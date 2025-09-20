# OMW Backend Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Redis (optional, for caching)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Setup environment:**
```bash
# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual values
```

3. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🗄️ Database Setup

### Option 1: Using Docker (Recommended)
```bash
# Start MySQL with Docker
docker run --name omw-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=omw_db \
  -p 3306:3306 \
  -d mysql:8.0

# Run migrations
mysql -h localhost -u root -p omw_db < database_updates/omw_4.0.sql
mysql -h localhost -u root -p omw_db < database_updates/run_migrations.sql
```

### Option 2: Existing MySQL
1. Create database: `CREATE DATABASE omw_db;`
2. Run migrations in order:
   - `omw_4.0.sql`
   - `run_migrations.sql`

## 🔧 Configuration

### Required Environment Variables
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=omw_db
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Optional (Mock available)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Optional (Mock available)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Mock Mode (Without Payment Keys)
If you don't have payment gateway keys, the system will automatically use mock functions for:
- Payment processing
- UPI transactions
- Order creation
- Refunds

## 🧪 Testing

### Start with Mock Payments
```bash
# The system will automatically use mock functions
npm run dev
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:5001/api/health

# Get vehicle types (no auth required)
curl http://localhost:5001/api/ride/vehicle-types

# Create a test user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

## 📱 Mobile App Integration

### Customer App
- Base URL: `http://your-server:5001/api`
- Socket URL: `http://your-server:5001`

### Captain App
- Same endpoints as customer app
- Role-based authentication required

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (customer, worker, admin, super_admin)
- Input validation and sanitization
- SQL injection protection
- Rate limiting ready
- CORS configuration

## 📊 Features Status

### ✅ Fully Implemented
- User authentication & authorization
- Ride booking system
- Dynamic fare calculation
- Real-time Socket.IO communication
- Provider management
- Admin dashboard
- File upload handling
- Database migrations
- Mock payment processing

### 🔧 Ready for Production (Add Keys)
- Razorpay payment gateway
- Google Maps integration
- SMS/Email notifications
- Push notifications

## 🚨 Production Checklist

- [ ] Set up production database (AWS RDS recommended)
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring (optional)
- [ ] Configure backup strategy
- [ ] Add payment gateway keys (optional)
- [ ] Add Google Maps API key (optional)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DB_HOST, DB_USER, DB_PASSWORD
   - Ensure MySQL is running
   - Verify database exists

2. **Port Already in Use**
   ```bash
   # Find process using port 5001
   lsof -ti:5001 | xargs kill -9
   ```

3. **Environment Variables Not Loading**
   - Ensure .env file exists in backend root
   - Restart the server after changes

4. **Payment Errors (Expected without keys)**
   - System uses mock functions automatically
   - Add Razorpay keys for live payments

## 📞 Support

For issues or questions:
1. Check this README
2. Verify environment configuration
3. Check server logs
4. Ensure all dependencies are installed

---

**Your OMW backend is ready for development and testing!** 🎉

Add your database credentials and optionally payment gateway keys to start using all features.

