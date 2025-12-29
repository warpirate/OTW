const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../../config/db');
require('dotenv').config();

const client = new OAuth2Client();

// Google OAuth initiation
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    session: false 
  }),
  (req, res) => {
    try {
      // Create JWT token for the authenticated user
      const token = jwt.sign(
        {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role || 'customer',
          role_id: req.user.role_id
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION }
      );

      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/google/success?token=${token}`;
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// Mobile Google OAuth endpoint - verify ID token and return JWT
router.post('/google/mobile', async (req, res) => {
  try {
    const { idToken, role = 'customer' } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const configuredAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_MOBILE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_RELEASE_CLIENT_ID,
    ]
      .filter(Boolean)
      .flatMap((v) => String(v).split(',').map((s) => s.trim()))
      .filter(Boolean);

    if (configuredAudiences.length === 0) {
      return res.status(500).json({
        error: 'Google OAuth is not configured',
        message: 'Missing GOOGLE_CLIENT_ID / GOOGLE_MOBILE_CLIENT_ID in backend environment',
      });
    }

    // Verify the ID token with Google
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: configuredAudiences,
      });
    } catch (verifyError) {
      console.error('Mobile Google OAuth token verification failed:', {
        error: verifyError?.message,
        configuredAudiences,
      });
      return res.status(401).json({
        error: 'Invalid Google token',
        message: 'Google token verification failed. Check OAuth client IDs for this build.',
      });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid ID token' });
    }

    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;
    const profilePicture = payload.picture;

    // Check if user exists with this email
    const [existingUsers] = await pool.query(
      'SELECT id, google_id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    let userId;

    if (existingUsers.length > 0) {
      // User exists - update google_id if not set
      userId = existingUsers[0].id;
      
      if (!existingUsers[0].google_id) {
        await pool.query(
          'UPDATE users SET google_id = ?, email_verified = 1, email_verified_at = NOW() WHERE id = ?',
          [googleId, userId]
        );
      }
      
      // Check if user has customer role
      const [userRoles] = await pool.query(
        `SELECT ur.role_id, r.name as role_name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = ? AND r.name = 'customer'`,
        [userId]
      );

      // If user doesn't have customer role, add it
      if (userRoles.length === 0) {
        const [customerRole] = await pool.query(
          'SELECT id FROM roles WHERE name = ? LIMIT 1',
          ['customer']
        );
        
        if (customerRole.length > 0) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [userId, customerRole[0].id]
          );
          
          // Also ensure customer record exists
          const [customerRecord] = await pool.query(
            'SELECT id FROM customers WHERE id = ?',
            [userId]
          );
          
          if (customerRecord.length === 0) {
            await pool.query('INSERT INTO customers (id) VALUES (?)', [userId]);
          }
        }
      }

    } else {
      // Create new user
      const [userResult] = await pool.query(
        `INSERT INTO users (name, email, google_id, is_active, email_verified, email_verified_at, created_at) 
         VALUES (?, ?, ?, 1, 1, NOW(), NOW())`,
        [name, email, googleId]
      );

      userId = userResult.insertId;

      // Assign customer role
      const [customerRole] = await pool.query(
        'SELECT id FROM roles WHERE name = ? LIMIT 1',
        ['customer']
      );

      if (customerRole.length > 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, customerRole[0].id]
        );
      }

      // Create customer record
      await pool.query('INSERT INTO customers (id) VALUES (?)', [userId]);
    }

    // Fetch complete user info with role
    const [users] = await pool.query(
      'SELECT id, name, email, phone_number FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    const [roles] = await pool.query(
      `SELECT r.id AS role_id, r.name AS role_name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (roles.length > 0) {
      user.role = roles[0].role_name;
      user.role_id = roles[0].role_id;
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'customer',
        role_id: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'customer',
        role_id: user.role_id
      }
    });

  } catch (error) {
    console.error('Mobile Google OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed', message: error?.message || 'Authentication failed' });
  }
});

// Get user info from OAuth token (optional endpoint for debugging)
router.get('/user', 
  passport.authenticate('jwt', { session: false }), 
  (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        role_id: req.user.role_id
      }
    });
  }
);

module.exports = router;
