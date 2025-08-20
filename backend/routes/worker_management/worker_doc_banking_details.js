const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    
    // Delete file from filesystem
    const filePath = path.join(process.cwd(), document[0].document_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
    
    // Get all qualifications
    const [qualifications] = await pool.query(
      'SELECT * FROM provider_qualifications WHERE provider_id = ? ORDER BY issue_date DESC',
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
      certificate_number
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
    
    // Insert qualification
    const [result] = await pool.query(
      `INSERT INTO provider_qualifications 
       (provider_id, qualification_name, issuing_institution, issue_date, certificate_number) 
       VALUES (?, ?, ?, ?, ?)`,
      [providerId, qualification_name, issuing_institution, issue_date || null, certificate_number || null]
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
    
    // Delete qualification
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