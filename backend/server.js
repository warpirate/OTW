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
const workerRoute = require('./routes/worker_management/worker');
const baseURL = process.env.BASE_URL1 || '/api';

app.use(`${baseURL}/categories`, categoryRoute); 
app.use(`${baseURL}/auth`, authRoute);
app.use(`${baseURL}/customer`, customerRoute);
app.use(`${baseURL}/superadmin`, superAdminRoute);
app.use(`${baseURL}/worker-management`, workerRoute);
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
