const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();

// Configure CORS for production and development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Production domains
      'https://omwhub.com',
      'https://www.omwhub.com',
      'https://test.omwhub.com',
      'https://d1v40s48mdt8sd.cloudfront.net',
      // Development domains (only if NODE_ENV is not production)
      ...(process.env.NODE_ENV !== 'production' ? [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5001',
        'capacitor://localhost',
        'http://localhost'
      ] : []),
      // Add any additional production frontend URLs from environment
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load route
const pool = require('./config/db');
const { verifyTransporter } = require('./services/emailService');

const categoryRoute = require('./routes/category_management/categories');
const authRoute = require('./routes/authentication/auth');
const oauthRoute = require('./routes/authentication/oauth');
const customerRoute = require('./routes/customer_management/customer');
const superAdminRoute = require('./routes/admin_management/superAdmin');
const auditLogsRoute = require('./routes/admin_management/auditLogs');
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
const customerAdminRoute = require('./routes/admin_management/customerAdmin');
const emailTestRoute = require('./routes/test/emailTest');
const registrationTestRoute = require('./routes/test/registrationTest');
// Site Management Routes
const siteSettingsRoute = require('./routes/site_management/siteSettings');
const contentPagesRoute = require('./routes/site_management/contentPages');
const socialLinksRoute = require('./routes/site_management/socialLinks');
const paymentSettingsRoute = require('./routes/admin_management/paymentSettings');
const assistantRoute = require('./routes/assistant/assistant');
const baseURL = process.env.BASE_URL1 || '/api';

// Test routes (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use(`${baseURL}/test/email`, emailTestRoute);
    app.use(`${baseURL}/test/registration`, registrationTestRoute);
}

app.use(`${baseURL}/categories`, categoryRoute); 
app.use(`${baseURL}/auth`, authRoute);
app.use(`${baseURL}/auth`, oauthRoute);
app.use(`${baseURL}/customer`, customerRoute);
// Wallet customer routes disabled
// app.use(`${baseURL}/customer`, require('./routes/customer_management/wallet'));
app.use(`${baseURL}/customer/driver`, driverRoute);
app.use(`${baseURL}/customer/ride`, rideQuoteRoute);
app.use(`${baseURL}/customer/cart`, cartRoute);
app.use(`${baseURL}/customer/addresses`, addressRoute);
app.use(`${baseURL}/customer/bookings`, bookingRoute);
app.use(`${baseURL}/customer/verifications`, customerVerificationsRoute);
app.use(`${baseURL}/payment`, paymentRoute);
app.use(`${baseURL}/webhooks`, webhookRoute);
// Specific superadmin sub-routes must come before the general /superadmin route
// Site Management routes (must come before general superadmin route)
app.use(`${baseURL}/superadmin/site-settings`, siteSettingsRoute);
app.use(`${baseURL}/superadmin/content-pages`, contentPagesRoute);
app.use(`${baseURL}/superadmin/social-links`, socialLinksRoute);
app.use(`${baseURL}/superadmin/payment-settings`, paymentSettingsRoute);
app.use(`${baseURL}/superadmin/audit-logs`, auditLogsRoute);
app.use(`${baseURL}/superadmin`, superAdminRoute);
app.use(`${baseURL}/admin`, providerAdminRoute);
app.use(`${baseURL}/admin`, customerAdminRoute);
app.use(`${baseURL}/admin/pricing`, pricingAdminRoute);
app.use(`${baseURL}/admin/payouts`, payoutAdminRoute);
app.use(`${baseURL}/worker-management`, workerRoute);
app.use(`${baseURL}/worker-management`, require('./routes/worker_management/cash_payments'));
app.use(`${baseURL}/worker-management/selfie-verification`, require('./routes/worker_management/selfieVerification'));
// Wallet worker routes disabled
// app.use(`${baseURL}/worker-management`, require('./routes/worker_management/wallet'));
app.use(`${baseURL}/worker`, workerDocsRoute);
app.use(`${baseURL}/worker/trip`, tripTrackingRoute);
// Wallet admin routes disabled
// app.use(`${baseURL}/admin`, require('./routes/admin_management/wallet'));
app.use(`${baseURL}/chat`, chatRoute);
app.use(`${baseURL}/assistant`, assistantRoute);

// Initialize chat socket server with proper ChatService integration
const SocketServer = require('./socketServer');
const socketServer = new SocketServer(app);

// Initialize socket server and get the HTTP server
let server;
(async () => {
  try {
    server = await socketServer.initialize();
    
    // Make io accessible in routes via req.app.get('io')
    app.set('io', socketServer.getIO());
    app.set('chatService', socketServer.getChatService());
    
    console.log('✅ Chat socket server initialized with ChatService');
    
    // Start the server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (with Chat Socket.IO)`));
  } catch (error) {
    console.error('❌ Failed to initialize chat socket server:', error);
    // Fallback to basic HTTP server if socket initialization fails
    server = http.createServer(app);
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (basic HTTP only)`));
  }
})();

// Initialize email service
verifyTransporter().then((isReady) => {
  if (!isReady) {
    console.warn('⚠️  Email service not configured properly. OTP emails will not work.');
    console.warn('Please set USER_GMAIL and USER_PASSWORD environment variables.');
  }
});
