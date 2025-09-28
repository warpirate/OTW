const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const authorizeRole = require('../middlewares/authorizeRole');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// AWS S3 setup for presigned GET URLs (admin viewing)
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_PROVIDER_DOCS || process.env.AWS_BUCKET_NAME;
const s3 = new AWS.S3({ region: S3_REGION });

/**
 * Get all providers with pagination, search and filters
 * GET /api/admin/providers
 */
router.get('/providers', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const verified = req.query.verified || '';
    const active = req.query.active || '';

    // Build WHERE clause based on filters
    let whereConditions = ['u.is_active = 1'];
    let queryParams = [];

    // Search filter
    if (search) {
      whereConditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Verified filter
    if (verified === 'true') {
      whereConditions.push('p.verified = 1');
    } else if (verified === 'false') {
      whereConditions.push('p.verified = 0');
    }

    // Active filter
    if (active === 'true') {
      whereConditions.push('p.active = 1');
    } else if (active === 'false') {
      whereConditions.push('p.active = 0');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      INNER JOIN providers p ON u.id = p.user_id
      ${whereClause}
    `;
    
    const [countResult] = await pool.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get providers with pagination
    const dataQuery = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        u.created_at as user_created_at,
        p.id as provider_id,
        p.experience_years,
        p.rating,
        p.bio,
        p.verified,
        p.active,
        p.last_active_at,
        p.service_radius_km,
        p.location_lat,
        p.location_lng,
        p.alternate_email,
        p.alternate_phone_number,
        p.emergency_contact_name,
        p.emergency_contact_relationship,
        p.emergency_contact_phone,
        p.created_at as provider_created_at,
        p.updated_at as provider_updated_at,
        ANY_VALUE(pa.street_address) AS street_address,
        ANY_VALUE(pa.city) AS city,
        ANY_VALUE(pa.state) AS state,
        ANY_VALUE(pa.zip_code) AS zip_code,
        ANY_VALUE(pa.address_type) AS address_type,
        GROUP_CONCAT(DISTINCT ps.subcategory_id) as subcategory_ids
      FROM users u
      INNER JOIN providers p ON u.id = p.user_id
      LEFT JOIN provider_services ps ON p.id = ps.provider_id
      LEFT JOIN provider_addresses pa ON p.id = pa.provider_id AND pa.address_type = 'permanent'
      ${whereClause}
      GROUP BY u.id, p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const [providers] = await pool.query(dataQuery, queryParams);

    // Format the response
    const formattedProviders = providers.map(provider => ({
      id: provider.user_id,
      provider_id: provider.provider_id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone_number,
      experience_years: provider.experience_years,
      rating: parseFloat(provider.rating) || 0,
      bio: provider.bio,
      verified: Boolean(provider.verified),
      active: Boolean(provider.active),
      last_active_at: provider.last_active_at,
      service_radius_km: provider.service_radius_km,
      location: {
        lat: parseFloat(provider.location_lat),
        lng: parseFloat(provider.location_lng)
      },
      permanent_address: {
        street: provider.street_address,
        city: provider.city,
        state: provider.state,
        zip_code: provider.zip_code
      },
      alternate_email: provider.alternate_email,
      alternate_phone_number: provider.alternate_phone_number,
      emergency_contact: {
        name: provider.emergency_contact_name,
        relationship: provider.emergency_contact_relationship,
        phone: provider.emergency_contact_phone
      },
      subcategory_ids: provider.subcategory_ids ? provider.subcategory_ids.split(',').map(id => parseInt(id)) : [],
      created_at: provider.user_created_at,
      provider_created_at: provider.provider_created_at,
      updated_at: provider.provider_updated_at
    }));

    res.json({
      success: true,
      data: {
        providers: formattedProviders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch providers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get specific provider by ID
 * GET /api/admin/providers/:id
 */
router.get('/providers/:id', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    const query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        u.created_at as user_created_at,
        p.id as provider_id,
        p.experience_years,
        p.rating,
        p.bio,
        p.verified,
        p.active,
        p.last_active_at,
        p.service_radius_km,
        p.location_lat,
        p.location_lng,
        p.alternate_email,
        p.alternate_phone_number,
        p.emergency_contact_name,
        p.emergency_contact_relationship,
        p.emergency_contact_phone,
        p.created_at as provider_created_at,
        p.updated_at as provider_updated_at,
        ANY_VALUE(pa.street_address) AS street_address,
        ANY_VALUE(pa.city) AS city,
        ANY_VALUE(pa.state) AS state,
        ANY_VALUE(pa.zip_code) AS zip_code
      FROM users u
      INNER JOIN providers p ON u.id = p.user_id
      LEFT JOIN provider_addresses pa ON p.id = pa.provider_id AND pa.address_type = 'permanent'
      WHERE u.id = ? AND u.is_active = 1
      GROUP BY u.id, p.id
    `;

    const [providers] = await pool.query(query, [userId]);

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const provider = providers[0];

    // Get provider services
    const servicesQuery = `
      SELECT ps.subcategory_id, sc.name as subcategory_name, c.name as category_name
      FROM provider_services ps
      LEFT JOIN subcategories sc ON ps.subcategory_id = sc.id
      LEFT JOIN service_categories c ON sc.category_id = c.id
      WHERE ps.provider_id = ?
    `;

    const [services] = await pool.query(servicesQuery, [provider.provider_id]);

    const formattedProvider = {
      id: providers[0].user_id,
      provider_id: providers[0].provider_id,
      name: providers[0].name,
      email: providers[0].email,
      phone: providers[0].phone_number,
      experience_years: providers[0].experience_years,
      rating: parseFloat(providers[0].rating) || 0,
      bio: providers[0].bio,
      verified: Boolean(providers[0].verified),
      active: Boolean(providers[0].active),
      last_active_at: providers[0].last_active_at,
      service_radius_km: providers[0].service_radius_km,
      location: {
        lat: parseFloat(providers[0].location_lat),
        lng: parseFloat(providers[0].location_lng)
      },
      permanent_address: {
        street: providers[0].street_address,
        city: providers[0].city,
        state: providers[0].state,
        zip_code: providers[0].zip_code
      },
      alternate_email: providers[0].alternate_email,
      alternate_phone_number: providers[0].alternate_phone_number,
      emergency_contact: {
        name: providers[0].emergency_contact_name,
        relationship: providers[0].emergency_contact_relationship,
        phone: providers[0].emergency_contact_phone
      },
      services: services.map(service => ({
        subcategory_id: service.subcategory_id,
        subcategory_name: service.subcategory_name,
        category_name: service.category_name
      })),
      created_at: providers[0].user_created_at,
      provider_created_at: providers[0].provider_created_at,
      updated_at: providers[0].provider_updated_at
    };

    res.json({
      success: true,
      data: formattedProvider
    });

  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provider',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Update provider verification status (approve/reject)
 * PATCH /api/admin/providers/:id/verify
 */
router.patch('/providers/:id/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Verified status must be a boolean value'
      });
    }

    // Update provider verification status
    const updateQuery = `
      UPDATE providers 
      SET verified = ?, updated_at = NOW() 
      WHERE user_id = ?
    `;

    const [result] = await pool.query(updateQuery, [verified, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.json({
      success: true,
      message: `Provider ${verified ? 'approved' : 'rejected'} successfully`,
      data: {
        verified,
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error updating provider verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update provider verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Update provider details
 * PUT /api/admin/providers/:id
 */
router.put('/providers/:id', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.params.id;
    const {
      name,
      email,
      phone_number,
      experience_years,
      bio,
      active,
      service_radius_km,
      location_lat,
      location_lng,
      permanent_address,
      alternate_email,
      alternate_phone_number,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      gender // <-- add gender
    } = req.body;

    // Update users table
    if (name || email || phone_number || gender) {
      const userUpdates = [];
      const userValues = [];

      if (name) {
        userUpdates.push('name = ?');
        userValues.push(name);
      }
      if (email) {
        userUpdates.push('email = ?');
        userValues.push(email);
      }
      if (phone_number) {
        userUpdates.push('phone_number = ?');
        userValues.push(phone_number);
      }
      if (gender) {
        userUpdates.push('gender = ?');
        userValues.push(gender);
      }

      if (userUpdates.length > 0) {
        userValues.push(userId);
        await connection.query(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
          userValues
        );
      }
    }

    // Update providers table
    const providerUpdates = [];
    const providerValues = [];

    const providerFields = {
      experience_years,
      bio,
      active,
      service_radius_km,
      location_lat,
      location_lng,
      alternate_email,
      alternate_phone_number,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone
    };

    Object.entries(providerFields).forEach(([field, value]) => {
      if (value !== undefined) {
        providerUpdates.push(`${field} = ?`);
        providerValues.push(value);
      }
    });

    if (providerUpdates.length > 0) {
      providerUpdates.push('updated_at = NOW()');
      providerValues.push(userId);

      await connection.query(
        `UPDATE providers SET ${providerUpdates.join(', ')} WHERE user_id = ?`,
        providerValues
      );
    }

    // Update provider addresses table
    if (permanent_address) {
      const addressFields = {
        street_address: permanent_address.street,
        city: permanent_address.city,
        state: permanent_address.state,
        zip_code: permanent_address.zip_code
      };

      const addressUpdates = [];
      const addressValues = [];

      Object.entries(addressFields).forEach(([field, value]) => {
        if (value !== undefined) {
          addressUpdates.push(`${field} = ?`);
          addressValues.push(value);
        }
      });

      if (addressUpdates.length > 0) {
        addressUpdates.push('provider_id = ?');
        addressValues.push(userId);
        addressUpdates.push('address_type = ?');
        addressValues.push('permanent');

        await connection.query(
          `UPDATE provider_addresses SET ${addressUpdates.join(', ')} WHERE provider_id = ? AND address_type = 'permanent'`,
          [...addressValues, userId]
        );
      }
    }

    await connection.commit();

    const query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        u.created_at as user_created_at,
        p.id as provider_id,
        p.experience_years,
        p.rating,
        p.bio,
        p.verified,
        p.active,
        p.last_active_at,
        p.service_radius_km,
        p.location_lat,
        p.location_lng,
        p.alternate_email,
        p.alternate_phone_number,
        p.emergency_contact_name,
        p.emergency_contact_relationship,
        p.emergency_contact_phone,
        p.created_at as provider_created_at,
        p.updated_at as provider_updated_at,
        ANY_VALUE(pa.street_address) AS street_address,
        ANY_VALUE(pa.city) AS city,
        ANY_VALUE(pa.state) AS state,
        ANY_VALUE(pa.zip_code) AS zip_code
      FROM users u
      INNER JOIN providers p ON u.id = p.user_id
      LEFT JOIN provider_addresses pa ON p.id = pa.provider_id AND pa.address_type = 'permanent'
      WHERE u.id = ? AND u.is_active = 1
      GROUP BY u.id, p.id
    `;

    const [providers] = await pool.query(query, [userId]);

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const provider = providers[0];

    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: {
        id: provider.user_id,
        provider_id: provider.provider_id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone_number,
        experience_years: provider.experience_years,
        rating: parseFloat(provider.rating) || 0,
        bio: provider.bio,
        verified: Boolean(provider.verified),
        active: Boolean(provider.active),
        last_active_at: provider.last_active_at,
        service_radius_km: provider.service_radius_km,
        location: {
          lat: parseFloat(provider.location_lat),
          lng: parseFloat(provider.location_lng)
        },
        permanent_address: {
          street: provider.street_address,
          city: provider.city,
          state: provider.state,
          zip_code: provider.zip_code
        },
        alternate_email: provider.alternate_email,
        alternate_phone_number: provider.alternate_phone_number,
        emergency_contact: {
          name: provider.emergency_contact_name,
          relationship: provider.emergency_contact_relationship,
          phone: provider.emergency_contact_phone
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update provider',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    connection.release();
  }
});

/**
 * Delete provider (soft delete - set user as inactive)
 * DELETE /api/admin/providers/:id
 */
router.delete('/providers/:id', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // Soft delete by setting user as inactive
    const updateQuery = `
      UPDATE users 
      SET is_active = 0 
      WHERE id = ?
    `;

    const [result] = await pool.query(updateQuery, [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete provider',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Toggle provider active status
 * PATCH /api/admin/providers/:id/toggle-active
 */
router.patch('/providers/:id/toggle-active', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Active status must be a boolean value'
      });
    }

    const updateQuery = `
      UPDATE providers 
      SET active = ?, updated_at = NOW() 
      WHERE user_id = ?
    `;

    const [result] = await pool.query(updateQuery, [active, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.json({
      success: true,
      message: `Provider ${active ? 'activated' : 'deactivated'} successfully`,
      data: {
        active,
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error toggling provider status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle provider status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get provider banking details
 * GET /api/admin/providers/:id/banking-details
 */
router.get('/providers/:id/banking-details', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // First verify the provider exists
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerId = provider[0].id;

    // Get banking details
    const query = `
      SELECT 
        id,
        bank_name,
        branch_name,
        account_holder_name,
        account_number,
        ifsc_code,
        account_type,
        is_primary,
        status,
        verification_remarks,
        created_at,
        updated_at
      FROM provider_banking_details 
      WHERE provider_id = ?
      ORDER BY is_primary DESC, created_at DESC
    `;

    const [bankingDetails] = await pool.query(query, [providerId]);

    res.json({
      success: true,
      data: bankingDetails.map(detail => ({
        id: detail.id,
        bank_name: detail.bank_name,
        branch_name: detail.branch_name,
        account_holder_name: detail.account_holder_name,
        account_number: detail.account_number,
        ifsc_code: detail.ifsc_code,
        account_type: detail.account_type,
        is_primary: Boolean(detail.is_primary),
        status: detail.status,
        verification_remarks: detail.verification_remarks,
        created_at: detail.created_at,
        updated_at: detail.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fetching provider banking details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banking details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get provider documents
 * GET /api/admin/providers/:id/documents
 */
router.get('/providers/:id/documents', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // First verify the provider exists
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerId = provider[0].id;

    // Get documents
    const query = `
      SELECT 
        id,
        document_type,
        document_url,
        status,
        remarks,
        uploaded_at,
        verified_at
      FROM provider_documents 
      WHERE provider_id = ?
      ORDER BY uploaded_at DESC
    `;

    const [documents] = await pool.query(query, [providerId]);

    res.json({
      success: true,
      data: documents.map(doc => ({
        id: doc.id,
        document_type: doc.document_type,
        document_url: doc.document_url,
        status: doc.status,
        remarks: doc.remarks,
        uploaded_at: doc.uploaded_at,
        verified_at: doc.verified_at,
        // Extract filename from URL for display
        file_name: doc.document_url ? doc.document_url.split('/').pop() : 'Unknown'
      }))
    });

  } catch (error) {
    console.error('Error fetching provider documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
    // AWS S3 setup for presigned GET URLs for private documents
    const S3_REGION = process.env.AWS_REGION;
    const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_PROVIDER_DOCS || process.env.AWS_BUCKET_NAME;
    const s3 = new AWS.S3({ region: S3_REGION });
  }
});

/**
 * Get provider qualifications
 * GET /api/admin/providers/:id/qualifications
 */
router.get('/providers/:id/qualifications', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // First verify the provider exists
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerId = provider[0].id;

    // Get qualifications with new schema fields
    const query = `
      SELECT 
        id,
        qualification_name,
        issuing_institution,
        issue_date,
        certificate_number,
        certificate_url,
        status,
        remarks,
        created_at,
        updated_at
      FROM provider_qualifications 
      WHERE provider_id = ?
      ORDER BY created_at DESC
    `;

    const [qualifications] = await pool.query(query, [providerId]);

    res.json({
      success: true,
      data: qualifications.map(qual => ({
        id: qual.id,
        qualification_name: qual.qualification_name,
        institution: qual.issuing_institution,
        issue_date: qual.issue_date,
        certificate_number: qual.certificate_number,
        certificate_url: qual.certificate_url,
        status: qual.status || 'pending_review',
        remarks: qual.remarks,
        created_at: qual.created_at,
        updated_at: qual.updated_at,
        has_certificate: Boolean(qual.certificate_url)
      }))
    });

  } catch (error) {
    console.error('Error fetching provider qualifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch qualifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Approve/Reject provider qualification
 * PATCH /api/admin/providers/qualifications/:qualificationId/status
 */
router.patch('/providers/qualifications/:qualificationId/status', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { qualificationId } = req.params;
    const { status, remarks } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }
    
    // Update qualification status
    const updateQuery = `
      UPDATE provider_qualifications 
      SET status = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const [result] = await pool.query(updateQuery, [status, remarks || null, qualificationId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Qualification not found'
      });
    }
    
    res.json({
      success: true,
      message: `Qualification ${status} successfully`,
      data: {
        status,
        remarks
      }
    });
  } catch (error) {
    console.error('Error updating qualification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update qualification status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get presigned URL to view qualification certificate
 * GET /api/admin/providers/qualifications/:qualificationId/certificate
 */
router.get('/providers/qualifications/:qualificationId/certificate', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { qualificationId } = req.params;

    // Get qualification details
    const [qualifications] = await pool.query(
      'SELECT certificate_url FROM provider_qualifications WHERE id = ?',
      [qualificationId]
    );

    if (qualifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Qualification not found'
      });
    }

    const certificateUrl = qualifications[0].certificate_url;
    if (!certificateUrl) {
      return res.status(404).json({
        success: false,
        message: 'No certificate uploaded for this qualification'
      });
    }

    // Handle local files (legacy)
    if (certificateUrl.startsWith('/uploads/')) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return res.json({ 
        success: true, 
        url: `${baseUrl}${certificateUrl}`, 
        storage: 'local' 
      });
    }

    // Handle S3 files
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({
        success: false,
        message: 'S3 is not configured on the server'
      });
    }

    const params = {
      Bucket: S3_BUCKET,
      Key: certificateUrl,
      Expires: 300,
      ResponseContentDisposition: 'attachment'
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return res.json({ 
      success: true, 
      url, 
      storage: 's3', 
      expiresIn: 300 
    });
  } catch (error) {
    console.error('Error generating qualification certificate presigned URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificate link',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get all qualifications pending review (for admin dashboard)
 * GET /api/admin/qualifications/pending
 */
router.get('/qualifications/pending', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { status = 'pending_review', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get qualifications with provider information
    const [qualifications] = await pool.query(
      `SELECT pq.*, p.id as provider_id, u.name as provider_name, u.email as provider_email,
              u.phone_number as provider_phone
       FROM provider_qualifications pq
       JOIN providers p ON pq.provider_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE pq.status = ?
       ORDER BY pq.created_at DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM provider_qualifications WHERE status = ?',
      [status]
    );
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        qualifications: qualifications.map(qual => ({
          id: qual.id,
          qualification_name: qual.qualification_name,
          institution: qual.issuing_institution,
          issue_date: qual.issue_date,
          certificate_number: qual.certificate_number,
          certificate_url: qual.certificate_url,
          status: qual.status,
          remarks: qual.remarks,
          created_at: qual.created_at,
          updated_at: qual.updated_at,
          has_certificate: Boolean(qual.certificate_url),
          provider: {
            id: qual.provider_id,
            name: qual.provider_name,
            email: qual.provider_email,
            phone: qual.provider_phone
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pending qualifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending qualifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get provider driver details
 * GET /api/admin/providers/:id/driver-details
 */
router.get('/providers/:id/driver-details', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // First verify the provider exists
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerId = provider[0].id;

    // Get driver details
    const query = `
      SELECT 
        provider_id,
        license_number,
        license_expiry_date,
        license_issuing_authority,
        vehicle_type,
        driving_experience_years,
        years_of_commercial_driving_exp,
        vehicle_registration_number
      FROM drivers 
      WHERE provider_id = ?
    `;

    const [driverDetails] = await pool.query(query, [providerId]);

    if (driverDetails.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No driver details found for this provider'
      });
    }

    const details = driverDetails[0];

    res.json({
      success: true,
      data: {
        provider_id: details.provider_id,
        license_number: details.license_number,
        license_expiry_date: details.license_expiry_date,
        license_issuing_authority: details.license_issuing_authority,
        vehicle_type: details.vehicle_type,
        driving_experience_years: details.driving_experience_years,
        years_of_commercial_driving_exp: details.years_of_commercial_driving_exp,
        vehicle_registration_number: details.vehicle_registration_number
      }
    });

  } catch (error) {
    console.error('Error fetching provider driver details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Verify provider document
router.patch('/providers/documents/:documentId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, remarks } = req.body;

    // Validate input and map frontend status to database enum values
    let dbStatus;
    if (status === 'verified') {
      dbStatus = 'approved';
    } else if (status === 'rejected') {
      dbStatus = 'rejected';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    // Update document verification status
    const updateQuery = `
      UPDATE provider_documents 
      SET status = ?, remarks = ?, verified_at = NOW()
      WHERE id = ?
    `;

    const [result] = await pool.query(updateQuery, [dbStatus, remarks || null, documentId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: `Document ${status} successfully`
    });

  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Verify banking details
router.patch('/providers/banking/:bankingId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { bankingId } = req.params;
    const { status, remarks } = req.body;

    // Validate input
    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    // Update banking verification status
    const updateQuery = `
      UPDATE provider_banking_details 
      SET status = ?, verification_remarks = ?, updated_at = NOW()
      WHERE id = ?
    `;

    const [result] = await pool.query(updateQuery, [status, remarks || null, bankingId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Banking details not found'
      });
    }

    res.json({
      success: true,
      message: `Banking details ${status} successfully`
    });

  } catch (error) {
    console.error('Error verifying banking details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify banking details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get presigned GET URL to view a provider document (admin)
 * GET /api/admin/providers/documents/:documentId/presign
 */
router.get('/providers/documents/:documentId/presign', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { documentId } = req.params;

    const [docs] = await pool.query(
      'SELECT provider_id, document_url FROM provider_documents WHERE id = ?',
      [documentId]
    );

    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    let key = docs[0].document_url;
    const providerId = docs[0].provider_id;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Document key is empty' });
    }

    // If document is stored locally, migrate it to S3 on-demand, then return S3 URL
    if (key.startsWith('/uploads/')) {
      try {
        if (!S3_BUCKET || !S3_REGION) {
          // As a last resort, return the local URL (may 404 if not served statically)
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          return res.json({ success: true, url: `${baseUrl}${key}`, storage: 'local' });
        }

        const relPath = key.startsWith('/') ? key.slice(1) : key;
        const absPath = path.join(process.cwd(), relPath);
        if (!fs.existsSync(absPath)) {
          return res.status(404).json({ success: false, message: 'Local document not found for migration' });
        }

        const fileName = path.basename(absPath);
        // Place migrated files under provider-specific prefix
        const migrateKey = `provider_documents/${providerId}/${Date.now()}_${fileName}`;

        await s3.upload({
          Bucket: S3_BUCKET,
          Key: migrateKey,
          Body: fs.createReadStream(absPath)
        }).promise();

        // Update DB to point to S3 key so future requests go directly to S3
        await pool.query(
          'UPDATE provider_documents SET document_url = ? WHERE id = ?',
          [migrateKey, documentId]
        );

        key = migrateKey; // continue to sign and return S3 URL below
      } catch (migrateErr) {
        console.error('Error migrating local document to S3:', migrateErr);
        return res.status(500).json({ success: false, message: 'Failed to migrate local document to S3' });
      }
    }

    // S3 private object presign
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ success: false, message: 'S3 is not configured on the server' });
    }

    const params = { Bucket: S3_BUCKET, Key: key, Expires: 300 };
    const url = await s3.getSignedUrlPromise('getObject', params);
    return res.json({ success: true, url, storage: 's3', expiresIn: 300 });
  } catch (error) {
    console.error('Error generating presigned GET URL:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate presigned URL', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;
