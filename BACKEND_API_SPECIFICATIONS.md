# Backend API Specifications for OMW Booking System

## Overview
This document outlines the backend API endpoints required for the OMW (On My Way) booking system, specifically for the worker preference and availability features.

## Base URL
```
/api/customer
```

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Check Worker Availability

### Endpoint
```
POST /api/customer/bookings/check-worker-availability
```

### Purpose
Check which worker types (male/female) are available for a specific time slot at a given address.

### Request Body
```json
{
  "date": "2024-01-15",
  "time": "14:30",
  "address_id": 123,
  "services": [
    {
      "subcategory_id": 1,
      "quantity": 1
    }
  ]
}
```

### Request Parameters
- `date` (string, required): Date in YYYY-MM-DD format
- `time` (string, required): Time in HH:MM format (24-hour)
- `address_id` (integer, required): Customer's address ID
- `services` (array, required): Array of service objects
  - `subcategory_id` (integer, required): Service subcategory ID
  - `quantity` (integer, required): Number of services

### Response
```json
{
  "success": true,
  "data": {
    "male_available": true,
    "female_available": false,
    "any_available": true,
    "message": "Worker availability checked successfully"
  }
}
```

### Response Fields
- `male_available` (boolean): Whether male workers are available
- `female_available` (boolean): Whether female workers are available
- `any_available` (boolean): Whether any workers are available (should be true if either male or female is available)

### Error Responses
```json
{
  "success": false,
  "error": "No workers available for this time slot",
  "code": "NO_WORKERS_AVAILABLE"
}
```

---

## 2. Create Booking (Updated)

### Endpoint
```
POST /api/customer/bookings/create
```

### Purpose
Create a new booking with worker preference.

### Request Body
```json
{
  "cart_items": [
    {
      "subcategory_id": 1,
      "quantity": 1,
      "price": 2000.00
    }
  ],
  "scheduled_time": "2024-01-15 14:30:00",
  "address_id": 123,
  "notes": "Please call before arriving",
  "payment_method": "online",
  "worker_preference": "male"
}
```

### Request Parameters
- `cart_items` (array, required): Array of service items
- `scheduled_time` (string, required): Scheduled time in YYYY-MM-DD HH:mm:ss format (UTC)
- `address_id` (integer, required): Customer's address ID
- `notes` (string, optional): Special instructions
- `payment_method` (string, required): Payment method ("online")
- `worker_preference` (string, required): Worker preference ("any", "male", "female")

### Response
```json
{
  "success": true,
  "data": {
    "booking_ids": [456, 457],
    "total_amount": 2460.00,
    "message": "Booking created successfully"
  }
}
```

---

## 3. Database Schema Requirements

### Workers Table
```sql
CREATE TABLE workers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  gender ENUM('male', 'female') NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Worker Availability Table
```sql
CREATE TABLE worker_availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  worker_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  INDEX idx_worker_date (worker_id, date),
  INDEX idx_date_time (date, start_time, end_time)
);
```

### Bookings Table (Updated)
```sql
ALTER TABLE bookings ADD COLUMN worker_preference ENUM('any', 'male', 'female') DEFAULT 'any';
```

---

## 4. Business Logic Requirements

### Worker Availability Check Logic
1. **Input Validation**: Validate date, time, address_id, and services
2. **Service Area Check**: Verify if the address is within serviceable areas
3. **Worker Query**: Find workers who:
   - Are active and available
   - Can provide the requested services
   - Are available during the specified time slot
   - Are within service radius of the address
4. **Gender Filtering**: Separate workers by gender
5. **Response**: Return availability status for each gender

### Booking Creation Logic
1. **Validation**: Validate all input parameters
2. **Worker Assignment**: Based on preference:
   - If "any": Assign any available worker
   - If "male": Assign male worker (if available)
   - If "female": Assign female worker (if available)
3. **Fallback**: If preferred gender not available, assign any available worker
4. **Booking Creation**: Create booking records
5. **Notification**: Send notifications to customer and assigned worker

---

## 5. Error Handling

### Common Error Codes
- `INVALID_DATE_TIME`: Invalid date or time format
- `INVALID_ADDRESS`: Address not found or not serviceable
- `NO_WORKERS_AVAILABLE`: No workers available for the time slot
- `SERVICE_NOT_AVAILABLE`: Requested service not available
- `INVALID_WORKER_PREFERENCE`: Invalid worker preference value

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

---

## 6. Testing Requirements

### Test Cases for Worker Availability
1. **Valid Request**: Test with valid date, time, and address
2. **No Workers Available**: Test when no workers are available
3. **Only Male Available**: Test when only male workers are available
4. **Only Female Available**: Test when only female workers are available
5. **Invalid Address**: Test with non-serviceable address
6. **Past Time**: Test with past date/time
7. **Invalid Service**: Test with non-existent service

### Test Cases for Booking Creation
1. **Valid Booking**: Test with all valid parameters
2. **Worker Preference**: Test each preference type (any, male, female)
3. **Fallback Logic**: Test when preferred gender not available
4. **Invalid Preference**: Test with invalid worker preference
5. **Missing Parameters**: Test with missing required fields

---

## 7. Performance Considerations

### Database Indexes
- Index on `worker_availability(worker_id, date)`
- Index on `worker_availability(date, start_time, end_time)`
- Index on `workers(gender, is_active)`
- Index on `bookings(scheduled_time, status)`

### Caching Strategy
- Cache worker availability for frequently requested time slots
- Cache service area data
- Implement Redis for session management

### Rate Limiting
- Implement rate limiting for availability checks
- Limit booking creation attempts per user

---

## 8. Security Considerations

### Input Validation
- Sanitize all input parameters
- Validate date/time formats
- Check address ownership (user can only use their own addresses)
- Validate service IDs and quantities

### Authorization
- Verify JWT token for all requests
- Check user permissions for address access
- Validate booking ownership

### Data Protection
- Log all booking activities
- Encrypt sensitive data
- Implement audit trails

---

## 9. Monitoring and Logging

### Key Metrics to Track
- Worker availability check response times
- Booking creation success rates
- Worker assignment accuracy
- API error rates

### Logging Requirements
- Log all API requests and responses
- Log worker availability queries
- Log booking creation attempts
- Log error conditions

---

## 10. Deployment Notes

### Environment Variables
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=omw_database
DB_USER=omw_user
DB_PASSWORD=secure_password
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
```

### Dependencies
- Node.js 16+
- Express.js
- MySQL 8.0+
- Redis (for caching)
- JWT library
- Date/time handling library (moment.js or date-fns)

---

This specification provides a complete guide for implementing the backend API endpoints required for the OMW booking system with worker preference functionality.
