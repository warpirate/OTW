const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// AWS S3 setup (reusing env patterns from worker docs route)
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_CUSTOMER_DOCS || process.env.AWS_BUCKET_NAME;
const s3 = new AWS.S3({ region: S3_REGION });

const ALLOWED_DOC_TYPES = new Set(['student_id', 'aadhaar', 'pan', 'other']);

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
    const { file_name, content_type, document_type } = req.body || {};

    if (!file_name || !content_type || !document_type) {
      return res.status(400).json({ message: 'file_name, content_type and document_type are required' });
    }

    if (!ALLOWED_DOC_TYPES.has(document_type)) {
      return res.status(400).json({ message: 'Invalid document_type' });
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
    const { document_type, object_key } = req.body || {};

    if (!object_key || !document_type) {
      return res.status(400).json({ message: 'document_type and object_key are required' });
    }
    if (!ALLOWED_DOC_TYPES.has(document_type)) {
      return res.status(400).json({ message: 'Invalid document_type' });
    }

    const [result] = await pool.query(
      `INSERT INTO customer_verifications (customer_id, document_url, document_type, verification_status)
       VALUES (?, ?, ?, 'pending')`,
      [customerId, object_key, document_type]
    );

    return res.status(201).json({
      message: 'Document saved successfully',
      id: result.insertId,
      document_url: object_key
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
      `SELECT id, document_type, document_url, verification_status, uploaded_at
       FROM customer_verifications
       WHERE customer_id = ?
       ORDER BY uploaded_at DESC`,
      [customerId]
    );

    return res.json({ documents: rows });
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

module.exports = router;
