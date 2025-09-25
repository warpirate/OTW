const nodemailer = require('nodemailer');

// Simple Hostinger SMTP transporter (clean version)
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.USER_GMAIL,
    pass: process.env.USER_PASSWORD,
  },
});

const FROM_ADDRESS = process.env.USER_GMAIL || 'info@omwhub.com';

// Verify transporter configuration
const verifyTransporter = async () => {
    try {
        const verified = await transporter.verify();
        console.log('✅ Email service is ready', {
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          user: process.env.USER_GMAIL,
          verified
        });
        return true;
    } catch (error) {
        console.error('❌ Email service configuration error:', {
          message: error.message,
          code: error.code,
          command: error.command,
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          user: process.env.USER_GMAIL,
        });
        return false;
    }
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email to customer
const sendOTPEmail = async (customerEmail, customerName, otp, workerName, bookingId, serviceName) => {
    try {
        const mailOptions = {
            from: {
                name: 'OTW Service',
                address: FROM_ADDRESS
            },
            to: customerEmail,
            subject: `Service Verification Code - Booking #${bookingId}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Service Verification Code</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 10px 0; }
                        .info-box { background: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                        .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Service Verification Required</h1>
                            <p>Your service provider has arrived and needs verification</p>
                        </div>
                        
                        <div class="content">
                            <h2>Hello ${customerName},</h2>
                            
                            <div class="info-box">
                                <strong>📍 Service Details:</strong><br>
                                • Booking ID: #${bookingId}<br>
                                • Service: ${serviceName}<br>
                                • Provider: ${workerName}
                            </div>
                            
                            <p>Your service provider <strong>${workerName}</strong> has arrived at your location and is ready to start the service. To proceed, please share the verification code below with your service provider:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0; font-size: 16px; color: #666;">Your Verification Code</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 0; font-size: 14px; color: #999;">Valid for 15 minutes</p>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Important Security Notice:</strong><br>
                                • Only share this code with your assigned service provider<br>
                                • Do not share this code via phone or message<br>
                                • Verify the provider's identity before sharing<br>
                                • This code expires in 15 minutes
                            </div>
                            
                            <h3>🛡️ How to verify your service provider:</h3>
                            <ul>
                                <li>Check their name matches: <strong>${workerName}</strong></li>
                                <li>Ask them to show their service provider ID</li>
                                <li>Verify they know your booking details</li>
                                <li>Only then share the 6-digit code above</li>
                            </ul>
                            
                            <p>Once you share this code with your service provider, they will be able to start the service. After completion, you'll receive a payment confirmation.</p>
                            
                            <div class="footer">
                                <p>Need help? Contact our support team</p>
                                <p style="color: #999; font-size: 12px;">
                                    This is an automated message from OTW Service Platform.<br>
                                    Please do not reply to this email.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Service Verification Code - Booking #${bookingId}

Hello ${customerName},

Your service provider ${workerName} has arrived at your location for ${serviceName}.

Verification Code: ${otp}

Please share this 6-digit code with your service provider to start the service.

Important:
- Only share with your assigned provider
- Code expires in 15 minutes
- Verify provider identity first

Booking Details:
- ID: #${bookingId}
- Service: ${serviceName}
- Provider: ${workerName}

Thank you for using OTW Service Platform.
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ OTP email sent successfully:', result.messageId);
        return {
            success: true,
            messageId: result.messageId
        };
    } catch (error) {
        console.error('❌ Failed to send OTP email:', {
          message: error.message,
          code: error.code,
          response: error.response,
          responseCode: error.responseCode,
        });
        return {
            success: false,
            error: error.message
        };
    }
};

// Send service completion notification
const sendServiceCompletionEmail = async (customerEmail, customerName, bookingId, serviceName, workerName, amount) => {
    try {
        const mailOptions = {
            from: {
                name: 'OTW Service',
                address: FROM_ADDRESS
            },
            to: customerEmail,
            subject: `Service Completed - Booking #${bookingId}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                        .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Service Completed Successfully!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${customerName},</h2>
                            <div class="success-box">
                                <strong>Service Details:</strong><br>
                                • Booking ID: #${bookingId}<br>
                                • Service: ${serviceName}<br>
                                • Provider: ${workerName}<br>
                                • Amount: ₹${amount}
                            </div>
                            <p>Your service has been completed successfully. Thank you for using OTW Service Platform!</p>
                            <p>You can now proceed with the payment process.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send completion email:', {
          message: error.message,
          code: error.code,
          response: error.response,
          responseCode: error.responseCode,
        });
        return { success: false, error: error.message };
    }
};

module.exports = {
    verifyTransporter,
    generateOTP,
    sendOTPEmail,
    sendServiceCompletionEmail,
    // New: send email verification link
    sendVerificationEmail: async (toEmail, toName, verifyUrl) => {
        try {
            const mailOptions = {
                from: {
                    name: 'OTW Service',
                    address: FROM_ADDRESS
                },
                to: toEmail,
                subject: 'Verify your email address',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #111;">
                      <h2>Welcome to OTW, ${toName || 'there'}!</h2>
                      <p>Thanks for signing up. Please verify your email address by clicking the button below:</p>
                      <p style="text-align:center; margin: 28px 0;">
                        <a href="${verifyUrl}" style="background:#6d28d9; color:#fff; padding:12px 22px; text-decoration:none; border-radius:6px;">Verify Email</a>
                      </p>
                      <p>If the button doesn't work, copy and paste this link into your browser:</p>
                      <p style="word-break: break-all; color:#555;">${verifyUrl}</p>
                      <p style="color:#777; font-size: 12px;">If you did not create an account, you can safely ignore this email.</p>
                    </div>
                `,
                text: `Welcome to OTW!\n\nPlease verify your email by visiting: ${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`
            };
            const result = await transporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send verification email:', {
              message: error.message,
              code: error.code,
              response: error.response,
              responseCode: error.responseCode,
            });
            return { success: false, error: error.message };
        }
    },
    
    // Send password reset email
    sendPasswordResetEmail: async (toEmail, toName, resetUrl) => {
        try {
            const mailOptions = {
                from: {
                    name: 'OTW Service',
                    address: FROM_ADDRESS
                },
                to: toEmail,
                subject: 'Reset your password - OTW Service',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1>🔐 Password Reset Request</h1>
                            <p>We received a request to reset your password</p>
                        </div>
                        
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                            <h2>Hello ${toName || 'there'},</h2>
                            
                            <p>You requested to reset your password for your OTW Service account. Click the button below to create a new password:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password</a>
                            </div>
                            
                            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404;">
                                <strong>⚠️ Important:</strong><br>
                                • This link expires in 1 hour<br>
                                • If you didn't request this reset, you can safely ignore this email<br>
                                • Your password won't change until you create a new one
                            </div>
                            
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #555; background: #f0f0f0; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 14px;">
                                <p>If you have any questions, please contact our support team.</p>
                                <p>Best regards,<br>The OTW Service Team</p>
                            </div>
                        </div>
                    </div>
                `,
                text: `Password Reset Request\n\nHello ${toName || 'there'},\n\nYou requested to reset your password for your OTW Service account.\n\nPlease visit this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this reset, you can safely ignore this email.\n\nBest regards,\nThe OTW Service Team`
            };
            
            const result = await transporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send password reset email:', {
              message: error.message,
              code: error.code,
              response: error.response,
              responseCode: error.responseCode,
            });
            return { success: false, error: error.message };
        }
    },
    
    transporter
};
