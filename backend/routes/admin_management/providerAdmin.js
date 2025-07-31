const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const authorizeRole = require('../middlewares/authorizeRole');

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
      emergency_contact_phone
    } = req.body;

    // Update users table
    if (name || email || phone_number) {
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

module.exports = router;
