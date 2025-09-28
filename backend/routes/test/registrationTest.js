const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

/**
 * Test endpoint to verify email + role uniqueness logic
 * This endpoint simulates the registration process to test uniqueness checks
 */
router.post('/test-registration-uniqueness', async (req, res) => {
  const { email, role_name } = req.body;

  if (!email || !role_name) {
    return res.status(400).json({
      message: 'Email and role_name are required',
      example: { email: 'test@example.com', role_name: 'customer' }
    });
  }

  try {
    // Get role ID
    const [roleResult] = await pool.query(
      'SELECT id, name FROM roles WHERE LOWER(name) = ? LIMIT 1',
      [role_name.toLowerCase()]
    );

    if (roleResult.length === 0) {
      return res.status(404).json({ 
        message: 'Role not found',
        available_roles: ['customer', 'worker', 'admin', 'super admin']
      });
    }

    const roleId = roleResult[0].id;

    // Check if email + role combination already exists
    const [existingUsers] = await pool.query(
      `SELECT u.id, u.name, u.email, r.name as role_name FROM users u 
       INNER JOIN user_roles ur ON u.id = ur.user_id 
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ? AND ur.role_id = ? LIMIT 1`,
      [email, roleId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: 'Email already registered for this role',
        existing_user: existingUsers[0],
        can_register_different_role: true
      });
    }

    // Check if email exists with different roles
    const [otherRoles] = await pool.query(
      `SELECT u.id, u.name, u.email, r.name as role_name FROM users u 
       INNER JOIN user_roles ur ON u.id = ur.user_id 
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    return res.status(200).json({
      message: 'Email + role combination is available for registration',
      email,
      role: role_name,
      role_id: roleId,
      existing_roles_for_email: otherRoles.map(user => ({
        role: user.role_name,
        name: user.name
      }))
    });

  } catch (error) {
    console.error('Registration uniqueness test error:', error);
    res.status(500).json({
      message: 'Test failed',
      error: error.message
    });
  }
});

/**
 * Test endpoint to show all users with their roles
 */
router.get('/test-users-roles', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, r.name as role_name, ur.role_id
       FROM users u 
       INNER JOIN user_roles ur ON u.id = ur.user_id 
       INNER JOIN roles r ON ur.role_id = r.id
       ORDER BY u.email, r.name`
    );

    // Group by email to show multiple roles per user
    const usersByEmail = {};
    users.forEach(user => {
      if (!usersByEmail[user.email]) {
        usersByEmail[user.email] = {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: []
        };
      }
      usersByEmail[user.email].roles.push({
        role_id: user.role_id,
        role_name: user.role_name
      });
    });

    res.json({
      message: 'All users with their roles',
      total_users: Object.keys(usersByEmail).length,
      total_user_role_combinations: users.length,
      users: Object.values(usersByEmail)
    });

  } catch (error) {
    console.error('Users roles test error:', error);
    res.status(500).json({
      message: 'Test failed',
      error: error.message
    });
  }
});

/**
 * Test endpoint to show available roles
 */
router.get('/test-available-roles', async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT id, name FROM roles ORDER BY id');
    
    res.json({
      message: 'Available roles in the system',
      roles
    });

  } catch (error) {
    console.error('Available roles test error:', error);
    res.status(500).json({
      message: 'Test failed',
      error: error.message
    });
  }
});

module.exports = router;
