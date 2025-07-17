const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
 const verifyToken = require('../middlewares/verify_token');

 