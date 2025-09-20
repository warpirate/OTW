const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Load route
const pool = require('./config/db');
const categoryRoute = require('./routes/category_management/categories');
const authRoute = require('./routes/authentication/auth');
const customerRoute = require('./routes/customer_management/customer');
const superAdminRoute = require('./routes/admin_management/superAdmin');
const providerAdminRoute = require('./routes/admin_management/providerAdmin');
const workerRoute = require('./routes/worker_management/worker');
const workerDocsRoute = require('./routes/worker_management/worker_doc_banking_details');
const cartRoute = require('./routes/category_management/cart');
const addressRoute = require('./routes/customer_management/addresses');
const bookingRoute = require('./routes/customer_management/bookings');
const driverRoute = require('./routes/customer_management/driver_booking');
const rideQuoteRoute = require('./routes/customer_management/ride_quote');
const tripTrackingRoute = require('./routes/worker_management/trip_tracking');
const pricingAdminRoute = require('./routes/admin_management/pricing_admin');
const payoutAdminRoute = require('./routes/admin_management/payout_admin');
const paymentRoute = require('./routes/customer_management/payments');
const webhookRoute = require('./routes/customer_management/webhooks');
const baseURL = process.env.BASE_URL1 || '/api';

app.use(`${baseURL}/categories`, categoryRoute); 
app.use(`${baseURL}/auth`, authRoute);
app.use(`${baseURL}/customer`, customerRoute);
app.use(`${baseURL}/customer/driver`, driverRoute);
app.use(`${baseURL}/customer/ride`, rideQuoteRoute);
app.use(`${baseURL}/customer/cart`, cartRoute);
app.use(`${baseURL}/customer/addresses`, addressRoute);
app.use(`${baseURL}/customer/bookings`, bookingRoute);
app.use(`${baseURL}/payment`, paymentRoute);
app.use(`${baseURL}/webhooks`, webhookRoute);
app.use(`${baseURL}/superadmin`, superAdminRoute);
app.use(`${baseURL}/admin`, providerAdminRoute);
app.use(`${baseURL}/admin/pricing`, pricingAdminRoute);
app.use(`${baseURL}/admin/payouts`, payoutAdminRoute);
app.use(`${baseURL}/worker-management`, workerRoute);
app.use(`${baseURL}/worker-management`, require('./routes/worker_management/cash_payments'));
app.use(`${baseURL}/worker`, workerDocsRoute);
app.use(`${baseURL}/worker/trip`, tripTrackingRoute);

// Health check endpoint
app.get(`${baseURL}/health`, async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// Socket.IO authentication and room joins
io.use(async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    const token = socket.handshake.auth?.token || tokenFromHeader;
    if (!token) {
      return next(new Error('Authentication token missing'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, email, role, role_id }

    // Join a per-user room for direct notifications
    socket.join(`user:${decoded.id}`);

    // If worker, attempt to join provider room as well
    if (decoded.role === 'worker') {
      try {
        const [rows] = await pool.query('SELECT id FROM providers WHERE user_id = ? LIMIT 1', [decoded.id]);
        if (rows.length) {
          const providerId = rows[0].id;
          socket.join(`provider:${providerId}`);
          socket.providerId = providerId;
        }
      } catch (e) {
        // Do not fail connection on provider room join failure
      }
    }

    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, role } = socket.user || {};
  console.log(`🔌 Socket connected: user=${userId} role=${role} socket=${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: user=${userId} reason=${reason}`);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (with Socket.IO)`));
