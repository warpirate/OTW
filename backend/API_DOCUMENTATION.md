# API Documentation - Worker/Provider Management

## Base URL
```
http://localhost:5050/api
```

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Worker/Provider Routes

### 1. Worker Registration
**POST** `/worker-management/worker/register`

Register a new worker with provider data.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "providerData": {
    "experience_years": 5,
    "bio": "Experienced service provider",
    "service_radius_km": 25,
    "location_lat": 40.7128,
    "location_lng": -74.0060,
    "permanent_address": "123 Main St, City, State",
    "verified": false,
    "active": true,
    "rating": 0.0,
    "services": [
      {
        "subcategory_id": 1
      }
    ],
    "qualifications": [
      {
        "qualification_name": "Certified Electrician",
        "issuing_institution": "State Board",
        "issue_date": "2020-01-15",
        "certificate_number": "CERT123456"
      }
    ],
    "documents": [
      {
        "document_type": "identity_proof",
        "document_url": "https://example.com/doc.pdf",
        "status": "pending_review",
        "remarks": "ID proof uploaded"
      }
    ],
    "banking_details": {
      "account_holder_name": "John Doe",
      "account_number": "1234567890",
      "ifsc_code": "SBIN0001234",
      "bank_name": "State Bank of India",
      "branch_name": "Main Branch",
      "account_type": "savings",
      "is_primary": true,
      "status": "unverified"
    },
    "driver_info": {
      "license_number": "DL123456789",
      "vehicle_type": "car",
      "driving_experience_years": 3,
      "vehicle_registration_number": "MH12AB1234"
    },
    "vehicles": [
      {
        "make": "Honda",
        "model": "City",
        "year": 2020,
        "color": "White",
        "registration_number": "MH12AB1234",
        "vehicle_type": "sedan",
        "insurance_policy_number": "INS123456",
        "insurance_expiry_date": "2024-12-31",
        "fitness_certificate_expiry_date": "2024-06-30",
        "is_active": true
      }
    ]
  }
}
```

**Response:**
```json
{
  "message": "Worker registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "worker",
    "role_id": 2
  }
}
```

### 2. Get Worker Profile
**GET** `/worker-management/worker/profile`

Get complete worker profile with all related data.

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "profile": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "provider_id": 1,
    "experience_years": 5,
    "bio": "Experienced service provider",
    "rating": 4.5,
    "verified": true,
    "active": true,
    "service_radius_km": 25,
    "location_lat": 40.7128,
    "location_lng": -74.0060,
    "last_active_at": "2024-01-15T10:30:00Z",
    "permanent_address": "123 Main St, City, State",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "settings": {
      "id": 1,
      "provider_id": 1,
      "notify_on_job_alerts": true,
      "notify_on_messages": true,
      "notify_on_payments": true,
      "notify_by_sms": true,
      "notify_by_push": true,
      "auto_accept_jobs": false,
      "max_jobs_per_day": 5,
      "allow_weekend_work": true,
      "allow_holiday_work": true,
      "profile_visibility": "public",
      "display_rating": true,
      "allow_direct_contact": true,
      "location_sharing_mode": "on_job",
      "preferred_language": "en",
      "preferred_currency": "INR",
      "distance_unit": "km",
      "time_format": "24h"
    },
    "services": [
      {
        "prov_serv_id": 1,
        "provider_id": 1,
        "subcategory_id": 1,
        "subcategory_name": "Electrical Repair"
      }
    ],
    "qualifications": [
      {
        "id": 1,
        "provider_id": 1,
        "qualification_name": "Certified Electrician",
        "issuing_institution": "State Board",
        "issue_date": "2020-01-15",
        "certificate_number": "CERT123456"
      }
    ],
    "documents": [
      {
        "id": 1,
        "provider_id": 1,
        "document_type": "identity_proof",
        "document_url": "https://example.com/doc.pdf",
        "status": "approved",
        "remarks": "ID proof verified",
        "uploaded_at": "2024-01-01T00:00:00Z",
        "verified_at": "2024-01-02T00:00:00Z"
      }
    ],
    "banking_details": [
      {
        "id": 1,
        "provider_id": 1,
        "account_holder_name": "John Doe",
        "account_number": "1234567890",
        "ifsc_code": "SBIN0001234",
        "bank_name": "State Bank of India",
        "branch_name": "Main Branch",
        "account_type": "savings",
        "is_primary": true,
        "status": "verified",
        "verification_remarks": "Banking details verified",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z"
      }
    ],
    "driver_info": {
      "provider_id": 1,
      "license_number": "DL123456789",
      "vehicle_type": "car",
      "driving_experience_years": 3,
      "vehicle_registration_number": "MH12AB1234"
    },
    "vehicles": [
      {
        "id": 1,
        "provider_id": 1,
        "make": "Honda",
        "model": "City",
        "year": 2020,
        "color": "White",
        "registration_number": "MH12AB1234",
        "vehicle_type": "sedan",
        "insurance_policy_number": "INS123456",
        "insurance_expiry_date": "2024-12-31",
        "fitness_certificate_expiry_date": "2024-06-30",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "location_logs": [
      {
        "id": 1,
        "provider_id": 1,
        "latitude": 40.7128,
        "longitude": -74.0060,
        "recorded_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 3. Update Worker Profile
**PUT** `/worker-management/worker/profile`

Update worker profile information.

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone_number": "+1234567890",
  "experience_years": 6,
  "bio": "Updated bio",
  "service_radius_km": 30,
  "location_lat": 40.7128,
  "location_lng": -74.0060,
  "active": true,
  "permanent_address": "456 New St, City, State",
  "settings": {
    "notify_on_job_alerts": true,
    "auto_accept_jobs": false,
    "max_jobs_per_day": 8,
    "profile_visibility": "public"
  },
  "services": [
    {
      "subcategory_id": 1
    },
    {
      "subcategory_id": 2
    }
  ],
  "qualifications": [
    {
      "qualification_name": "Advanced Certification",
      "issuing_institution": "Advanced Institute",
      "issue_date": "2023-06-15",
      "certificate_number": "ADV789012"
    }
  ],
  "driver_info": {
    "license_number": "DL987654321",
    "vehicle_type": "suv",
    "driving_experience_years": 5,
    "vehicle_registration_number": "MH12CD5678"
  },
  "vehicles": [
    {
      "make": "Toyota",
      "model": "Innova",
      "year": 2022,
      "color": "Silver",
      "registration_number": "MH12CD5678",
      "vehicle_type": "suv",
      "insurance_policy_number": "INS789012",
      "insurance_expiry_date": "2025-12-31",
      "fitness_certificate_expiry_date": "2025-06-30",
      "is_active": true
    }
  ]
}
```

### 4. Update Worker Location
**POST** `/worker-management/worker/location`

Update worker's current location.

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

### 5. Add Provider Document
**POST** `/worker-management/worker/documents`

Upload a new document for verification.

**Request Body:**
```json
{
  "document_type": "identity_proof",
  "document_url": "https://example.com/new-doc.pdf",
  "status": "pending_review",
  "remarks": "New ID proof"
}
```

### 6. Add Banking Details
**POST** `/worker-management/worker/banking`

Add banking information for payments.

**Request Body:**
```json
{
  "account_holder_name": "John Doe",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "bank_name": "State Bank of India",
  "branch_name": "Main Branch",
  "account_type": "savings",
  "is_primary": true,
  "status": "unverified",
  "verification_remarks": "New account"
}
```

### 7. Get Provider Services
**GET** `/worker-management/worker/services`

Get list of services offered by the provider.

### 8. Get Provider Qualifications
**GET** `/worker-management/worker/qualifications`

Get list of provider qualifications.

### 9. Get Provider Documents
**GET** `/worker-management/worker/documents`

Get list of uploaded documents.

### 10. Get Provider Banking Details
**GET** `/worker-management/worker/banking`

Get banking information.

### 11. Get Provider Vehicles
**GET** `/worker-management/worker/vehicles`

Get list of registered vehicles.

### 12. Get Provider Driver Info
**GET** `/worker-management/worker/driver-info`

Get driver information.

### 13. Get Provider Settings
**GET** `/worker-management/worker/settings`

Get provider settings and preferences.

### 14. Update Provider Settings
**PUT** `/worker-management/worker/settings`

Update provider settings.

**Request Body:**
```json
{
  "notify_on_job_alerts": true,
  "notify_on_messages": true,
  "auto_accept_jobs": false,
  "max_jobs_per_day": 5,
  "profile_visibility": "public",
  "location_sharing_mode": "on_job",
  "preferred_language": "en",
  "preferred_currency": "INR"
}
```

### 15. Worker Dashboard Stats
**GET** `/worker-management/worker/dashboard/stats`

Get dashboard statistics for the worker.

---

## Admin Routes (Provider Management)

### 1. Get All Providers
**GET** `/provider-admin/providers`

Get all providers with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `verified` (optional): Filter by verification status (true/false)
- `active` (optional): Filter by active status (true/false)
- `document_status` (optional): Filter by document status

### 2. Get Provider Details
**GET** `/provider-admin/providers/:providerId`

Get detailed information about a specific provider.

### 3. Update Provider Verification
**PATCH** `/provider-admin/providers/:providerId/verify`

Update provider verification status.

**Request Body:**
```json
{
  "verified": true,
  "remarks": "Provider verified after document review"
}
```

### 4. Update Document Status
**PATCH** `/provider-admin/documents/:documentId/status`

Update document verification status.

**Request Body:**
```json
{
  "status": "approved",
  "remarks": "Document verified successfully"
}
```

### 5. Update Banking Verification
**PATCH** `/provider-admin/banking/:bankingId/verify`

Update banking details verification status.

**Request Body:**
```json
{
  "status": "verified",
  "remarks": "Banking details verified"
}
```

### 6. Get Pending Verifications
**GET** `/provider-admin/verifications/pending`

Get all pending document and banking verifications.

### 7. Get Provider Statistics
**GET** `/provider-admin/statistics`

Get overall provider statistics.

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Missing required fields",
  "required": ["firstName", "lastName", "email", "password", "providerData"]
}
```

### 401 Unauthorized
```json
{
  "message": "Authorization header missing"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied: insufficient permissions"
}
```

### 404 Not Found
```json
{
  "message": "Worker not found"
}
```

### 409 Conflict
```json
{
  "message": "Email already registered"
}
```

### 500 Internal Server Error
```json
{
  "message": "Registration failed",
  "error": "Internal server error"
}
```

---

## Database Schema

The system uses the following main tables:

- `providers` - Main provider information
- `provider_settings` - Provider preferences and settings
- `provider_services` - Services offered by provider
- `provider_qualifications` - Provider qualifications
- `provider_documents` - Uploaded documents for verification
- `provider_banking_details` - Banking information
- `provider_location_logs` - Location tracking
- `drivers` - Driver information
- `vehicles` - Vehicle information

---

## Notes

1. All timestamps are in ISO 8601 format
2. Location coordinates use decimal degrees
3. Document statuses: `pending_review`, `approved`, `rejected`
4. Banking statuses: `unverified`, `verified`, `rejected`, `archived`
5. Profile visibility: `public`, `platform_only`
6. Location sharing modes: `on_job`, `always_on`, `off`
7. Vehicle types: `sedan`, `suv`, `hatchback`, `bike`, `van`
8. Document types: `identity_proof`, `address_proof`, `drivers_license`, `trade_certificate`, `background_check`, `vehicle_registration` 