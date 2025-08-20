const express = require('express');
const cors = require('cors');
require('dotenv').config();

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
const baseURL = process.env.BASE_URL1 || '/api';

app.use(`${baseURL}/categories`, categoryRoute); 
app.use(`${baseURL}/auth`, authRoute);
app.use(`${baseURL}/customer`, customerRoute);
app.use(`${baseURL}/customer/driver`, driverRoute);
app.use(`${baseURL}/customer/cart`, cartRoute);
app.use(`${baseURL}/customer/addresses`, addressRoute);
app.use(`${baseURL}/customer/bookings`, bookingRoute);
app.use(`${baseURL}/superadmin`, superAdminRoute);
app.use(`${baseURL}/admin`, providerAdminRoute);
app.use(`${baseURL}/worker-management`, workerRoute);
app.use(`${baseURL}/worker`, workerDocsRoute);
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
