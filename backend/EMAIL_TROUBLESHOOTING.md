# Email Service Troubleshooting Guide

## Overview
The OTW application uses Hostinger SMTP service for sending emails. This guide helps troubleshoot common email issues.

## Current Configuration
- **SMTP Host**: smtp.hostinger.com
- **Port**: 465 (SSL/TLS)
- **Authentication**: Username/Password
- **From Address**: info@omwhub.com

## Features Implemented
1. ✅ **Connection Pooling**: Maintains persistent connections for better performance
2. ✅ **Retry Mechanism**: Automatic retry with exponential backoff (up to 3 attempts)
3. ✅ **Comprehensive Logging**: Detailed error messages and debugging information
4. ✅ **Timeout Configuration**: Prevents hanging connections
5. ✅ **Rate Limiting**: Prevents overwhelming the SMTP server
6. ✅ **TLS Support**: Secure email transmission

## Testing the Email Service

### Method 1: Using the Test Script
```bash
cd backend
node test-email.js
```

### Method 2: Using the API Endpoint
```bash
# Start the server
npm run dev

# Test email configuration
curl http://localhost:5001/api/test/email/check-config

# Send test email
curl -X POST http://localhost:5001/api/test/email/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

## Common Issues and Solutions

### 1. Emails Not Being Received

**Possible Causes:**
- Incorrect SMTP credentials
- Emails going to spam folder
- Firewall blocking port 465
- ISP blocking SMTP connections

**Solutions:**
```bash
# Check environment variables
echo $USER_GMAIL
echo $USER_PASSWORD

# Verify they match your Hostinger email account
```

### 2. Authentication Failed (EAUTH)

**Issue**: Invalid credentials or account settings

**Solutions:**
1. Verify email and password in .env file
2. Ensure the email account exists in Hostinger
3. Check if 2FA is enabled (may need app-specific password)
4. Verify account is not suspended

### 3. Connection Timeout (ETIMEDOUT)

**Issue**: Cannot connect to SMTP server

**Solutions:**
1. Check internet connection
2. Verify firewall settings:
   ```bash
   # Windows - Check if port 465 is open
   netstat -an | findstr :465
   ```
3. Try alternative ports if available
4. Check with ISP if they block SMTP

### 4. Connection Refused (ECONNREFUSED)

**Issue**: Server actively refusing connection

**Solutions:**
1. Verify SMTP host is correct: `smtp.hostinger.com`
2. Check if Hostinger service is operational
3. Try using telnet to test connection:
   ```bash
   telnet smtp.hostinger.com 465
   ```

## Environment Variables

Required in `.env` file:
```env
USER_GMAIL=info@omwhub.com
USER_PASSWORD=YourPasswordHere
FRONTEND_URL=http://localhost:5173
```

## Email Types Sent

1. **Verification Emails**: Sent after user registration
2. **Password Reset Emails**: For forgot password flow
3. **OTP Emails**: For service verification
4. **Service Completion Emails**: After service is completed

## Debugging Tips

### Enable Debug Mode
In `services/emailService.js`, set:
```javascript
logger: true,  // Enable logging
debug: true,   // Enable debug mode
```

### Check Server Logs
Look for these log patterns:
- `🚀 Initializing email service...` - Service startup
- `✅ Email service is ready` - Successful configuration
- `❌ Email service configuration error` - Configuration failed
- `✅ Email sent successfully` - Email sent
- `🔄 Retrying in Xms...` - Retry attempt

### Test with Different Email Providers
Try sending to different email providers:
- Gmail
- Outlook/Hotmail
- Yahoo
- Your domain email

## Alternative SMTP Services

If Hostinger continues to have issues, consider:

1. **SendGrid** (Free tier: 100 emails/day)
   ```javascript
   host: 'smtp.sendgrid.net',
   port: 587,
   auth: {
     user: 'apikey',
     pass: 'YOUR_SENDGRID_API_KEY'
   }
   ```

2. **Gmail** (Less secure, requires app password)
   ```javascript
   host: 'smtp.gmail.com',
   port: 587,
   auth: {
     user: 'your-email@gmail.com',
     pass: 'your-app-password'
   }
   ```

3. **Mailgun** (Free tier: 5,000 emails/month)
   ```javascript
   host: 'smtp.mailgun.org',
   port: 587,
   auth: {
     user: 'postmaster@YOUR_DOMAIN',
     pass: 'YOUR_MAILGUN_PASSWORD'
   }
   ```

## Monitoring Email Delivery

### Success Metrics
- Message ID returned
- No errors in logs
- Email received in inbox

### Failure Metrics
- Error codes (EAUTH, ETIMEDOUT, etc.)
- Retry attempts exhausted
- Bounce notifications

## Production Recommendations

1. **Use Email Queue**: Implement a queue system (Bull, RabbitMQ) for reliable delivery
2. **Add Webhooks**: Track delivery status with webhook endpoints
3. **Implement Templates**: Use template engines for consistent email formatting
4. **Add Analytics**: Track open rates and click-through rates
5. **Set up SPF/DKIM**: Improve deliverability with proper DNS records
6. **Monitor Reputation**: Keep track of sender reputation

## Contact Support

If issues persist:
1. Contact Hostinger support with error logs
2. Check Hostinger email service status page
3. Review account limitations and quotas

## Quick Checklist

- [ ] Environment variables set correctly
- [ ] Internet connection working
- [ ] Port 465 not blocked
- [ ] Credentials are valid
- [ ] Email account active
- [ ] No typos in email addresses
- [ ] Checked spam folder
- [ ] Server logs reviewed
