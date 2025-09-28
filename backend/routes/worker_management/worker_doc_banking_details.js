const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/provider_documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed'));
    }
  }
});

// AWS S3 setup for presigned URL uploads
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_PROVIDER_DOCS || process.env.AWS_BUCKET_NAME;
const s3 = new AWS.S3({ region: S3_REGION });

// Helper to create a safe S3 key filename
const sanitizeFileName = (name) => {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200);
};

// ============= BANKING DETAILS APIs =============

// GET /banking-details - Get provider's banking details
router.get('/banking-details', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get provider ID from user ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Get all banking details for the provider
    const [bankingDetails] = await pool.query(
      `SELECT * FROM provider_banking_details 
       WHERE provider_id = ? 
       ORDER BY is_primary DESC, created_at DESC`,
      [providerId]
    );
    
    res.json({ bankingDetails });
  } catch (err) {
    console.error('Error fetching banking details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /banking-details - Add new banking details
router.post('/banking-details', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name,
      branch_name,
      account_type,
      is_primary
    } = req.body;
    
    // Validate required fields
    if (!account_holder_name || !account_number || !ifsc_code || !bank_name || !account_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Start transaction
    await pool.query('START TRANSACTION');
    
    try {
      // If setting as primary, unset other primary accounts
      if (is_primary) {
        await pool.query(
          'UPDATE provider_banking_details SET is_primary = 0 WHERE provider_id = ?',
          [providerId]
        );
      }
      
      // Insert new banking details
      const [result] = await pool.query(
        `INSERT INTO provider_banking_details 
         (provider_id, account_holder_name, account_number, ifsc_code, 
          bank_name, branch_name, account_type, is_primary, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unverified')`,
        [providerId, account_holder_name, account_number, ifsc_code, 
         bank_name, branch_name || null, account_type, is_primary ? 1 : 0]
      );
      
      await pool.query('COMMIT');
      
      res.status(201).json({ 
        message: 'Banking details added successfully',
        id: result.insertId 
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error adding banking details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /banking-details/:id - Update banking details
router.put('/banking-details/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bankingId = req.params.id;
    const updates = req.body;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Check if banking details belong to this provider
    const [bankingDetails] = await pool.query(
      'SELECT * FROM provider_banking_details WHERE id = ? AND provider_id = ?',
      [bankingId, providerId]
    );
    
    if (bankingDetails.length === 0) {
      return res.status(404).json({ message: 'Banking details not found' });
    }
    
    // Start transaction
    await pool.query('START TRANSACTION');
    
    try {
      // If setting as primary, unset other primary accounts
      if (updates.is_primary) {
        await pool.query(
          'UPDATE provider_banking_details SET is_primary = 0 WHERE provider_id = ? AND id != ?',
          [providerId, bankingId]
        );
      }
      
      // Build update query dynamically
      const allowedFields = ['account_holder_name', 'account_number', 'ifsc_code', 
                           'bank_name', 'branch_name', 'account_type', 'is_primary'];
      const updateFields = [];
      const updateValues = [];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      }
      
      if (updateFields.length > 0) {
        updateValues.push(bankingId, providerId);
        await pool.query(
          `UPDATE provider_banking_details 
           SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ? AND provider_id = ?`,
          updateValues
        );
      }
      
      await pool.query('COMMIT');
      
      res.json({ message: 'Banking details updated successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error updating banking details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /banking-details/:id - Delete banking details
router.delete('/banking-details/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bankingId = req.params.id;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Delete banking details
    const [result] = await pool.query(
      'DELETE FROM provider_banking_details WHERE id = ? AND provider_id = ?',
      [bankingId, providerId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Banking details not found' });
    }
    
    res.json({ message: 'Banking details deleted successfully' });
  } catch (err) {
    console.error('Error deleting banking details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============= DOCUMENTS APIs =============

// Generate a presigned URL for direct S3 upload
router.post('/documents/presign', verifyToken, async (req, res) => {
  try {
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    const userId = req.user.id;
    const { file_name, content_type, document_type } = req.body;

    if (!file_name || !content_type || !document_type) {
      return res.status(400).json({ message: 'file_name, content_type and document_type are required' });
    }

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;
    const safeName = sanitizeFileName(file_name);
    const key = `provider_documents/${providerId}/${Date.now()}_${safeName}`;

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
    console.error('Error generating presigned URL:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Confirm upload and save document metadata to DB
router.post('/documents/confirm', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { document_type, object_key } = req.body;

    if (!document_type || !object_key) {
      return res.status(400).json({ message: 'document_type and object_key are required' });
    }

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;

    // Save document info to database; store the S3 object key in document_url column
    const [result] = await pool.query(
      `INSERT INTO provider_documents 
       (provider_id, document_type, document_url, status) 
       VALUES (?, ?, ?, 'pending_review')`,
      [providerId, document_type, object_key]
    );

    return res.status(201).json({
      message: 'Document saved successfully',
      id: result.insertId,
      document_url: object_key
    });
  } catch (err) {
    console.error('Error confirming document upload:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /documents - Get provider's documents
router.get('/documents', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Get all documents for the provider
    const [documents] = await pool.query(
      `SELECT * FROM provider_documents 
       WHERE provider_id = ? 
       ORDER BY uploaded_at DESC`,
      [providerId]
    );
    
    res.json({ documents });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /documents/:id/presign - Get a presigned GET URL to download/view a document
router.get('/documents/:id/presign', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;

    // Verify the document belongs to the provider
    const [docs] = await pool.query(
      'SELECT document_url FROM provider_documents WHERE id = ? AND provider_id = ?',
      [documentId, providerId]
    );

    if (docs.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    let key = docs[0].document_url;
    if (!key) {
      return res.status(400).json({ message: 'Document key is empty' });
    }

    // If the document is stored locally, migrate it to S3 once and update DB
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
        const migrateKey = `provider_documents/${providerId}/${Date.now()}_${fileName}`;

        await s3.upload({
          Bucket: S3_BUCKET,
          Key: migrateKey,
          Body: fs.createReadStream(absPath)
        }).promise();

        await pool.query(
          'UPDATE provider_documents SET document_url = ? WHERE id = ?',
          [migrateKey, documentId]
        );

        key = migrateKey;
      } catch (migrateErr) {
        console.error('Error migrating worker document to S3:', migrateErr);
        return res.status(500).json({ message: 'Failed to migrate document to S3' });
      }
    }

    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    // Force download in browser by setting ContentDisposition to attachment
    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      Expires: 300,
      ResponseContentDisposition: 'attachment'
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return res.json({ success: true, url, storage: 's3', expiresIn: 300 });
  } catch (err) {
    console.error('Error generating worker document presigned URL:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /documents - Upload new document
router.post('/documents', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { document_type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    if (!document_type) {
      return res.status(400).json({ message: 'Document type is required' });
    }
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Save document info to database
    const documentUrl = `/uploads/provider_documents/${req.file.filename}`;
    
    const [result] = await pool.query(
      `INSERT INTO provider_documents 
       (provider_id, document_type, document_url, status) 
       VALUES (?, ?, ?, 'pending_review')`,
      [providerId, document_type, documentUrl]
    );
    
    res.status(201).json({ 
      message: 'Document uploaded successfully',
      id: result.insertId,
      document_url: documentUrl
    });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /documents/:id - Delete document
router.delete('/documents/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Get document details
    const [document] = await pool.query(
      'SELECT * FROM provider_documents WHERE id = ? AND provider_id = ?',
      [documentId, providerId]
    );
    
    if (document.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete file from S3 if it's an S3 object (does not start with '/uploads/')
    const docUrl = document[0].document_url || '';
    if (docUrl && !docUrl.startsWith('/uploads/')) {
      if (!S3_BUCKET) {
        console.warn('S3 bucket not configured; cannot delete S3 object');
      } else {
        try {
          await s3.deleteObject({ Bucket: S3_BUCKET, Key: docUrl }).promise();
        } catch (e) {
          console.error('Error deleting from S3:', e);
        }
      }
    } else {
      // Local filesystem fallback
      const filePath = path.join(process.cwd(), document[0].document_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete from database
    await pool.query(
      'DELETE FROM provider_documents WHERE id = ? AND provider_id = ?',
      [documentId, providerId]
    );
    
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============= QUALIFICATIONS APIs =============

// Generate presigned URL for qualification certificate upload
router.post('/qualifications/presign', verifyToken, async (req, res) => {
  try {
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    const userId = req.user.id;
    const { file_name, content_type } = req.body;

    if (!file_name || !content_type) {
      return res.status(400).json({ message: 'file_name and content_type are required' });
    }

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;
    const safeName = sanitizeFileName(file_name);
    const key = `provider_qualifications/${providerId}/${Date.now()}_${safeName}`;

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
    console.error('Error generating qualification presigned URL:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /qualifications - Get provider's qualifications
router.get('/qualifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Get all qualifications with status information
    const [qualifications] = await pool.query(
      `SELECT id, provider_id, qualification_name, issuing_institution, issue_date, 
              certificate_number, certificate_url, status, remarks, created_at, updated_at
       FROM provider_qualifications 
       WHERE provider_id = ? 
       ORDER BY created_at DESC`,
      [providerId]
    );
    
    res.json({ qualifications });
  } catch (err) {
    console.error('Error fetching qualifications:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /qualifications - Add new qualification
router.post('/qualifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      qualification_name,
      issuing_institution,
      issue_date,
      certificate_number,
      certificate_url
    } = req.body;
    
    if (!qualification_name || !issuing_institution) {
      return res.status(400).json({ message: 'Qualification name and institution are required' });
    }
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Insert qualification with certificate URL and pending status
    const [result] = await pool.query(
      `INSERT INTO provider_qualifications 
       (provider_id, qualification_name, issuing_institution, issue_date, 
        certificate_number, certificate_url, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending_review')`,
      [providerId, qualification_name, issuing_institution, issue_date || null, 
       certificate_number || null, certificate_url || null]
    );
    
    res.status(201).json({ 
      message: 'Qualification added successfully',
      id: result.insertId 
    });
  } catch (err) {
    console.error('Error adding qualification:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /qualifications/:id/presign - Get presigned URL to view qualification certificate
router.get('/qualifications/:id/presign', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const qualificationId = req.params.id;

    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = provider[0].id;

    // Get qualification and verify ownership
    const [qualifications] = await pool.query(
      'SELECT certificate_url FROM provider_qualifications WHERE id = ? AND provider_id = ?',
      [qualificationId, providerId]
    );

    if (qualifications.length === 0) {
      return res.status(404).json({ message: 'Qualification not found' });
    }

    const certificateUrl = qualifications[0].certificate_url;
    if (!certificateUrl) {
      return res.status(404).json({ message: 'No certificate uploaded for this qualification' });
    }

    // Handle local files (legacy)
    if (certificateUrl.startsWith('/uploads/')) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return res.json({ success: true, url: `${baseUrl}${certificateUrl}`, storage: 'local' });
    }

    // Handle S3 files
    if (!S3_BUCKET || !S3_REGION) {
      return res.status(500).json({ message: 'S3 is not configured on the server' });
    }

    const params = {
      Bucket: S3_BUCKET,
      Key: certificateUrl,
      Expires: 300,
      ResponseContentDisposition: 'attachment'
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return res.json({ success: true, url, storage: 's3', expiresIn: 300 });
  } catch (err) {
    console.error('Error generating qualification certificate presigned URL:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /qualifications/:id - Delete qualification
router.delete('/qualifications/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const qualificationId = req.params.id;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Get qualification details including certificate URL
    const [qualification] = await pool.query(
      'SELECT * FROM provider_qualifications WHERE id = ? AND provider_id = ?',
      [qualificationId, providerId]
    );
    
    if (qualification.length === 0) {
      return res.status(404).json({ message: 'Qualification not found' });
    }
    
    // Delete certificate from S3 if it exists
    const certificateUrl = qualification[0].certificate_url;
    if (certificateUrl && !certificateUrl.startsWith('/uploads/')) {
      if (S3_BUCKET) {
        try {
          await s3.deleteObject({ Bucket: S3_BUCKET, Key: certificateUrl }).promise();
        } catch (e) {
          console.error('Error deleting certificate from S3:', e);
        }
      }
    } else if (certificateUrl && certificateUrl.startsWith('/uploads/')) {
      // Delete local file
      const filePath = path.join(process.cwd(), certificateUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete qualification from database
    const [result] = await pool.query(
      'DELETE FROM provider_qualifications WHERE id = ? AND provider_id = ?',
      [qualificationId, providerId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Qualification not found' });
    }
    
    res.json({ message: 'Qualification deleted successfully' });
  } catch (err) {
    console.error('Error deleting qualification:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============= ADMIN QUALIFICATION APPROVAL APIs =============

// PUT /qualifications/:id/status - Admin approve/reject qualification
router.put('/qualifications/:id/status', verifyToken, async (req, res) => {
  try {
    const qualificationId = req.params.id;
    const { status, remarks } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either approved or rejected' });
    }
    
    // Check if user has admin privileges (you may want to add proper admin role checking)
    // For now, assuming this endpoint will be protected by admin middleware
    
    // Update qualification status
    const [result] = await pool.query(
      `UPDATE provider_qualifications 
       SET status = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, remarks || null, qualificationId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Qualification not found' });
    }
    
    res.json({ 
      message: `Qualification ${status} successfully`,
      status,
      remarks 
    });
  } catch (err) {
    console.error('Error updating qualification status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /admin/qualifications - Get all qualifications for admin review
router.get('/admin/qualifications', verifyToken, async (req, res) => {
  try {
    const { status = 'pending_review', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get qualifications with provider information
    const [qualifications] = await pool.query(
      `SELECT pq.*, p.id as provider_id, u.name as provider_name, u.email as provider_email,
              u.phone as provider_phone
       FROM provider_qualifications pq
       JOIN providers p ON pq.provider_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE pq.status = ?
       ORDER BY pq.created_at DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM provider_qualifications WHERE status = ?',
      [status]
    );
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({ 
      qualifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error fetching qualifications for admin:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============= DRIVER DETAILS APIs =============

// GET /driver-details - Get driver details
router.get('/driver-details', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Check if provider is a driver
    const [isDriver] = await pool.query(
      `SELECT ps.*, s.name as service_name, sc.name as category_name, sc.category_type
       FROM provider_services ps
       JOIN subcategories s ON ps.subcategory_id = s.id
       JOIN service_categories sc ON s.category_id = sc.id
       WHERE ps.provider_id = ? AND LOWER(sc.category_type) = 'driver'`,
      [providerId]
    );
    
    if (isDriver.length === 0) {
      return res.status(403).json({ message: 'Not registered as a driver' });
    }
    
    // Get driver details
    const [driverDetails] = await pool.query(
      'SELECT * FROM drivers WHERE provider_id = ?',
      [providerId]
    );
    
    res.json({ 
      isDriver: true,
      driverDetails: driverDetails.length > 0 ? driverDetails[0] : null 
    });
  } catch (err) {
    console.error('Error fetching driver details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /driver-details - Add/Update driver details
router.post('/driver-details', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      license_number,
      license_expiry_date,
      license_issuing_authority,
      vehicle_type,
      driving_experience_years,
      years_of_commercial_driving_exp,
      vehicle_registration_number
    } = req.body;
    
    // Validate required fields
    if (!license_number || !license_expiry_date) {
      return res.status(400).json({ message: 'License number and expiry date are required' });
    }
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Check if provider is registered as a driver
    const [isDriver] = await pool.query(
      `SELECT ps.*, sc.category_type
       FROM provider_services ps
       JOIN subcategories s ON ps.subcategory_id = s.id
       JOIN service_categories sc ON s.category_id = sc.id
       WHERE ps.provider_id = ? AND LOWER(sc.category_type) = 'driver'`,
      [providerId]
    );
    
    if (isDriver.length === 0) {
      return res.status(403).json({ message: 'Not registered as a driver' });
    }
    
    // Check if driver details already exist
    const [existing] = await pool.query(
      'SELECT * FROM drivers WHERE provider_id = ?',
      [providerId]
    );
    
    if (existing.length > 0) {
      // Update existing record
      await pool.query(
        `UPDATE drivers SET 
         license_number = ?, license_expiry_date = ?, license_issuing_authority = ?,
         vehicle_type = ?, driving_experience_years = ?, years_of_commercial_driving_exp = ?,
         vehicle_registration_number = ?
         WHERE provider_id = ?`,
        [license_number, license_expiry_date, license_issuing_authority || null,
         vehicle_type || null, driving_experience_years || null, 
         years_of_commercial_driving_exp || null, vehicle_registration_number || null,
         providerId]
      );
      res.json({ message: 'Driver details updated successfully' });
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO drivers 
         (provider_id, license_number, license_expiry_date, license_issuing_authority,
          vehicle_type, driving_experience_years, years_of_commercial_driving_exp,
          vehicle_registration_number) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [providerId, license_number, license_expiry_date, license_issuing_authority || null,
         vehicle_type || null, driving_experience_years || null, 
         years_of_commercial_driving_exp || null, vehicle_registration_number || null]
      );
      res.status(201).json({ message: 'Driver details added successfully' });
    }
  } catch (err) {
    console.error('Error saving driver details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /check-driver-status - Check if provider is registered as driver
router.get('/check-driver-status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get provider ID
    const [provider] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );
    
    if (provider.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = provider[0].id;
    
    // Check if provider offers driver services
    const [driverServices] = await pool.query(
      `SELECT ps.*, s.name as service_name, sc.name as category_name, sc.category_type
       FROM provider_services ps
       JOIN subcategories s ON ps.subcategory_id = s.id
       JOIN service_categories sc ON s.category_id = sc.id
       WHERE ps.provider_id = ? AND LOWER(sc.category_type) = 'driver'`,
      [providerId]
    );
    
    res.json({ 
      isDriver: driverServices.length > 0,
      services: driverServices 
    });
  } catch (err) {
    console.error('Error checking driver status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;