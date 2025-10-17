const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
