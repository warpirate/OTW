const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../services/emailService');
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

    // Enforce email verification for email/password login (customers only)
    if (role && role.toLowerCase() === 'customer' && !user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in. Check your inbox or request a new link.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
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
      'INSERT INTO users (name, email, password, phone_number, is_active, email_verified, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
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

    // Create auth JWT
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

    // Send email verification link (24h expiry)
    try {
      const verifyToken = jwt.sign({ id: userId, purpose: 'email_verify' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      const base = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${base}/verify-email?token=${verifyToken}`;
      
      const emailResult = await sendVerificationEmail(email, name, verifyUrl);
      if (emailResult.success) {
        console.log('Verification email sent successfully to:', email);
      } else {
        console.error('Failed to send verification email:', emailResult.error);
      }
    } catch (mailErr) {
      // Don't fail registration on mail errors
      console.warn('Email verification send failed:', mailErr.message);
    }

    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email,
        phone_number,
        role: 'customer',
        role_id
      },
      email_verification_sent: true
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ------------------------
// OTP ENDPOINTS (for mobile app compatibility)
// ------------------------

// Request OTP for phone login
router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }
  // TODO: Integrate with SMS service
  console.log(`OTP request for phone: ${phone}`);
  res.json({ success: true, message: 'OTP sent successfully' });
});

// Login with phone and OTP
router.post('/login-otp', async (req, res) => {
  const { phone, otp, role = 'customer' } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone and OTP are required' });
  }
  
  // TODO: Verify OTP from SMS service
  // For now, accept any 6-digit OTP as valid
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'Invalid OTP format' });
  }
  
  try {
    // Find user by phone
    const [users] = await pool.query(
      'SELECT * FROM users WHERE phone_number = ? AND is_active = 1 LIMIT 1',
      [phone]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Phone number not registered' });
    }

    const user = users[0];

    // Get user role
    const [[dbRole]] = await pool.query(
      `SELECT r.id AS role_id, r.name AS role_name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?
       LIMIT 1`,
      [user.id]
    );

    if (!dbRole) {
      return res.status(403).json({ message: 'User role not found' });
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
        phone_number: user.phone_number,
        role: dbRole.role_name,
        role_id: dbRole.role_id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    // Optional guard: check token purpose when present
    if (decoded.purpose && decoded.purpose !== 'email_verify') {
      return res.status(400).json({ message: 'Invalid token purpose' });
    }

    // Update user as verified
    await pool.query(
      'UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ? LIMIT 1',
      [userId]
    );

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('verify-email error:', err.message);
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  console.log(req.body);
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const [rows] = await pool.query('SELECT id, name, email_verified FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) {
      // To prevent enumeration
      return res.json({ success: true, message: 'If the email exists, a new verification link will be sent' });
    }
    const user = rows[0];
    if (user.email_verified) {
      return res.json({ success: true, message: 'Email already verified' });
    }
    const verifyToken = jwt.sign({ id: user.id, purpose: 'email_verify' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${base}/verify-email?token=${verifyToken}`;
    
    // Send verification email with proper error handling
    const emailResult = await sendVerificationEmail(email, user.name || 'there', verifyUrl);
    
    if (emailResult.success) {
      console.log('VERIFY EMAIL:', emailResult); 
      return res.json({ success: true, message: 'Verification link resent successfully' });
    } else {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again.' });
    }
  } catch (err) {
    console.error('resend-verification error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Legacy OTP reset endpoints (keeping for backward compatibility)
router.post('/reset/send-otp', async (req, res) => {
  res.json({ success: true, message: 'OTP sent (dummy)' });
});

router.post('/reset/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
  res.json({ success: true, message: 'OTP verified (dummy)' });
});

// ------------------------
// Forgot Password - Request Reset Link
// ------------------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const [users] = await pool.query(
      'SELECT id, name FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (users.length === 0) {
      // To prevent email enumeration
      return res.json({ success: true, message: 'If that email is in our database, a password reset link will be sent' });
    }
    const user = users[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    
    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, user.name || 'there', resetUrl);
    
    if (emailResult.success) {
      console.log(`Password reset email sent successfully to: ${email}`);
      return res.json({ success: true, message: 'If that email is in our database, a password reset link will be sent' });
    } else {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to prevent email enumeration
      return res.json({ success: true, message: 'If that email is in our database, a password reset link will be sent' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------
// Reset Password - Update Password
// ------------------------
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    return res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
