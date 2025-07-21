const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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
      await connection.query(
        `INSERT INTO providers (
          user_id, experience_years, bio, service_radius_km, 
          location_lat, location_lng, verified, active, rating,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          providerData.experience_years,
          providerData.bio,
          providerData.service_radius_km,
          providerData.location_lat,
          providerData.location_lng,
          providerData.verified || false,
          providerData.active || true,
          providerData.rating || 0.0
        ]
      );
      
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

module.exports = WorkerService;
