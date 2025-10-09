const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const authorizeRole = require('../../middlewares/authorizeRole');
const AWS = require('aws-sdk');

// AWS S3 setup for presigned GET URLs (admin viewing)
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_CUSTOMER_DOCS || process.env.AWS_BUCKET_NAME;
const s3 = new AWS.S3({ region: S3_REGION });

// -------- Customer Types (Discounts) --------
// GET /api/admin/customer-types
router.get('/customer-types', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, discount_percentage FROM customer_types ORDER BY id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching customer types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer types' });
  }
});

// POST /api/admin/customer-types
router.post('/customer-types', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { name, discount_percentage = 0 } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const [result] = await pool.query(
      'INSERT INTO customer_types (name, discount_percentage) VALUES (?, ?)',
      [name, discount_percentage]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name, discount_percentage } });
  } catch (error) {
    console.error('Error creating customer type:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer type' });
  }
});

// PATCH /api/admin/customer-types/:id
router.patch('/customer-types/:id', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, discount_percentage } = req.body || {};

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (discount_percentage !== undefined) { updates.push('discount_percentage = ?'); values.push(discount_percentage); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    values.push(id);
    const [result] = await pool.query(`UPDATE customer_types SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Customer type not found' });
    res.json({ success: true, message: 'Customer type updated' });
  } catch (error) {
    console.error('Error updating customer type:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer type' });
  }
});

// -------- Customers Listing & Details --------
// GET /api/admin/customers
router.get('/customers', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const customerTypeId = req.query.customer_type_id || '';
    const verification = req.query.verification || ''; // 'pending' | 'verified' | 'rejected'

    const conditions = ['ur.role_id = (SELECT id FROM roles WHERE name = "customer" LIMIT 1)'];
    const params = [];

    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (customerTypeId) {
      conditions.push('c.customer_type_id = ?');
      params.push(customerTypeId);
    }
    if (verification) {
      conditions.push(`EXISTS (SELECT 1 FROM customer_verifications cv WHERE cv.customer_id = u.id AND cv.verification_status = ?)`);
      params.push(verification);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN customers c ON c.id = u.id
       LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone_number, u.created_at,
              c.customer_type_id, ct.name AS customer_type_name, ct.discount_percentage,
              (
                SELECT cv2.verification_status FROM customer_verifications cv2
                WHERE cv2.customer_id = u.id
                ORDER BY cv2.uploaded_at DESC
                LIMIT 1
              ) AS latest_verification_status
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN customers c ON c.id = u.id
       LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: { customers: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } } });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

// GET /api/admin/customers/:id
router.get('/customers/:id', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone_number, u.created_at,
              c.customer_type_id, ct.name AS customer_type_name, ct.discount_percentage
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN customers c ON c.id = u.id
       LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
       WHERE u.id = ? AND ur.role_id = (SELECT id FROM roles WHERE name = 'customer' LIMIT 1)
       LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' });

    const [docs] = await pool.query(
      `SELECT cv.id, cv.document_url, cv.verification_status, cv.uploaded_at, ct.name as customer_type_name
       FROM customer_verifications cv
       JOIN customers c ON c.id = cv.customer_id
       JOIN customer_types ct ON ct.id = c.customer_type_id
       WHERE cv.customer_id = ? ORDER BY cv.uploaded_at DESC`,
      [id]
    );

    // Map the results to include document_type for frontend compatibility
    const documentsWithType = docs.map(row => ({
      id: row.id,
      document_url: row.document_url,
      verification_status: row.verification_status,
      uploaded_at: row.uploaded_at,
      document_type: row.customer_type_name.toLowerCase().replace(' ', '_') // Convert "Senior Citizen" to "senior_citizen"
    }));

    res.json({ success: true, data: { customer: rows[0], documents: documentsWithType } });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
});

// PATCH /api/admin/customers/:id/type -> assign customer type
router.patch('/customers/:id/type', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_type_id } = req.body || {};
    if (!customer_type_id) return res.status(400).json({ success: false, message: 'customer_type_id is required' });

    const [exists] = await pool.query('SELECT id FROM customer_types WHERE id = ? LIMIT 1', [customer_type_id]);
    if (!exists.length) return res.status(400).json({ success: false, message: 'Invalid customer_type_id' });

    const [result] = await pool.query('UPDATE customers SET customer_type_id = ? WHERE id = ?', [customer_type_id, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Customer not found' });

    res.json({ success: true, message: 'Customer type updated' });
  } catch (error) {
    console.error('Error updating customer type:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer type' });
  }
});

// -------- Customer Documents Verification --------
// GET presigned URL to view a customer document
router.get('/customer-verifications/:documentId/presign', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const [docs] = await pool.query('SELECT document_url FROM customer_verifications WHERE id = ?', [documentId]);
    if (!docs.length) return res.status(404).json({ success: false, message: 'Document not found' });
    const key = docs[0].document_url;
    if (!S3_BUCKET || !S3_REGION) return res.status(500).json({ success: false, message: 'S3 is not configured on the server' });
    const url = await s3.getSignedUrlPromise('getObject', { Bucket: S3_BUCKET, Key: key, Expires: 300, ResponseContentDisposition: 'inline' });
    res.json({ success: true, url, expiresIn: 300 });
  } catch (error) {
    console.error('Error presigning customer doc:', error);
    res.status(500).json({ success: false, message: 'Failed to generate presigned URL' });
  }
});

// PATCH verify/reject customer document
router.patch('/customer-verifications/:documentId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status } = req.body || {}; // 'verified' | 'rejected'
    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be "verified" or "rejected"' });
    }
    const [result] = await pool.query('UPDATE customer_verifications SET verification_status = ? WHERE id = ?', [status, documentId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Document not found' });

    res.json({ success: true, message: `Document ${status}` });
  } catch (error) {
    console.error('Error verifying customer document:', error);
    res.status(500).json({ success: false, message: 'Failed to verify customer document' });
  }
});

module.exports = router;
