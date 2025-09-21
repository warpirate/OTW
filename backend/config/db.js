const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: process.env.NODE_ENV === 'production' ? 25 : 15,
  queueLimit: 0,
  // Return DATE/DATETIME as strings to avoid timezone conversion to UTC
  dateStrings: true,
  // Enable multiple statements for migrations
  multipleStatements: process.env.NODE_ENV !== 'production',
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : false
});
 
db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL Pool connection failed:', err);
  } else {
    console.log('MySQL Pool Connected');
    connection.release();  
  }
});

module.exports = db;
