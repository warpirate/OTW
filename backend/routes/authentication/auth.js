const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');
// need to check password and email also
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
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

    // Get role
    const [[role]] = await pool.query(
      `SELECT r.name 
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ? LIMIT 1`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: role.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// implement sign up route with email and password and name
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role_id } = req.body;
  const name = `${firstName} ${lastName}`;

  if (!name || !email || !password || !role_id) {
    return res.status(400).json({ message: 'Name, email, password, and role are required' });
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

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, is_active, created_at) VALUES (?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, 1]
    );

    const userId = result.insertId;

    // Assign role
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, role_id]
    );

    // Get role name for response
    const [[roleRow]] = await pool.query(
      'SELECT name FROM roles WHERE id = ?',
      [role_id]
    );

    const token = jwt.sign(
      { id: userId, role: roleRow.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email,
        role: roleRow.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});




   

module.exports = router;
