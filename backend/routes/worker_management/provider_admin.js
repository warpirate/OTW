const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const authorizeRole = require('../middlewares/authorizeRole');

/**
 * ProviderAdminService class for admin operations
 */
class ProviderAdminService {
  /**
   * Get all providers with detailed information
   */
  static async getAllProviders(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE u.is_active = 1';
      const queryParams = [];

      // Apply filters
      if (filters.verified !== undefined) {
        whereClause += ' AND p.verified = ?';
        queryParams.push(filters.verified);
      }

      if (filters.active !== undefined) {
        whereClause += ' AND p.active = ?';
        queryParams.push(filters.active);
      }

      if (filters.document_status) {
        whereClause += ' AND pd.status = ?';
        queryParams.push(filters.document_status);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const [providers] = await pool.query(
        `SELECT 
          u.id, u.name, u.email, u.phone_number, u.created_at as user_created,
          p.id as provider_id, p.experience_years, p.bio, p.rating,
          p.verified, p.active, p.service_radius_km,
          p.location_lat, p.location_lng, p.last_active_at,
          p.permanent_address, p.created_at as provider_created, p.updated_at,
          COUNT(DISTINCT pd.id) as total_documents,
          COUNT(DISTINCT CASE WHEN pd.status = 'approved' THEN pd.id END) as approved_documents,
          COUNT(DISTINCT CASE WHEN pd.status = 'pending_review' THEN pd.id END) as pending_documents,
          COUNT(DISTINCT CASE WHEN pd.status = 'rejected' THEN pd.id END) as rejected_documents
        FROM users u
        INNER JOIN providers p ON u.id = p.user_id
        LEFT JOIN provider_documents pd ON p.id = pd.provider_id
        ${whereClause}
        GROUP BY u.id, p.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count for pagination
      const [countResult] = await pool.query(
        `SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN providers p ON u.id = p.user_id
        LEFT JOIN provider_documents pd ON p.id = pd.provider_id
        ${whereClause}`,
        queryParams.slice(0, -2) // Remove limit and offset params
      );

      return {
        providers,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get provider details with all related data
   */
  static async getProviderDetails(providerId) {
    try {
      // Get basic provider info
      const [basicResults] = await pool.query(
        `SELECT 
          u.id, u.name, u.email, u.phone_number,
          p.id as provider_id, p.experience_years, p.bio, p.rating,
          p.verified, p.active, p.service_radius_km,
          p.location_lat, p.location_lng, p.last_active_at,
          p.permanent_address, p.created_at, p.updated_at
        FROM users u
        LEFT JOIN providers p ON u.id = p.user_id
        WHERE p.id = ? AND u.is_active = 1`,
        [providerId]
      );

      if (basicResults.length === 0) {
        throw new Error('Provider not found');
      }

      const provider = basicResults[0];

      // Get all related data
      const [settingsResults] = await pool.query(
        'SELECT * FROM provider_settings WHERE provider_id = ?',
        [providerId]
      );

      const [servicesResults] = await pool.query(
        `SELECT ps.*, sc.name as subcategory_name 
         FROM provider_services ps
         LEFT JOIN subcategories sc ON ps.subcategory_id = sc.id
         WHERE ps.provider_id = ?`,
        [providerId]
      );

      const [qualificationsResults] = await pool.query(
        'SELECT * FROM provider_qualifications WHERE provider_id = ?',
        [providerId]
      );

      const [documentsResults] = await pool.query(
        'SELECT * FROM provider_documents WHERE provider_id = ? ORDER BY uploaded_at DESC',
        [providerId]
      );

      const [bankingResults] = await pool.query(
        'SELECT * FROM provider_banking_details WHERE provider_id = ?',
        [providerId]
      );

      const [driverResults] = await pool.query(
        'SELECT * FROM drivers WHERE provider_id = ?',
        [providerId]
      );

      const [vehiclesResults] = await pool.query(
        'SELECT * FROM vehicles WHERE provider_id = ?',
        [providerId]
      );

      const [locationLogsResults] = await pool.query(
        `SELECT * FROM provider_location_logs 
         WHERE provider_id = ? 
         ORDER BY recorded_at DESC 
         LIMIT 50`,
        [providerId]
      );

      return {
        ...provider,
        settings: settingsResults[0] || null,
        services: servicesResults,
        qualifications: qualificationsResults,
        documents: documentsResults,
        banking_details: bankingResults,
        driver_info: driverResults[0] || null,
        vehicles: vehiclesResults,
        location_logs: locationLogsResults
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update provider verification status
   */
  static async updateProviderVerification(providerId, verified, remarks = null) {
    try {
      const [result] = await pool.query(
        'UPDATE providers SET verified = ?, updated_at = NOW() WHERE id = ?',
        [verified, providerId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Provider not found');
      }

      // Log the verification action
      await pool.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES (?, 'verification_update', 'provider', ?, ?, NOW())`,
        [req.user.id, providerId, JSON.stringify({ verified, remarks })]
      );

      return await this.getProviderDetails(providerId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(documentId, status, remarks = null, adminId) {
    try {
      const [result] = await pool.query(
        `UPDATE provider_documents 
         SET status = ?, remarks = ?, verified_at = NOW() 
         WHERE id = ?`,
        [status, remarks, documentId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Document not found');
      }

      // Log the document status update
      await pool.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES (?, 'document_status_update', 'document', ?, ?, NOW())`,
        [adminId, documentId, JSON.stringify({ status, remarks })]
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update banking details verification
   */
  static async updateBankingVerification(bankingId, status, remarks = null, adminId) {
    try {
      const [result] = await pool.query(
        `UPDATE provider_banking_details 
         SET status = ?, verification_remarks = ?, updated_at = NOW() 
         WHERE id = ?`,
        [status, remarks, bankingId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Banking details not found');
      }

      // Log the banking verification action
      await pool.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES (?, 'banking_verification_update', 'banking', ?, ?, NOW())`,
        [adminId, bankingId, JSON.stringify({ status, remarks })]
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pending verifications
   */
  static async getPendingVerifications() {
    try {
      const [documents] = await pool.query(
        `SELECT pd.*, p.user_id, u.name as provider_name, u.email
         FROM provider_documents pd
         JOIN providers p ON pd.provider_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pd.status = 'pending_review'
         ORDER BY pd.uploaded_at ASC`
      );

      const [bankingDetails] = await pool.query(
        `SELECT pbd.*, p.user_id, u.name as provider_name, u.email
         FROM provider_banking_details pbd
         JOIN providers p ON pbd.provider_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pbd.status = 'unverified'
         ORDER BY pbd.created_at ASC`
      );

      return {
        documents,
        banking_details: bankingDetails
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get provider statistics
   */
  static async getProviderStatistics() {
    try {
      const [totalProviders] = await pool.query(
        'SELECT COUNT(*) as total FROM providers'
      );

      const [verifiedProviders] = await pool.query(
        'SELECT COUNT(*) as total FROM providers WHERE verified = 1'
      );

      const [activeProviders] = await pool.query(
        'SELECT COUNT(*) as total FROM providers WHERE active = 1'
      );

      const [pendingDocuments] = await pool.query(
        "SELECT COUNT(*) as total FROM provider_documents WHERE status = 'pending_review'"
      );

      const [pendingBanking] = await pool.query(
        "SELECT COUNT(*) as total FROM provider_banking_details WHERE status = 'unverified'"
      );

      return {
        total_providers: totalProviders[0].total,
        verified_providers: verifiedProviders[0].total,
        active_providers: activeProviders[0].total,
        pending_documents: pendingDocuments[0].total,
        pending_banking: pendingBanking[0].total
      };
    } catch (error) {
      throw error;
    }
  }
}

// ------------------------
// Get All Providers (Admin Only)
// ------------------------
router.get('/providers', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};
    
    // Parse filters from query params
    if (req.query.verified !== undefined) {
      filters.verified = req.query.verified === 'true';
    }
    
    if (req.query.active !== undefined) {
      filters.active = req.query.active === 'true';
    }
    
    if (req.query.document_status) {
      filters.document_status = req.query.document_status;
    }
    
    console.log('Admin fetching providers:', { page, limit, filters });
    
    const result = await ProviderAdminService.getAllProviders(page, limit, filters);
    
    res.json({
      message: 'Providers retrieved successfully',
      ...result
    });
    
  } catch (error) {
    console.error('Get all providers error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve providers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Details (Admin Only)
// ------------------------
router.get('/providers/:providerId', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const providerId = req.params.providerId;
    
    if (!providerId || isNaN(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }
    
    const provider = await ProviderAdminService.getProviderDetails(parseInt(providerId));
    
    res.json({
      message: 'Provider details retrieved successfully',
      provider
    });
    
  } catch (error) {
    console.error('Get provider details error:', error);
    
    if (error.message === 'Provider not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to retrieve provider details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Provider Verification (Admin Only)
// ------------------------
router.patch('/providers/:providerId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const providerId = req.params.providerId;
    const { verified, remarks } = req.body;
    
    if (!providerId || isNaN(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ message: 'Verified status must be a boolean' });
    }
    
    console.log('Admin updating provider verification:', { 
      providerId, 
      verified, 
      adminId: req.user.id 
    });
    
    const updatedProvider = await ProviderAdminService.updateProviderVerification(
      parseInt(providerId), 
      verified, 
      remarks
    );
    
    res.json({
      message: `Provider ${verified ? 'verified' : 'unverified'} successfully`,
      provider: updatedProvider
    });
    
  } catch (error) {
    console.error('Update provider verification error:', error);
    
    if (error.message === 'Provider not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update provider verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Document Status (Admin Only)
// ------------------------
router.patch('/documents/:documentId/status', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const { status, remarks } = req.body;
    
    if (!documentId || isNaN(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    if (!status || !['pending_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }
    
    await ProviderAdminService.updateDocumentStatus(
      parseInt(documentId), 
      status, 
      remarks, 
      req.user.id
    );
    
    res.json({
      message: 'Document status updated successfully'
    });
    
  } catch (error) {
    console.error('Update document status error:', error);
    
    if (error.message === 'Document not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update document status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Update Banking Verification (Admin Only)
// ------------------------
router.patch('/banking/:bankingId/verify', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const bankingId = req.params.bankingId;
    const { status, remarks } = req.body;
    
    if (!bankingId || isNaN(bankingId)) {
      return res.status(400).json({ message: 'Invalid banking ID' });
    }
    
    if (!status || !['unverified', 'verified', 'rejected', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }
    
    await ProviderAdminService.updateBankingVerification(
      parseInt(bankingId), 
      status, 
      remarks, 
      req.user.id
    );
    
    res.json({
      message: 'Banking verification updated successfully'
    });
    
  } catch (error) {
    console.error('Update banking verification error:', error);
    
    if (error.message === 'Banking details not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to update banking verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Pending Verifications (Admin Only)
// ------------------------
router.get('/verifications/pending', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const pendingVerifications = await ProviderAdminService.getPendingVerifications();
    
    res.json({
      message: 'Pending verifications retrieved successfully',
      ...pendingVerifications
    });
    
  } catch (error) {
    console.error('Get pending verifications error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve pending verifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ------------------------
// Get Provider Statistics (Admin Only)
// ------------------------
router.get('/statistics', verifyToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const statistics = await ProviderAdminService.getProviderStatistics();
    
    res.json({
      message: 'Provider statistics retrieved successfully',
      statistics
    });
    
  } catch (error) {
    console.error('Get provider statistics error:', error);
    
    res.status(500).json({ 
      message: 'Failed to retrieve provider statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 