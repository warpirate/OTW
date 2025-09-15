# UPI Payment Backend Setup Instructions

## Prerequisites
- Node.js and npm installed
- MySQL database running
- Existing OMW backend setup

## Setup Steps

### 1. Database Migration

Run the database migration to create the required tables:

```bash
cd OMW/backend
node scripts/migrate_payment_tables.js
```

This will create the following tables:
- `upi_payment_methods` - Store user UPI payment methods
- `upi_transactions` - Store UPI payment transactions
- Updates existing `payments` and `bookings` tables

### 2. Install Dependencies

The payment functionality uses existing dependencies. No additional packages are required.

### 3. Environment Variables

Ensure your `.env` file has the required database configuration:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret
BASE_URL1=/api
```

### 4. Start the Server

```bash
npm start
# or for development
npm run dev
```

## API Endpoints

The payment API is now available at:
- Base URL: `http://localhost:5001/api/payment`

### Available Endpoints:
- `GET /api/payment/upi-methods` - Get user's UPI methods
- `POST /api/payment/upi-methods` - Add new UPI method
- `PATCH /api/payment/upi-methods/:id/set-default` - Set default method
- `DELETE /api/payment/upi-methods/:id` - Delete UPI method
- `POST /api/payment/upi/initiate` - Initiate UPI payment
- `GET /api/payment/upi/verify/:paymentId` - Verify payment status
- `GET /api/payment/history` - Get payment history

## Testing the API

### 1. Test UPI Method Management

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

### 2. Test Payment Processing

```bash
# Initiate payment
curl -X POST "http://localhost:5001/api/payment/upi/initiate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "upi_id": "test@paytm",
    "description": "Test Payment",
    "booking_id": 1
  }'
```

## Integration with Mobile App

The mobile app is already configured to use these endpoints. The frontend service (`src/services/payment.ts`) will automatically connect to:

- `GET /api/payment/upi-methods` → `PaymentService.getUPIMethods()`
- `POST /api/payment/upi-methods` → `PaymentService.addUPIMethod()`
- `PATCH /api/payment/upi-methods/:id/set-default` → `PaymentService.setDefaultUPIMethod()`
- `DELETE /api/payment/upi-methods/:id` → `PaymentService.deleteUPIMethod()`
- `POST /api/payment/upi/initiate` → `PaymentService.initiateUPIPayment()`
- `GET /api/payment/upi/verify/:paymentId` → `PaymentService.verifyUPIPayment()`
- `GET /api/payment/history` → `PaymentService.getPaymentHistory()`

## Production Deployment

### 1. Database Setup
Run the migration script on your production database:

```bash
NODE_ENV=production node scripts/migrate_payment_tables.js
```

### 2. UPI Gateway Integration

For production, replace the mock payment processing in `routes/customer_management/payments.js` with actual UPI gateway integration:

1. **Choose UPI Gateway Provider:**
   - Razorpay UPI
   - PayU UPI
   - Direct bank APIs
   - NPCI UPI APIs

2. **Update Payment Processing:**
   - Replace mock logic in `/upi/initiate` endpoint
   - Implement webhook handling for payment status updates
   - Add proper error handling and logging

3. **Security Considerations:**
   - Implement rate limiting
   - Add request validation
   - Use HTTPS in production
   - Implement proper logging and monitoring

### 3. Environment Configuration

Update production environment variables:

```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASS=your_production_db_password
DB_NAME=your_production_db_name
JWT_SECRET=your_secure_jwt_secret
BASE_URL1=/api
```

## Troubleshooting

### Common Issues:

1. **Database Connection Error:**
   - Check database credentials in `.env`
   - Ensure MySQL server is running
   - Verify database exists

2. **Migration Fails:**
   - Check if tables already exist
   - Verify database permissions
   - Check MySQL version compatibility

3. **API Authentication Error:**
   - Ensure JWT token is valid
   - Check token format: `Bearer <token>`
   - Verify JWT_SECRET matches

4. **Payment Processing Error:**
   - Check request payload format
   - Verify UPI ID format
   - Check database constraints

### Logs and Debugging:

Enable detailed logging by setting:
```env
DEBUG=payment:*
```

Check server logs for detailed error information.

## Support

For issues or questions:
1. Check the API documentation in `PAYMENT_API_DOCUMENTATION.md`
2. Review server logs for error details
3. Verify database schema matches expected structure
4. Test with Postman or curl to isolate issues
