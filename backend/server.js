const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Load route
const pool = require('./config/db');
const categoryRoute = require('./routes/category_management/categories');
const subcategoriesRoute = require('./routes/category_management/subcategories');
const authRoute = require('./routes/authentication/auth');
const baseURL = process.env.BASE_URL1 || '/api';

app.use(`${baseURL}/categories`, categoryRoute, subcategoriesRoute);
app.use(`${baseURL}/auth`, authRoute);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
