const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const SocketServer = require('./socketServer');

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
const customerVerificationsRoute = require('./routes/customer_management/customer_verifications');
const paymentRoute = require('./routes/customer_management/payments');
const webhookRoute = require('./routes/customer_management/webhooks');
const chatRoute = require('./routes/chat/chat');
const baseURL = process.env.BASE_URL1 || '/api';

app.use(`${baseURL}/categories`, categoryRoute); 
app.use(`${baseURL}/auth`, authRoute);
app.use(`${baseURL}/customer`, customerRoute);
app.use(`${baseURL}/customer`, require('./routes/customer_management/wallet'));
app.use(`${baseURL}/customer/driver`, driverRoute);
app.use(`${baseURL}/customer/ride`, rideQuoteRoute);
app.use(`${baseURL}/customer/cart`, cartRoute);
app.use(`${baseURL}/customer/addresses`, addressRoute);
app.use(`${baseURL}/customer/bookings`, bookingRoute);
app.use(`${baseURL}/customer/verifications`, customerVerificationsRoute);
app.use(`${baseURL}/payment`, paymentRoute);
app.use(`${baseURL}/webhooks`, webhookRoute);
app.use(`${baseURL}/superadmin`, superAdminRoute);
app.use(`${baseURL}/admin`, providerAdminRoute);
app.use(`${baseURL}/admin/pricing`, pricingAdminRoute);
app.use(`${baseURL}/admin/payouts`, payoutAdminRoute);
app.use(`${baseURL}/worker-management`, workerRoute);
app.use(`${baseURL}/worker-management`, require('./routes/worker_management/cash_payments'));
app.use(`${baseURL}/worker-management`, require('./routes/worker_management/wallet'));
app.use(`${baseURL}/worker`, workerDocsRoute);
app.use(`${baseURL}/worker/trip`, tripTrackingRoute);
app.use(`${baseURL}/admin`, require('./routes/admin_management/wallet'));
app.use(`${baseURL}/chat`, chatRoute);

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

// Initialize Socket.IO server with chat service
let socketServer;
let server;

async function initializeServer() {
  try {
    // Create Socket.IO server with chat service
    socketServer = new SocketServer(app);
    server = await socketServer.initialize();
    
    // Make io accessible in routes via req.app.get('io')
    app.set('io', socketServer.getIO());
    app.set('chatService', socketServer.getChatService());
    
    console.log('✅ Socket.IO server with chat service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Socket.IO server:', error);
    process.exit(1);
  }
}

// Legacy Socket.IO handlers (for existing functionality)
function setupLegacySocketHandlers(io) {
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
    console.log(`🔌 Legacy Socket connected: user=${userId} role=${role} socket=${socket.id}`);

    // Handle worker room joins
    socket.on('join_worker_room', (bookingId) => {
      console.log(`Worker ${userId} joining room for booking ${bookingId}`);
      socket.join(`booking_${bookingId}`);
    });

    // Handle customer booking room joins
    socket.on('join_booking_room', (bookingId) => {
      console.log(`Customer ${userId} joining room for booking ${bookingId}`);
      socket.join(`booking_${bookingId}`);
    });

    // Handle OTP sending from worker to customer
    socket.on('send_otp', async (data) => {
      try {
        const { booking_id, otp } = data;
        console.log(`Sending OTP ${otp} for booking ${booking_id}`);
        
        // Get customer user_id from booking
        const [customerData] = await pool.query(
          'SELECT user_id FROM bookings WHERE id = ?',
          [booking_id]
        );
        
        if (customerData.length) {
          // Send OTP to customer
          io.to(`user:${customerData[0].user_id}`).emit('otp_code', {
            booking_id,
            otp,
            message: 'Your service provider has arrived. Please verify with this OTP.'
          });
        }
      } catch (error) {
        console.error('Error sending OTP:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Legacy Socket disconnected: user=${userId} reason=${reason}`);
    });
  });
}

// Start server
async function startServer() {
  await initializeServer();
  
  // Setup legacy socket handlers
  setupLegacySocketHandlers(socketServer.getIO());
  
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (with Socket.IO and Chat Service)`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (socketServer) {
    await socketServer.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (socketServer) {
    await socketServer.shutdown();
  }
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
