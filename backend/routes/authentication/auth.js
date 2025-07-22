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

    // More flexible role checking - normalize role names
    const dbRoleName = dbRole.role_name.toLowerCase();
    const requestedRole = role.toLowerCase();
    
    // Handle role mapping for worker/provider synonyms
    const roleMapping = {
      'worker': ['worker', 'provider', 'service provider'],
      'provider': ['worker', 'provider', 'service provider'],
      'service provider': ['worker', 'provider', 'service provider']
    };
    
    const allowedRoles = roleMapping[requestedRole] || [requestedRole];
    
    if (!dbRole || !allowedRoles.includes(dbRoleName)) {
      return res.status(403).json({ message: `Access denied for role ${role}. User has role: ${dbRole.role_name}` });
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
  const {
    firstName,
    lastName,
    email,
    password,
    phone_number
  } = req.body;

  const name = `${firstName} ${lastName}`;
  const role_id = 1; // Only customer

  if (!firstName || !lastName || !email || !password ) {
    return res.status(400).json({ message: 'First name, last name, email, password, and phone number are required' });
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

    // Insert into users
    const [userResult] = await pool.query(
      'INSERT INTO users (name, email, password, phone_number, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, phone_number, 1]
    );

    const userId = userResult.insertId;

    // Assign role
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, role_id]
    );

    // Insert empty row into customers
    await pool.query(
      'INSERT INTO customers (id) VALUES (?)',
      [userId]
    );

    // Create JWT
    const token = jwt.sign(
      {
        id: userId,
        email,
        role: 'customer',
        role_id
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
        phone_number,
        role: 'customer',
        role_id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
