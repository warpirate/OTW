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

      const { first_name, last_name, email, phone, password, provider_data, subcategory_ids = [] } = userData;
      const name = `${first_name} ${last_name}`;
      console.log('Worker registration attempt:', { email, first_name, last_name, hasProviderData: !!provider_data });
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

      // Insert into providers table and capture newly created provider_id
      const [providerResult] = await connection.query(
        `INSERT INTO providers (
          user_id, experience_years, bio, service_radius_km, 
          location_lat, location_lng, verified, active, rating,
          created_at, updated_at, alternate_email,
          alternate_phone_number, emergency_contact_name, 
          emergency_contact_relationship, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?)`,
        [
          userId,
          provider_data.experience_years,
          provider_data.bio,
          provider_data.service_radius_km,
          provider_data.location_lat,
          provider_data.location_lng,
          provider_data.verified || false,
          provider_data.active || true,
          provider_data.rating || 0,
          provider_data.alternate_email,
          provider_data.alternate_phone_number,
          provider_data.emergency_contact_name,
          provider_data.emergency_contact_relationship,
          provider_data.emergency_contact_phone
        ]
      );
      
      const providerId = providerResult.insertId;
      
      // Insert permanent address
      await connection.query(
        `INSERT INTO provider_addresses (
          provider_id, address_type, street_address, city, 
          state, zip_code, created_at, updated_at
        ) VALUES (?, 'permanent', ?, ?, ?, ?, NOW(), NOW())`,
        [
          providerId,
          provider_data.permanent_address.street,
          provider_data.permanent_address.city,
          provider_data.permanent_address.state,
          provider_data.permanent_address.zip
        ]
      );

      // Map any provided subcategoryIds (either array of numbers or objects) and filter invalid entries
      const cleanSubcategoryIds = Array.isArray(subcategory_ids)
        ? subcategory_ids.map(sc => {
            if (typeof sc === 'number') return sc;
            if (typeof sc === 'string') return parseInt(sc, 10);
            if (sc && typeof sc === 'object') return sc.subcategoryId || sc.id;
            return null;
          }).filter(id => id && !isNaN(id))
        : [];

      if (cleanSubcategoryIds.length) {
        const values = cleanSubcategoryIds.map(id => [providerId, id]);
        await connection.query(
          'INSERT INTO provider_services (provider_id, subcategory_id) VALUES ?',
          [values]
        );
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
   * Get worker profile with provider data
   */
  static async getWorkerProfile(userId) {
    const connection = await pool.getConnection();
    try {
      // Get basic provider info
      const [provider] = await connection.query(
        `SELECT p.*, 
          a.street_address, a.city, a.state, a.zip_code,
          u.name, u.email, u.phone_number
         FROM providers p
         LEFT JOIN provider_addresses a ON p.id = a.provider_id AND a.address_type = 'permanent'
         LEFT JOIN users u ON p.user_id = u.id

         WHERE p.user_id = ?`,
        [userId]
      );
      
      if (!provider.length) return null;
      
      // Get provider services/subcategories
      const [subcategories] = await connection.query(
        `SELECT s.id, s.name, s.description, s.base_price
         FROM provider_services ps
         JOIN subcategories s ON ps.subcategory_id = s.id
         WHERE ps.provider_id = ?`,
        [provider[0].id]
      );
      
      return {
        ...provider[0],
        subcategories
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Update worker profile
   */
  static async updateWorkerProfile(userId, updateData) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update provider basic info
      await connection.query(
        `UPDATE providers p JOIN users u ON p.user_id = u.id SET 
          p.experience_years = ?, p.bio = ?, p.service_radius_km = ?,
          u.phone_number = ?, p.updated_at = NOW()
         WHERE p.user_id = ?`,
        [
          updateData.experience_years,
          updateData.bio,
          updateData.service_radius_km,
          updateData.phone_number,
          userId
        ]
      );
      
      // Update address if provided
      if (updateData.street_address) {
        await connection.query(
          `UPDATE provider_addresses pa JOIN providers p ON pa.provider_id = p.id SET
            pa.street_address = ?, pa.city = ?, pa.state = ?, pa.zip_code = ?, pa.updated_at = NOW()
           WHERE p.user_id = ? AND pa.address_type = 'permanent'`,
          [
            updateData.street_address,
            updateData.city,
            updateData.state,
            updateData.zip_code,
            userId
          ]
        );
      }
      
      await connection.commit();
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
        'UPDATE providers p JOIN users u ON p.user_id = u.id SET p.last_active_at = NOW() WHERE u.id = ?',
        [userId]
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
          p.created_at as provider_created, p.updated_at
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
}

const verifyToken = require('../middlewares/verify_token');
const authorizeRole = require('../middlewares/authorizeRole');

/**
 * Worker Registration Route
 */
router.post('/worker/register', async (req, res) => {
  const { first_name, last_name, email, phone, password, provider_data, subcategory_ids = [] } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !email || !password || !provider_data) {
    return res.status(400).json({
      message: 'Missing required fields',
      required: ['first_name', 'last_name', 'email', 'password', 'provider_data', 'subcategory_ids']
    });
  }

  // Validate provider data
  const requiredProviderFields = ['experience_years', 'bio', 'service_radius_km', 'location_lat', 'location_lng'];
  const missingProviderFields = requiredProviderFields.filter(field =>
    provider_data[field] === undefined || provider_data[field] === null
  );

  if (missingProviderFields.length > 0) {
    return res.status(400).json({
      message: 'Missing required provider fields',
      missingFields: missingProviderFields
    });
  }

  // Validate subcategory IDs
  if (!Array.isArray(subcategory_ids) || subcategory_ids.length === 0) {
    return res.status(400).json({
      message: 'At least one service subcategory is required',
      missingFields: ['subcategory_ids']
    });
  }

  try {
    const result = await WorkerService.registerWorker({
      first_name,
      last_name,
      email,
      phone,
      password,
      provider_data,
      subcategory_ids
    });   

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
      'service_radius_km', 'active'
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
// Get worker settings
router.get('/worker/settings', verifyToken, async (req, res) => {
  try {
    const [settings] = await pool.query(
      `SELECT * FROM provider_settings 
       WHERE provider_id = (SELECT id FROM providers WHERE user_id = ?)`,
      [req.user.id]
    );
    
    if (settings.length === 0) {
      // Return default settings if none exist
      return res.json({
        notify_on_job_alerts: true,
        notify_on_messages: true,
        notify_on_payments: true,
        notify_by_sms: false,
        notify_by_push: true,
        notify_by_email: false,
        auto_accept_jobs: false,
        max_jobs_per_day: 5,
        allow_weekend_work: true,
        allow_holiday_work: false,
        profile_visibility: 'public',
        display_rating: true,
        allow_direct_contact: true,
        location_sharing_mode: 'on_job',
        preferred_language: 'en',
        preferred_currency: 'INR',
        distance_unit: 'km',
        time_format: '24h',
        working_hours_start: '09:00',
        working_hours_end: '18:00'
      });
    }
    
    res.json(settings[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update worker settings
router.put('/worker/settings', verifyToken, async (req, res) => {
  const {
    notify_on_job_alerts,
    notify_on_messages,
    notify_on_payments,
    notify_by_sms,
    notify_by_push,
    auto_accept_jobs,
    max_jobs_per_day,
    allow_weekend_work,
    allow_holiday_work,
    profile_visibility,
    display_rating,
    allow_direct_contact,
    location_sharing_mode,
    preferred_language,
    preferred_currency,
    distance_unit,
    time_format
  , working_hours_start,
  working_hours_end
  } = req.body;
  
  try {
    // Check if settings exist
    const [existing] = await pool.query(
      `SELECT id FROM provider_settings 
       WHERE provider_id = (SELECT id FROM providers WHERE user_id = ?)`,
      [req.user.id]
    );
    
    if (existing.length > 0) {
      // Update existing settings
      await pool.query(
        `UPDATE provider_settings SET
          notify_on_job_alerts = ?,
          notify_on_messages = ?,
          notify_on_payments = ?,
          notify_by_sms = ?,
          notify_by_push = ?,
          auto_accept_jobs = ?,
          max_jobs_per_day = ?,
          allow_weekend_work = ?,
          allow_holiday_work = ?,
          profile_visibility = ?,
          display_rating = ?,
          allow_direct_contact = ?,
          location_sharing_mode = ?,
          preferred_language = ?,
          preferred_currency = ?,
          distance_unit = ?,
          time_format = ?,
          working_hours_start = ?,
          working_hours_end = ?,
          updated_at = NOW()
        WHERE provider_id = (SELECT id FROM providers WHERE user_id = ?)`,
        [
          notify_on_job_alerts,
          notify_on_messages,
          notify_on_payments,
          notify_by_sms,
          notify_by_push,
          auto_accept_jobs,
          max_jobs_per_day,
          allow_weekend_work,
          allow_holiday_work,
          profile_visibility,
          display_rating,
          allow_direct_contact,
          location_sharing_mode,
          preferred_language,
          preferred_currency,
          distance_unit,
          time_format,
          working_hours_start,
          working_hours_end,
          req.user.id
        ]
      );
    } else {
      // Create new settings
      await pool.query(
        `INSERT INTO provider_settings (
          provider_id, notify_on_job_alerts, notify_on_messages, notify_on_payments,
          notify_by_sms, notify_by_push, auto_accept_jobs, max_jobs_per_day,
          allow_weekend_work, allow_holiday_work, profile_visibility, display_rating,
          allow_direct_contact, location_sharing_mode, preferred_language,
          preferred_currency, distance_unit, time_format, working_hours_start, working_hours_end, created_at, updated_at
        ) VALUES (
          (SELECT id FROM providers WHERE user_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )`,
        [
          req.user.id,
          notify_on_job_alerts,
          notify_on_messages,
          notify_on_payments,
          notify_by_sms,
          notify_by_push,
          auto_accept_jobs,
          max_jobs_per_day,
          allow_weekend_work,
          allow_holiday_work,
          profile_visibility,
          display_rating,
          allow_direct_contact,
          location_sharing_mode,
          preferred_language,
          preferred_currency,
          distance_unit,
          time_format,
          working_hours_start,
          working_hours_end
        ]
      );
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// // ------------------------
// // Get All Workers (Admin Only)
// // ------------------------
// router.get('/worker/all', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const filters = {};
    
//     // Parse filters from query params
//     if (req.query.verified !== undefined) {
//       filters.verified = req.query.verified === 'true';
//     }
    
//     if (req.query.active !== undefined) {
//       filters.active = req.query.active === 'true';
//     }
    
//     if (req.query.location) {
//       filters.location = true;
//     }
    
//     console.log('Admin fetching workers:', { page, limit, filters });
    
//     const result = await WorkerService.getAllWorkers(page, limit, filters);
    
//     res.json({
//       message: 'Workers retrieved successfully',
//       ...result
//     });
    
//   } catch (error) {
//     console.error('Get all workers error:', error);
    
//     res.status(500).json({ 
//       message: 'Failed to retrieve workers',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

// // ------------------------
// // Get Specific Worker (Admin Only)
// // ------------------------
// router.get('/worker/:workerId', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
//   try {
//     const workerId = req.params.workerId;
    
//     if (!workerId || isNaN(workerId)) {
//       return res.status(400).json({ message: 'Invalid worker ID' });
//     }
    
//     const profile = await WorkerService.getWorkerProfile(parseInt(workerId));
    
//     res.json({
//       message: 'Worker profile retrieved successfully',
//       profile
//     });
    
//   } catch (error) {
//     console.error('Get worker by ID error:', error);
    
//     if (error.message === 'Worker not found') {
//       return res.status(404).json({ message: error.message });
//     }
    
//     res.status(500).json({ 
//       message: 'Failed to retrieve worker profile',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

// // ------------------------
// // Update Worker Verification Status (Admin Only)
// // ------------------------
// router.patch('/worker/:workerId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
//   try {
//     const workerId = req.params.workerId;
//     const { verified } = req.body;
    
//     if (!workerId || isNaN(workerId)) {
//       return res.status(400).json({ message: 'Invalid worker ID' });
//     }
    
//     if (typeof verified !== 'boolean') {
//       return res.status(400).json({ message: 'Verified status must be a boolean' });
//     }
    
//     console.log('Admin updating worker verification:', { 
//       workerId, 
//       verified, 
//       adminId: req.user.id 
//     });
    
//     const updatedProfile = await WorkerService.updateVerificationStatus(parseInt(workerId), verified);
    
//     res.json({
//       message: `Worker ${verified ? 'verified' : 'unverified'} successfully`,
//       profile: updatedProfile
//     });
    
//   } catch (error) {
//     console.error('Update verification status error:', error);
    
//     if (error.message === 'Worker not found') {
//       return res.status(404).json({ message: error.message });
//     }
    
//     res.status(500).json({ 
//       message: 'Failed to update verification status',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

// // ------------------------
// // Update Worker Activity Status (Admin Only)
// // ------------------------
// router.patch('/worker/:workerId/activity', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
//   try {
//     const workerId = req.params.workerId;
//     const { active } = req.body;
    
//     if (!workerId || isNaN(workerId)) {
//       return res.status(400).json({ message: 'Invalid worker ID' });
//     }
    
//     if (typeof active !== 'boolean') {
//       return res.status(400).json({ message: 'Active status must be a boolean' });
//     }
    
//     console.log('Admin updating worker activity:', { 
//       workerId, 
//       active, 
//       adminId: req.user.id 
//     });
    
//     const updatedProfile = await WorkerService.updateWorkerProfile(parseInt(workerId), { active });
    
//     res.json({
//       message: `Worker ${active ? 'activated' : 'deactivated'} successfully`,
//       profile: updatedProfile
//     });
    
//   } catch (error) {
//     console.error('Update activity status error:', error);
    
//     if (error.message === 'Worker not found') {
//       return res.status(404).json({ message: error.message });
//     }
    
//     res.status(500).json({ 
//       message: 'Failed to update activity status',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

// // ------------------------
// // Worker Dashboard Stats
// // ------------------------
// router.get('/worker/dashboard/stats', verifyToken, async (req, res) => {
//   try {
//     const userId = req.user.id;
    
//     // Update last active
//     await WorkerService.updateLastActive(userId);
    
//     // Get worker profile for basic stats
//     const profile = await WorkerService.getWorkerProfile(userId);
    
//     // Basic stats structure (expand as needed)
//     const stats = {
//       profile: {
//         verified: profile.verified,
//         active: profile.active,
//         rating: parseFloat(profile.rating) || 0,
//         experience_years: profile.experience_years,
//         service_radius: profile.service_radius_km
//       },
//       // Placeholder for job-related stats
//       jobs: {
//         total: 0,
//         completed: 0,
//         pending: 0,
//         cancelled: 0
//       },
//       earnings: {
//         total: 0,
//         thisMonth: 0,
//         lastMonth: 0
//       }
//     };
    
//     res.json({
//       message: 'Dashboard stats retrieved successfully',
//       stats
//     });
    
//   } catch (error) {
//     console.error('Get dashboard stats error:', error);
    
//     res.status(500).json({ 
//       message: 'Failed to retrieve dashboard stats',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

module.exports = router;