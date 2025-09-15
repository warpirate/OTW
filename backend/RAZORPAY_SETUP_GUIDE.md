# Razorpay UPI Integration Setup Guide

## Overview
This guide will help you set up a complete, production-ready Razorpay UPI payment integration for your OMW backend.

## Prerequisites
- Razorpay account (https://razorpay.com)
- Node.js and npm installed
- MySQL database running
- Existing OMW backend setup

## Step 1: Razorpay Account Setup

### 1.1 Create Razorpay Account
1. Go to https://razorpay.com and sign up
2. Complete KYC verification
3. Activate your account

### 1.2 Get API Keys
1. Login to Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate API Keys:
   - **Test Mode**: Use for development
   - **Live Mode**: Use for production

### 1.3 Configure Webhooks
1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.authorized`
   - `order.paid`
4. Copy the webhook secret

## Step 2: Environment Configuration

### 2.1 Update .env File
Add the following to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Existing configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret
BASE_URL1=/api
```

### 2.2 Production Environment
For production, use live mode keys:

```env
# Production Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret
```

## Step 3: Install Dependencies

```bash
cd OMW/backend
npm install razorpay@^2.9.2
```

## Step 4: Database Migration

Run the database migration to create payment tables:

```bash
node scripts/migrate_payment_tables.js
```

## Step 5: Start the Server

```bash
npm start
# or for development
npm run dev
```

## Step 6: Test the Integration

### 6.1 Test UPI Method Management

```bash
# Get UPI methods (requires authentication)
curl -X GET "http://localhost:5001/api/payment/upi-methods" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Add new UPI method
curl -X POST "http://localhost:5001/api/payment/upi-methods" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "upi_id": "test@paytm",
    "provider_name": "Paytm",
    "is_default": true
  }'
```

### 6.2 Test Payment Processing

```bash
# Initiate payment
curl -X POST "http://localhost:5001/api/payment/upi/initiate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "upi_id": "test@paytm",
    "description": "Test Payment",
    "booking_id": 1
  }'
```

### 6.3 Test Payment Verification

```bash
# Verify payment status
curl -X GET "http://localhost:5001/api/payment/upi/verify/TXN_1234567890_ABC123DEF" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 7: Mobile App Integration

The mobile app is already configured to work with the Razorpay backend. The payment flow will be:

1. User selects UPI payment method
2. App calls `/api/payment/upi/initiate`
3. Razorpay creates UPI payment request
4. User completes payment in UPI app
5. App polls `/api/payment/upi/verify` for status
6. Webhook updates payment status in database

## Step 8: Production Deployment

### 8.1 SSL Certificate
Ensure your production server has SSL certificate for webhook security.

### 8.2 Webhook URL
Update webhook URL in Razorpay dashboard to your production domain:
```
https://yourdomain.com/api/webhooks/razorpay/webhook
```

### 8.3 Environment Variables
Update production environment with live Razorpay keys.

### 8.4 Monitoring
Set up monitoring for:
- Payment success/failure rates
- Webhook delivery status
- API response times

## API Endpoints

### Payment Methods
- `GET /api/payment/upi-methods` - Get user's UPI methods
- `POST /api/payment/upi-methods` - Add new UPI method
- `PATCH /api/payment/upi-methods/:id/set-default` - Set default method
- `DELETE /api/payment/upi-methods/:id` - Delete UPI method

### Payment Processing
- `POST /api/payment/upi/initiate` - Initiate UPI payment
- `GET /api/payment/upi/verify/:paymentId` - Verify payment status
- `GET /api/payment/history` - Get payment history

### Webhooks
- `POST /api/webhooks/razorpay/webhook` - Razorpay webhook handler

## Payment Flow

1. **Initiate Payment**:
   - Client calls `/api/payment/upi/initiate`
   - Backend creates Razorpay order and UPI payment request
   - Returns payment details to client

2. **User Payment**:
   - User receives UPI payment request in their UPI app
   - User completes payment in UPI app

3. **Status Updates**:
   - Razorpay sends webhook to `/api/webhooks/razorpay/webhook`
   - Backend updates payment status in database
   - Client polls `/api/payment/upi/verify` for status updates

4. **Completion**:
   - Payment status updated to 'completed' or 'failed'
   - Booking payment status updated
   - Payment record created in main payments table

## Error Handling

The integration includes comprehensive error handling:

- **Validation Errors**: Invalid UPI ID, missing parameters
- **Payment Failures**: Insufficient funds, network issues
- **Webhook Failures**: Invalid signatures, processing errors
- **Timeout Handling**: Payment polling timeout

## Security Features

- **JWT Authentication**: All endpoints require valid JWT token
- **Webhook Signature Verification**: Validates Razorpay webhook signatures
- **Input Validation**: Validates all input parameters
- **SQL Injection Protection**: Uses parameterized queries
- **Rate Limiting**: Can be added for production

## Troubleshooting

### Common Issues:

1. **Webhook Not Receiving**:
   - Check webhook URL is accessible
   - Verify SSL certificate
   - Check webhook secret configuration

2. **Payment Not Completing**:
   - Check Razorpay dashboard for payment status
   - Verify UPI ID format
   - Check network connectivity

3. **Database Errors**:
   - Verify database migration completed
   - Check database permissions
   - Verify table structure

### Debug Mode:
Enable debug logging by setting:
```env
DEBUG=payment:*,razorpay:*
```

## Support

For issues:
1. Check Razorpay dashboard for payment status
2. Review server logs for error details
3. Verify webhook delivery in Razorpay dashboard
4. Test with Razorpay test UPI IDs

## Test UPI IDs

For testing, use these Razorpay test UPI IDs:
- `success@razorpay` - Always succeeds
- `failure@razorpay` - Always fails
- `timeout@razorpay` - Times out

## Cost Structure

Razorpay charges:
- **UPI Payments**: 0.5% per transaction (minimum ₹2)
- **Setup Fee**: ₹0
- **Monthly Fee**: ₹0
- **Refund Fee**: ₹0 (first 1000 refunds per month)

## Compliance

Ensure compliance with:
- **PCI DSS**: Razorpay handles card data
- **RBI Guidelines**: For UPI payments
- **GST**: For payment processing
- **Data Protection**: User data handling
