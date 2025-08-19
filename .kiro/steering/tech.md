# Technology Stack & Development Guidelines

## Frontend Stack

### Web Applications
- **Framework**: React 18+ with Vite build system
- **Styling**: Tailwind CSS with custom brand classes
- **State Management**: Zustand for global state
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios for API communication
- **UI Components**: Custom components with Headless UI and Radix UI
- **Maps**: React Leaflet for location services
- **Notifications**: React Toastify

### Mobile Applications
- **Framework**: React Native (planned)
- **Navigation**: React Navigation
- **Maps**: Google Maps API integration (planned)

## Backend Stack

### Core Technologies
- **Runtime**: Node.js with Express.js framework
- **Database**: MySQL 8+ with mysql2 promise-based driver
- **Authentication**: JWT tokens with bcrypt password hashing
- **Environment**: dotenv for configuration management

### API Architecture
- RESTful API design with role-based routing
- Connection pooling for database optimization
- CORS enabled for cross-origin requests
- Modular route structure by feature domain

## Development Commands

### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

### Backend Development
```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Run tests (placeholder)
npm test
```

## Database Management

### Connection Configuration
- Uses connection pooling (limit: 15 connections)
- Environment-based configuration via .env
- Automatic connection health checks

### Schema Management
- Manual SQL migrations in project root
- Foreign key constraints enforced
- Timestamp tracking for audit trails

## Integration Points

### Planned Integrations
- **Google Maps API**: Location services and navigation
- **Payment Gateways**: Razorpay/Stripe for transactions
- **SMS Services**: OTP verification and notifications
- **Push Notifications**: Firebase Cloud Messaging
- **Email Services**: Transactional and marketing emails

## Security Practices

- JWT-based authentication with role verification
- Password hashing with bcrypt (10 rounds)
- Environment variable protection for secrets
- CORS configuration for API security
- Input validation and sanitization