# Dynamic Fare Engine Implementation

## Overview

This document outlines the implementation of a comprehensive dynamic fare engine for the OMW ride-hailing platform, replacing the previous flat `estimated_cost` model with a sophisticated, distance and vehicle-aware pricing system.

## 🎯 Key Features

- **Dynamic Fare Calculation**: Real-time fare estimation based on distance, duration, vehicle type, and demand
- **Surge Pricing**: Demand-based surge multipliers with configurable thresholds
- **Night Charges**: Time-based pricing adjustments for night hours
- **Vehicle Type Multipliers**: Different pricing for bikes, hatchbacks, sedans, SUVs, etc.
- **Real-time Tracking**: GPS-based actual distance calculation for final fare reconciliation
- **Payment Settlement**: Automated pre-authorization, capture, and refund handling with Razorpay
- **Provider Earnings**: Transparent commission calculation and payout management
- **Fare Validation**: Deviation detection and dispute management

## 📁 File Structure

```
backend/
├── database_updates/
│   ├── dynamic_fare_engine_migration.sql      # Core schema migration
│   └── payment_settlement_tables.sql          # Payment & wallet tables
├── routes/
│   ├── customer_management/
│   │   ├── driver_booking.js                  # Updated booking endpoint
│   │   └── ride_quote.js                      # New quote API
│   └── worker_management/
│       └── trip_tracking.js                   # Trip lifecycle management
└── utils/
    ├── fareCalculator.js                      # Core fare calculation logic
    └── paymentSettlement.js                   # Payment processing utilities
```

## 🗄️ Database Schema

### Core Tables

1. **`pricing_vehicle_types`** - Vehicle pricing configuration
2. **`ride_fare_breakdowns`** - Quote and actual fare storage
3. **`pricing_rules`** - Configurable pricing parameters
4. **`trip_location_logs`** - GPS tracking for distance calculation
5. **`user_wallets`** - Customer wallet management
6. **`provider_earnings`** - Driver earnings and payouts

### Key Views

- **`v_active_vehicle_pricing`** - Current vehicle type pricing
- **`v_completed_rides_fare_summary`** - Ride completion analytics
- **`v_provider_earnings_summary`** - Driver earnings overview

## 🚀 API Endpoints

### Quote System

#### `POST /ride/quote`
Generate fare estimate before booking
```json
{
  "pickup": { "lat": 12.9716, "lng": 77.5946 },
  "drop": { "lat": 12.9352, "lng": 77.6245 },
  "vehicle_type_id": 2,
  "pickup_time": "2024-01-15T14:30:00Z"
}
```

**Response:**
```json
{
  "quote_id": "uuid-v4",
  "distance_km": 12.4,
  "duration_min": 28,
  "vehicle_type": "Hatchback",
  "fare": {
    "base": 25.00,
    "distance": 148.00,
    "time": 42.00,
    "surge": 35.00,
    "total": 250.00
  },
  "surge_multiplier": 1.2,
  "night_hours": false,
  "expires_at": "2024-01-15T14:40:00Z"
}
```

#### `GET /ride/vehicle-types`
Get available vehicle types with pricing

#### `POST /ride/quote/validate`
Validate quote before booking

### Booking System

#### `POST /book-ride` (Updated)
Create booking with quote-based pricing
```json
{
  "pickup_address": "MG Road, Bangalore",
  "pickup_lat": 12.9716,
  "pickup_lon": 77.5946,
  "drop_address": "Koramangala, Bangalore",
  "drop_lat": 12.9352,
  "drop_lon": 77.6245,
  "pickup_time": "2024-01-15T14:30:00Z",
  "quote_id": "uuid-from-quote-api",
  "vehicle_type_id": 2,
  "booking_type": "without_car"
}
```

### Trip Tracking

#### `POST /trip/start`
Start trip tracking
```json
{
  "booking_id": 123,
  "start_location": { "lat": 12.9716, "lng": 77.5946 }
}
```

#### `POST /trip/location-update`
Update location during trip
```json
{
  "booking_id": 123,
  "location": { "lat": 12.9716, "lng": 77.5946 },
  "speed_kmh": 45,
  "bearing": 180
}
```

#### `POST /trip/end`
Complete trip and calculate final fare
```json
{
  "booking_id": 123,
  "end_location": { "lat": 12.9352, "lng": 77.6245 },
  "additional_charges": {
    "tip": 20.00,
    "waiting_charges": 10.00,
    "toll_charges": 15.00
  }
}
```

## 💰 Fare Calculation Logic

### Base Fare Formula
```
Base Components:
- Base Fare: ₹25 (vehicle-specific)
- Distance: (actual_km - free_km) × rate_per_km
- Time: duration_minutes × rate_per_minute

Multipliers:
- Vehicle Multiplier: 1.0 (bike) to 1.8 (SUV)
- Night Multiplier: 1.25 (11 PM - 6 AM)
- Surge Multiplier: 1.0 to 4.0 (demand-based)

Final Fare = (Base + Distance + Time + Night + Surge) × Vehicle_Multiplier
Minimum Fare = Max(Calculated_Fare, Minimum_Fare_Threshold)
```

### Surge Calculation
```javascript
// Simplified demand-based surge
const demand_index = (pending_requests × 10) + (active_rides × 5);

if (demand_index > 80) surge = 2.5;
else if (demand_index > 60) surge = 2.0;
else if (demand_index > 40) surge = 1.5;
else if (demand_index > 20) surge = 1.2;
else surge = 1.0;
```

## 🔄 Payment Flow

### 1. Pre-Authorization
- Customer pays estimated fare amount
- Razorpay pre-authorizes payment (doesn't capture)
- Amount held on customer's payment method

### 2. Trip Completion
- Calculate actual fare based on GPS tracking
- Compare with estimated fare

### 3. Settlement
- **If actual ≤ estimated**: Capture actual amount, auto-refund difference
- **If actual > estimated**: Capture full pre-auth, charge additional via wallet/payment link

### 4. Provider Earnings
```
Platform Commission: 20% of final fare
GST: 18% of commission
Provider Earnings: Final Fare - Commission - GST
```

## 🛡️ Validation & Safety

### Fare Deviation Protection
- Maximum allowed deviation: ±20% of estimated fare
- Trips exceeding threshold flagged for manual review
- Automatic dispute creation for significant deviations

### Timeout Protection
- Auto-end trip if duration exceeds 2× estimated time
- Grace period for network issues and GPS problems

### Data Integrity
- All location updates logged with timestamps
- Fare calculations stored for audit trail
- Payment status tracking at every step

## 📊 Analytics & Reporting

### Provider Dashboard
- Real-time earnings tracking
- Trip history with fare breakdowns
- Payout status and history

### Customer Dashboard
- Trip history with detailed fare breakdown
- Wallet balance and transaction history
- Fare dispute submission

### Admin Dashboard
- Surge pricing configuration
- Vehicle type rate management
- Dispute resolution interface
- Payout batch processing

## 🔧 Configuration

### Environment Variables
```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Google Maps API (for production distance calculation)
GOOGLE_MAPS_API_KEY=your_api_key
```

### Pricing Rules (Database)
Key configurable parameters in `pricing_rules` table:
- `surge_demand_threshold`: 80
- `night_hours_start`: "23:00"
- `night_hours_end`: "06:00"
- `cancellation_fee_customer`: 20.00
- `max_fare_deviation_percentage`: 20
- `platform_commission_percentage`: 20

## 🚦 Migration Guide

### Step 1: Database Migration
```sql
-- Run the migration scripts
SOURCE dynamic_fare_engine_migration.sql;
SOURCE payment_settlement_tables.sql;
```

### Step 2: Update Routes
- Import new route files in your main app
- Update existing booking endpoints
- Add trip tracking routes

### Step 3: Frontend Integration
- Update booking flow to use quote API
- Implement fare breakdown display
- Add real-time trip tracking

### Step 4: Testing
- Test quote generation with various scenarios
- Verify fare calculations match expectations
- Test payment flows with Razorpay sandbox

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor
- Average fare deviation percentage
- Surge pricing frequency and duration
- Payment failure rates
- Provider earning disputes
- System response times for quote generation

### Recommended Alerts
- Fare deviation > 25%
- Payment capture failures
- Surge multiplier > 3.0 for extended periods
- GPS tracking gaps > 5 minutes during trips

## 🐛 Troubleshooting

### Common Issues

1. **Quote Expiry**: Quotes expire in 10 minutes
   - Solution: Generate new quote before booking

2. **GPS Accuracy**: Poor GPS can affect distance calculation
   - Solution: Implement map-matching algorithms for production

3. **Payment Failures**: Network issues during payment capture
   - Solution: Implement retry logic with exponential backoff

4. **Surge Calculation**: High surge during low demand
   - Solution: Review demand calculation algorithm and thresholds

## 📈 Future Enhancements

1. **Machine Learning**: Implement ML-based demand prediction
2. **Route Optimization**: Integrate with traffic APIs for better ETA
3. **Dynamic Pricing**: Time-of-day and location-based pricing
4. **Subscription Plans**: Monthly/weekly ride packages
5. **Carbon Footprint**: Track and offset emissions per ride

## 📞 Support

For technical issues or questions regarding the dynamic fare engine implementation, please refer to:
- Code documentation in individual files
- Database schema comments
- API endpoint documentation
- Test cases in the test directory

---

*This implementation provides a robust foundation for a modern ride-hailing fare system with room for future enhancements and optimizations.*
