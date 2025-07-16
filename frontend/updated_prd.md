# Revised Product Requirements Document (PRD) for On-Demand Service Platform

## 1. Introduction

### 1.1 Project Overview

**Key Components**:
- Hybrid platform combining:
  - Urban Company's home services (6 categories)
  - Ola/Rapido's ride-hailing features

**User Interfaces**:
- Customer: urbango.ca (web/mobile)
- Admin: admin.urbango.ca
- Super Admin: superadmin.urbango.ca
- Mobile apps for Workers/Drivers

**Technology Stack**:
- Frontend (Team Member 1):
  - Mobile: React Native
  - Web: React
- Backend (Team Member 2):
  - Node.js/Java
  - PostgreSQL/MongoDB

**Timeline**:
- 12-week internship
- MVP focus with expansion potential

### 1.2 Objectives

- ✔ Seamless booking/tracking experience
- ✔ Efficient profile/job management for workers/drivers
- ✔ Robust admin oversight tools
- ✔ Scalable, secure infrastructure
- ✔ Third-party service integrations

### 1.3 Scope

**Included**:
- Frontend (Team Member 1):
  - All user interfaces (5 apps/panels)
- Backend (Team Member 2):
  - Core APIs & database
  - Key integrations

**Excluded**:
- Marketing initiatives
- Post-launch maintenance
- Advanced AI features

## 2. Stakeholders and Roles

| Role          | Description                  | Key Responsibilities          |
|---------------|------------------------------|-------------------------------|
| Customer      | Service/trip booker          | Book, pay, track, rate        |
| Worker        | Service provider             | Manage profile, jobs, earnings|
| Driver        | Transportation provider       | Accept trips, navigate        |
| Admin         | Platform operator            | Approve providers, manage categories |
| Super Admin   | Platform overseer            | Configure settings, view logs |

### 2.1 User Personas

1. **Customer (Amit)**
   - Demographics: 30, urban professional
   - Needs: Quick, convenient services

2. **Worker (Priya)**
   - Demographics: 35, skilled tradesperson
   - Needs: Steady work, earnings visibility

3. **Driver (Rahul)**
   - Demographics: 28, full-time driver
   - Needs: Efficient trip management

4. **Admin (Sneha)**
   - Demographics: 40, operations manager
   - Needs: Comprehensive oversight tools

5. **Super Admin (Vikram)**
   - Demographics: 45, platform owner
   - Needs: Full system control

## 3. Functional Requirements

### 3.1 Customer App 
**Platforms**: Mobile (React Native), Web (React)
**URL**: urbango.ca

**Key Features**:
- **Authentication**:
  - Email/phone login
  - Social login (Google, Facebook)
  - OTP recovery

- **Service Management**:
  - Browse 6 service categories
  - Search & filter by price/rating
  - Book services (select date/time)

- **Trip Booking**:
  - Set pickup/drop-off locations
  - Choose vehicle type (sedan/bike)
  - Fare estimates

- **Payment**:
  - Multiple options: UPI, cards, wallets
  - Integrated with Razorpay/Stripe

- **Tracking**:
  - Real-time map view
  - ETA updates

- **UI Screens**:
  - Home (categories grid)
  - Login
  - Service Category
  - Booking
  - Tracking
  - Profile

### 3.2 Worker App
**Platform**: Mobile (React Native)

**Key Features**:
- **Profile Management**:
  - Create/verify profile
  - Upload documents
  - Admin approval system

- **Service Management**:
  - Add/edit services
  - Set prices & subcategories

- **Job System**:
  - Accept/reject requests
  - Track job status
  - In-app chat

- **Earnings**:
  - Daily/weekly summaries
  - Payout history

### 3.3 Driver App
**Platform**: Mobile (React Native)

**Key Features**:
- **Trip Management**:
  - Accept/reject trip requests
  - View trip details

- **Navigation**:
  - Live GPS tracking
  - Google Maps integration

- **Earnings**:
  - Trip history
  - Payout summaries

### 3.4 Admin Panel
**Platform**: Web (React)
**URL**: admin.urbango.ca

**Key Features**:
- **Dashboard**:
  - Key performance indicators
  - Booking/revenue analytics

- **User Management**:
  - Approve/reject workers & drivers

- **Content Management**:
  - Add/edit service categories
  - Set pricing rules

- **Dispute Resolution**:
  - Ticketing system
  - Conflict mediation

### 3.5 Super Admin Panel
**Platform**: Web (React)
**URL**: superadmin.urbango.ca

**Key Features**:
- **Admin Management**:
  - Create/delete admin accounts
  - Set permissions

- **System Configuration**:
  - Notification settings
  - Payment gateway setup

- **Audit & Reporting**:
  - Action logs
  - Financial/user data exports

## 4. Non-Functional Requirements

Performance: Load within 2-3 seconds, support 10,000 users initially.
Security: HTTPS, JWT/OAuth, data encryption, role-based access.
Scalability: Horizontal scaling with load balancers.
Usability: Accessible (WCAG 2.1), responsive design.
Reliability: 99.9% uptime, 24/7 availability.

## 5. Technical Requirements

### 5.1 Technology Stack

| Component          | Technology Options               |
|--------------------|----------------------------------|
| **Frontend (Mobile)** | React Native                   |
| **Frontend (Web)**   | React                          |
| **Backend**          | Node.js/Express or Java/Spring Boot |
| **Database**         | PostgreSQL or MongoDB          |
| **Authentication**   | JWT/OAuth 2.0                  |
| **Cloud Hosting**    | AWS or Google Cloud            |
| **Notifications**    | Firebase Cloud Messaging       |
| **Payments**         | Razorpay or Stripe             |
| **Maps**             | Google Maps API                |

### 5.2 Project Structure

```
src/
├── app/
│   ├── core/        # API, Redux store, utilities
│   ├── shared/      # Shared components (Button, MapComponent)
│   ├── layouts/     # Role-specific layouts
│   ├── features/    # Feature modules (admin, worker, driver)
│   └── auth/        # Authentication flows
├── assets/          # Images, fonts
└── environments/    # Configuration files
```

### 5.3 Architecture

**Frontend**:
- Component-based design
- Role-based routing (React Navigation/React Router)

**Backend**:
- RESTful APIs
- Microservices-ready
- Scalable database architecture

**Data Flow**:
1. Customer → Booking/Trip Request → Backend
2. Backend → Worker/Driver Assignment → Tracking Updates
3. Tracking → Payment Processing
4. Admin/Super Admin → Management Actions → Audit/Reports

## 6. API Specifications

### Authentication APIs
| Endpoint | Method | Description | Request Body | Response | Access | Errors | Notes |
|----------|--------|-------------|--------------|----------|--------|--------|-------|
| `/api/auth/register` | POST | Register new user | { email, password, role, name, phone, documents } | { token, user } | All | 400, 409 | JWT token generation |
| `/api/auth/login` | POST | Authenticate user | { email, password, role } | { token, user } | All | 401, 404 | Rate limiting (100 req/min) |

### Admin APIs
| Endpoint | Method | Description | Request Body | Response | Access | Errors | Notes |
|----------|--------|-------------|--------------|----------|--------|--------|-------|
| `/api/admin/users` | GET | List users | { role, status, page, limit } | { users[], total } | Admin+ | 403, 500 | Paginated results |
| `/api/admin/users/approve` | POST | Approve worker/driver | { user_id, status, reason } | { user_id, status } | Admin | 400, 404 | SMS/email notification |
| `/api/admin/categories` | GET | List categories | - | { categories[] } | Admin | 500 | Cached data |
| `/api/admin/categories` | POST | Manage categories | { category, subcategories, price, action } | { category_id } | Admin | 400, 409 | Validate subcategories |
| `/api/admin/disputes` | GET | List disputes | { status, user_id, page, limit } | { disputes[], total } | Admin | 403 | Search by user_id |
| `/api/admin/disputes/resolve` | POST | Resolve dispute | { dispute_id, resolution } | { dispute_id, status } | Admin | 400, 404 | Send notification |

### Super Admin APIs
| Endpoint | Method | Description | Request Body | Response | Access | Errors | Notes |
|----------|--------|-------------|--------------|----------|--------|--------|-------|
| `/api/superadmin/admins` | GET | List admins | { status, page, limit } | { admins[], total } | Super | 500 | Filter by status |
| `/api/superadmin/admins` | POST | Create admin | { email, password, name } | { admin_id } | Super | 400, 409 | Hash password |
| `/api/superadmin/admins/delete` | DELETE | Delete admin | { admin_id } | { message } | Super | 403, 404 | Log action |
| `/api/superadmin/settings` | GET | Get settings | - | { settings } | Super | 500 | Cached |
| `/api/superadmin/settings` | PUT | Update settings | { key, value } | { message } | Super | 400, 500 | Validate values |
| `/api/superadmin/audit` | GET | Audit logs | { action, user_id, dates } | { logs[], total } | Super | 400, 500 | CSV export |
| `/api/superadmin/reports` | GET | Generate reports | { type, dates, format } | { report_id, url } | Super | 400, 500 | Queue heavy jobs |

### Worker APIs
| Endpoint | Method | Description | Request Body | Response | Access | Errors | Notes |
|----------|--------|-------------|--------------|----------|--------|--------|-------|
| `/api/worker/profile` | GET | Get profile | - | { profile } | Worker | 401, 404 | Approved only |
| `/api/worker/profile` | PUT | Update profile | { name, skills, documents } | { message } | Worker | 400, 403 | Admin approval |
| `/api/worker/services` | GET | List services | - | { services[] } | Worker | 500 | Filter by availability |
| `/api/worker/services` | POST | Add service | { category, subcategory, price } | { service_id } | Worker | 400, 409 | Validate categories |
| `/api/worker/jobs` | GET | Job requests | { status, page, limit } | { jobs[], total } | Worker | 401 | Paginated |
| `/api/worker/jobs` | PUT | Manage job | { job_id, action, reason } | { job_id, status } | Worker | 400, 404 | Notify customer |
| `/api/worker/chat` | GET | Chat history | { job_id } | { messages[] } | Worker | 404 | WebSocket updates |
| `/api/worker/chat` | POST | Send message | { job_id, message } | { message_id } | Worker | 400, 404 | Push notification |
| `/api/worker/earnings` | GET | Earnings | { dates, type } | { earnings } | Worker | 400, 500 | Cached |

### Driver APIs
| Endpoint | Method | Description | Request Body | Response | Access | Errors | Notes |
|----------|--------|-------------|--------------|----------|--------|--------|-------|
| `/api/driver/trips` | GET | Trip requests | { status, page, limit } | { trips[], total } | Driver | 401 | Paginated |
| `/api/driver/trips` | PUT | Manage trip | { trip_id, action, reason } | { trip_id, status } | Driver | 400, 404 | Notify customer |
| `/api/driver/location` | POST | Update location | { trip_id, coords } | { message } | Driver | 400, 404 | WebSocket |
| `/api/driver/history` | GET | Trip history | { dates, page, limit } | { history[], total } | Driver | 400 | CSV export |
| `/api/driver/earnings` | GET | Earnings | { dates, type } | { earnings } | Driver | 400 | Cached |

## 7. UI/UX Design

### Customer Interface
- **Style**: Urban Company-inspired
- **Features**:
  - Clean 1-page booking flow
  - Tailwind CSS components
  - Responsive design

### Worker/Driver Apps
- **Optimization**: Mobile-first
- **Components**:
  - Map integration
  - NativeBase UI kit
  - Status indicators

### Admin Panels
- **Layout**: Desktop-optimized
- **Elements**:
  - Sidebar navigation
  - Chart.js for analytics
  - Form-based management

## 8. Testing and Quality Assurance

| Test Type | Tools | Coverage | Notes |
|-----------|-------|----------|-------|
| Unit | Jest, React Testing Library | Components | Mock data |
| Integration | Postman | API calls | Test environments |
| E2E | Cypress | User flows | Booking → Payment |
| Performance | JMeter | 5,000 users | Load testing |
| Security | OWASP ZAP | Vulnerabilities | Regular scans |

## 9. Edge Cases

### Customer Scenarios
- Booking during provider unavailability
- Payment failure recovery
- Concurrent service requests

### Worker/Driver Scenarios
- Multiple simultaneous job requests
- Offline mode operation
- Location tracking failures

### Admin Scenarios
- High dispute volume
- Category deletion with active bookings
- Bulk user approvals

## 10. Deployment and Maintenance

### Environments
- **Development**: Local setups
- **Staging**: AWS test instance
- **Production**: AWS live with DNS

### Deployment Process
1. **Web**: Vercel deployment
   - Custom domains for panels
2. **Mobile**: App Store submission
   - Google Play & Apple Store
3. **Backend**: CI/CD pipeline
   - Automated testing
   - Zero-downtime deploys

### Monitoring
- **Logs**: AWS CloudWatch
- **Performance**: New Relic
- **Uptime**: 99.9% SLA

## 11. Timeline and Milestones

| Phase | Weeks | Frontend Tasks | Backend Tasks | Deliverables |
|-------|-------|----------------|---------------|--------------|
| Setup | 1-2 | Auth UI, project structure | Auth APIs, DB setup | Base systems |
| Core | 3-4 | Role layouts | User management | Login flows |
| Features | 5-6 | All role interfaces | Service/trip APIs | Booking system |
| Advanced | 7-8 | Chat, tracking | Notifications | Live updates |
| Testing | 9-10 | Component tests | API validation | Test reports |
| Deploy | 11-12 | App builds | Cloud config | Live platform |

## 12. References

- Urban Company service model
- Ola ride-hailing platform
- Google Maps API documentation
- Razorpay payment integration docs
