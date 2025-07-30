const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * WorkerService class merged from backend/services/worker.service.js
 */
class WorkerService {
  /**
   * Register a new worker with provider data
   */
  static async registerWorker(userData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { firstName, lastName, email, phone, password, providerData } = userData;
      const name = `${firstName} ${lastName}`;

      // Check if email already exists
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (existingUsers.length > 0) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert into users table
      const [userResult] = await connection.query(
        `INSERT INTO users (name, email, password, phone_number, is_active, created_at) 
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [name, email, hashedPassword, phone]
      );

      const userId = userResult.insertId;

      // Get worker role ID (check for various possible worker role names)
      const [roleResult] = await connection.query(
        'SELECT id, name FROM roles WHERE LOWER(name) IN (?, ?, ?) LIMIT 1',
        ['worker', 'provider', 'service provider']
      );

      if (roleResult.length === 0) {
        throw new Error('Worker role not found in system');
      }

      const roleId = roleResult[0].id;

      // Assign worker role to user
      await connection.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roleId]
      );

      // Insert into providers table
      const [providerResult] = await connection.query(
        `INSERT INTO providers (
          user_id, experience_years, bio, service_radius_km, 
          location_lat, location_lng, verified, active, rating,
          permanent_address, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          providerData.experience_years,
          providerData.bio,
          providerData.service_radius_km,
          providerData.location_lat,
          providerData.location_lng,
          providerData.verified || false,
          providerData.active || true,
          providerData.rating || 0.0,
          providerData.permanent_address || null
        ]
      );

      const providerId = providerResult.insertId;

      // Insert default provider settings
      await connection.query(
        `INSERT INTO provider_settings (
          provider_id, notify_on_job_alerts, notify_on_messages, notify_on_payments,
          notify_by_sms, notify_by_push, auto_accept_jobs, max_jobs_per_day,
          allow_weekend_work, allow_holiday_work, profile_visibility, display_rating,
          allow_direct_contact, location_sharing_mode, preferred_language,
          preferred_currency, distance_unit, time_format, created_at, updated_at
        ) VALUES (?, 1, 1, 1, 1, 1, 0, 5, 1, 1, 'public', 1, 1, 'on_job', 'en', 'INR', 'km', '24h', NOW(), NOW())`,
        [providerId]
      );

      // Insert provider services if provided
      if (providerData.services && Array.isArray(providerData.services)) {
        for (const service of providerData.services) {
          await connection.query(
            'INSERT INTO provider_services (provider_id, subcategory_id) VALUES (?, ?)',
            [providerId, service.subcategory_id]
          );
        }
      }

      // Insert provider qualifications if provided
      if (providerData.qualifications && Array.isArray(providerData.qualifications)) {
        for (const qualification of providerData.qualifications) {
          await connection.query(
            `INSERT INTO provider_qualifications (
              provider_id, qualification_name, issuing_institution, 
              issue_date, certificate_number
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              providerId,
              qualification.qualification_name,
              qualification.issuing_institution,
              qualification.issue_date,
              qualification.certificate_number
            ]
          );
        }
      }

      // Insert provider documents if provided
      if (providerData.documents && Array.isArray(providerData.documents)) {
        for (const document of providerData.documents) {
          await connection.query(
            `INSERT INTO provider_documents (
              provider_id, document_type, document_url, status, remarks, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              providerId,
              document.document_type,
              document.document_url,
              document.status || 'pending_review',
              document.remarks || null
            ]
          );
        }
      }

      // Insert provider banking details if provided
      if (providerData.banking_details) {
        await connection.query(
          `INSERT INTO provider_banking_details (
            provider_id, account_holder_name, account_number, ifsc_code,
            bank_name, branch_name, account_type, is_primary, status,
            verification_remarks, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            providerId,
            providerData.banking_details.account_holder_name,
            providerData.banking_details.account_number,
            providerData.banking_details.ifsc_code,
            providerData.banking_details.bank_name,
            providerData.banking_details.branch_name,
            providerData.banking_details.account_type || 'savings',
            providerData.banking_details.is_primary || true,
            providerData.banking_details.status || 'unverified',
            providerData.banking_details.verification_remarks || null
          ]
        );
      }

      // Insert driver information if provided
      if (providerData.driver_info) {
        await connection.query(
          `INSERT INTO drivers (
            provider_id, license_number, vehicle_type, 
            driving_experience_years, vehicle_registration_number
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            providerId,
            providerData.driver_info.license_number,
            providerData.driver_info.vehicle_type,
            providerData.driver_info.driving_experience_years,
            providerData.driver_info.vehicle_registration_number
          ]
        );
      }

      // Insert vehicles if provided
      if (providerData.vehicles && Array.isArray(providerData.vehicles)) {
        for (const vehicle of providerData.vehicles) {
          await connection.query(
            `INSERT INTO vehicles (
              provider_id, make, model, year, color, registration_number,
              vehicle_type, insurance_policy_number, insurance_expiry_date,
              fitness_certificate_expiry_date, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              providerId,
              vehicle.make,
              vehicle.model,
              vehicle.year,
              vehicle.color,
              vehicle.registration_number,
              vehicle.vehicle_type,
              vehicle.insurance_policy_number,
              vehicle.insurance_expiry_date,
              vehicle.fitness_certificate_expiry_date,
              vehicle.is_active !== undefined ? vehicle.is_active : true
            ]
          );
        }
      }

      await connection.commit();

      // Generate JWT token
      const token = jwt.sign(
        {
          id: userId,
          email,
          role: 'worker',
          role_id: roleId
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION }
      );

      return {
        token,
        user: {
          id: userId,
          name,
          email,
          phone,
          role: 'worker',
          role_id: roleId
        }
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get worker profile with all related data
   */
  static async getWorkerProfile(userId) {
    try {
      // Get basic user and provider info
      const [basicResults] = await pool.query(
        `SELECT 
          u.id, u.name, u.email, u.phone_number,
          p.id as provider_id, p.experience_years, p.bio, p.rating,
          p.verified, p.active, p.service_radius_km,
          p.location_lat, p.location_lng, p.last_active_at,
          p.permanent_address, p.created_at, p.updated_at
        FROM users u
        LEFT JOIN providers p ON u.id = p.user_id
        WHERE u.id = ? AND u.is_active = 1`,
        [userId]
      );

      if (basicResults.length === 0) {
        throw new Error('Worker not found');
      }

      const profile = basicResults[0];

      // Get provider settings
      const [settingsResults] = await pool.query(
        'SELECT * FROM provider_settings WHERE provider_id = ?',
        [profile.provider_id]
      );

      // Get provider services
      const [servicesResults] = await pool.query(
        `SELECT ps.*, sc.name as subcategory_name 
         FROM provider_services ps
         LEFT JOIN subcategories sc ON ps.subcategory_id = sc.id
         WHERE ps.provider_id = ?`,
        [profile.provider_id]
      );

      // Get provider qualifications
      const [qualificationsResults] = await pool.query(
        'SELECT * FROM provider_qualifications WHERE provider_id = ?',
        [profile.provider_id]
      );

      // Get provider documents
      const [documentsResults] = await pool.query(
        'SELECT * FROM provider_documents WHERE provider_id = ?',
        [profile.provider_id]
      );

      // Get provider banking details
      const [bankingResults] = await pool.query(
        'SELECT * FROM provider_banking_details WHERE provider_id = ?',
        [profile.provider_id]
      );

      // Get driver information
      const [driverResults] = await pool.query(
        'SELECT * FROM drivers WHERE provider_id = ?',
        [profile.provider_id]
      );

      // Get vehicles
      const [vehiclesResults] = await pool.query(
        'SELECT * FROM vehicles WHERE provider_id = ?',
        [profile.provider_id]
      );

      // Get location logs (recent ones)
      const [locationLogsResults] = await pool.query(
        `SELECT * FROM provider_location_logs 
         WHERE provider_id = ? 
         ORDER BY recorded_at DESC 
         LIMIT 10`,
        [profile.provider_id]
      );

      return {
        ...profile,
        settings: settingsResults[0] || null,
        services: servicesResults,
        qualifications: qualificationsResults,
        documents: documentsResults,
        banking_details: bankingResults,
        driver_info: driverResults[0] || null,
        vehicles: vehiclesResults,
        location_logs: locationLogsResults
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update worker profile with all related data
   */
  static async updateWorkerProfile(userId, updateData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get provider ID
      const [providerResult] = await connection.query(
        'SELECT id FROM providers WHERE user_id = ?',
        [userId]
      );

      if (providerResult.length === 0) {
        throw new Error('Provider not found');
      }

      const providerId = providerResult[0].id;

      // Update users table if user data provided
      if (updateData.name || updateData.phone_number) {
        const userUpdates = [];
        const userValues = [];

        if (updateData.name) {
          userUpdates.push('name = ?');
          userValues.push(updateData.name);
        }
        if (updateData.phone_number) {
          userUpdates.push('phone_number = ?');
          userValues.push(updateData.phone_number);
        }

        if (userUpdates.length > 0) {
          userValues.push(userId);
          await connection.query(
            `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
            userValues
          );
        }
      }

      // Update providers table if provider data provided
      const providerFields = [
        'experience_years', 'bio', 'service_radius_km',
        'location_lat', 'location_lng', 'active', 'permanent_address'
      ];

      const providerUpdates = [];
      const providerValues = [];

      providerFields.forEach(field => {
        if (updateData[field] !== undefined) {
          providerUpdates.push(`${field} = ?`);
          providerValues.push(updateData[field]);
        }
      });

      if (providerUpdates.length > 0) {
        providerUpdates.push('updated_at = NOW()');
        providerValues.push(providerId);

        await connection.query(
          `UPDATE providers SET ${providerUpdates.join(', ')} WHERE id = ?`,
          providerValues
        );
      }

      // Update provider settings if provided
      if (updateData.settings) {
        const settingsFields = [
          'notify_on_job_alerts', 'notify_on_messages', 'notify_on_payments',
          'notify_by_sms', 'notify_by_push', 'auto_accept_jobs', 'max_jobs_per_day',
          'allow_weekend_work', 'allow_holiday_work', 'profile_visibility', 'display_rating',
          'allow_direct_contact', 'location_sharing_mode', 'preferred_language',
          'preferred_currency', 'distance_unit', 'time_format'
        ];

        const settingsUpdates = [];
        const settingsValues = [];

        settingsFields.forEach(field => {
          if (updateData.settings[field] !== undefined) {
            settingsUpdates.push(`${field} = ?`);
            settingsValues.push(updateData.settings[field]);
          }
        });

        if (settingsUpdates.length > 0) {
          settingsUpdates.push('updated_at = NOW()');
          settingsValues.push(providerId);

          await connection.query(
            `UPDATE provider_settings SET ${settingsUpdates.join(', ')} WHERE provider_id = ?`,
            settingsValues
          );
        }
      }

      // Update services if provided
      if (updateData.services) {
        // Delete existing services
        await connection.query(
          'DELETE FROM provider_services WHERE provider_id = ?',
          [providerId]
        );

        // Insert new services
        if (Array.isArray(updateData.services)) {
          for (const service of updateData.services) {
            await connection.query(
              'INSERT INTO provider_services (provider_id, subcategory_id) VALUES (?, ?)',
              [providerId, service.subcategory_id]
            );
          }
        }
      }

      // Update qualifications if provided
      if (updateData.qualifications) {
        // Delete existing qualifications
        await connection.query(
          'DELETE FROM provider_qualifications WHERE provider_id = ?',
          [providerId]
        );

        // Insert new qualifications
        if (Array.isArray(updateData.qualifications)) {
          for (const qualification of updateData.qualifications) {
            await connection.query(
              `INSERT INTO provider_qualifications (
                provider_id, qualification_name, issuing_institution, 
                issue_date, certificate_number
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                providerId,
                qualification.qualification_name,
                qualification.issuing_institution,
                qualification.issue_date,
                qualification.certificate_number
              ]
            );
          }
        }
      }

      // Update driver info if provided
      if (updateData.driver_info) {
        await connection.query(
          'DELETE FROM drivers WHERE provider_id = ?',
          [providerId]
        );

        await connection.query(
          `INSERT INTO drivers (
            provider_id, license_number, vehicle_type, 
            driving_experience_years, vehicle_registration_number
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            providerId,
            updateData.driver_info.license_number,
            updateData.driver_info.vehicle_type,
            updateData.driver_info.driving_experience_years,
            updateData.driver_info.vehicle_registration_number
          ]
        );
      }

      // Update vehicles if provided
      if (updateData.vehicles) {
        // Delete existing vehicles
        await connection.query(
          'DELETE FROM vehicles WHERE provider_id = ?',
          [providerId]
        );

        // Insert new vehicles
        if (Array.isArray(updateData.vehicles)) {
          for (const vehicle of updateData.vehicles) {
            await connection.query(
              `INSERT INTO vehicles (
                provider_id, make, model, year, color, registration_number,
                vehicle_type, insurance_policy_number, insurance_expiry_date,
                fitness_certificate_expiry_date, is_active, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                providerId,
                vehicle.make,
                vehicle.model,
                vehicle.year,
                vehicle.color,
                vehicle.registration_number,
                vehicle.vehicle_type,
                vehicle.insurance_policy_number,
                vehicle.insurance_expiry_date,
                vehicle.fitness_certificate_expiry_date,
                vehicle.is_active !== undefined ? vehicle.is_active : true
              ]
            );
          }
        }
      }

      await connection.commit();

      // Return updated profile
      return await this.getWorkerProfile(userId);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update worker last active timestamp
   */
  static async updateLastActive(userId) {
    try {
      await pool.query(
        'UPDATE providers SET last_active_at = NOW() WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log provider location
   */
  static async logLocation(userId, latitude, longitude) {
    try {
      const [providerResult] = await pool.query(
        'SELECT id FROM providers WHERE user_id = ?',
        [userId]
      );

      if (providerResult.length === 0) {
        throw new Error('Provider not found');
      }

      const providerId = providerResult[0].id;

      await pool.query(
        `INSERT INTO provider_location_logs (
          provider_id, latitude, longitude, recorded_at
        ) VALUES (?, ?, ?, NOW())`,
        [providerId, latitude, longitude]
      );

      // Also update the main location in providers table
      await pool.query(
        'UPDATE providers SET location_lat = ?, location_lng = ?, updated_at = NOW() WHERE id = ?',
        [latitude, longitude, providerId]
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all workers (for admin purposes)
   */
  static async getAllWorkers(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE u.is_active = 1';
      const queryParams = [];

      // Apply filters
      if (filters.verified !== undefined) {
        whereClause += ' AND p.verified = ?';
        queryParams.push(filters.verified);
      }

      if (filters.active !== undefined) {
        whereClause += ' AND p.active = ?';
        queryParams.push(filters.active);
      }

      if (filters.location) {
        // Filter by location radius (basic implementation)
        whereClause += ' AND p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL';
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const [workers] = await pool.query(
        `SELECT 
          u.id, u.name, u.email, u.phone_number, u.created_at as user_created,
          p.id as provider_id, p.experience_years, p.bio, p.rating,
          p.verified, p.active, p.service_radius_km,
          p.location_lat, p.location_lng, p.last_active_at,
          p.permanent_address, p.created_at as provider_created, p.updated_at
        FROM users u
        INNER JOIN providers p ON u.id = p.user_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count for pagination
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total
        FROM users u
        INNER JOIN providers p ON u.id = p.user_id
        ${whereClause}`,
        queryParams.slice(0, -2) // Remove limit and offset params
      );

      return {
        workers,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update worker verification status (admin only)
   */
  static async updateVerificationStatus(userId, verified) {
    try {
      const [result] = await pool.query(
        'UPDATE providers SET verified = ?, updated_at = NOW() WHERE user_id = ?',
        [verified, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Worker not found');
      }

      return await this.getWorkerProfile(userId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add provider document
   */
  static async addDocument(userId, documentData) {
    try {
      const [providerResult] = await pool.query(
        'SELECT id FROM providers WHERE user_id = ?',
        [userId]
      );

      if (providerResult.length === 0) {
        throw new Error('Provider not found');
      }

      const providerId = providerResult[0].id;

      const [result] = await pool.query(
        `INSERT INTO provider_documents (
          provider_id, document_type, document_url, status, remarks, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          providerId,
          documentData.document_type,
          documentData.document_url,
          documentData.status || 'pending_review',
          documentData.remarks || null
        ]
      );

      return { document_id: result.insertId };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update document status (admin only)
   */
  static async updateDocumentStatus(documentId, status, remarks = null) {
    try {
      const [result] = await pool.query(
        `UPDATE provider_documents 
         SET status = ?, remarks = ?, verified_at = NOW() 
         WHERE id = ?`,
        [status, remarks, documentId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Document not found');
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add banking details
   */
  static async addBankingDetails(userId, bankingData) {
    try {
      const [providerResult] = await pool.query(
        'SELECT id FROM providers WHERE user_id = ?',
        [userId]
      );

      if (providerResult.length === 0) {
        throw new Error('Provider not found');
      }

      const providerId = providerResult[0].id;

      const [result] = await pool.query(
        `INSERT INTO provider_banking_details (
          provider_id, account_holder_name, account_number, ifsc_code,
          bank_name, branch_name, account_type, is_primary, status,
          verification_remarks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          providerId,
          bankingData.account_holder_name,
          bankingData.account_number,
          bankingData.ifsc_code,
          bankingData.bank_name,
          bankingData.branch_name,
          bankingData.account_type || 'savings',
          bankingData.is_primary || true,
          bankingData.status || 'unverified',
          bankingData.verification_remarks || null
        ]
      );

      return { banking_id: result.insertId };
    } catch (error) {
      throw error;
    }
  }
}
const verifyToken = require('../middlewares/verify_token');
const authorizeRole = require('../middlewares/authorizeRole');

// ------------------------
// Worker Registration Route
// ------------------------
router.post('/worker/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, role, providerData } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !email || !password || !providerData) {
    return res.status(400).json({ 
      message: 'Missing required fields',
      required: ['firstName', 'lastName', 'email', 'password', 'providerData']
    });
  }
  
  // Validate provider data
  const requiredProviderFields = ['experience_years', 'bio', 'service_radius_km', 'location_lat', 'location_lng'];
  const missingProviderFields = requiredProviderFields.filter(field => 
    providerData[field] === undefined || providerData[field] === null
  );
  
  if (missingProviderFields.length > 0) {
    return res.status(400).json({ 
      message: 'Missing required provider fields',
      missingFields: missingProviderFields
    });
  }

  // Validate optional arrays if provided
  if (providerData.services && !Array.isArray(providerData.services)) {
    return res.status(400).json({ 
      message: 'Services must be an array' 
    });
  }

  if (providerData.qualifications && !Array.isArray(providerData.qualifications)) {
    return res.status(400).json({ 
      message: 'Qualifications must be an array' 
    });
  }

  if (providerData.documents && !Array.isArray(providerData.documents)) {
    return res.status(400).json({ 
      message: 'Documents must be an array' 
    });
  }

  if (providerData.vehicles && !Array.isArray(providerData.vehicles)) {
    return res.status(400).json({ 
      message: 'Vehicles must be an array' 
    });
  }
  
  try {
    console.log('Worker registration attempt:', { email, firstName, lastName, hasProviderData: !!providerData });
    
    const result = await WorkerService.registerWorker({
      firstName,
      lastName,
      email,
      phone,
      password,
      providerData
    });
    
    console.log('Worker registration successful:', { userId: result.user.id, email });
    
    res.status(201).json({
      message: 'Worker registered successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Worker registration error:', error);
    
    if (error.message === 'Email already registered') {
      return res.status(409).json({ message: error.message });
    }
    
    if (error.message === 'Worker role not found in system') {
      return res.status(500).json({ message: 'System configuration error' });
    }
    
    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Worker Profile
// ------------------------
router.get('/worker/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update last active timestamp
    await WorkerService.updateLastActive(userId);
    
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Profile retrieved successfully',
      profile
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Profile
// ------------------------
router.put('/worker/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    const allowedFields = [
      'name', 'phone_number', 'experience_years', 'bio', 
      'service_radius_km', 'location_lat', 'location_lng', 'active', 'permanent_address'
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    });
    
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ 
        message: 'No valid fields to update',
        allowedFields
      });
    }
    
    console.log('Worker profile update:', { userId, fields: Object.keys(filteredData) });
    
    const updatedProfile = await WorkerService.updateWorkerProfile(userId, filteredData);
    
    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get All Workers (Admin Only)
// ------------------------
router.get('/worker/all', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};
    
    // Parse filters from query params
    if (req.query.verified !== undefined) {
      filters.verified = req.query.verified === 'true';
    }
    
    if (req.query.active !== undefined) {
      filters.active = req.query.active === 'true';
    }
    
    if (req.query.location) {
      filters.location = true;
    }
    
    console.log('Admin fetching workers:', { page, limit, filters });
    
    const result = await WorkerService.getAllWorkers(page, limit, filters);
    
    res.json({
      message: 'Workers retrieved successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Get all workers error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Specific Worker (Admin Only)
// ------------------------
router.get('/worker/:workerId', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const workerId = req.params.workerId;
    
    if (!workerId || isNaN(workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    
    const profile = await WorkerService.getWorkerProfile(parseInt(workerId));
    
    res.json({
      message: 'Worker profile retrieved successfully',
      profile
    });
    
  } catch (error) {
    console.error('Get worker by ID error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to retrieve worker profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Verification Status (Admin Only)
// ------------------------
router.patch('/worker/:workerId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const { verified } = req.body;
    
    if (!workerId || isNaN(workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ message: 'Verified status must be a boolean' });
    }
    
    console.log('Admin updating worker verification:', { 
      workerId, 
      verified, 
      adminId: req.user.id 
    });
    
    const updatedProfile = await WorkerService.updateVerificationStatus(parseInt(workerId), verified);
    
    res.json({
      message: `Worker ${verified ? 'verified' : 'unverified'} successfully`,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Update verification status error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Activity Status (Admin Only)
// ------------------------
router.patch('/worker/:workerId/activity', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const { active } = req.body;
    
    if (!workerId || isNaN(workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'Active status must be a boolean' });
    }
    
    console.log('Admin updating worker activity:', { 
      workerId, 
      active, 
      adminId: req.user.id 
    });
    
    const updatedProfile = await WorkerService.updateWorkerProfile(parseInt(workerId), { active });
    
    res.json({
      message: `Worker ${active ? 'activated' : 'deactivated'} successfully`,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Update activity status error:', error);
    
    if (error.message === 'Worker not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update activity status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Worker Dashboard Stats
// ------------------------
router.get('/worker/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update last active
    await WorkerService.updateLastActive(userId);
    
    // Get worker profile for basic stats
    const profile = await WorkerService.getWorkerProfile(userId);
    
    // Basic stats structure (expand as needed)
    const stats = {
      profile: {
        verified: profile.verified,
        active: profile.active,
        rating: parseFloat(profile.rating) || 0,
        experience_years: profile.experience_years,
        service_radius: profile.service_radius_km
      },
      // Placeholder for job-related stats
      jobs: {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0
      },
      earnings: {
        total: 0,
        thisMonth: 0,
        lastMonth: 0
      }
    };
    
    res.json({
      message: 'Dashboard stats retrieved successfully',
      stats
    });
    
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Worker Location
// ------------------------
router.post('/worker/location', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Latitude and longitude are required' 
      });
    }
    
    await WorkerService.logLocation(userId, latitude, longitude);
    
    res.json({
      message: 'Location updated successfully'
    });
    
  } catch (error) {
    console.error('Update location error:', error);
    
    res.status(500).json({ 
      message: 'Failed to update location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Add Provider Document
// ------------------------
router.post('/worker/documents', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentData = req.body;
    
    // Validate required fields
    if (!documentData.document_type || !documentData.document_url) {
      return res.status(400).json({ 
        message: 'Document type and URL are required' 
      });
    }
    
    const result = await WorkerService.addDocument(userId, documentData);
    
    res.status(201).json({
      message: 'Document uploaded successfully',
      document_id: result.document_id
    });
    
  } catch (error) {
    console.error('Add document error:', error);
    
    res.status(500).json({ 
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Document Status (Admin Only)
// ------------------------
router.patch('/worker/documents/:documentId/status', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const { status, remarks } = req.body;
    
    if (!documentId || isNaN(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    if (!status || !['pending_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }
    
    await WorkerService.updateDocumentStatus(parseInt(documentId), status, remarks);
    
    res.json({
      message: 'Document status updated successfully'
    });
    
  } catch (error) {
    console.error('Update document status error:', error);
    
    if (error.message === 'Document not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update document status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Add Banking Details
// ------------------------
router.post('/worker/banking', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bankingData = req.body;
    
    // Validate required fields
    const requiredFields = ['account_holder_name', 'account_number', 'ifsc_code', 'bank_name'];
    const missingFields = requiredFields.filter(field => !bankingData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required banking fields',
        missingFields
      });
    }
    
    const result = await WorkerService.addBankingDetails(userId, bankingData);
    
    res.status(201).json({
      message: 'Banking details added successfully',
      banking_id: result.banking_id
    });
    
  } catch (error) {
    console.error('Add banking details error:', error);
    
    res.status(500).json({ 
      message: 'Failed to add banking details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Services
// ------------------------
router.get('/worker/services', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Services retrieved successfully',
      services: profile.services || []
    });
    
  } catch (error) {
    console.error('Get services error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve services',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Qualifications
// ------------------------
router.get('/worker/qualifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Qualifications retrieved successfully',
      qualifications: profile.qualifications || []
    });
    
  } catch (error) {
    console.error('Get qualifications error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve qualifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Documents
// ------------------------
router.get('/worker/documents', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Documents retrieved successfully',
      documents: profile.documents || []
    });
    
  } catch (error) {
    console.error('Get documents error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve documents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Banking Details
// ------------------------
router.get('/worker/banking', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Banking details retrieved successfully',
      banking_details: profile.banking_details || []
    });
    
  } catch (error) {
    console.error('Get banking details error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve banking details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Vehicles
// ------------------------
router.get('/worker/vehicles', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Vehicles retrieved successfully',
      vehicles: profile.vehicles || []
    });
    
  } catch (error) {
    console.error('Get vehicles error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve vehicles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Driver Info
// ------------------------
router.get('/worker/driver-info', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Driver information retrieved successfully',
      driver_info: profile.driver_info || null
    });
    
  } catch (error) {
    console.error('Get driver info error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve driver information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Settings
// ------------------------
router.get('/worker/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await WorkerService.getWorkerProfile(userId);
    
    res.json({
      message: 'Settings retrieved successfully',
      settings: profile.settings || null
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Provider Settings
// ------------------------
router.put('/worker/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    const allowedFields = [
      'notify_on_job_alerts', 'notify_on_messages', 'notify_on_payments',
      'notify_by_sms', 'notify_by_push', 'auto_accept_jobs', 'max_jobs_per_day',
      'allow_weekend_work', 'allow_holiday_work', 'profile_visibility', 'display_rating',
      'allow_direct_contact', 'location_sharing_mode', 'preferred_language',
      'preferred_currency', 'distance_unit', 'time_format'
    ];
    
    const filteredData = {};
    Object.keys(settingsData).forEach(key => {
      if (allowedFields.includes(key) && settingsData[key] !== undefined) {
        filteredData[key] = settingsData[key];
      }
    });
    
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ 
        message: 'No valid settings to update',
        allowedFields
      });
    }
    
    const updatedProfile = await WorkerService.updateWorkerProfile(userId, { settings: filteredData });
    
    res.json({
      message: 'Settings updated successfully',
      settings: updatedProfile.settings
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    
    res.status(500).json({ 
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;