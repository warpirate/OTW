# Payment API Documentation

## Overview
This document describes the UPI payment management API endpoints for the OMW backend.

## Base URL
```
/api/payment
```

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Get UPI Payment Methods
**GET** `/upi-methods`

Get all active UPI payment methods for the authenticated user.

**Response:**
```json
{
  "success": true,
  "payment_methods": [
    {
      "id": 1,
      "upi_id": "user@paytm",
      "provider_name": "Paytm",
      "is_default": true,
      "is_active": 1,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 2. Add UPI Payment Method
**POST** `/upi-methods`

Add a new UPI payment method for the authenticated user.

**Request Body:**
```json
{
  "upi_id": "user@paytm",
  "provider_name": "Paytm",
  "is_default": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "UPI payment method added successfully",
  "payment_method": {
    "id": 2,
    "user_id": 1,
    "upi_id": "user@paytm",
    "provider_name": "Paytm",
    "is_default": 0,
    "is_active": 1,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Set Default UPI Payment Method
**PATCH** `/upi-methods/:id/set-default`

Set a UPI payment method as the default for the authenticated user.

**Response:**
```json
{
  "success": true,
  "message": "Default payment method updated successfully"
}
```

### 4. Delete UPI Payment Method
**DELETE** `/upi-methods/:id`

Delete (soft delete) a UPI payment method.

**Response:**
```json
{
  "success": true,
  "message": "Payment method deleted successfully"
}
```

### 5. Initiate UPI Payment
**POST** `/upi/initiate`

Initiate a UPI payment transaction.

**Request Body:**
```json
{
  "amount": 500.00,
  "upi_id": "user@paytm",
  "description": "Service Payment",
  "booking_id": 123
}
```

**Response (Success):**
```json
{
  "success": true,
  "payment_id": "TXN_1705312200000_ABC123DEF",
  "transaction_id": "UPI_1705312200000_XYZ789GHI",
  "message": "Payment completed successfully"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Payment failed - insufficient funds"
}
```

### 6. Verify UPI Payment
**GET** `/upi/verify/:paymentId`

Verify the status of a UPI payment transaction.

**Response:**
```json
{
  "success": true,
  "payment_id": "TXN_1705312200000_ABC123DEF",
  "transaction_id": "UPI_1705312200000_XYZ789GHI",
  "status": "completed",
  "amount": 500.00,
  "upi_id": "user@paytm",
  "provider_name": "Paytm",
  "created_at": "2024-01-15T10:30:00.000Z",
  "completed_at": "2024-01-15T10:30:05.000Z"
}
```

### 7. Get Payment History
**GET** `/history`

Get payment history for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 20)
- `offset` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": 1,
      "booking_id": 123,
      "user_id": 1,
      "method": "upi",
      "payment_type": "upi",
      "status": "captured",
      "amount_paid": 500.00,
      "currency": "INR",
      "created_at": "2024-01-15T10:30:00.000Z",
      "upi_transaction_id": 1,
      "upi_status": "completed",
      "upi_id": "user@paytm",
      "provider_name": "Paytm",
      "booking_type": "service"
    }
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

## Database Schema

### upi_payment_methods
- `id` - Primary key
- `user_id` - Foreign key to users table
- `upi_id` - UPI identifier (e.g., user@paytm)
- `provider_name` - Payment provider name
- `is_default` - Boolean flag for default method
- `is_active` - Boolean flag for soft delete
- `created_at` - Timestamp
- `updated_at` - Timestamp

### upi_transactions
- `id` - Primary key
- `user_id` - Foreign key to users table
- `booking_id` - Foreign key to bookings table (optional)
- `upi_payment_method_id` - Foreign key to upi_payment_methods
- `transaction_id` - Unique transaction identifier
- `upi_transaction_id` - UPI gateway transaction ID
- `amount` - Transaction amount
- `currency` - Currency code (default: INR)
- `status` - Transaction status
- `payment_gateway_response` - JSON response from gateway
- `failure_reason` - Failure reason if applicable
- `initiated_at` - Transaction start time
- `completed_at` - Transaction completion time
- `created_at` - Record creation time
- `updated_at` - Record update time

## Integration Notes

1. **UPI ID Validation**: The API validates UPI IDs using regex pattern `/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/`

2. **Provider Detection**: The API automatically detects payment providers from UPI IDs

3. **Default Method Management**: Only one UPI method can be set as default per user

4. **Soft Delete**: Payment methods are soft deleted (is_active = 0) to maintain transaction history

5. **Transaction Status**: UPI transactions can have statuses: pending, processing, completed, failed, cancelled, refunded

6. **Mock Implementation**: Currently uses mock payment processing (90% success rate) for development

## Production Considerations

For production deployment, replace the mock payment processing in `/upi/initiate` with actual UPI gateway integration:

1. **UPI Gateway Integration**: Integrate with providers like Razorpay UPI, PayU, or direct bank APIs
2. **Webhook Handling**: Implement webhook endpoints for payment status updates
3. **Security**: Implement additional security measures for payment processing
4. **Logging**: Add comprehensive logging for payment transactions
5. **Monitoring**: Set up monitoring and alerting for payment failures
