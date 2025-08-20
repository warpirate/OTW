# Project Structure & Organization

## Repository Layout

```
├── backend/                 # Node.js Express API server
├── frontend/               # React web application
├── .kiro/                  # Kiro IDE configuration
├── *.md                    # Project documentation
└── otw_db2_3.sql          # Database schema
```

## Backend Structure

```
backend/
├── config/
│   └── db.js              # MySQL connection pool configuration
├── routes/                # Feature-based route modules
│   ├── authentication/    # Login, register, password reset
│   ├── admin_management/  # Super admin and provider admin routes
│   ├── customer_management/ # Customer, addresses, bookings, driver bookings
│   ├── worker_management/ # Worker/provider management
│   └── category_management/ # Categories and cart functionality
├── migrations/            # Database migration scripts
├── node_modules/          # Dependencies
├── .env                   # Environment configuration
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and scripts
└── server.js             # Main application entry point
```

## Frontend Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Route-specific page components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── styles/           # Global styles and Tailwind config
│   └── App.jsx           # Main application component
├── public/               # Static assets
├── dist/                 # Production build output
├── node_modules/         # Dependencies
├── .eslintrc.json        # ESLint configuration
├── .prettierrc           # Prettier configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.js        # Vite build configuration
└── package.json          # Dependencies and scripts
```

## API Route Organization

### Base URL Structure
- Base API URL: `/api` (configurable via BASE_URL1 env var)
- Authentication: `/api/auth/*`
- Customer operations: `/api/customer/*`
- Worker management: `/api/worker-management/*`
- Admin operations: `/api/admin/*`
- Super admin: `/api/superadmin/*`
- Categories: `/api/categories/*`

### Route Modules by Feature
- **Authentication**: Login, register, password reset, OTP verification
- **Customer Management**: Profile, addresses, bookings, driver bookings
- **Worker Management**: Provider registration, service management
- **Admin Management**: User management, category management, disputes
- **Category Management**: Service categories, cart operations

## Database Schema Organization

### Core Tables
- `users`: Base user information for all roles
- `roles`: Role definitions (customer, worker, driver, admin, super_admin)
- `user_roles`: Many-to-many relationship between users and roles

### Feature-Specific Tables
- **Customers**: `customers`, `addresses`
- **Providers**: `providers`, `provider_services`
- **Bookings**: `bookings`, `booking_requests`
- **Categories**: `categories`, `subcategories`
- **Vehicles**: `vehicles` (for transportation services)

## File Naming Conventions

### Backend
- Route files: lowercase with underscores (`customer_management.js`)
- Configuration files: lowercase (`db.js`, `auth.js`)
- Directory names: lowercase with underscores

### Frontend
- Components: PascalCase (`UserProfile.jsx`)
- Pages: PascalCase (`CustomerDashboard.jsx`)
- Utilities: camelCase (`apiClient.js`)
- Styles: kebab-case (`custom-components.css`)

## Environment Configuration

### Backend Environment Variables
```
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=otw_db
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h
PORT=5050
BASE_URL1=/api
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables
```
VITE_API_BASE_URL=http://localhost:5050/api
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- Feature branches: `feature/feature-name`
- Hotfix branches: `hotfix/issue-description`

### Code Organization Principles
- Separation of concerns between frontend and backend
- Feature-based module organization
- Role-based access control throughout the application
- Consistent error handling and response formats
- Environment-specific configuration management