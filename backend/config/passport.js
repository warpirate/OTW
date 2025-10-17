const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
require('dotenv').config();

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, phone_number FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
    
    if (users.length === 0) {
      return done(null, false);
    }
    
    const user = users[0];
    
    // Get user role
    const [roles] = await pool.query(
      `SELECT r.id AS role_id, r.name AS role_name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?
       LIMIT 1`,
      [user.id]
    );
    
    if (roles.length > 0) {
      user.role = roles[0].role_name;
      user.role_id = roles[0].role_id;
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const googleId = profile.id;
      const profilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

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

      return done(null, user);

    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
