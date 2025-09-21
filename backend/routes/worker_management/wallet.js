const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const WalletService = require('../../services/walletService');

/**
 * GET /wallet - Get worker wallet details
 */
router.get('/wallet', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can access wallet' });
    }

    const walletDetails = await WalletService.getWalletDetails(userId);
    
    if (!walletDetails) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.json({
      success: true,
      data: walletDetails
    });
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    res.status(500).json({ message: 'Server error while fetching wallet details' });
  }
});

/**
 * POST /wallet/withdraw - Create withdrawal request
 */
router.post('/wallet/withdraw', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { amount, upi_id } = req.body;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can create withdrawal requests' });
    }

    if (!amount || !upi_id) {
      return res.status(400).json({ message: 'Amount and UPI ID are required' });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const result = await WalletService.createWithdrawalRequest(userId, amount, upi_id);
    
    res.json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while creating withdrawal request' 
    });
  }
});

/**
 * POST /wallet/settle - Process daily settlement
 */
router.post('/wallet/settle', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { upi_id } = req.body;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can process settlements' });
    }

    if (!upi_id) {
      return res.status(400).json({ message: 'UPI ID is required' });
    }

    const result = await WalletService.processDailySettlement(userId, upi_id);
    
    res.json({
      success: true,
      message: 'Daily settlement processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error processing settlement:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while processing settlement' 
    });
  }
});

/**
 * GET /wallet/withdrawals - Get withdrawal history
 */
router.get('/wallet/withdrawals', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can access withdrawal history' });
    }

    const [withdrawals] = await pool.query(
      `SELECT * FROM withdrawal_requests 
       WHERE worker_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ message: 'Server error while fetching withdrawal history' });
  }
});

/**
 * GET /wallet/settlements - Get settlement history
 */
router.get('/wallet/settlements', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can access settlement history' });
    }

    const [settlements] = await pool.query(
      `SELECT * FROM daily_settlements 
       WHERE worker_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    console.error('Error fetching settlement history:', error);
    res.status(500).json({ message: 'Server error while fetching settlement history' });
  }
});

/**
 * POST /wallet/upi - Add UPI details
 */
router.post('/wallet/upi', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { upi_id, upi_provider, is_primary = false } = req.body;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can add UPI details' });
    }

    if (!upi_id || !upi_provider) {
      return res.status(400).json({ message: 'UPI ID and provider are required' });
    }

    // Validate UPI ID format
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    if (!upiRegex.test(upi_id)) {
      return res.status(400).json({ message: 'Invalid UPI ID format' });
    }

    // Get provider_id for this worker
    const [providerData] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [userId]
    );

    if (providerData.length === 0) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    const providerId = providerData[0].id;

    // If setting as primary, unset other primary UPI IDs
    if (is_primary) {
      await pool.query(
        'UPDATE worker_upi_details SET is_primary = FALSE WHERE worker_id = ?',
        [userId]
      );
    }

    // Insert new UPI details
    const [result] = await pool.query(
      `INSERT INTO worker_upi_details 
       (worker_id, provider_id, upi_id, upi_provider, is_primary, is_verified, is_active) 
       VALUES (?, ?, ?, ?, ?, FALSE, TRUE)`,
      [userId, providerId, upi_id, upi_provider, is_primary]
    );

    res.json({
      success: true,
      message: 'UPI details added successfully',
      data: { id: result.insertId, upi_id, upi_provider, is_primary }
    });
  } catch (error) {
    console.error('Error adding UPI details:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'UPI ID already exists' });
    } else {
      res.status(500).json({ message: 'Server error while adding UPI details' });
    }
  }
});

/**
 * GET /wallet/upi - Get UPI details
 */
router.get('/wallet/upi', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can access UPI details' });
    }

    const [upiDetails] = await pool.query(
      `SELECT * FROM worker_upi_details 
       WHERE worker_id = ? AND is_active = TRUE 
       ORDER BY is_primary DESC, created_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: upiDetails
    });
  } catch (error) {
    console.error('Error fetching UPI details:', error);
    res.status(500).json({ message: 'Server error while fetching UPI details' });
  }
});

/**
 * GET /wallet/charges - Get withdrawal charges calculation
 */
router.get('/wallet/charges', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { amount } = req.query;

    if (role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can calculate charges' });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const chargeDetails = await WalletService.calculateWithdrawalCharges(amount);
    
    res.json({
      success: true,
      data: chargeDetails
    });
  } catch (error) {
    console.error('Error calculating charges:', error);
    res.status(500).json({ message: 'Server error while calculating charges' });
  }
});

module.exports = router;
