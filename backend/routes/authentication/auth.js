const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ------------------------
// Login Route
// ------------------------
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  console.log('Login attempt with email:', email, 'and role:', role);
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required' });
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or inactive user' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Fetch actual role from DB
    const [[dbRole]] = await pool.query(
      `SELECT r.id AS role_id, r.name AS role_name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?
       LIMIT 1`,
      [user.id]
    );
console.log('DB role for user:', dbRole);

    if (!dbRole || dbRole.role_name !== role) {
      return res.status(403).json({ message: 'Access denied for this role' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: dbRole.role_name,
        role_id: dbRole.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: dbRole.role_name,
        role_id: dbRole.role_id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ------------------------
// Register Route
// ------------------------
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role_id } = req.body;
  const name = `${firstName} ${lastName}`;

  if (!firstName || !lastName || !email || !password || !role_id) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const allowedRoles = [1, 2, 3]; // Allowed roles: adjust as needed (1 = customer, 2 = admin, etc.)
  if (!allowedRoles.includes(role_id)) {
    return res.status(403).json({ message: 'Invalid role selection' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, is_active, created_at) VALUES (?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, 1]
    );

    const userId = result.insertId;

    // Assign role to user
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, role_id]
    );

    // Get role name
    const [[roleRow]] = await pool.query(
      'SELECT name FROM roles WHERE id = ?',
      [role_id]
    );

    const token = jwt.sign(
      {
        id: userId,
        email,
        role: roleRow.name,
        role_id: role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email,
        role: roleRow.name,
        role_id: role_id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
