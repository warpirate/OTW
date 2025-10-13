const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const { generateOTP, sendOTPEmail } = require('../../services/emailService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

// AWS S3 setup for profile pictures
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME;
const s3 = new AWS.S3({ region: S3_REGION });

// Helper to create a safe S3 key filename
const sanitizeFileName = (name) => {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200);
};

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
      
      // Get worker role ID first (check for various possible worker role names)
      const [roleResult] = await connection.query(
        'SELECT id, name FROM roles WHERE LOWER(name) IN (?, ?, ?) LIMIT 1',
        ['worker', 'provider', 'service provider']
      );

      if (roleResult.length === 0) {
        throw new Error('Worker role not found in system');
      }

      const roleId = roleResult[0].id;
      
      // Check if email + role combination already exists
      const [existingUserRole] = await connection.query(
        `SELECT u.id FROM users u 
         INNER JOIN user_roles ur ON u.id = ur.user_id 
         WHERE u.email = ? AND ur.role_id = ? LIMIT 1`,
        [email, roleId]
      );

      if (existingUserRole.length > 0) {
        throw new Error('Email already registered for this role');
      }

      // Check if user exists with different role
      const [existingUser] = await connection.query(
        'SELECT id, password FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      let userId;
      
      if (existingUser.length > 0) {
        // User exists with different role, use existing user
        userId = existingUser[0].id;
        console.log('User exists with different role, adding worker role to existing user:', userId);
      } else {
        // New user, create user record
        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await connection.query(
          `INSERT INTO users (name, email, password, phone_number, is_active, created_at) 
           VALUES (?, ?, ?, ?, 1, NOW())`,
          [name, email, hashedPassword, phone]
        );

        userId = userResult.insertId;
        console.log('Created new user:', userId);
      }

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
    console.log('Update Data:', updateData);

    await connection.beginTransaction();
    
    try {
      // Update provider basic info
      await connection.query(
        `UPDATE providers p JOIN users u ON p.user_id = u.id SET 
          p.experience_years = ?, p.bio = ?, p.service_radius_km = ?,
          p.active = ?, u.phone_number = ?, p.updated_at = NOW()
         WHERE p.user_id = ?`,
        [
          updateData.experience_years,
          updateData.bio,
          updateData.service_radius_km,
          updateData.active,
          updateData.phone_number,
          userId
        ]
      );
      
      // Update address if provided
      if (updateData.street_address) {
        await connection.query(
          `UPDATE provider_addresses pa JOIN providers p ON pa.provider_id = p.id SET
            pa.street_address = ?, pa.city = ?, pa.state = ?, pa.zip_code = ?, pa.updated_at = NOW()
           WHERE p.user_id = ?`,
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
   * Get dashboard stats for worker
   */
  // static async getDashboardStats(userId) {
  //   try {
  //     // Get provider ID
  //     const [providerResult] = await pool.query(
  //       'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
  //       [userId]
  //     );

  //     if (providerResult.length === 0) {
  //       throw new Error('Provider not found');
  //     }

  //     const providerId = providerResult[0].id;

  //     // Get total bookings count
  //     const [totalBookingsResult] = await pool.query(
  //       'SELECT COUNT(*) as count FROM bookings WHERE provider_id = ?',
  //       [providerId]
  //     );

  //     // Get completed bookings count
  //     const [completedBookingsResult] = await pool.query(
  //       "SELECT COUNT(*) as count FROM bookings WHERE provider_id = ? AND service_status = 'completed'",
  //       [providerId]
  //     );

  //     // Get pending bookings count
  //     const [pendingBookingsResult] = await pool.query(
  //       "SELECT COUNT(*) as count FROM bookings WHERE provider_id = ? AND service_status IN ('assigned', 'accepted', 'in_progress')",
  //       [providerId]
  //     );

  //     // Get total earnings (sum of completed booking prices)
  //     const [earningsResult] = await pool.query(
  //       "SELECT COALESCE(SUM(CASE WHEN booking_type = 'ride' THEN estimated_cost ELSE price END), 0) as total FROM bookings WHERE provider_id = ? AND service_status = 'completed'",
  //       [providerId]
  //     );

  //     // Get average rating
  //     const [ratingResult] = await pool.query(
  //       'SELECT rating FROM providers WHERE id = ?',
  //       [providerId]
  //     );

  //     // Get total reviews count
  //     const [reviewsResult] = await pool.query(
  //       'SELECT COUNT(*) as count FROM provider_reviews WHERE provider_id = ?',
  //       [providerId]
  //     );

  //     return {
  //       total_bookings: totalBookingsResult[0].count,
  //       completed_bookings: completedBookingsResult[0].count,
  //       pending_bookings: pendingBookingsResult[0].count,
  //       total_earnings: parseFloat(earningsResult[0].total),
  //       average_rating: ratingResult[0] ? parseFloat(ratingResult[0].rating) : 0,
  //       total_reviews: reviewsResult[0].count
  //     };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

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

    if (error.message === 'Email already registered for this role') {
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
      'service_radius_km', 'active',
      'street_address', 'city', 'state', 'zip_code',
      'alternate_email', 'alternate_phone_number',
      'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone'
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
    notify_by_email,
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
          notify_on_job_alerts = ?, notify_on_messages = ?, notify_on_payments = ?,
          notify_by_sms = ?, notify_by_push = ?, notify_by_email = ?,
          auto_accept_jobs = ?, max_jobs_per_day = ?,
          allow_weekend_work = ?, allow_holiday_work = ?,
          profile_visibility = ?, display_rating = ?,
          allow_direct_contact = ?, location_sharing_mode = ?,
          preferred_language = ?, preferred_currency = ?,
          distance_unit = ?, time_format = ?,
          working_hours_start = ?, working_hours_end = ?,
          updated_at = NOW()
         WHERE provider_id = (SELECT id FROM providers WHERE user_id = ?)`,
        [
          notify_on_job_alerts, notify_on_messages, notify_on_payments,
          notify_by_sms, notify_by_push, notify_by_email,
          auto_accept_jobs, max_jobs_per_day,
          allow_weekend_work, allow_holiday_work,
          profile_visibility, display_rating,
          allow_direct_contact, location_sharing_mode,
          preferred_language, preferred_currency,
          distance_unit, time_format,
          working_hours_start, working_hours_end,
          req.user.id
        ]
      );
    } else {
      // Insert new settings
      await pool.query(
        `INSERT INTO provider_settings (
          provider_id, notify_on_job_alerts, notify_on_messages, notify_on_payments,
          notify_by_sms, notify_by_push, notify_by_email,
          auto_accept_jobs, max_jobs_per_day,
          allow_weekend_work, allow_holiday_work,
          profile_visibility, display_rating,
          allow_direct_contact, location_sharing_mode,
          preferred_language, preferred_currency,
          distance_unit, time_format,
          working_hours_start, working_hours_end
        ) VALUES (
          (SELECT id FROM providers WHERE user_id = ?),
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?
        )`,
        [
          req.user.id,
          notify_on_job_alerts, notify_on_messages, notify_on_payments,
          notify_by_sms, notify_by_push, notify_by_email,
          auto_accept_jobs, max_jobs_per_day,
          allow_weekend_work, allow_holiday_work,
          profile_visibility, display_rating,
          allow_direct_contact, location_sharing_mode,
          preferred_language, preferred_currency,
          distance_unit, time_format,
          working_hours_start, working_hours_end
        ]
      );
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
 
/**
 * Get booking requests for worker
 */
router.get('/worker/booking-requests', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20, cursor, mode } = req.query;
    
    console.log('Worker fetching booking requests:', { 
      userId, 
      status, 
      page, 
      limit,
      cursor,
      mode
    });

    // Get provider_id for this worker
    const [providerResult] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (providerResult.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providerResult[0].id;

    // Determine if we should use cursor-based pagination
    const useCursor = typeof cursor !== 'undefined' || (mode && mode === 'cursor');

    if (useCursor) {
      // Cursor-based pagination using br.id for keyset
      let query = `
        SELECT 
          br.id AS request_id,
          br.booking_id,
          br.status,
          br.requested_at,
          br.responded_at,
          b.user_id,
          b.booking_type,
          rb.with_vehicle,
          rb.pickup_address,
          rb.pickup_lat,
          rb.pickup_lon,
          rb.drop_address,
          rb.drop_lat,
          rb.drop_lon,
          COALESCE(sb.address, ca.address, b.address) AS service_address,
          COALESCE(NULLIF(ca.location_lat, 0), NULLIF(cust.location_lat, 0)) AS service_lat,
          COALESCE(NULLIF(ca.location_lng, 0), NULLIF(cust.location_lng, 0)) AS service_lng,
          COALESCE(ca.address, cust.address, sb.address, b.address) AS customer_address,
          COALESCE(NULLIF(ca.location_lat, 0), NULLIF(cust.location_lat, 0)) AS customer_latitude,
          COALESCE(NULLIF(ca.location_lng, 0), NULLIF(cust.location_lng, 0)) AS customer_longitude,
          b.actual_cost,
          b.price,
          b.estimated_cost,
          b.service_status,
          b.payment_status,
          b.created_at AS booking_created_at,
          b.scheduled_time,
          b.duration,
          b.cost_type,
          b.subcategory_id,
          r.rating AS ride_rating,
          r.review AS ride_review,
          r.created_at AS ride_rating_submitted_at,
          u.name AS customer_name,
          u.phone_number AS customer_phone,
          s.name AS service_name,
          s.description AS service_description,
          sc.name AS category_name
        FROM booking_requests br
        INNER JOIN bookings b ON br.booking_id = b.id
        INNER JOIN users u ON b.user_id = u.id
        LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
        LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
        LEFT JOIN customer_addresses ca ON ca.customer_id = b.user_id AND ca.is_active = 1 AND ca.is_default = 1
        LEFT JOIN customers cust ON cust.id = b.user_id
        LEFT JOIN subcategories s ON b.subcategory_id = s.id
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        LEFT JOIN ratings r ON b.id = r.booking_id
        WHERE br.provider_id = ?
      `;

      const params = [providerId];

      // Exclude cancelled bookings from general lists
      query += " AND b.service_status != 'cancelled'";
      
      // Filter by specific status if provided
      if (status && status !== 'all') {
        if (status === 'completed') {
          // For completed, we need accepted booking_requests with completed service_status
          query += ' AND br.status = ? AND b.service_status = ?';
          params.push('accepted', 'completed');
        } else if (status === 'accepted') {
          // For accepted, exclude completed service_status to prevent duplicates
          query += ' AND br.status = ? AND b.service_status != ?';
          params.push('accepted', 'completed');
        } else if (status === 'pending') {
          // For pending requests, exclude expired bookings (scheduled time has passed)
          query += ' AND br.status = ? AND b.scheduled_time > NOW()';
          params.push('pending');
        } else {
          // For other statuses, filter by booking_request status
          query += ' AND br.status = ?';
          params.push(status);
        }
      } else {
        // When no specific status is provided, exclude expired pending requests
        query += ' AND (br.status != ? OR (br.status = ? AND b.scheduled_time > NOW()))';
        params.push('pending', 'pending');
      }

      if (cursor) {
        query += ' AND br.id < ?';
        params.push(parseInt(cursor));
      }

      query += ' ORDER BY br.id DESC LIMIT ?';
      params.push(parseInt(limit));

      const [bookingRequests] = await pool.query(query, params);

      const hasMore = bookingRequests.length === parseInt(limit);
      const nextCursor = hasMore ? bookingRequests[bookingRequests.length - 1].request_id : null;

      return res.json({
        message: 'Booking requests retrieved successfully',
        booking_requests: bookingRequests,
        pagination: {
          limit: parseInt(limit),
          nextCursor,
          hasMore
        }
      });
    } else {
      // Legacy offset-based pagination
      let query = `
        SELECT 
          br.id AS request_id,
          br.booking_id,
          br.status,
          br.requested_at,
          br.responded_at,
          b.user_id,
          b.booking_type,
          rb.with_vehicle,
          rb.pickup_address,
          rb.pickup_lat,
          rb.pickup_lon,
          rb.drop_address,
          rb.drop_lat,
          rb.drop_lon,
          COALESCE(sb.address, ca.address, b.address) AS service_address,
          COALESCE(ca.location_lat, cust.location_lat) AS service_lat,
          COALESCE(ca.location_lng, cust.location_lng) AS service_lng,
          COALESCE(ca.address, cust.address, sb.address, b.address) AS customer_address,
          COALESCE(ca.location_lat, cust.location_lat) AS customer_latitude,
          COALESCE(ca.location_lng, cust.location_lng) AS customer_longitude,
          b.actual_cost,
          b.price,
          b.estimated_cost,
          b.service_status,
          b.payment_status,
          b.created_at AS booking_created_at,
          b.scheduled_time,
          b.duration,
          b.cost_type,
          b.subcategory_id,
          r.rating AS ride_rating,
          r.review AS ride_review,
          r.created_at AS ride_rating_submitted_at,
          u.name AS customer_name,
          u.phone_number AS customer_phone,
          s.name AS service_name,
          s.description AS service_description,
          sc.name AS category_name
        FROM booking_requests br
        INNER JOIN bookings b ON br.booking_id = b.id
        INNER JOIN users u ON b.user_id = u.id
        LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
        LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
        LEFT JOIN customer_addresses ca ON ca.customer_id = b.user_id AND ca.is_default = 1
        LEFT JOIN customers cust ON cust.id = b.user_id
        LEFT JOIN subcategories s ON b.subcategory_id = s.id
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        LEFT JOIN ratings r ON b.id = r.booking_id
        WHERE br.provider_id = ?
      `;

      const queryParams = [providerId];

      // Exclude cancelled bookings from general lists
      query += " AND b.service_status != 'cancelled'";
      
      // Filter by specific status if provided
      if (status && status !== 'all') {
        if (status === 'completed') {
          // For completed, we need accepted booking_requests with completed service_status
          query += ' AND br.status = ? AND b.service_status = ?';
          queryParams.push('accepted', 'completed');
        } else if (status === 'accepted') {
          // For accepted, exclude completed service_status to prevent duplicates
          query += ' AND br.status = ? AND b.service_status != ?';
          queryParams.push('accepted', 'completed');
        } else if (status === 'pending') {
          // For pending requests, exclude expired bookings (scheduled time has passed)
          query += ' AND br.status = ? AND b.scheduled_time > NOW()';
          queryParams.push('pending');
        } else {
          // For other statuses, filter by booking_request status
          query += ' AND br.status = ?';
          queryParams.push(status);
        }
      } else {
        // When no specific status is provided, exclude expired pending requests
        query += ' AND (br.status != ? OR (br.status = ? AND b.scheduled_time > NOW()))';
        queryParams.push('pending', 'pending');
      }

      query += ' ORDER BY br.requested_at DESC LIMIT ? OFFSET ?';
      queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      // Get booking requests
      const [bookingRequests] = await pool.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM booking_requests br
        INNER JOIN bookings b ON br.booking_id = b.id
        WHERE br.provider_id = ?
      `;
      const countParams = [providerId];

      // Exclude cancelled bookings from general lists
      countQuery += " AND b.service_status != 'cancelled'";
      
      // Apply status filter if provided
      if (status && status !== 'all') {
        if (status === 'completed') {
          // For completed, we need accepted booking_requests with completed service_status
          countQuery += ' AND br.status = ? AND b.service_status = ?';
          countParams.push('accepted', 'completed');
        } else if (status === 'accepted') {
          // For accepted, exclude completed service_status to prevent duplicates
          countQuery += ' AND br.status = ? AND b.service_status != ?';
          countParams.push('accepted', 'completed');
        } else if (status === 'pending') {
          // For pending requests, exclude expired bookings (scheduled time has passed)
          countQuery += ' AND br.status = ? AND b.scheduled_time > NOW()';
          countParams.push('pending');
        } else {
          // For other statuses, filter by booking_request status
          countQuery += ' AND br.status = ?';
          countParams.push(status);
        }
      } else {
        // When no specific status is provided, exclude expired pending requests
        countQuery += ' AND (br.status != ? OR (br.status = ? AND b.scheduled_time > NOW()))';
        countParams.push('pending', 'pending');
      }

      const [countResult] = await pool.query(countQuery, countParams);
      const total = countResult[0].total;

      return res.json({
        message: 'Booking requests retrieved successfully',
        booking_requests: bookingRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

  } catch (error) {
    console.error('Get booking requests error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve booking requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Counts endpoint for booking requests per status
router.get('/worker/booking-requests/counts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get provider_id for this worker
    const [providerResult] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (providerResult.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providerResult[0].id;

    const baseJoin = `
      FROM booking_requests br
      INNER JOIN bookings b ON br.booking_id = b.id
      WHERE br.provider_id = ?
    `;

    // All (non-cancelled bookings, excluding expired pending)
    const [allRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND (br.status != 'pending' OR (br.status = 'pending' AND b.scheduled_time > NOW()))`,
      [providerId]
    );
    // Pending (non-cancelled, non-expired bookings)
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND br.status = 'pending' AND b.scheduled_time > NOW()`,
      [providerId]
    );
    // Accepted (non-cancelled bookings that are not completed)
    const [acceptedRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND br.status = 'accepted' AND b.service_status != 'completed'`,
      [providerId]
    );
    // Completed (accepted bookings that are completed)
    const [completedRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND br.status = 'accepted' AND b.service_status = 'completed'`,
      [providerId]
    );
    // Rejected (from booking_requests)
    const [rejectedRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND br.status = 'rejected'`,
      [providerId]
    );

    res.json({
      all: allRows[0]?.total || 0,
      pending: pendingRows[0]?.total || 0,
      accepted: acceptedRows[0]?.total || 0,
      completed: completedRows[0]?.total || 0,
      rejected: rejectedRows[0]?.total || 0
    });
  } catch (error) {
    console.error('Get booking request counts error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve booking request counts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
/**
 * Update booking request status (accept only)
 */
router.put('/worker/booking-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    const { status, reason } = req.body;
    
    console.log('Worker updating booking request:', { 
      userId, 
      requestId, 
      status, 
      reason 
    });

    // Allow accepted (from pending) and rejected (cancel accepted) transitions
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Allowed values: "accepted", "rejected"' });
    }

    // Get provider_id for this worker
    const [providerResult] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (providerResult.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providerResult[0].id;

    // Get the booking request
    const [requestResult] = await pool.query(
      'SELECT * FROM booking_requests WHERE id = ? AND provider_id = ? LIMIT 1',
      [requestId, providerId]
    );

    if (requestResult.length === 0) {
      return res.status(404).json({ message: 'Booking request not found' });
    }

    const bookingRequest = requestResult[0];


    const bookingId = bookingRequest.booking_id;

    if (status === 'accepted') {
      // Accept flow: only if currently pending
      if (bookingRequest.status !== 'pending') {
        return res.status(400).json({ message: 'Booking request has already been processed' });
      }

      // Update the booking request to accepted
      await pool.query(
        'UPDATE booking_requests SET status = ?, responded_at = NOW() WHERE id = ?',
        ['accepted', requestId]
      );

      // Update the main booking to 'assigned' status
      await pool.query(
        'UPDATE bookings SET provider_id = ?, service_status = ? WHERE id = ?',
        [providerId, 'assigned', bookingId]
      );

      // Reject other pending requests for the same booking
      await pool.query(
        'UPDATE booking_requests SET status = ?, responded_at = NOW() WHERE booking_id = ? AND id != ? AND status = ?',
        ['rejected', bookingId, requestId, 'pending']
      );

      // Emit Socket.IO events for real-time updates
      try {
        const io = req.app.get('io');
        if (io) {
          // Notify accepted provider
          io.to(`provider:${providerId}`).emit('booking_requests:updated', {
            request_id: parseInt(requestId),
            booking_id: bookingId,
            status: 'accepted'
          });

          // Notify the customer that booking was assigned
          const [bookingRows] = await pool.query('SELECT user_id FROM bookings WHERE id = ? LIMIT 1', [bookingId]);
          const customerId = bookingRows?.[0]?.user_id;
          if (customerId) {
            io.to(`user:${customerId}`).emit('bookings:assigned', {
              booking_id: bookingId,
              provider_id: providerId
            });
          }

          // Notify other providers their requests were rejected
          const [otherProviders] = await pool.query(
            'SELECT provider_id FROM booking_requests WHERE booking_id = ? AND id != ?',
            [bookingId, requestId]
          );
          for (const row of otherProviders) {
            io.to(`provider:${row.provider_id}`).emit('booking_requests:updated', {
              booking_id: bookingId,
              status: 'rejected'
            });
          }
        }
      } catch (emitErr) {
        console.error('Socket emit error (accept booking request):', emitErr.message);
      }

      return res.json({
        message: 'Booking request accepted successfully',
        request_id: requestId,
        status: 'accepted'
      });
    }

    // status === 'rejected' (cancel providing service)
    // Only allow cancel if this request was previously accepted by this provider
    if (bookingRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted requests can be cancelled' });
    }

    // Mark this request as rejected
    await pool.query(
      'UPDATE booking_requests SET status = ?, responded_at = NOW() WHERE id = ?',
      ['rejected', requestId]
    );

    // Unassign the booking if currently assigned to this provider
    await pool.query(
      'UPDATE bookings SET provider_id = NULL, service_status = ? WHERE id = ? AND provider_id = ? AND service_status = ?',
      ['pending', bookingId, providerId, 'assigned']
    );

    // Re-open other providers' requests that were auto-rejected when this was accepted
    await pool.query(
      'UPDATE booking_requests SET status = ? WHERE booking_id = ? AND id != ? AND status = ?',
      ['pending', bookingId, requestId, 'rejected']
    );

    // Emit Socket.IO events
    try {
      const io = req.app.get('io');
      if (io) {
        // Notify this provider of update
        io.to(`provider:${providerId}`).emit('booking_requests:updated', {
          request_id: parseInt(requestId),
          booking_id: bookingId,
          status: 'rejected'
        });

        // Notify other providers their request is active again
        const [pendingProviders] = await pool.query(
          'SELECT provider_id FROM booking_requests WHERE booking_id = ? AND status = ? AND id != ?',
          [bookingId, 'pending', requestId]
        );

        pendingProviders.forEach(provider => {
          io.to(`provider:${provider.provider_id}`).emit('booking_requests:available', {
            booking_id: bookingId,
            message: 'Booking is available again'
          });
        });
      }
    } catch (emitErr) {
      console.error('Socket emit error (booking rejection):', emitErr.message);
    }

    res.json({
      message: 'Booking request rejected successfully',
      request_id: parseInt(requestId),
      booking_id: bookingId,
      status: 'rejected'
    });

  } catch (error) {
    console.error('Update booking request error:', error);
    res.status(500).json({ 
      message: 'Failed to update booking request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get assigned bookings for worker
 */
router.get('/worker/assigned-bookings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE b.provider_id = (SELECT id FROM providers WHERE user_id = ?) AND b.service_status != \'cancelled\'';
    let queryParams = [userId];

    if (status) {
      whereClause += ' AND b.service_status = ?';
      queryParams.push(status);
    }

    const [bookings] = await pool.query(
      `SELECT b.*, 
              b.user_id AS customer_user_id,
              COALESCE(s.name, 'Ride Service') AS service_name, 
              COALESCE(s.description, 'Driver transportation service') AS service_description,
              rb.pickup_address,
              rb.pickup_lat,
              rb.pickup_lon,
              rb.drop_address,
              rb.drop_lat,
              rb.drop_lon,
              COALESCE(sb.address, ca.address, b.address) AS service_address,
              COALESCE(ca.location_lat, cust.location_lat) AS service_lat,
              COALESCE(ca.location_lng, cust.location_lng) AS service_lng,
              COALESCE(ca.address, cust.address, sb.address, b.address) AS customer_address,
              COALESCE(ca.location_lat, cust.location_lat) AS customer_latitude,
              COALESCE(ca.location_lng, cust.location_lng) AS customer_longitude
       FROM bookings b
       LEFT JOIN service_bookings sb ON sb.booking_id = b.id
       LEFT JOIN customer_addresses ca ON ca.customer_id = b.user_id AND ca.is_default = 1
       LEFT JOIN customers cust ON cust.id = b.user_id
       LEFT JOIN subcategories s ON s.id = b.subcategory_id
       LEFT JOIN ride_bookings rb ON rb.booking_id = b.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count - exclude cancelled bookings
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b ${whereClause}`,
      queryParams
    );

    res.json({
      bookings,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get assigned bookings error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve assigned bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Recent Bookings for worker (by provider categories)
router.get('/worker/recent-bookings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    // Get provider_id for this worker
    const [providerRows] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (providerRows.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providerRows[0].id;

    // Fetch recent pending booking requests for this provider
    const perPage = Math.max(1, Math.min(50, parseInt(limit) || 5));
    const [bookings] = await pool.query(
      `SELECT 
          b.*, 
          b.user_id AS customer_user_id,
          u.name AS customer_name,
          u.phone_number AS customer_phone,
          COALESCE(s.name, 'Ride Service') AS service_name,
          COALESCE(s.description, 'Driver transportation service') AS service_description,
          CASE WHEN b.booking_type = 'ride' THEN 
            CONCAT(rb.pickup_address, ' → ', rb.drop_address)
          ELSE sb.address END AS display_address,
          CASE WHEN b.booking_type = 'ride' THEN b.estimated_cost ELSE b.price END AS display_price,
          -- Include location coordinates
          rb.pickup_address,
          rb.pickup_lat,
          rb.pickup_lon,
          rb.drop_address,
          rb.drop_lat,
          rb.drop_lon,
          sb.address AS service_address,
          COALESCE(ca.location_lat, cust.location_lat) AS service_lat,
          COALESCE(ca.location_lng, cust.location_lng) AS service_lng,
          COALESCE(ca.address, cust.address, sb.address) AS customer_address,
          COALESCE(ca.location_lat, cust.location_lat) AS customer_latitude,
          COALESCE(ca.location_lng, cust.location_lng) AS customer_longitude
       FROM booking_requests br
       JOIN bookings b ON br.booking_id = b.id
       JOIN users u ON b.user_id = u.id
       LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
       LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
       LEFT JOIN customer_addresses ca ON ca.customer_id = b.user_id AND ca.is_default = 1
       LEFT JOIN customers cust ON cust.id = b.user_id
       LEFT JOIN subcategories s ON b.subcategory_id = s.id
       WHERE br.provider_id = ?
         AND br.status = 'pending'
         AND b.service_status = 'pending'
       ORDER BY br.requested_at DESC
       LIMIT ?`,
      [providerId, perPage]
    );

    return res.json({ bookings });
  } catch (error) {
    console.error('Get recent bookings error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve recent bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Cancel assigned booking (for workers)
 */
router.put('/worker/bookings/:bookingId/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.bookingId;
    const { cancellation_reason } = req.body;

    // Get provider_id for this worker
    const [providerResult] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (providerResult.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providerResult[0].id;

    // Check if booking exists and is assigned to this provider
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND provider_id = ? AND service_status = ?',
      [bookingId, providerId, 'assigned']
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    const booking = bookings[0];

    // Check if booking can be cancelled
    if (booking.service_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (booking.service_status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed booking' });
    }

    // Check if booking is too close to scheduled time (e.g., within 2 hours) using server time
    const scheduledTime = new Date(booking.scheduled_time);
    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff > 2) {
      return res.status(400).json({ 
        message: 'Cannot cancel booking more than 2 hours before scheduled time' 
      });
    }

    // Cancel the booking
    await pool.query(
      `UPDATE bookings 
       SET service_status = 'cancelled', payment_status = 'refunded'
       WHERE id = ?`,
      [bookingId]
    );

    res.json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Dashboard Stats endpoint
router.get('/worker/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get provider_id for this worker
    const [providerResult] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (providerResult.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providerResult[0].id;

    // Get today's stats
    const [todayStats] = await pool.query(
      `SELECT 
        COUNT(*) as today_jobs,
        COALESCE(SUM(CASE WHEN b.booking_type = 'ride' THEN b.estimated_cost ELSE b.price END), 0) as today_earnings
       FROM bookings b
       WHERE b.provider_id = ? 
       AND b.service_status = 'completed'
       AND DATE(b.created_at) = CURDATE()`,
      [providerId]
    );

    // Get this week's stats
    const [weekStats] = await pool.query(
      `SELECT 
        COUNT(*) as this_week_jobs,
        COALESCE(SUM(CASE WHEN b.booking_type = 'ride' THEN b.estimated_cost ELSE b.price END), 0) as this_week_earnings
       FROM bookings b
       WHERE b.provider_id = ? 
       AND b.service_status = 'completed'
       AND YEARWEEK(b.created_at, 1) = YEARWEEK(CURDATE(), 1)`,
      [providerId]
    );

    // Get total stats
    const [totalStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_jobs,
        COALESCE(SUM(CASE WHEN b.booking_type = 'ride' THEN b.estimated_cost ELSE b.price END), 0) as total_earnings
       FROM bookings b
       WHERE b.provider_id = ? 
       AND b.service_status = 'completed'`,
      [providerId]
    );

    // Get completed jobs count
    const [completedStats] = await pool.query(
      `SELECT COUNT(*) as completed_jobs
       FROM bookings b
       WHERE b.provider_id = ? 
       AND b.service_status = 'completed'`,
      [providerId]
    );

    // Get rating and reviews count (from actual bookings)
    const [ratingResult] = await pool.query(
      `SELECT 
        COALESCE(AVG(r.rating), 0) AS average_rating,
        COUNT(r.id) AS rating_count
       FROM ratings r
       INNER JOIN bookings b ON b.id = r.booking_id
       WHERE r.ratee_type = 'provider'
         AND r.ratee_id = ?
         AND b.service_status = 'completed'`,
      [providerId]
    );

    // Get active jobs count
    const [activeJobsResult] = await pool.query(
      `SELECT COUNT(*) as active_jobs
       FROM bookings b
       WHERE b.provider_id = ? 
       AND b.service_status IN ('assigned', 'in_progress', 'pending')`,
      [providerId]
    );

    const stats = {
      today_earnings: parseFloat(todayStats[0].today_earnings || 0),
      today_jobs: parseInt(todayStats[0].today_jobs || 0),
      this_week_earnings: parseFloat(weekStats[0].this_week_earnings || 0),
      this_week_jobs: parseInt(weekStats[0].this_week_jobs || 0),
      total_earnings: parseFloat(totalStats[0].total_earnings || 0),
      total_jobs: parseInt(totalStats[0].total_jobs || 0),
      completed_jobs: parseInt(completedStats[0].completed_jobs || 0),
      rating: parseFloat(ratingResult[0]?.average_rating || 0),
      total_reviews: parseInt(ratingResult[0]?.rating_count || 0),
      active_jobs: parseInt(activeJobsResult[0].active_jobs || 0)
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ...

/**
 * GET /bookings/:bookingId - Get booking details for worker
 */
router.get('/bookings/:bookingId', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { id: user_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can view booking details' });
  }

  const connection = await pool.getConnection();
  try {
    // Get provider_id for this worker
    const [providerData] = await connection.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [user_id]
    );

    if (!providerData.length) {
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;

    // Get booking details including rating and review
    const [bookingResult] = await connection.query(`
      SELECT 
        b.*,
        u.name as customer_name,
        u.phone_number as customer_phone,
        u.email as customer_email,
        COALESCE(sb.address, CONCAT(rb.pickup_address, ' → ', rb.drop_address)) as address,
        COALESCE(s.name, 'Driver Booking') as service_name,
        COALESCE(s.description, 'Driver transportation service') as service_description,
        r.rating,
        r.review,
        r.created_at as rating_submitted_at,
        CASE 
          WHEN b.cash_payment_id IS NOT NULL THEN 'pay_after_service'
          WHEN b.upi_payment_method_id IS NOT NULL THEN 'UPI Payment'
          ELSE 'pay_after_service'
        END as payment_method
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
      LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
      LEFT JOIN subcategories s ON b.subcategory_id = s.id
      LEFT JOIN ratings r ON r.booking_id = b.id AND r.ratee_type = 'provider' AND r.ratee_id = b.provider_id
      WHERE b.id = ? AND b.provider_id = ?
    `, [bookingId, provider_id]);

    if (!bookingResult.length) {
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    const booking = bookingResult[0];

    // Get service details (since each booking is a single service item)
    const [serviceDetails] = await connection.query(`
      SELECT 
        s.name as subcategory_name,
        s.description as service_description,
        s.base_price as price,
        sc.name as category_name
      FROM subcategories s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.id = ?
    `, [booking.subcategory_id]);

    // Create a single cart item from the booking
    const cartItems = serviceDetails.length > 0 ? [{
      subcategory_id: booking.subcategory_id,
      subcategory_name: serviceDetails[0].subcategory_name,
      service_description: serviceDetails[0].service_description,
      price: serviceDetails[0].price,
      category_name: serviceDetails[0].category_name,
      quantity: 1
    }] : [];

    // Get customer details
    const customer = {
      name: booking.customer_name,
      phone: booking.customer_phone,
      email: booking.customer_email
    };

    res.json({
      success: true,
      booking: {
        ...booking,
        cart_items: cartItems
      },
      customer: customer
    });

  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ message: 'Server error while fetching booking details' });
  } finally {
    connection.release();
  }
});

/**
 * PUT /bookings/:bookingId/status - Update booking status (Worker)
 */
router.put('/bookings/:bookingId/status', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  const { id: user_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can update booking status' });
  }

  const validStatuses = ['started', 'arrived', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the worker is assigned to this booking
    const [bookingRows] = await connection.query(
      `SELECT b.id, b.provider_id, b.user_id as customer_id, b.booking_type, b.service_status
       FROM bookings b
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!bookingRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Get provider_id for this worker
    const [providerData] = await connection.query(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [user_id]
    );

    if (!providerData.length) {
      await connection.rollback();
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;
    const booking = bookingRows[0];

    if (booking.provider_id !== provider_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not assigned to this booking' });
    }

    // Update booking status
    await connection.query(
      'UPDATE bookings SET service_status = ? WHERE id = ?',
      [status, bookingId]
    );

    // If job is completed, clean up chat data for this booking
    if (status === 'completed') {
      try {
        // Check if a chat session exists for this booking
        const [chatSessions] = await connection.query(
          'SELECT id FROM chat_sessions WHERE booking_id = ? LIMIT 1',
          [bookingId]
        );

        if (chatSessions.length) {
          // Try stored procedures first
          try {
            await connection.query('CALL sp_end_chat_session(?)', [bookingId]);
          } catch (_) {
            // ignore if SP missing
          }
          try {
            await connection.query('CALL sp_delete_chat_data(?)', [bookingId]);
          } catch (spErr) {
            // Fallback manual cleanup
            await connection.query(
              'DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE booking_id = ?)',
              [bookingId]
            );
            await connection.query(
              'DELETE FROM chat_participants WHERE session_id IN (SELECT id FROM chat_sessions WHERE booking_id = ?)',
              [bookingId]
            );
            await connection.query(
              "UPDATE chat_sessions SET session_status = 'ended', last_message_at = NOW() WHERE booking_id = ?",
              [bookingId]
            );
          }
        }
      } catch (cleanupErr) {
        console.warn('Chat cleanup warning (worker status):', cleanupErr?.message || cleanupErr);
      }
    }

    await connection.commit();

    // Emit socket events to customer and provider rooms
    try {
      const io = req.app.get('io');
      if (io) {
        // Generic status broadcast to booking room
        io.to(`booking_${bookingId}`).emit('status_update', { booking_id: Number(bookingId), status });

        // Customer specific events for DriverBooking.jsx
        if (status === 'started') {
          io.to(`booking_${bookingId}`).emit('trip_started', { booking_id: Number(bookingId) });
        } else if (status === 'arrived') {
          io.to(`booking_${bookingId}`).emit('driver_arrived', { booking_id: Number(bookingId) });
        } else if (status === 'in_progress') {
          // Send a neutral progress update; front-end may render a spinner/progress
          io.to(`booking_${bookingId}`).emit('trip_progress', { booking_id: Number(bookingId), progress: 10, eta: null });
        } else if (status === 'completed') {
          io.to(`booking_${bookingId}`).emit('trip_completed', { booking_id: Number(bookingId), final_fare: null });
        }

        // Notify the assigned provider room too (optional)
        io.to(`provider:${provider_id}`).emit('booking_status_updated', { booking_id: Number(bookingId), status });

        // Notify the customer user channel (optional)
        if (booking.customer_id) {
          io.to(`user:${booking.customer_id}`).emit('booking_status_updated', { booking_id: Number(bookingId), status });
        }
      }
    } catch (socketErr) {
      // Log socket errors but do not fail the API
      console.error('Socket emit error (status update):', socketErr.message);
    }

    return res.json({ success: true, message: 'Status updated', status });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating booking status:', error);
    return res.status(500).json({ message: 'Server error while updating booking status' });
  } finally {
    connection.release();
  }
});

/**
 * POST /send-otp-email - Send OTP via email to customer for service verification
 */
router.post('/send-otp-email', verifyToken, async (req, res) => {
  const { booking_id } = req.body;
  const { id: worker_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can send OTP emails' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get booking details with customer information
    const [bookingDetails] = await connection.query(`
      SELECT 
        b.id, b.user_id AS customer_id, b.service_status, b.otp_code, b.otp_expires_at,
        u.name as customer_name, u.email as customer_email,
        wu.name as worker_name,
        sc.name as service_name,
        p.id as provider_id
      FROM bookings b
      JOIN providers p ON b.provider_id = p.id
      JOIN users u ON b.user_id = u.id
      JOIN users wu ON p.user_id = wu.id
      LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
      WHERE b.id = ? AND p.user_id = ? AND b.booking_type != 'ride'
    `, [booking_id, worker_id]);

    if (!bookingDetails.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    const booking = bookingDetails[0];

    // Check if booking is in arrived status
    if (booking.service_status !== 'arrived') {
      await connection.rollback();
      return res.status(400).json({ message: 'Booking must be in arrived status to send OTP' });
    }

    // Check if customer has email
    if (!booking.customer_email) {
      await connection.rollback();
      return res.status(400).json({ message: 'Customer email not found. Cannot send OTP.' });
    }

    // Check if OTP was sent recently (prevent spam)
    const now = new Date();
    if (booking.otp_expires_at && new Date(booking.otp_expires_at) > now) {
      const timeLeft = Math.ceil((new Date(booking.otp_expires_at) - now) / 60000);
      await connection.rollback();
      return res.status(429).json({ 
        message: `Please wait ${timeLeft} minutes before requesting a new OTP` 
      });
    }

    // Generate new OTP and set expiration (15 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    await connection.query(
      'UPDATE bookings SET otp_code = ?, otp_expires_at = ?, updated_at = NOW() WHERE id = ?',
      [otp, expiresAt, booking_id]
    );

    await connection.commit();

    // Send OTP email to customer
    const emailResult = await sendOTPEmail(
      booking.customer_email,
      booking.customer_name,
      otp,
      booking.worker_name,
      booking_id,
      booking.service_name || 'Service'
    );

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: `OTP sent successfully to ${booking.customer_email}`,
        customer_email: booking.customer_email,
        expires_at: expiresAt.toISOString()
      });
    } else {
      // If email fails, we should remove the OTP from database
      await pool.query(
        'UPDATE bookings SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
        [booking_id]
      );
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to send OTP email. Please try again.',
        error: emailResult.error
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error sending OTP email:', error);
    res.status(500).json({ message: 'Server error while sending OTP email' });
  } finally {
    connection.release();
  }
});

/**
 * POST /verify-otp - Verify OTP provided by customer and complete service
 */
router.post('/verify-otp', verifyToken, async (req, res) => {
  const { booking_id, otp_code } = req.body;
  const { id: worker_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can verify OTP' });
  }

  if (!otp_code || otp_code.length !== 6) {
    return res.status(400).json({ message: 'Please provide a valid 6-digit OTP' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get booking details with OTP information
    const [bookingDetails] = await connection.query(`
      SELECT 
        b.id, b.user_id AS customer_id, b.service_status, b.otp_code, b.otp_expires_at,
        u.name as customer_name, u.email as customer_email,
        wu.name as worker_name,
        sc.name as service_name,
        p.id as provider_id
      FROM bookings b
      JOIN providers p ON b.provider_id = p.id
      JOIN users u ON b.user_id = u.id
      JOIN users wu ON p.user_id = wu.id
      LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
      WHERE b.id = ? AND p.user_id = ? AND b.booking_type != 'ride'
    `, [booking_id, worker_id]);

    if (!bookingDetails.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    const booking = bookingDetails[0];

    // Check if booking is in arrived status
    if (booking.service_status !== 'arrived') {
      await connection.rollback();
      return res.status(400).json({ message: 'Booking must be in arrived status to verify OTP' });
    }

    // Check if OTP exists
    if (!booking.otp_code) {
      await connection.rollback();
      return res.status(400).json({ message: 'No OTP found. Please generate OTP first.' });
    }

    // Check if OTP has expired
    const now = new Date();
    if (!booking.otp_expires_at || new Date(booking.otp_expires_at) < now) {
      await connection.rollback();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (booking.otp_code !== otp_code) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // OTP is valid - update booking status to in_progress and clear OTP
    await connection.query(
      'UPDATE bookings SET service_status = ?, otp_code = NULL, otp_expires_at = NULL, service_started_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['in_progress', booking_id]
    );

    await connection.commit();

    // Emit socket events
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`booking_${booking_id}`).emit('status_update', { 
          booking_id: Number(booking_id), 
          status: 'in_progress',
          message: 'Service verification completed. Service has started.'
        });
        io.to(`booking_${booking_id}`).emit('trip_started', { booking_id: Number(booking_id) });
      }
    } catch (socketErr) {
      console.error('Socket emit error (OTP verification):', socketErr.message);
    }

    res.json({ 
      success: true, 
      message: 'OTP verified successfully. Service has started.',
      status: 'in_progress'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error while verifying OTP' });
  } finally {
    connection.release();
  }
});

/**
 * POST /bookings/:bookingId/generate-otp - Generate and send OTP to customer (booking-specific route)
 */
router.post('/bookings/:bookingId/generate-otp', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { id: worker_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can generate OTP' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get booking details with customer information
    const [bookingDetails] = await connection.query(`
      SELECT 
        b.id, b.user_id AS customer_id, b.service_status, b.otp_code, b.otp_expires_at,
        u.name as customer_name, u.email as customer_email,
        wu.name as worker_name,
        sc.name as service_name,
        p.id as provider_id
      FROM bookings b
      JOIN providers p ON b.provider_id = p.id
      JOIN users u ON b.user_id = u.id
      JOIN users wu ON p.user_id = wu.id
      LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
      WHERE b.id = ? AND p.user_id = ? 
    `, [bookingId, worker_id]);

    if (!bookingDetails.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    const booking = bookingDetails[0];

    // Check if booking is in arrived status
    if (booking.service_status !== 'arrived') {
      await connection.rollback();
      return res.status(400).json({ message: 'Booking must be in arrived status to generate OTP' });
    }

    // Check if customer has email
    if (!booking.customer_email) {
      await connection.rollback();
      return res.status(400).json({ message: 'Customer email not found. Cannot send OTP.' });
    }

    // Check if OTP was sent recently (prevent spam)
    const now = new Date();
    if (booking.otp_expires_at && new Date(booking.otp_expires_at) > now) {
      const timeLeft = Math.ceil((new Date(booking.otp_expires_at) - now) / 60000);
      await connection.rollback();
      return res.status(429).json({ 
        message: `Please wait ${timeLeft} minutes before requesting a new OTP` 
      });
    }

    // Generate new 6-digit OTP and set expiration (15 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    await connection.query(
      'UPDATE bookings SET otp_code = ?, otp_expires_at = ?, updated_at = NOW() WHERE id = ?',
      [otp, expiresAt, bookingId]
    );

    await connection.commit();

    // Send OTP email to customer
    const emailResult = await sendOTPEmail(
      booking.customer_email,
      booking.customer_name,
      otp,
      booking.worker_name,
      bookingId,
      booking.service_name || 'Service'
    );

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent successfully to customer email',
        expires_at: expiresAt.toISOString()
      });
    } else {
      // If email fails, we should remove the OTP from database
      await pool.query(
        'UPDATE bookings SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
        [bookingId]
      );
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error generating OTP:', error);
    res.status(500).json({ message: 'Server error while generating OTP' });
  } finally {
    connection.release();
  }
});

/**
 * POST /bookings/:bookingId/verify-otp - Verify OTP provided by customer (booking-specific route)
 */
router.post('/bookings/:bookingId/verify-otp', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { otp } = req.body;
  const { id: worker_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can verify OTP' });
  }

  if (!otp || otp.length !== 6) {
    return res.status(400).json({ message: 'Please provide a valid 6-digit OTP' });
  }

  console.log('OTP Verification Debug:', { bookingId, worker_id, otp });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get booking details with OTP information
    const [bookingDetails] = await connection.query(`
      SELECT 
        b.id, b.user_id AS customer_id, b.service_status, b.otp_code, b.otp_expires_at,
        u.name as customer_name, u.email as customer_email,
        wu.name as worker_name,
        sc.name as service_name,
        p.id as provider_id
      FROM bookings b
      JOIN providers p ON b.provider_id = p.id
      JOIN users u ON b.user_id = u.id
      JOIN users wu ON p.user_id = wu.id
      LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
      WHERE b.id = ? AND p.user_id = ?
    `, [bookingId, worker_id]);

    console.log('Query result:', { bookingDetails, length: bookingDetails.length });

    if (!bookingDetails.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    const booking = bookingDetails[0];

    console.log('Booking found:', { booking_id: booking.id, status: booking.service_status, otp_code: booking.otp_code });

    // Check if booking is in arrived status
    if (booking.service_status !== 'arrived') {
      await connection.rollback();
      return res.status(400).json({ message: 'Booking must be in arrived status to verify OTP' });
    }

    // Check if OTP exists
    if (!booking.otp_code) {
      await connection.rollback();
      return res.status(400).json({ message: 'No OTP found. Please generate OTP first.' });
    }

    // Check if OTP has expired
    const now = new Date();
    if (!booking.otp_expires_at || new Date(booking.otp_expires_at) < now) {
      await connection.rollback();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (booking.otp_code !== otp) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // OTP is valid - update booking status to in_progress and clear OTP
    await connection.query(
      'UPDATE bookings SET service_status = ?, otp_code = NULL, otp_expires_at = NULL, service_started_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['in_progress', bookingId]
    );

    await connection.commit();

    // Emit socket events
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`booking_${bookingId}`).emit('status_update', { 
          booking_id: Number(bookingId), 
          status: 'in_progress',
          message: 'Service verification completed. Service has started.'
        });
        io.to(`booking_${bookingId}`).emit('trip_started', { booking_id: Number(bookingId) });
      }
    } catch (socketErr) {
      console.error('Socket emit error (OTP verification):', socketErr.message);
    }

    res.json({ 
      success: true, 
      message: 'OTP verified successfully. Service has started.',
      booking_id: Number(bookingId),
      status: 'in_progress'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error while verifying OTP' });
  } finally {
    connection.release();
  }
});

/**
 * POST /worker/profile-picture/presign - Generate presigned URL for profile picture upload
 */
router.post('/worker/profile-picture/presign', verifyToken, async (req, res) => {
  try {
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    const userId = req.user.id;
    const { file_name, content_type } = req.body;

    if (!file_name || !content_type) {
      return res.status(400).json({ message: 'file_name and content_type are required' });
    }

    // Validate content type (only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(content_type.toLowerCase())) {
      return res.status(400).json({ message: 'Only JPEG, PNG, and WebP images are allowed' });
    }

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;
    const safeName = sanitizeFileName(file_name);
    const key = `provider_profile_pictures/${providerId}/${Date.now()}_${safeName}`;

    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: content_type,
      Expires: 300, // 5 minutes
      ACL: 'private'
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    res.json({
      upload_url: uploadUrl,
      s3_key: key,
      expires_in: 300
    });

  } catch (error) {
    console.error('Error generating presigned URL for profile picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * PUT /worker/profile-picture - Update profile picture URL in database
 */
router.put('/worker/profile-picture', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profile_picture_url } = req.body;

    if (!profile_picture_url) {
      return res.status(400).json({ message: 'profile_picture_url is required' });
    }

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id, profile_picture_url FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;
    const oldProfilePicture = provider[0].profile_picture_url;

    // Update profile picture URL
    await pool.query(
      'UPDATE providers SET profile_picture_url = ?, updated_at = NOW() WHERE id = ?',
      [profile_picture_url, providerId]
    );

    // Optional: Delete old profile picture from S3 if it exists
    if (oldProfilePicture && oldProfilePicture.includes(S3_BUCKET)) {
      try {
        const oldKey = oldProfilePicture.split('.com/')[1];
        if (oldKey) {
          await s3.deleteObject({
            Bucket: S3_BUCKET,
            Key: oldKey
          }).promise();
        }
      } catch (deleteError) {
        console.error('Error deleting old profile picture:', deleteError);
        // Don't fail the request if deletion fails
      }
    }

    res.json({ 
      message: 'Profile picture updated successfully',
      profile_picture_url
    });

  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /worker/profile-picture/presign - Get presigned URL to view profile picture
 */
router.get('/worker/profile-picture/presign', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get provider profile picture URL
    const [provider] = await pool.query(
      'SELECT profile_picture_url FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const profilePictureUrl = provider[0].profile_picture_url;

    if (!profilePictureUrl) {
      return res.status(404).json({ message: 'No profile picture found' });
    }

    // If it's an S3 URL, generate presigned URL
    if (profilePictureUrl.includes(S3_BUCKET)) {
      try {
        const key = profilePictureUrl.split('.com/')[1];
        if (!key) {
          return res.status(400).json({ message: 'Invalid S3 URL format' });
        }

        const params = {
          Bucket: S3_BUCKET,
          Key: key,
          Expires: 3600 // 1 hour for viewing
        };

        const viewUrl = await s3.getSignedUrlPromise('getObject', params);

        res.json({
          url: viewUrl,
          storage: 's3',
          expires_in: 3600
        });
      } catch (s3Error) {
        console.error('S3 error:', s3Error);
        return res.status(500).json({ message: 'Error generating presigned URL' });
      }
    } else {
      // Legacy or external URL
      res.json({
        url: profilePictureUrl,
        storage: 'legacy',
        expires_in: null
      });
    }

  } catch (error) {
    console.error('Error getting profile picture presigned URL:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * DELETE /worker/profile-picture - Delete profile picture
 */
router.delete('/worker/profile-picture', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get provider profile picture URL
    const [provider] = await pool.query(
      'SELECT id, profile_picture_url FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;
    const profilePictureUrl = provider[0].profile_picture_url;

    if (!profilePictureUrl) {
      return res.status(404).json({ message: 'No profile picture to delete' });
    }

    // Delete from S3 if it's an S3 URL
    if (profilePictureUrl.includes(S3_BUCKET)) {
      try {
        const key = profilePictureUrl.split('.com/')[1];
        if (key) {
          await s3.deleteObject({
            Bucket: S3_BUCKET,
            Key: key
          }).promise();
        }
      } catch (s3Error) {
        console.error('Error deleting from S3:', s3Error);
        // Continue to update database even if S3 deletion fails
      }
    }

    // Remove profile picture URL from database
    await pool.query(
      'UPDATE providers SET profile_picture_url = NULL, updated_at = NOW() WHERE id = ?',
      [providerId]
    );

    res.json({ message: 'Profile picture deleted successfully' });

  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;