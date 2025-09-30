# 🚖 OMW CAB BOOKING SYSTEM - COMPLETE FLOW DOCUMENTATION
**Version:** 1.0 | **Date:** 2025-09-30 | **Status:** 📋 PLANNING & ANALYSIS

---

## 📑 TABLE OF CONTENTS
1. [Current State Analysis](#1-current-state-analysis)
2. [Database Schema & Required Changes](#2-database-schema--required-changes)
3. [Customer Journey - Complete Flow](#3-customer-journey---complete-flow)
4. [Driver Journey - Complete Flow](#4-driver-journey---complete-flow)
5. [Screen Wireframes & UI Specifications](#5-screen-wireframes--ui-specifications)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Real-time Socket.IO Events](#7-real-time-socketio-events)
8. [Payment Integration (Razorpay)](#8-payment-integration-razorpay)
9. [Industry Standards Checklist](#9-industry-standards-checklist)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. CURRENT STATE ANALYSIS

### 1.1 What's Working ✅
- Backend ride quote API with fare calculation
- Driver search API (finds nearby providers)
- Booking creation API
- Customer app has booking screens
- Captain app has trip tracking screens
- Socket.IO infrastructure exists
- Payment service exists

### 1.2 Critical Issues 🔴
| Issue | Impact | Status |
|-------|--------|--------|
| Booking created BEFORE driver check | Orphan bookings in DB | CRITICAL |
| No real-time driver online status | Shows offline drivers | CRITICAL |
| Hardcoded vehicle types in UI | Doesn't reflect availability | CRITICAL |
| No booking validation on frontend | Can book without drivers | CRITICAL |
| Captain app notification issues | Drivers miss requests | HIGH |
| No heartbeat system | Can't track availability | HIGH |
| No location tracking during trip | Customer can't see driver | HIGH |

---

## 2. DATABASE SCHEMA & REQUIRED CHANGES

### 2.1 Add Driver Availability Tracking
```sql
ALTER TABLE providers 
ADD COLUMN is_online TINYINT(1) DEFAULT 0,
ADD COLUMN availability_status ENUM('available', 'busy', 'offline') DEFAULT 'offline',
ADD COLUMN last_seen TIMESTAMP NULL,
ADD COLUMN current_booking_id INT NULL,
ADD INDEX idx_availability (is_online, availability_status, last_seen);
```

### 2.2 Add Location Tracking Table
```sql
CREATE TABLE driver_location_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  booking_id INT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_provider_booking (provider_id, booking_id),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

### 2.3 Add Payment Integration Fields
```sql
ALTER TABLE bookings
ADD COLUMN razorpay_order_id VARCHAR(100) NULL,
ADD COLUMN razorpay_payment_id VARCHAR(100) NULL,
ADD COLUMN payment_method ENUM('upi', 'card', 'cash', 'wallet') DEFAULT 'cash';
```

---

## 3. CUSTOMER JOURNEY - COMPLETE FLOW

### 3.1 SCREEN: Cab Home (Booking Screen)
**Platforms:** Web, Customer Mobile App  
**File:** `CabHomeScreen.tsx` / `RideBooking.jsx`

**Flow:**
```
1. User opens screen
   ↓
2. Load vehicle types (GET /ride/vehicle-types)
   ↓
3. User enters PICKUP location
   ↓
4. Start polling nearby drivers every 5s (POST /driver/search)
   Show driver markers on map
   ↓
5. User enters DROP location
   ↓
6. Generate fare quotes for each vehicle type (POST /ride/quote)
   Display vehicle cards with prices
   ↓
7. User selects vehicle type + payment method
   ↓
8. VALIDATE: Check nearbyDrivers.length > 0
   If NO drivers → Show alert, block booking
   If YES → Allow booking
   ↓
9. User clicks "Confirm Booking"
   ↓
10. POST /driver/book-ride
   Navigate to "Searching for Driver" screen
```

**UI Elements:**
- Map with pickup/drop markers
- Nearby driver markers (animated car icons)
- Location input fields with autocomplete
- Vehicle type cards showing:
  - Icon, name, capacity
  - Fare estimate
  - ETA to pickup
  - "X drivers nearby" badge
  - Surge indicator if applicable
- Payment method selector
- "Confirm Booking" button (disabled until all selected)
- Real-time driver count: "✓ 5 drivers nearby"

**Key Validations:**
```typescript
if (!pickup || !drop) return showError('Enter both locations');
if (!selectedVehicleType) return showError('Select vehicle type');
if (nearbyDrivers.length === 0) {
  return showAlert('No drivers available in your area');
}
```

---

### 3.2 SCREEN: Searching for Driver
**Display:** Modal or full screen with loading animation

**Flow:**
```
1. Show "Finding driver..." animation
   ↓
2. Poll booking status every 3s (GET /bookings/{id})
   ↓
3. Listen for Socket.IO event: 'bookings:driver_assigned'
   ↓
4. If driver accepts → Navigate to Ride Tracking
   If timeout (2 mins) → Auto-cancel, show error
```

**UI:**
- Animated searching indicator
- Map with pickup/drop
- Timer showing elapsed time
- Cancel button
- Text: "Searching for nearby drivers..."

---

### 3.3 SCREEN: Ride Tracking (Active Trip)
**File:** `RideTrackingScreen.tsx`

**Phases:**
1. **Driver Assigned:** Show driver info, ETA to pickup
2. **Driver Arriving:** Show "Driver arriving" banner
3. **Driver Arrived:** Show OTP prominently
4. **Trip Started:** Show route, distance/time remaining
5. **Approaching Destination:** Show "Near destination" banner
6. **Completed:** Navigate to payment

**UI Elements:**
- Map with real-time driver location
- Driver info card (photo, name, rating, vehicle)
- Status banner (dynamically updates)
- Pickup OTP (large, highlighted)
- Action buttons: Call Driver, Cancel Trip, Report Issue
- Trip details: Distance remaining, Time remaining

**Socket.IO Events Handled:**
- `ride:driver_location` - Update map marker
- `ride:driver_arriving` - Update UI
- `ride:driver_arrived` - Show OTP prominently
- `ride:trip_started` - Change UI to in-progress
- `ride:approaching_destination` - Show banner
- `ride:completed` - Navigate to payment

---

### 3.4 SCREEN: Payment & Rating
**File:** `PaymentScreen.tsx` + `RatingScreen.tsx`

**Payment Flow:**
```
1. Show fare breakdown
   ↓
2. If cash → Confirm cash payment
   If UPI/Card → Open Razorpay
   ↓
3. Verify payment
   ↓
4. Navigate to Rating screen
```

**Rating Flow:**
```
1. Show driver info
   ↓
2. User selects stars (1-5)
   ↓
3. Optional: Add review text
   ↓
4. Submit rating (POST /driver/rate/{booking_id})
   ↓
5. Show thank you, navigate home
```

---

## 4. DRIVER JOURNEY - COMPLETE FLOW

### 4.1 SCREEN: Captain Home (Online/Offline)
**File:** `CaptainHomeScreen.tsx`

**Flow:**
```
1. Driver opens app
   ↓
2. Show toggle: "Go Online" / "Go Offline"
   ↓
3. Driver toggles ONLINE
   ↓
4. Start heartbeat (POST /worker/heartbeat every 30s)
   Update: is_online=1, availability_status='available'
   ↓
5. Start GPS location tracking
   ↓
6. Navigate to "Booking Requests" screen
```

**Heartbeat API:**
```javascript
POST /worker/heartbeat
Body: {
  is_online: true,
  availability_status: 'available',
  current_location: { lat, lng }
}
```

---

### 4.2 SCREEN: Booking Requests (Ride Requests List)
**File:** `BookingRequestsScreen.tsx`

**Flow:**
```
1. Poll booking requests every 10s
   GET /worker-management/booking-requests?service_type=ride
   ↓
2. Listen for Socket.IO: 'booking_requests:new'
   ↓
3. Display list of pending ride requests
   Show: Pickup, Drop, Distance, Fare, Customer rating
   ↓
4. Driver taps on request → Navigate to detail screen
```

**UI:**
- List of ride request cards
- Each card shows:
  - Pickup address
  - Drop address
  - Distance & estimated time
  - Fare amount
  - Customer name & rating
  - "Accept" / "Reject" buttons
- Auto-refresh when new request arrives
- Sound/vibration notification for new requests

---

### 4.3 SCREEN: Booking Request Detail
**File:** `BookingRequestDetailScreen.tsx`

**Flow:**
```
1. Show full request details
   ↓
2. Driver clicks "Accept"
   ↓
3. POST /worker-management/booking-requests/{id}/accept
   ↓
4. Navigate to "Trip Tracking" screen
```

**UI:**
- Map with route (pickup → drop)
- Customer info (name, photo, rating)
- Fare breakdown
- Distance, estimated time
- Pickup & drop addresses
- Large "Accept Request" button
- "Decline" button

---

### 4.4 SCREEN: Trip Tracking (Driver View)
**File:** `TripTrackingScreen.tsx`

**Phases & Actions:**

**Phase 1: Going to Pickup**
```
- Navigate to pickup location
- Update location every 5s (POST /worker/location-update)
- Reach pickup → Click "I've Arrived"
  POST /worker/trip-tracking/{id}/arrive
```

**Phase 2: At Pickup**
```
- Ask customer for OTP
- Enter OTP → Click "Start Trip"
  POST /worker/trip-tracking/{id}/start
  Body: { otp_code: '7829' }
```

**Phase 3: Trip In Progress**
```
- Navigate to drop location
- Continue location updates
- Update trip progress
```

**Phase 4: At Drop**
```
- Click "Complete Trip"
  POST /worker/trip-tracking/{id}/complete
  Body: { actual_distance, final_location }
- Navigate to "Payment Collection" screen
```

**UI Elements:**
- Map with navigation
- Customer info card
- Trip status indicator
- Action buttons (dynamic based on status):
  - "I've Arrived" → "Start Trip" → "Complete Trip"
- Call Customer button
- Trip details: Distance, Time, Fare

---

### 4.5 SCREEN: Payment Collection
**File:** `PaymentCollectionScreen.tsx`

**Flow:**
```
1. Show fare breakdown
   ↓
2. If cash → Customer pays driver directly
   Driver confirms: "Cash Received"
   ↓
3. If UPI → Customer pays via Razorpay
   Auto-verified by backend
   ↓
4. Mark payment complete
   ↓
5. Navigate back to Booking Requests (availability = 'available')
```

---

## 5. SCREEN WIREFRAMES & UI SPECIFICATIONS

### 5.1 Customer App - CabHomeScreen Layout
```
┌─────────────────────────────────┐
│ [MAP VIEW - Full Screen]        │
│                                  │
│ • Pickup marker (blue)          │
│ • Drop marker (red)             │
│ • Driver markers (car icons)    │
│ • Route polyline                │
│                                  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 📍 Pickup: [Hitech City____]    │
│ 📍 Drop:   [Charminar______]    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ✓ 5 drivers nearby              │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🚗 Go Economy      ETA: 5 min   │
│    ₹238 • 15.3 km               │
│    [SELECT]                      │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🚙 Go Sedan        ETA: 5 min   │
│    ₹315 • 15.3 km  [SELECTED]   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Payment: [UPI ▼]                │
│ [CONFIRM BOOKING]               │
└─────────────────────────────────┘
```

### 5.2 Captain App - BookingRequestsScreen Layout
```
┌─────────────────────────────────┐
│ ⚡ ONLINE         [Go Offline]  │
│ Today: ₹1850 • 8 trips          │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🔔 NEW RIDE REQUEST             │
│                                  │
│ 📍 Pickup: Hitech City          │
│ 📌 Drop: Charminar              │
│ 💰 ₹238 • 15.3 km • 35 min     │
│ 👤 Suhas ⭐4.8                  │
│                                  │
│ [ACCEPT]  [DECLINE]             │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Pending Request (2m ago)        │
│ 📍 Gachibowli → HITEC City      │
│ ₹125 • 5.2 km                   │
│ [VIEW DETAILS]                  │
└─────────────────────────────────┘
```

---

## 6. API ENDPOINTS REFERENCE

### Customer APIs
```
GET    /customer/ride/vehicle-types
POST   /customer/ride/quote
GET    /customer/ride/pricing-info
POST   /customer/driver/search
POST   /customer/driver/book-ride
GET    /customer/bookings/{id}
POST   /customer/bookings/{id}/cancel
POST   /customer/bookings/{id}/payment
POST   /customer/bookings/{id}/create-payment-order
POST   /customer/bookings/{id}/verify-payment
POST   /customer/driver/rate/{booking_id}
```

### Worker/Driver APIs
```
POST   /worker/heartbeat
GET    /worker-management/booking-requests
POST   /worker-management/booking-requests/{id}/accept
POST   /worker-management/booking-requests/{id}/reject
POST   /worker/location-update
POST   /worker/trip-tracking/{id}/arrive
POST   /worker/trip-tracking/{id}/start
POST   /worker/trip-tracking/{id}/complete
```

---

## 7. REAL-TIME SOCKET.IO EVENTS

### Customer Events (Listen)
```javascript
'bookings:driver_assigned'    // Driver accepted
'ride:driver_location'        // Driver location update
'ride:driver_arriving'        // Driver near pickup
'ride:driver_arrived'         // Driver at pickup
'ride:trip_started'           // Trip started
'ride:location_update'        // Trip location update
'ride:approaching_destination'// Near drop
'ride:completed'              // Trip completed
```

### Driver Events (Listen)
```javascript
'booking_requests:new'        // New ride request
'booking_requests:cancelled'  // Customer cancelled
'bookings:updated'            // Booking status changed
```

---

## 8. PAYMENT INTEGRATION (RAZORPAY)

### 8.1 Setup
```javascript
// Install
npm install razorpay

// Initialize
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
```

### 8.2 Create Order
```javascript
POST /customer/bookings/{id}/create-payment-order
const order = await razorpay.orders.create({
  amount: Math.round(booking.final_fare * 100),
  currency: 'INR',
  receipt: `booking_${booking.id}`
});
```

### 8.3 Verify Payment
```javascript
POST /customer/bookings/{id}/verify-payment
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(order_id + '|' + payment_id)
  .digest('hex');
if (signature === razorpay_signature) {
  // Payment verified
}
```

---

## 9. INDUSTRY STANDARDS CHECKLIST

### Must-Have Features
- [x] Real-time driver location tracking
- [x] Fare estimation before booking
- [x] Multiple vehicle types
- [x] Surge pricing
- [x] Driver ratings & reviews
- [x] In-app payments (UPI/Card)
- [x] Trip history
- [x] Cancellation with policy
- [ ] SOS/Emergency button
- [ ] Trip sharing (share ETA with contacts)
- [ ] Scheduled rides
- [ ] Favorite locations
- [ ] Ride preferences (AC/Non-AC, etc.)

### Performance Standards
- Driver location update: Every 5 seconds
- Driver search polling: Every 5 seconds
- Booking request timeout: 2 minutes
- Quote validity: 10 minutes
- Heartbeat interval: 30 seconds

---

## 10. IMPLEMENTATION ROADMAP

### Phase 1: Critical Fixes (Week 1)
- [ ] Add database columns for driver availability
- [ ] Fix backend booking flow (check drivers FIRST)
- [ ] Add frontend validation (block if no drivers)
- [ ] Implement heartbeat system
- [ ] Fix Socket.IO notifications

### Phase 2: Real-time Features (Week 2)
- [ ] Implement location tracking during trip
- [ ] Add driver location updates to customer
- [ ] Implement all trip status transitions
- [ ] Add OTP verification at pickup

### Phase 3: Payment Integration (Week 3)
- [ ] Integrate Razorpay orders
- [ ] Implement payment verification
- [ ] Add payment method management
- [ ] Handle cash payments

### Phase 4: Polish & Testing (Week 4)
- [ ] Add all UI improvements
- [ ] Implement rating system
- [ ] Add cancellation flow
- [ ] End-to-end testing
- [ ] Create dummy drivers in database
- [ ] Test complete flow

---

## 11. NEXT STEPS: DATABASE SETUP

### Create Dummy Drivers
```sql
-- Will be executed after approval
INSERT INTO providers (...) VALUES (...);
UPDATE providers SET verified = 1, active = 1, is_online = 1;
INSERT INTO provider_services (...) VALUES (...);
-- etc.
```

**READY FOR YOUR APPROVAL TO PROCEED!**
