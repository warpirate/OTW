# Email-Based OTP Verification System

This document describes the new email-based OTP verification system that replaces the previous manual OTP generation for service verification between workers and customers.

## Overview

The system now uses email to send OTP codes to customers when workers arrive at their location. This provides better security and user experience compared to manually sharing OTP codes.

## System Flow

1. **Worker Arrives**: Worker updates booking status to "arrived"
2. **Send OTP Email**: Worker clicks "Send OTP Email" button in their app
3. **Email Sent**: System generates 6-digit OTP and emails it to customer
4. **Customer Receives**: Customer gets email with OTP code and security instructions
5. **Customer Shares**: Customer verbally shares the OTP with the worker
6. **Worker Verifies**: Worker enters OTP in their app to start service
7. **Service Starts**: System updates booking status to "in_progress"

## API Endpoints

### Worker Endpoints

#### POST `/api/worker-management/send-otp-email`
Sends OTP email to customer when worker has arrived.

**Request Body:**
```json
{
  "booking_id": 123
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully to customer@email.com",
  "customer_email": "customer@email.com",
  "expires_at": "2025-09-24T15:45:00.000Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Please wait 12 minutes before requesting a new OTP"
}
```

#### POST `/api/worker-management/verify-otp`
Verifies OTP provided by customer and starts service.

**Request Body:**
```json
{
  "booking_id": 123,
  "otp_code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully. Service has started.",
  "status": "in_progress"
}
```

### Customer Endpoints

#### GET `/api/customer/bookings/:bookingId/otp-status`
Allows customer to check OTP status for their booking.

**Response:**
```json
{
  "success": true,
  "has_otp": true,
  "otp_valid": true,
  "expires_at": "2025-09-24T15:45:00.000Z",
  "service_status": "arrived",
  "message": "OTP is active and valid"
}
```

## Email Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Hostinger SMTP Configuration
USER_GMAIL=your_business_email@yourdomain.com
USER_PASSWORD=your_hostinger_email_password
```

### Email Service Features

- **Professional Templates**: HTML emails with company branding
- **Security Instructions**: Clear guidance on OTP sharing
- **Expiration Handling**: 15-minute OTP validity
- **Spam Prevention**: Rate limiting to prevent abuse
- **Fallback Text**: Plain text version for all email clients

## Database Changes

### New Column Added

```sql
ALTER TABLE bookings 
ADD COLUMN otp_expires_at DATETIME NULL 
COMMENT 'Expiration timestamp for OTP codes sent via email'
AFTER otp_code;
```

### Migration Script

Run the migration script:
```bash
mysql -u your_user -p omw_db < database_updates/add_otp_expires_at.sql
```

## Security Features

1. **Time-Limited OTPs**: 15-minute expiration
2. **Rate Limiting**: Prevents spam (one OTP per 15 minutes)
3. **Access Control**: Only assigned workers can send OTPs
4. **Email Validation**: Ensures customer has valid email
5. **Secure Templates**: Instructions on safe OTP sharing

## Error Handling

### Common Error Scenarios

1. **No Customer Email**: Returns 400 if customer email not found
2. **Wrong Booking Status**: Must be in "arrived" status
3. **Rate Limited**: Prevents sending multiple OTPs quickly
4. **Expired OTP**: Clear messaging when OTP expires
5. **Invalid OTP**: Helpful error when verification fails

### Email Delivery Issues

- System logs email failures
- Removes OTP from database if email fails
- Provides clear error messages to workers

## Testing

### Prerequisites

1. Install nodemailer: `npm install nodemailer`
2. Set up Hostinger email credentials in `.env`
3. Run database migration
4. Restart backend server

### Test Scenarios

#### 1. Complete OTP Flow
```bash
# 1. Create a booking and assign worker
POST /api/customer/driver/book-ride

# 2. Worker updates status to arrived
PUT /api/worker-management/bookings/123/status
{"status": "arrived"}

# 3. Worker sends OTP email
POST /api/worker-management/send-otp-email
{"booking_id": 123}

# 4. Check customer email for OTP
# 5. Worker verifies OTP
POST /api/worker-management/verify-otp
{"booking_id": 123, "otp_code": "123456"}
```

#### 2. Error Cases
```bash
# Test rate limiting
POST /api/worker-management/send-otp-email (twice quickly)

# Test invalid OTP
POST /api/worker-management/verify-otp
{"booking_id": 123, "otp_code": "000000"}

# Test expired OTP (wait 16 minutes)
POST /api/worker-management/verify-otp
{"booking_id": 123, "otp_code": "123456"}
```

## Frontend Integration

### Worker App Changes Needed

1. **Replace "Generate OTP" button** with "Send OTP Email"
2. **Add OTP input field** for verification
3. **Show customer email** when OTP is sent
4. **Display expiration timer** for OTP validity
5. **Handle error states** (rate limiting, email failures)

### Customer App Changes Needed

1. **Add OTP status check** endpoint call
2. **Show email notification** when OTP is sent
3. **Display OTP instructions** in booking details
4. **Add email verification** reminder if no email

## Socket.IO Events

The system emits these real-time events:

- `status_update`: When service starts after OTP verification
- `trip_started`: Specific event for service start

## Monitoring and Logs

### Log Messages

- `✅ OTP email sent successfully: {messageId}`
- `❌ Failed to send OTP email: {error}`
- `✅ Email service is ready`
- `❌ Email service configuration error`

### Metrics to Monitor

1. OTP email delivery success rate
2. OTP verification success rate
3. Average time from email send to verification
4. Rate limiting trigger frequency

## Troubleshooting

### Common Issues

1. **Email not received**:
   - Check spam folder
   - Verify Hostinger credentials
   - Check email service logs

2. **OTP expired**:
   - Request new OTP
   - Check system time sync

3. **Rate limiting**:
   - Wait for cooldown period
   - Check if multiple requests sent

4. **Invalid OTP**:
   - Ensure correct 6-digit code
   - Check for typos
   - Verify OTP hasn't expired

### Configuration Verification

```javascript
// Test email service in Node.js console
const { verifyTransporter } = require('./services/emailService');
verifyTransporter().then(console.log);
```

## Migration from Old System

### Backward Compatibility

- Old OTP codes without expiration are handled
- Existing bookings continue to work
- Gradual rollout possible

### Cleanup Tasks

1. Remove old OTP generation endpoints
2. Update frontend to use new endpoints
3. Train workers on new process
4. Monitor email delivery rates

## Future Enhancements

1. **SMS Fallback**: If email fails, send SMS
2. **Multiple Languages**: Localized email templates
3. **Push Notifications**: Mobile app notifications
4. **QR Codes**: Alternative verification method
5. **Analytics Dashboard**: OTP usage statistics

## Support

For issues with the email OTP system:

1. Check server logs for email errors
2. Verify environment variables
3. Test email service configuration
4. Monitor database for OTP records
5. Check customer email validity
