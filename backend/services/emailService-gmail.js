// Alternative Gmail SMTP configuration
const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP transporter (for better deliverability)
const gmailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'tulasi12115045@gmail.com', // Your Gmail address
        pass: 'your-app-password-here',   // Gmail App Password (not regular password)
    },
    tls: {
        rejectUnauthorized: false
    }
});

// To use Gmail SMTP:
// 1. Go to Google Account settings
// 2. Enable 2-Factor Authentication
// 3. Generate an "App Password" for "Mail"
// 4. Use that app password in the configuration above
// 5. Replace the transporter in emailService.js

module.exports = gmailTransporter;

/*
INSTRUCTIONS TO SETUP GMAIL SMTP:

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords" section
4. Generate a new app password for "Mail"
5. Update your .env file:
   USER_GMAIL=tulasi12115045@gmail.com
   USER_PASSWORD=your-16-character-app-password

This will have much better deliverability than Hostinger SMTP.
*/
