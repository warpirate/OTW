const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// AWS S3 setup (reusing env patterns from worker docs route)
const S3_REGION = process.env.AWS_REGION;
// Support multiple env var names for the bucket to match different deployments
const S3_BUCKET =
  process.env.S3_BUCKET ||
  process.env.S3_BUCKET_CUSTOMER_DOCS ||
  process.env.AWS_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET;
const s3 = new AWS.S3({ region: S3_REGION });

const ALLOWED_CUSTOMER_TYPES = new Set(['student', 'senior_citizen']);

// Helper to create a safe S3 key filename
const sanitizeFileName = (name) => {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200);
};

// POST /presign -> generate presigned PUT URL for direct upload
router.post('/presign', verifyToken, async (req, res) => {
  try {
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    const customerId = req.user.id;
    const { file_name, content_type, customer_type } = req.body || {};

    if (!file_name || !content_type || !customer_type) {
      return res.status(400).json({ message: 'file_name, content_type and customer_type are required' });
    }

    if (!ALLOWED_CUSTOMER_TYPES.has(customer_type)) {
      return res.status(400).json({ message: 'Invalid customer_type. Must be "student" or "senior_citizen"' });
    }

    const safeName = sanitizeFileName(file_name);
    const key = `customer_documents/${customerId}/${Date.now()}_${safeName}`;

    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: content_type,
      Expires: 300
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return res.json({
      uploadUrl,
      objectKey: key,
      expiresIn: 300,
      bucket: S3_BUCKET,
      region: S3_REGION
    });
  } catch (err) {
    console.error('Error generating customer doc presigned URL:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /confirm -> confirm upload and save record
router.post('/confirm', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { customer_type, object_key } = req.body || {};

    if (!object_key || !customer_type) {
      return res.status(400).json({ message: 'customer_type and object_key are required' });
    }
    if (!ALLOWED_CUSTOMER_TYPES.has(customer_type)) {
      return res.status(400).json({ message: 'Invalid customer_type. Must be "student" or "senior_citizen"' });
    }

    // Check for existing verification documents (mutual exclusivity)
    const [existingDocs] = await pool.query(
      `SELECT cv.id, ct.name as customer_type_name 
       FROM customer_verifications cv
       JOIN customers c ON c.id = cv.customer_id
       JOIN customer_types ct ON ct.id = c.customer_type_id
       WHERE cv.customer_id = ? AND cv.verification_status IN ('pending', 'verified')`,
      [customerId]
    );

    // If user already has a verification document, prevent uploading different type
    if (existingDocs.length > 0) {
      const existingTypeName = existingDocs[0].customer_type_name;
      const newTypeName = customer_type === 'student' ? 'Student' : 'Senior Citizen';
      
      if (existingTypeName.toLowerCase() !== customer_type) {
        return res.status(400).json({ 
          message: `You already have a ${existingTypeName} verification document. Cannot upload ${newTypeName} document.`,
          existing_type: existingTypeName.toLowerCase()
        });
      }
      
      // If same type, check if there's already a pending/verified document
      return res.status(400).json({ 
        message: `You already have a ${existingTypeName} verification document pending or verified.`
      });
    }

    // Update customer type first based on intended verification type
    let customerTypeId = 1; // Default to Normal (1)
    if (customer_type === 'student') {
      customerTypeId = 3; // Student type
    } else if (customer_type === 'senior_citizen') {
      customerTypeId = 2; // Senior Citizen type
    }

    // Update the customer's type
    await pool.query(
      `UPDATE customers SET customer_type_id = ? WHERE id = ?`,
      [customerTypeId, customerId]
    );

    // Insert verification record (without document_type column)
    const [result] = await pool.query(
      `INSERT INTO customer_verifications (customer_id, document_url, verification_status)
       VALUES (?, ?, 'pending')`,
      [customerId, object_key]
    );

    return res.status(201).json({
      message: 'Document saved successfully',
      id: result.insertId,
      document_url: object_key,
      customer_type_updated: true,
      customer_type_id: customerTypeId
    });
  } catch (err) {
    console.error('Error confirming customer document:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET / -> list my verification documents
router.get('/', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    const [rows] = await pool.query(
      `SELECT cv.id, cv.document_url, cv.verification_status, cv.uploaded_at, ct.name as customer_type_name
       FROM customer_verifications cv
       JOIN customers c ON c.id = cv.customer_id
       JOIN customer_types ct ON ct.id = c.customer_type_id
       WHERE cv.customer_id = ?
       ORDER BY cv.uploaded_at DESC`,
      [customerId]
    );

    // Map the results to include document_type for frontend compatibility
    const documents = rows.map(row => ({
      id: row.id,
      document_url: row.document_url,
      verification_status: row.verification_status,
      uploaded_at: row.uploaded_at,
      document_type: row.customer_type_name.toLowerCase().replace(' ', '_') // Convert "Senior Citizen" to "senior_citizen"
    }));

    return res.json({ documents });
  } catch (err) {
    console.error('Error listing customer documents:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /:id/presign -> presigned GET to view my own doc
router.get('/:id/presign', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const docId = req.params.id;

    const [docs] = await pool.query(
      'SELECT document_url FROM customer_verifications WHERE id = ? AND customer_id = ?',
      [docId, customerId]
    );

    if (docs.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    let key = docs[0].document_url;
    if (!key) return res.status(400).json({ message: 'Document key empty' });

    // If stored locally (legacy), attempt one-time migration to S3
    if (key.startsWith('/uploads/')) {
      try {
        if (!S3_BUCKET || !S3_REGION) {
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          return res.json({ success: true, url: `${baseUrl}${key}`, storage: 'local' });
        }
        const relPath = key.startsWith('/') ? key.slice(1) : key;
        const absPath = path.join(process.cwd(), relPath);
        if (!fs.existsSync(absPath)) {
          return res.status(404).json({ message: 'Local document not found for migration' });
        }
        const fileName = path.basename(absPath);
        const migrateKey = `customer_documents/${customerId}/${Date.now()}_${fileName}`;
        await s3.upload({ Bucket: S3_BUCKET, Key: migrateKey, Body: fs.createReadStream(absPath) }).promise();
        await pool.query('UPDATE customer_verifications SET document_url = ? WHERE id = ?', [migrateKey, docId]);
        key = migrateKey;
      } catch (e) {
        console.error('Customer doc migration error:', e);
        return res.status(500).json({ message: 'Failed to migrate document to S3' });
      }
    }

    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: S3_BUCKET,
      Key: key,
      Expires: 300,
      ResponseContentDisposition: 'inline'
    });

    return res.json({ success: true, url, storage: 's3', expiresIn: 300 });
  } catch (err) {
    console.error('Error generating customer doc view URL:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /:id/status -> update verification status (admin only)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'verified', 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "verified" or "rejected"' });
    }

    // Get the verification document details with current customer type
    const [docs] = await pool.query(
      `SELECT cv.customer_id, ct.name as customer_type_name, ct.id as customer_type_id
       FROM customer_verifications cv
       JOIN customers c ON c.id = cv.customer_id
       JOIN customer_types ct ON ct.id = c.customer_type_id
       WHERE cv.id = ?`,
      [id]
    );

    if (docs.length === 0) {
      return res.status(404).json({ message: 'Verification document not found' });
    }

    const { customer_id, customer_type_name, customer_type_id } = docs[0];

    // Update verification status
    await pool.query(
      `UPDATE customer_verifications SET verification_status = ? WHERE id = ?`,
      [status, id]
    );

    // If document is rejected, reset customer type to Normal
    // If verified, keep the current customer type (already set during upload)
    let newCustomerTypeId = customer_type_id; // Keep current type
    
    if (status === 'rejected') {
      newCustomerTypeId = 1; // Reset to Normal (1)
      
      // Update the customer's type back to Normal
      await pool.query(
        `UPDATE customers SET customer_type_id = ? WHERE id = ?`,
        [newCustomerTypeId, customer_id]
      );
    }

    return res.json({
      message: `Verification ${status} successfully`,
      verification_id: id,
      customer_type_updated: status === 'rejected',
      customer_type_id: newCustomerTypeId,
      customer_type_name: status === 'rejected' ? 'Normal' : customer_type_name
    });
  } catch (err) {
    console.error('Error updating verification status:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /discount-info -> get customer discount information
router.get('/discount-info', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    // Get customer type info and check if they have verified documents
    const [rows] = await pool.query(
      `SELECT c.customer_type_id, ct.name as customer_type_name, ct.discount_percentage,
              COUNT(cv.id) as verified_docs_count
       FROM customers c
       LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
       LEFT JOIN customer_verifications cv ON cv.customer_id = c.id AND cv.verification_status = 'verified'
       WHERE c.id = ?
       GROUP BY c.id, c.customer_type_id, ct.name, ct.discount_percentage`,
      [customerId]
    );

    if (rows.length === 0) {
      return res.json({
        has_discount: false,
        discount_percentage: 0,
        verification_type: null,
        customer_type: 'Normal'
      });
    }

    const customerData = rows[0];
    const hasVerifiedDocs = customerData.verified_docs_count > 0;
    const discountPercentage = hasVerifiedDocs ? (customerData.discount_percentage || 0) : 0;
    const customerTypeName = customerData.customer_type_name || 'Normal';

    return res.json({
      has_discount: discountPercentage > 0 && hasVerifiedDocs,
      discount_percentage: discountPercentage,
      verification_type: customerTypeName.toLowerCase().replace(' ', '_'), // Convert "Senior Citizen" to "senior_citizen"
      customer_type: customerTypeName
    });
  } catch (err) {
    console.error('Error getting discount info:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
