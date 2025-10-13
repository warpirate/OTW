const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticateToken, requireSuperAdmin } = require('../../middlewares/auth');
const encryption = require('../../utils/encryption');

// Middleware to authenticate and authorize super admin
const authenticateSuperAdmin = [authenticateToken, requireSuperAdmin];

/**
 * Get all payment API keys (with masked sensitive values)
 * GET /api/superadmin/payment-settings
 */
router.get('/', authenticateSuperAdmin, async (req, res) => {
  try {
    const [keys] = await pool.query(
      `SELECT id, key_name, key_type, is_sensitive, description, is_active, 
              updated_at, updated_by
       FROM payment_api_keys 
       WHERE is_active = TRUE
       ORDER BY key_type, key_name`
    );

    // Mask sensitive values for display
    const maskedKeys = keys.map(key => ({
      ...key,
      key_value: key.is_sensitive ? '••••••••••••' : null,
      can_view: true
    }));

    res.json({
      success: true,
      data: maskedKeys
    });
  } catch (error) {
    console.error('Error fetching payment keys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment keys',
      error: error.message
    });
  }
});

/**
 * Get a specific decrypted key value (for editing)
 * GET /api/superadmin/payment-settings/:id/decrypt
 */
router.get('/:id/decrypt', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [keys] = await pool.query(
      'SELECT id, key_name, key_value, key_type, is_sensitive FROM payment_api_keys WHERE id = ?',
      [id]
    );

    if (keys.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment key not found'
      });
    }

    const key = keys[0];
    
    // Decrypt the value
    let decryptedValue;
    try {
      decryptedValue = encryption.decrypt(key.key_value);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(500).json({
        success: false,
        message: 'Failed to decrypt key value'
      });
    }

    // Log the access in audit
    await pool.query(
      `INSERT INTO payment_key_audit_logs 
       (key_id, key_name, action, changed_by, changed_by_email, ip_address, user_agent)
       VALUES (?, ?, 'viewed', ?, ?, ?, ?)`,
      [
        key.id,
        key.key_name,
        req.user.id,
        req.user.email,
        req.ip,
        req.get('user-agent')
      ]
    );

    res.json({
      success: true,
      data: {
        id: key.id,
        key_name: key.key_name,
        key_value: decryptedValue,
        key_type: key.key_type
      }
    });
  } catch (error) {
    console.error('Error decrypting payment key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt payment key',
      error: error.message
    });
  }
});

/**
 * Update a payment API key
 * PUT /api/superadmin/payment-settings/:id
 */
router.put('/:id', authenticateSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { key_value, description } = req.body;

    if (!key_value) {
      return res.status(400).json({
        success: false,
        message: 'Key value is required'
      });
    }

    // Get existing key
    const [existingKeys] = await connection.query(
      'SELECT key_name, key_value FROM payment_api_keys WHERE id = ?',
      [id]
    );

    if (existingKeys.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment key not found'
      });
    }

    const oldKey = existingKeys[0];
    const oldValueHash = encryption.hash(encryption.decrypt(oldKey.key_value));
    const newValueHash = encryption.hash(key_value);

    // Encrypt the new value
    const encryptedValue = encryption.encrypt(key_value);

    // Update the key
    await connection.query(
      `UPDATE payment_api_keys 
       SET key_value = ?, description = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [encryptedValue, description, req.user.id, id]
    );

    // Log the change in audit
    await connection.query(
      `INSERT INTO payment_key_audit_logs 
       (key_id, key_name, action, old_value_hash, new_value_hash, 
        changed_by, changed_by_email, ip_address, user_agent)
       VALUES (?, ?, 'updated', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        oldKey.key_name,
        oldValueHash,
        newValueHash,
        req.user.id,
        req.user.email,
        req.ip,
        req.get('user-agent')
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Payment key updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating payment key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment key',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Create a new payment API key
 * POST /api/superadmin/payment-settings
 */
router.post('/', authenticateSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { key_name, key_value, key_type, is_sensitive, description } = req.body;

    if (!key_name || !key_value || !key_type) {
      return res.status(400).json({
        success: false,
        message: 'Key name, value, and type are required'
      });
    }

    // Check if key already exists
    const [existing] = await connection.query(
      'SELECT id FROM payment_api_keys WHERE key_name = ?',
      [key_name]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'A key with this name already exists'
      });
    }

    // Encrypt the value
    const encryptedValue = encryption.encrypt(key_value);
    const valueHash = encryption.hash(key_value);

    // Insert the key
    const [result] = await connection.query(
      `INSERT INTO payment_api_keys 
       (key_name, key_value, key_type, is_sensitive, description, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [key_name, encryptedValue, key_type, is_sensitive ?? true, description, req.user.id]
    );

    // Log the creation in audit
    await connection.query(
      `INSERT INTO payment_key_audit_logs 
       (key_id, key_name, action, new_value_hash, changed_by, changed_by_email, ip_address, user_agent)
       VALUES (?, ?, 'created', ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        key_name,
        valueHash,
        req.user.id,
        req.user.email,
        req.ip,
        req.get('user-agent')
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Payment key created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating payment key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment key',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Delete a payment API key (soft delete by setting is_active = false)
 * DELETE /api/superadmin/payment-settings/:id
 */
router.delete('/:id', authenticateSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Get existing key
    const [existingKeys] = await connection.query(
      'SELECT key_name FROM payment_api_keys WHERE id = ?',
      [id]
    );

    if (existingKeys.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment key not found'
      });
    }

    const keyName = existingKeys[0].key_name;

    // Soft delete
    await connection.query(
      'UPDATE payment_api_keys SET is_active = FALSE, updated_by = ? WHERE id = ?',
      [req.user.id, id]
    );

    // Log the deletion in audit
    await connection.query(
      `INSERT INTO payment_key_audit_logs 
       (key_id, key_name, action, changed_by, changed_by_email, ip_address, user_agent)
       VALUES (?, ?, 'deleted', ?, ?, ?, ?)`,
      [
        id,
        keyName,
        req.user.id,
        req.user.email,
        req.ip,
        req.get('user-agent')
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Payment key deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting payment key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment key',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Get audit logs for payment keys
 * GET /api/superadmin/payment-settings/audit-logs
 */
router.get('/audit-logs/list', authenticateSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, key_name, action } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT pal.*, u.name as changed_by_name
      FROM payment_key_audit_logs pal
      LEFT JOIN users u ON pal.changed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (key_name) {
      query += ' AND pal.key_name LIKE ?';
      params.push(`%${key_name}%`);
    }

    if (action) {
      query += ' AND pal.action = ?';
      params.push(action);
    }

    query += ' ORDER BY pal.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM payment_key_audit_logs WHERE 1=1';
    const countParams = [];

    if (key_name) {
      countQuery += ' AND key_name LIKE ?';
      countParams.push(`%${key_name}%`);
    }

    if (action) {
      countQuery += ' AND action = ?';
      countParams.push(action);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payment key audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

module.exports = router;
