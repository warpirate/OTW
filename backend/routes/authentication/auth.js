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
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or inactive user' });
    }

    const user = rows[0];

     
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// implement sign up route with email and password and name
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
 const name = `${firstName} ${lastName}`;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
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

     
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, is_active) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 1]
    );

    
    const token = jwt.sign(
      { id: result.insertId, name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

   

module.exports = router;
