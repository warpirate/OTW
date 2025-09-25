const express = require('express');
const router = express.Router();
const { sendTestEmail, verifyTransporter } = require('../../services/emailService');

// Test email endpoint
router.post('/test-email', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email address is required' 
        });
    }
    
    try {
        console.log('📧 Testing email service...');
        
        // First verify the transporter
        const isConfigured = await verifyTransporter();
        
        if (!isConfigured) {
            return res.status(503).json({
                success: false,
                message: 'Email service is not properly configured. Please check your SMTP settings and credentials.',
                details: {
                    smtp_host: 'smtp.hostinger.com',
                    smtp_port: 465,
                    smtp_secure: true,
                    from_email: process.env.USER_GMAIL || 'Not configured'
                }
            });
        }
        
        // Send test email
        const result = await sendTestEmail(email);
        
        if (result.success) {
            return res.json({
                success: true,
                message: 'Test email sent successfully!',
                messageId: result.messageId,
                details: {
                    to: email,
                    from: process.env.USER_GMAIL,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error,
                attempts: result.attempts || 1
            });
        }
    } catch (error) {
        console.error('Email test endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while testing email',
            error: error.message
        });
    }
});

// Check email configuration endpoint
router.get('/check-config', async (req, res) => {
    try {
        const hasCredentials = !!(process.env.USER_GMAIL && process.env.USER_PASSWORD);
        const isConfigured = await verifyTransporter();
        
        return res.json({
            success: isConfigured,
            configuration: {
                credentials_present: hasCredentials,
                smtp_host: 'smtp.hostinger.com',
                smtp_port: 465,
                smtp_secure: true,
                from_email: process.env.USER_GMAIL || 'Not configured',
                transporter_verified: isConfigured
            },
            message: isConfigured 
                ? 'Email service is properly configured and ready' 
                : 'Email service configuration failed. Check server logs for details.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error checking email configuration',
            error: error.message
        });
    }
});

module.exports = router;
