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
    console.log('Update Data:', updateData);

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
          br.id as request_id,
          br.booking_id,
          br.status as status,
          br.requested_at,
          br.responded_at,
          b.user_id,
          b.booking_type,
          rb.with_vehicle,
          rb.pickup_address,
          rb.drop_address,
          sb.address as service_address,
          b.actual_cost,
          b.price,
          b.estimated_cost,
          b.service_status,
          b.payment_status,
          b.created_at as booking_created_at,
          b.scheduled_time,
          b.duration,
          b.cost_type,
          b.subcategory_id,
          u.name as customer_name,
          u.phone_number as customer_phone,
          s.name as service_name,
          s.description as service_description,
          sc.name as category_name
        FROM booking_requests br
        LEFT JOIN bookings b ON br.booking_id = b.id
        INNER JOIN users u ON b.user_id = u.id
        LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
        LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
        LEFT JOIN subcategories s ON b.subcategory_id = s.id
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        WHERE br.provider_id = ?
      `;

      const params = [providerId];

      // Exclude cancelled bookings from general lists
      query += " AND b.service_status != 'cancelled'";
      // Filter by specific booking_request status if provided (pending, accepted, rejected)
      if (status && status !== 'all') {
        query += ' AND br.status = ?';
        params.push(status);
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
          br.id as request_id,
          br.booking_id,
          br.status,
          br.requested_at,
          br.responded_at,
          b.user_id,
          b.booking_type,
          rb.with_vehicle,
          rb.pickup_address,
          rb.drop_address,
          sb.address as service_address,
          b.actual_cost,
          b.price,
          b.estimated_cost,
          b.service_status,
          b.payment_status,
          b.created_at as booking_created_at,
          b.scheduled_time,
          b.duration,
          b.cost_type,
          b.subcategory_id,
          u.name as customer_name,
          u.phone_number as customer_phone,
          s.name as service_name,
          s.description as service_description,
          sc.name as category_name
        FROM booking_requests br
        INNER JOIN bookings b ON br.booking_id = b.id
        INNER JOIN users u ON b.user_id = u.id
        LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
        LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
        LEFT JOIN subcategories s ON b.subcategory_id = s.id
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        WHERE br.provider_id = ?
      `;

      const queryParams = [providerId];

      // Exclude cancelled bookings from general lists
      query += " AND b.service_status != 'cancelled'";
      // Filter by specific booking_request status if provided (pending, accepted, rejected)
      if (status && status !== 'all') {
        query += ' AND br.status = ?';
        queryParams.push(status);
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
        countQuery += ' AND br.status = ?';
        countParams.push(status);
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

    // All (non-cancelled bookings)
    const [allRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled'`,
      [providerId]
    );
    // Pending (non-cancelled bookings)
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND br.status = 'pending'`,
      [providerId]
    );
    // Accepted (non-cancelled bookings)
    const [acceptedRows] = await pool.query(
      `SELECT COUNT(*) as total ${baseJoin} AND b.service_status != 'cancelled' AND br.status = 'accepted'`,
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
        for (const row of pendingProviders) {
          io.to(`provider:${row.provider_id}`).emit('booking_requests:new', {
            booking_id: bookingId,
            status: 'pending'
          });
        }
      }
    } catch (emitErr) {
      console.error('Socket emit error (cancel booking request):', emitErr.message);
    }

    return res.json({
      message: 'Booking request cancelled successfully',
      request_id: requestId,
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
              COALESCE(s.name, 'Ride Service') as service_name, 
              COALESCE(s.description, 'Driver transportation service') as service_description,
              (SELECT u.name FROM users u WHERE u.id = b.user_id) as customer_name,
              (SELECT u.phone_number FROM users u WHERE u.id = b.user_id) as customer_phone,
              CASE 
                WHEN b.booking_type = 'ride' THEN 
                  CONCAT(rb.pickup_address, ' → ', rb.drop_address)
                ELSE sb.address 
              END as display_address,
              CASE 
                WHEN b.booking_type = 'ride' THEN b.estimated_cost
                ELSE b.price 
              END as display_price
       FROM bookings b
      
       LEFT JOIN service_bookings sb ON sb.booking_id = b.id
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
          u.name AS customer_name,
          u.phone_number AS customer_phone,
          COALESCE(s.name, 'Ride Service') AS service_name,
          COALESCE(s.description, 'Driver transportation service') AS service_description,
          CASE WHEN b.booking_type = 'ride' THEN 
            CONCAT(rb.pickup_address, ' → ', rb.drop_address)
          ELSE sb.address END AS display_address,
          CASE WHEN b.booking_type = 'ride' THEN b.estimated_cost ELSE b.price END AS display_price
       FROM booking_requests br
       JOIN bookings b ON br.booking_id = b.id
       JOIN users u ON b.user_id = u.id
       LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
       LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
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

    // Get rating and reviews count (from providers aggregates)
    const [ratingResult] = await pool.query(
      'SELECT COALESCE(average_rating, 0) AS average_rating, COALESCE(rating_count, 0) AS rating_count FROM providers WHERE id = ?',
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

module.exports = router;