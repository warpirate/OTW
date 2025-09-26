const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const { 
  createUPIOrder, 
  verifyPayment, 
  capturePayment,
  refundPayment,
  validateWebhookSignature 
} = require('../../config/razorpay');

// Helper function to validate UPI ID
const validateUPIId = (upiId) => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return upiRegex.test(upiId);
};

// Helper function to extract provider from UPI ID
const extractProviderFromUPI = (upiId) => {
  const parts = upiId.split('@');
  if (parts.length === 2) {
    const provider = parts[1].toLowerCase();
    const providerMap = {
      'paytm': 'Paytm',
      'gpay': 'Google Pay',
      'phonepe': 'PhonePe',
      'amazonpay': 'Amazon Pay',
      'bhim': 'BHIM',
      'ybl': 'Yono SBI',
      'okaxis': 'Axis Bank',
      'okhdfcbank': 'HDFC Bank',
      'okicici': 'ICICI Bank',
      'oksbi': 'SBI',
      'okbob': 'Bank of Baroda',
      'okciti': 'Citi Bank',
      'okhsbc': 'HSBC',
      'okindian': 'Indian Bank',
      'okkotak': 'Kotak Bank',
      'okpnb': 'Punjab National Bank',
      'okunion': 'Union Bank',
      'okyes': 'Yes Bank',
    };
    return providerMap[provider] || provider.toUpperCase();
  }
  return 'Unknown';
};

// GET /upi-methods - Get user's UPI payment methods
router.get('/upi-methods', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT id, upi_id, provider_name, is_default, is_active, created_at, updated_at 
       FROM upi_payment_methods 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      payment_methods: rows
    });
  } catch (error) {
    console.error('Error fetching UPI methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
});

// POST /upi-methods - Add new UPI payment method
router.post('/upi-methods', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { upi_id, provider_name, is_default = false } = req.body;

    // Validation
    if (!upi_id || !provider_name) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID and provider name are required'
      });
    }

    if (!validateUPIId(upi_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format'
      });
    }

    // Check if UPI ID already exists for this user
    const [existing] = await pool.query(
      'SELECT id FROM upi_payment_methods WHERE user_id = ? AND upi_id = ?',
      [userId, upi_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This UPI ID is already added'
      });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(
        'UPDATE upi_payment_methods SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    // Insert new UPI method
    const [result] = await pool.query(
      `INSERT INTO upi_payment_methods (user_id, upi_id, provider_name, is_default) 
       VALUES (?, ?, ?, ?)`,
      [userId, upi_id, provider_name, is_default]
    );

    // Fetch the created method
    const [newMethod] = await pool.query(
      'SELECT * FROM upi_payment_methods WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'UPI payment method added successfully',
      payment_method: newMethod[0]
    });
  } catch (error) {
    console.error('Error adding UPI method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add UPI payment method'
    });
  }
});

// PATCH /upi-methods/:id/set-default - Set UPI method as default
router.patch('/upi-methods/:id/set-default', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const methodId = req.params.id;

    // Verify the method belongs to the user
    const [method] = await pool.query(
      'SELECT id FROM upi_payment_methods WHERE id = ? AND user_id = ?',
      [methodId, userId]
    );

    if (method.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Unset all other defaults
    await pool.query(
      'UPDATE upi_payment_methods SET is_default = 0 WHERE user_id = ?',
      [userId]
    );

    // Set this method as default
    await pool.query(
      'UPDATE upi_payment_methods SET is_default = 1 WHERE id = ?',
      [methodId]
    );

    res.json({
      success: true,
      message: 'Default payment method updated successfully'
    });
  } catch (error) {
    console.error('Error setting default UPI method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default payment method'
    });
  }
});

// DELETE /upi-methods/:id - Delete UPI payment method
router.delete('/upi-methods/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const methodId = req.params.id;

    // Verify the method belongs to the user
    const [method] = await pool.query(
      'SELECT id, is_default FROM upi_payment_methods WHERE id = ? AND user_id = ?',
      [methodId, userId]
    );

    if (method.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Check if there are any pending transactions using this method
    const [pendingTransactions] = await pool.query(
      'SELECT id FROM upi_transactions WHERE upi_payment_method_id = ? AND status IN ("pending", "processing")',
      [methodId]
    );

    if (pendingTransactions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payment method with pending transactions'
      });
    }

    // Soft delete the method
    await pool.query(
      'UPDATE upi_payment_methods SET is_active = 0 WHERE id = ?',
      [methodId]
    );

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting UPI method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method'
    });
  }
});

// POST /upi/initiate - Initiate UPI payment
router.post('/upi/initiate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, upi_id, description, booking_id } = req.body;

    // Validation
    if (!amount || !upi_id || !description) {
      return res.status(400).json({
        success: false,
        message: 'Amount, UPI ID, and description are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    if (!validateUPIId(upi_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format'
      });
    }

    // Find the UPI payment method
    const [paymentMethod] = await pool.query(
      'SELECT id FROM upi_payment_methods WHERE user_id = ? AND upi_id = ? AND is_active = 1',
      [userId, upi_id]
    );

    if (paymentMethod.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'UPI payment method not found'
      });
    }

    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create UPI transaction record
    const [transactionResult] = await pool.query(
      `INSERT INTO upi_transactions 
       (user_id, booking_id, upi_payment_method_id, transaction_id, amount, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, booking_id || null, paymentMethod[0].id, transactionId, amount]
    );

    // Create Razorpay order
    const orderResult = await createUPIOrder(amount, 'INR', transactionId);
    
    if (!orderResult.success) {
      // Update transaction as failed
      await pool.query(
        `UPDATE upi_transactions 
         SET status = 'failed', failure_reason = ? 
         WHERE id = ?`,
        [orderResult.error, transactionResult.insertId]
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order'
      });
    }

    // Update transaction with Razorpay order details
    await pool.query(
      `UPDATE upi_transactions 
       SET status = 'processing', 
           payment_gateway_response = JSON_SET(COALESCE(payment_gateway_response, '{}'), '$.razorpay_order_id', ?)
       WHERE id = ?`,
      [orderResult.order.id, transactionResult.insertId]
    );

    // Return payment details for client
    res.json({
      success: true,
      payment_id: transactionId,
      razorpay_order_id: orderResult.order.id,
      razorpay_payment_id: null,
      upi_id: upi_id,
      amount: amount,
      currency: 'INR',
      status: 'order_created',
      message: 'Order created. Complete the payment via UPI using Razorpay Checkout.'
    });

  } catch (error) {
    console.error('Error initiating UPI payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment'
    });
  }
});

// GET /upi/verify/:paymentId - Verify UPI payment status by our transaction id
router.get('/upi/verify/:paymentId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.paymentId; // our TXN_... id

    // Find transaction by our transaction id
    const [rows] = await pool.query(
      `SELECT ut.*, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ut.payment_gateway_response, '$.razorpay_order_id')), NULL) AS razorpay_order_id
       FROM upi_transactions ut
       WHERE ut.transaction_id = ? AND ut.user_id = ?
       LIMIT 1`,
      [paymentId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const txn = rows[0];

    // If already completed or failed, return immediately
    if (txn.status === 'completed' || txn.status === 'failed' || txn.status === 'refunded') {
      return res.json({
        success: true,
        status: txn.status,
        razorpay_order_id: txn.razorpay_order_id || null
      });
    }

    // If we have a Razorpay order id, we can optionally leave it to webhooks or polling on client.
    return res.json({
      success: true,
      status: txn.status || 'processing',
      razorpay_order_id: txn.razorpay_order_id || null
    });
  } catch (error) {
    console.error('Error verifying UPI payment status:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

// GET /history - Get payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const [payments] = await pool.query(
      `SELECT p.*, ut.transaction_id as upi_transaction_id, ut.status as upi_status,
              upm.upi_id, upm.provider_name, b.id as booking_id, b.booking_type
       FROM payments p
       LEFT JOIN upi_transactions ut ON p.upi_transaction_id = ut.id
       LEFT JOIN upi_payment_methods upm ON ut.upi_payment_method_id = upm.id
       LEFT JOIN bookings b ON p.booking_id = b.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// POST /upi/refund/:paymentId - Refund UPI payment
router.post('/upi/refund/:paymentId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.paymentId;
    const { amount, reason } = req.body;

    // Find the transaction
    const [transactions] = await pool.query(
      `SELECT ut.*, upm.upi_id 
       FROM upi_transactions ut 
       JOIN upi_payment_methods upm ON ut.upi_payment_method_id = upm.id 
       WHERE ut.transaction_id = ? AND ut.user_id = ? AND ut.status = 'completed'`,
      [paymentId, userId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not eligible for refund'
      });
    }

    const transaction = transactions[0];
    const refundAmount = amount || transaction.amount;

    if (refundAmount > transaction.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed original payment amount'
      });
    }

    // Process refund through Razorpay
    const refundResult = await refundPayment(
      transaction.upi_transaction_id,
      refundAmount,
      reason || 'Refund requested by customer'
    );

    if (!refundResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process refund'
      });
    }

    // Update transaction status
    await pool.query(
      `UPDATE upi_transactions 
       SET status = 'refunded', 
           payment_gateway_response = JSON_SET(COALESCE(payment_gateway_response, '{}'), '$.refund', ?)
       WHERE id = ?`,
      [JSON.stringify(refundResult.refund), transaction.id]
    );

    // Update main payment record
    await pool.query(
      `UPDATE payments 
       SET status = 'refunded' 
       WHERE upi_transaction_id = ?`,
      [transaction.id]
    );

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund_id: refundResult.refund.id,
      amount: refundAmount
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
});

module.exports = router;
