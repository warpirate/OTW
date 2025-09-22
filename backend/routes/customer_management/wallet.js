const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const CustomerWalletService = require('../../services/customerWalletService');

/**
 * GET /wallet - Get customer wallet details
 */
router.get('/wallet', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access wallet' });
    }

    const walletDetails = await CustomerWalletService.getWalletDetails(userId);
    
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
 * POST /wallet/topup - Create wallet top-up request
 */
router.post('/wallet/topup', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { amount, payment_method = 'upi' } = req.body;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can top up wallet' });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const result = await CustomerWalletService.createTopupRequest(userId, amount, payment_method);
    
    res.json({
      success: true,
      message: 'Top-up request created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating top-up request:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while creating top-up request' 
    });
  }
});

/**
 * POST /wallet/pay - Process wallet payment for booking
 */
router.post('/wallet/pay', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { amount, booking_id, description } = req.body;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can make wallet payments' });
    }

    if (!amount || !booking_id) {
      return res.status(400).json({ message: 'Amount and booking ID are required' });
    }

    // Check if wallet payment is enabled
    const isEnabled = await CustomerWalletService.isWalletPaymentEnabled();
    if (!isEnabled) {
      return res.status(400).json({ message: 'Wallet payments are currently disabled' });
    }

    const result = await CustomerWalletService.processWalletPayment(
      userId, 
      amount, 
      booking_id, 
      description || 'Booking payment'
    );
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error processing wallet payment:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while processing payment' 
    });
  }
});

/**
 * GET /wallet/transactions - Get wallet transaction history
 */
router.get('/wallet/transactions', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { limit = 20, offset = 0, type = null } = req.query;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access transaction history' });
    }

    const walletDetails = await CustomerWalletService.getWalletDetails(userId);
    
    if (!walletDetails) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    let query = `
      SELECT cwt.*, b.id as booking_id, b.service_name
      FROM customer_wallet_transactions cwt
      LEFT JOIN bookings b ON cwt.booking_id = b.id
      WHERE cwt.wallet_id = ?
    `;
    
    const params = [walletDetails.wallet.id];
    
    if (type) {
      query += ' AND cwt.transaction_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY cwt.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [transactions] = await pool.query(query, params);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ message: 'Server error while fetching transaction history' });
  }
});

/**
 * GET /wallet/topups - Get top-up history
 */
router.get('/wallet/topups', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access top-up history' });
    }

    const topups = await CustomerWalletService.getTopupHistory(userId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: topups
    });
  } catch (error) {
    console.error('Error fetching top-up history:', error);
    res.status(500).json({ message: 'Server error while fetching top-up history' });
  }
});

/**
 * GET /wallet/refunds - Get refund history
 */
router.get('/wallet/refunds', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access refund history' });
    }

    const refunds = await CustomerWalletService.getRefundHistory(userId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: refunds
    });
  } catch (error) {
    console.error('Error fetching refund history:', error);
    res.status(500).json({ message: 'Server error while fetching refund history' });
  }
});

/**
 * GET /wallet/settings - Get wallet settings
 */
router.get('/wallet/settings', verifyToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access wallet settings' });
    }

    const settings = await CustomerWalletService.getWalletSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching wallet settings:', error);
    res.status(500).json({ message: 'Server error while fetching wallet settings' });
  }
});

/**
 * POST /wallet/topup/verify - Verify top-up payment (webhook handler)
 */
router.post('/wallet/topup/verify', async (req, res) => {
  try {
    const { topup_id, payment_id, status } = req.body;

    if (!topup_id) {
      return res.status(400).json({ message: 'Top-up ID is required' });
    }

    if (status === 'success' || status === 'completed') {
      const result = await CustomerWalletService.processTopupPayment(topup_id, payment_id);
      
      res.json({
        success: true,
        message: 'Top-up processed successfully',
        data: result
      });
    } else {
      // Handle failed payment
      await pool.query(
        'UPDATE wallet_topup_requests SET topup_status = ?, failure_reason = ? WHERE id = ?',
        ['failed', 'Payment verification failed', topup_id]
      );

      res.json({
        success: false,
        message: 'Top-up payment failed'
      });
    }
  } catch (error) {
    console.error('Error verifying top-up payment:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while verifying payment' 
    });
  }
});

/**
 * GET /wallet/balance - Get current wallet balance
 */
router.get('/wallet/balance', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access wallet balance' });
    }

    const walletDetails = await CustomerWalletService.getWalletDetails(userId);
    
    if (!walletDetails) {
      return res.json({
        success: true,
        data: {
          current_balance: 0,
          wallet_exists: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        current_balance: walletDetails.wallet.current_balance,
        wallet_exists: true,
        total_added: walletDetails.wallet.total_added,
        total_spent: walletDetails.wallet.total_spent,
        total_refunded: walletDetails.wallet.total_refunded
      }
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ message: 'Server error while fetching wallet balance' });
  }
});

module.exports = router;
