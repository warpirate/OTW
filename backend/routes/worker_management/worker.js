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

      const { firstName, lastName, email, phone, password, providerData, subcategoryIds = [] } = userData;
      const name = `${firstName} ${lastName}`;
      console.log('Worker registration attempt:', { email, firstName, lastName, hasProviderData: !!providerData });
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
          created_at, updated_at, permanent_address,
          alternate_email, alternate_phone_number,
          emergency_contact_name, emergency_contact_relationship,
          emergency_contact_phone 
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          providerData.experience_years,
          providerData.bio,
          providerData.service_radius_km,
          providerData.location_lat,
          providerData.location_lng,
          providerData.verified || false,
          providerData.active || true,
          providerData.rating || 0,
          providerData.permanent_address,
          providerData.alternate_email,
          providerData.alternate_phone_number,
          providerData.emergency_contact_name,
          providerData.emergency_contact_relationship,
          providerData.emergency_contact_phone
        ]
      );

      const providerId = providerResult.insertId;

      // Map any provided subcategoryIds (either array of numbers or objects) and filter invalid entries
      const cleanSubcategoryIds = Array.isArray(subcategoryIds)
        ? subcategoryIds.map(sc => {
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
    try {
      const [results] = await pool.query(
        `SELECT 
          u.id, u.name, u.email, u.phone_number,
          p.id as provider_id, p.experience_years, p.bio, p.rating,
          p.verified, p.active, p.service_radius_km,
          p.location_lat, p.location_lng, p.last_active_at,
          p.created_at, p.updated_at
        FROM users u
        LEFT JOIN providers p ON u.id = p.user_id
        WHERE u.id = ? AND u.is_active = 1`,
        [userId]
      );

      if (results.length === 0) {
        throw new Error('Worker not found');
      }

      return results[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update worker profile
   */
  static async updateWorkerProfile(userId, updateData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

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
        'location_lat', 'location_lng', 'active'
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
        providerValues.push(userId);

        await connection.query(
          `UPDATE providers SET ${providerUpdates.join(', ')} WHERE user_id = ?`,
          providerValues
        );
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
  const { firstName, lastName, email, phone, password, role, providerData, subcategoryIds = [] } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password || !providerData) {
    return res.status(400).json({
      message: 'Missing required fields',
      required: ['firstName', 'lastName', 'email', 'password', 'providerData', 'subcategoryIds']
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

  // Validate subcategory IDs
  if (!Array.isArray(subcategoryIds) || subcategoryIds.length === 0) {
    return res.status(400).json({
      message: 'At least one service subcategory is required',
      missingFields: ['subcategoryIds']
    });
  }

  try {
    const result = await WorkerService.registerWorker({
      firstName,
      lastName,
      email,
      phone,
      password,
      providerData,
      subcategoryIds
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
      'service_radius_km', 'location_lat', 'location_lng', 'active'
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

module.exports = router;