const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const { 
  createUPIOrder, 
  createUPIOrderDirectPaise,
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

// GET /payment-status/:booking_id - Check payment status for booking
router.get('/payment-status/:booking_id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.booking_id;

    // Check booking exists and belongs to user
    // Support both legacy bookings that store the customer on user_id
    // and newer records that may use customer_id.
    const [bookings] = await pool.query(
      `SELECT b.id, b.payment_status, b.payment_method, b.payment_completed_at, b.total_amount
       FROM bookings b 
       WHERE b.id = ? AND (b.customer_id = ? OR b.user_id = ?)`,
      [bookingId, userId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Get latest payment record for this booking
    const [payments] = await pool.query(
      `SELECT p.*, p.status as payment_status, p.razorpay_payment_id, p.captured_at
       FROM payments p 
       WHERE p.booking_id = ? AND p.user_id = ?
       ORDER BY p.created_at DESC LIMIT 1`,
      [bookingId, userId]
    );

    const latestPayment = payments.length > 0 ? payments[0] : null;

    // Determine overall payment status
    const isPaymentCompleted = booking.payment_status === 'paid' || 
                              booking.payment_status === 'completed' ||
                              (latestPayment && latestPayment.payment_status === 'captured');

    res.json({
      success: true,
      booking_id: bookingId,
      payment_completed: isPaymentCompleted,
      booking_payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      payment_completed_at: booking.payment_completed_at,
      total_amount: booking.total_amount,
      latest_payment: latestPayment ? {
        id: latestPayment.id,
        status: latestPayment.payment_status,
        razorpay_payment_id: latestPayment.razorpay_payment_id,
        razorpay_order_id: latestPayment.razorpay_order_id,
        amount: latestPayment.amount_paid,
        captured_at: latestPayment.captured_at,
        created_at: latestPayment.created_at
      } : null
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

// GET /checkout-session/:booking_id - Get or create checkout session for booking
router.get('/checkout-session/:booking_id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.booking_id;

    // First check if booking exists and belongs to user
    // Support both legacy bookings that store the customer on user_id
    // and newer records that may use customer_id.
    const [bookings] = await pool.query(
      `SELECT b.*, b.payment_status, b.payment_method, b.payment_completed_at, b.total_amount
       FROM bookings b 
       WHERE b.id = ? AND (b.customer_id = ? OR b.user_id = ?)`,
      [bookingId, userId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check if payment is already completed
    if (booking.payment_status === 'paid' || booking.payment_status === 'completed') {
      return res.json({
        success: true,
        payment_completed: true,
        message: 'Payment already completed',
        booking_id: bookingId,
        payment_method: booking.payment_method,
        payment_completed_at: booking.payment_completed_at
      });
    }

    // Check for existing pending payment
    const [existingPayments] = await pool.query(
      `SELECT p.*, p.razorpay_order_id 
       FROM payments p 
       WHERE p.booking_id = ? AND p.user_id = ? AND p.status IN ('created', 'authorized')
       ORDER BY p.created_at DESC LIMIT 1`,
      [bookingId, userId]
    );

    // If there's an existing pending payment, return it
    if (existingPayments.length > 0) {
      const existingPayment = existingPayments[0];

      // Always base the Razorpay order amount on the booking's total_amount
      // so that the payment gateway shows the same total as the UI.
      const amount = booking.total_amount != null
        ? Number(booking.total_amount)
        : (existingPayment.amount_paid != null ? Number(existingPayment.amount_paid) : 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking amount for payment session'
        });
      }

      // Optionally keep the payments table in sync with the latest booking total
      if (existingPayment.amount_paid !== amount) {
        await pool.query(
          'UPDATE payments SET amount_paid = ? WHERE id = ?',
          [amount, existingPayment.id]
        );
      }
      
      // Get user details for prefill
      const [userRows] = await pool.query(
        `SELECT u.name, u.email, u.phone_number FROM users u WHERE u.id = ?`,
        [userId]
      );
      const user = userRows[0] || {};

      return res.json({
        success: true,
        payment_completed: false,
        existing_session: true,
        order: {
          id: existingPayment.razorpay_order_id,
          amount: Math.round(amount * 100), // Convert rupees to paise using booking total
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID,
          name: "OMW - On My Way",
          description: `Payment for ${booking.booking_type || 'Service'}`,
          prefill: {
            name: user.name || '',
            email: user.email || '',
            contact: user.phone_number || ''
          },
          theme: { color: "#8B5CF6" },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            emi: false,
            paylater: true
          }
        },
        payment_id: existingPayment.id,
        booking_id: bookingId
      });
    }

    // Create new checkout session
    // Always base the Razorpay order amount on the booking's total_amount
    // and normalize it to 2-decimal precision (rupees) before creating the order.
    const rawAmount = booking.total_amount;
    const amount = rawAmount != null ? Number(Number(rawAmount).toFixed(2)) : 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount'
      });
    }

    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create Razorpay order first (best practice)
    const orderResult = await createUPIOrder(amount, 'INR', transactionId);
    
    if (!orderResult.success) {
      console.error('Razorpay order creation failed:', orderResult.error);
      return res.status(500).json({
        success: false,
        message: `Failed to create payment order: ${orderResult.error || 'Unknown error'}`,
        error_details: orderResult.error
      });
    }

    // Create payment record with order ID
    const [paymentResult] = await pool.query(
      `INSERT INTO payments (user_id, booking_id, amount_paid, status, method, payment_type, razorpay_order_id, created_at)
       VALUES (?, ?, ?, 'created', 'razorpay', 'razorpay', ?, NOW())`,
      [userId, bookingId, amount, orderResult.order.id]
    );

    // Get user details for prefill
    const [userRows] = await pool.query(
      `SELECT u.name, u.email, u.phone_number FROM users u WHERE u.id = ?`,
      [userId]
    );
    const user = userRows[0] || {};

    // Return checkout session
    res.json({
      success: true,
      payment_completed: false,
      existing_session: false,
      order: {
        id: orderResult.order.id,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        name: "OMW - On My Way",
        description: `Payment for ${booking.booking_type || 'Service'}`,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone_number || ''
        },
        theme: { color: "#8B5CF6" },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          emi: false,
          paylater: true
        },
        config: {
          display: {
            sequence: ['upi', 'card', 'netbanking'],
            preferences: { show_default_blocks: true }
          }
        }
      },
      payment_id: paymentResult.insertId,
      booking_id: bookingId,
      transaction_id: transactionId
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session'
    });
  }
});

// POST /razorpay/create-order - Create Razorpay order for checkout (Legacy - kept for compatibility)
router.post('/razorpay/create-order', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, description, booking_id, user_details } = req.body;
      console.log("user details",user_details);
      console.log("amount",amount);
      console.log("description",description);
      console.log("booking_id",booking_id);
      console.log("user_id",userId);
    // Validation
    if (!amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'Amount and description are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // If booking_id is provided, redirect to checkout session
    if (booking_id) {
      return res.redirect(307, `/api/payments/checkout-session/${booking_id}`);
    }

    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create Razorpay order first
    const orderResult = await createUPIOrder(amount, 'INR', transactionId);
    
    if (!orderResult.success) {
      console.error('Razorpay order creation failed:', orderResult.error);
      return res.status(500).json({
        success: false,
        message: `Failed to create payment order: ${orderResult.error || 'Unknown error'}`,
        error_details: orderResult.error
      });
    }

    // Create payment record with order ID
    const [paymentResult] = await pool.query(
      `INSERT INTO payments (user_id, booking_id, amount_paid, status, method, payment_type, razorpay_order_id, created_at)
       VALUES (?, ?, ?, 'created', 'razorpay', 'razorpay', ?, NOW())`,
      [userId, booking_id || null, amount, orderResult.order.id]
    );

    // Get user details for prefill
    const [userRows] = await pool.query(
      `SELECT u.name, u.email, u.phone_number FROM users u WHERE u.id = ?`,
      [userId]
    );
    const user = userRows[0] || {};
    const userPhone = user.phone_number || user_details?.contact || '';

    // Return payment details for Razorpay checkout
    res.json({
      success: true,
      order: {
        id: orderResult.order.id,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        name: "OMW - On My Way",
        description: description,
        prefill: {
          name: user.name || user_details?.name || '',
          email: user.email || user_details?.email || '',
          contact: userPhone
        },
        theme: { color: "#8B5CF6" },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          emi: false,
          paylater: true
        },
        config: {
          display: {
            sequence: ['upi', 'card', 'netbanking'],
            preferences: { show_default_blocks: true }
          }
        }
      },
      payment_id: paymentResult.insertId,
      transaction_id: transactionId
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
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

    // Create payment record for payment history and keep the id for later update
    const [paymentRowResult] = await pool.query(
      `INSERT INTO payments (user_id, booking_id, upi_transaction_id, amount_paid, status, method, payment_type)
       VALUES (?, ?, ?, ?, 'created', 'upi', 'upi')`,
      [userId, booking_id || null, transactionResult.insertId, amount]
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

    // Also link the Razorpay order id to the payments row so success/webhooks can resolve it
    if (paymentRowResult?.insertId) {
      await pool.query(
        `UPDATE payments SET razorpay_order_id = ? WHERE id = ?`,
        [orderResult.order.id, paymentRowResult.insertId]
      );
    }

    // Return payment details for client (include public key for checkout)
    res.json({
      success: true,
      payment_id: transactionId,
      razorpay_order_id: orderResult.order.id,
      razorpay_payment_id: null,
      upi_id: upi_id,
      amount: amount,
      currency: 'INR',
      status: 'order_created',
      key: process.env.RAZORPAY_KEY_ID,
      order_key: process.env.RAZORPAY_KEY_ID, // backward-compatible alias
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

    console.log('Fetching payment history for user:', userId);

    // First, try to get from payments table with joins
    const [paymentsFromTable] = await pool.query(
      `SELECT p.*, ut.transaction_id as upi_transaction_id, ut.status as upi_status,
              upm.upi_id, upm.provider_name, b.id as booking_id, b.booking_type,
              'payments' as source
       FROM payments p
       LEFT JOIN upi_transactions ut ON p.upi_transaction_id = ut.id
       LEFT JOIN upi_payment_methods upm ON ut.upi_payment_method_id = upm.id
       LEFT JOIN bookings b ON p.booking_id = b.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );

    // If no records in payments table, get directly from upi_transactions
    let finalPayments = [];
    
    if (paymentsFromTable.length === 0) {
      console.log('No records in payments table, fetching from upi_transactions directly');
      
      const [upiTransactions] = await pool.query(
        `SELECT ut.id as payment_id, ut.transaction_id, ut.amount, ut.status, 
                ut.created_at, ut.updated_at, ut.booking_id,
                upm.upi_id, upm.provider_name,
                b.booking_type,
                'upi_transactions' as source,
                CASE 
                  WHEN ut.status = 'completed' THEN 'captured'
                  WHEN ut.status = 'pending' THEN 'created'
                  WHEN ut.status = 'processing' THEN 'authorized'
                  WHEN ut.status = 'failed' THEN 'failed'
                  ELSE 'created'
                END as normalized_status
         FROM upi_transactions ut
         LEFT JOIN upi_payment_methods upm ON ut.upi_payment_method_id = upm.id
         LEFT JOIN bookings b ON ut.booking_id = b.id
         WHERE ut.user_id = ?
         ORDER BY ut.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, parseInt(limit), parseInt(offset)]
      );

      // Transform upi_transactions to match payments format
      finalPayments = upiTransactions.map(txn => ({
        id: txn.payment_id,
        user_id: userId,
        booking_id: txn.booking_id,
        upi_transaction_id: txn.payment_id,
        amount_paid: txn.amount,
        status: txn.normalized_status,
        method: 'upi',
        payment_type: 'upi',
        created_at: txn.created_at,
        updated_at: txn.updated_at,
        transaction_id: txn.transaction_id,
        upi_status: txn.status,
        upi_id: txn.upi_id,
        provider_name: txn.provider_name,
        booking_type: txn.booking_type,
        source: txn.source,
        description: `UPI Payment - ${txn.provider_name || 'UPI'}`
      }));
    } else {
      // Use payments table data with pagination
      const [paginatedPayments] = await pool.query(
        `SELECT p.*, ut.transaction_id as upi_transaction_id, ut.status as upi_status,
                upm.upi_id, upm.provider_name, b.id as booking_id, b.booking_type,
                'payments' as source
         FROM payments p
         LEFT JOIN upi_transactions ut ON p.upi_transaction_id = ut.id
         LEFT JOIN upi_payment_methods upm ON ut.upi_payment_method_id = upm.id
         LEFT JOIN bookings b ON p.booking_id = b.id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, parseInt(limit), parseInt(offset)]
      );
      finalPayments = paginatedPayments;
    }

    console.log('Found payments:', finalPayments.length);
    console.log('Payment data source:', finalPayments[0]?.source || 'none');
    console.log('Sample payment:', finalPayments[0]);

    res.json({
      success: true,
      payments: finalPayments
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// GET /debug-payments - Debug payment records (development only)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug-payments', verifyToken, async (req, res) => {
    try {
      const userId = req.user.id;
      console.log('Debugging payments for user:', userId);

      // Get all payments for user
      const [payments] = await pool.query(
        'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      // Get all UPI transactions for user
      const [upiTransactions] = await pool.query(
        'SELECT ut.*, upm.upi_id FROM upi_transactions ut LEFT JOIN upi_payment_methods upm ON ut.upi_payment_method_id = upm.id WHERE ut.user_id = ? ORDER BY ut.created_at DESC',
        [userId]
      );

      // Find orphaned UPI transactions (exist in upi_transactions but not in payments)
      const [orphanedTransactions] = await pool.query(
        `SELECT ut.* FROM upi_transactions ut 
         LEFT JOIN payments p ON p.upi_transaction_id = ut.id 
         WHERE ut.user_id = ? AND p.id IS NULL`,
        [userId]
      );

      // Get payments table structure
      const [columns] = await pool.query('DESCRIBE payments');

      res.json({
        success: true,
        debug: {
          payments_count: payments.length,
          payments: payments,
          upi_transactions_count: upiTransactions.length,
          upi_transactions: upiTransactions,
          orphaned_transactions_count: orphanedTransactions.length,
          orphaned_transactions: orphanedTransactions,
          payments_table_structure: columns.map(col => ({ Field: col.Field, Type: col.Type }))
        }
      });
    } catch (error) {
      console.error('Error debugging payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to debug payments'
      });
    }
  });

  // POST /fix-orphaned-payments - Fix orphaned UPI transactions by creating payment records
  router.post('/fix-orphaned-payments', verifyToken, async (req, res) => {
    try {
      const userId = req.user.id;
      console.log('Fixing orphaned payments for user:', userId);

      // Find orphaned UPI transactions
      const [orphanedTransactions] = await pool.query(
        `SELECT ut.* FROM upi_transactions ut 
         LEFT JOIN payments p ON p.upi_transaction_id = ut.id 
         WHERE ut.user_id = ? AND p.id IS NULL`,
        [userId]
      );

      console.log('Found orphaned transactions:', orphanedTransactions.length);

      let fixedCount = 0;
      for (const txn of orphanedTransactions) {
        try {
          // Map UPI transaction status to payments table status
          const paymentStatus = txn.status === 'completed' ? 'captured' : 
                               txn.status === 'processing' ? 'authorized' : 
                               txn.status === 'pending' ? 'created' : 
                               txn.status === 'failed' ? 'failed' : 'created';

          await pool.query(
            `INSERT INTO payments (user_id, booking_id, upi_transaction_id, amount_paid, status, method, payment_type, created_at)
             VALUES (?, ?, ?, ?, ?, 'upi', 'upi', ?)`,
            [txn.user_id, txn.booking_id, txn.id, txn.amount, paymentStatus, txn.created_at]
          );
          fixedCount++;
          console.log('Fixed orphaned transaction:', txn.transaction_id);
        } catch (error) {
          console.error('Error fixing transaction:', txn.transaction_id, error);
        }
      }

      res.json({
        success: true,
        message: `Fixed ${fixedCount} orphaned payment records`,
        fixed_count: fixedCount,
        total_orphaned: orphanedTransactions.length
      });
    } catch (error) {
      console.error('Error fixing orphaned payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix orphaned payments'
      });
    }
  });
}

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

  // POST /sync-payment-status - Sync payment status with Razorpay (development only)
  router.post('/sync-payment-status', verifyToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { transaction_id } = req.body;

      console.log('Syncing payment status for transaction:', transaction_id);

      if (!transaction_id) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID is required'
        });
      }

      // Find the transaction
      const [transactions] = await pool.query(
        'SELECT * FROM upi_transactions WHERE transaction_id = ? AND user_id = ?',
        [transaction_id, userId]
      );

      if (transactions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      const transaction = transactions[0];

      // Get Razorpay order ID from stored response
      const razorpayOrderId = transaction.payment_gateway_response ? 
        JSON.parse(transaction.payment_gateway_response).razorpay_order_id : null;

      if (!razorpayOrderId) {
        return res.status(400).json({
          success: false,
          message: 'No Razorpay order ID found for transaction'
        });
      }

      console.log('Found Razorpay order ID:', razorpayOrderId);

      // For now, let's manually update processing transactions to completed
      // In a real scenario, you'd query Razorpay API to get the actual status
      if (transaction.status === 'processing') {
        await pool.query(
          `UPDATE upi_transactions 
           SET status = 'completed', 
               completed_at = NOW(),
               payment_gateway_response = JSON_SET(COALESCE(payment_gateway_response, '{}'), '$.manual_update', true)
           WHERE id = ?`,
          [transaction.id]
        );

        // Update or create payment record
        await pool.query(
          `INSERT INTO payments (user_id, booking_id, upi_transaction_id, amount_paid, status, method, payment_type)
           VALUES (?, ?, ?, ?, 'captured', 'upi', 'upi')
           ON DUPLICATE KEY UPDATE status = 'captured'`,
          [transaction.user_id, transaction.booking_id, transaction.id, transaction.amount]
        );

        // Update booking payment status if booking_id exists
        if (transaction.booking_id) {
          await pool.query(
            'UPDATE bookings SET payment_status = "paid", payment_method = "UPI Payment", payment_completed_at = NOW() WHERE id = ?',
            [transaction.booking_id]
          );
          // Also complete the service if it was waiting for payment and emit socket updates
          const [svcRows] = await pool.query(
            'SELECT service_status FROM bookings WHERE id = ? LIMIT 1',
            [transaction.booking_id]
          );
          if (svcRows.length && svcRows[0].service_status === 'payment_required') {
            await pool.query(
              'UPDATE bookings SET service_status = "completed", updated_at = NOW() WHERE id = ?',
              [transaction.booking_id]
            );
            try {
              const io = require('../../server').get('io');
              if (io) {
                io.to(`booking_${transaction.booking_id}`).emit('status_update', {
                  booking_id: transaction.booking_id,
                  status: 'completed',
                  message: 'Service completed after online payment'
                });
                io.to(`booking_${transaction.booking_id}`).emit('payment_update', {
                  booking_id: transaction.booking_id,
                  payment_status: 'paid',
                  payment_method: 'UPI Payment',
                  message: 'Payment status synced as completed'
                });
              }
            } catch (socketErr) {
              console.error('Socket emit error (sync-payment-status):', socketErr.message);
            }
          }
        }

        res.json({
          success: true,
          message: 'Payment status updated to completed',
          transaction_id: transaction_id
        });
      } else {
        res.json({
          success: true,
          message: `Transaction is already ${transaction.status}`,
          current_status: transaction.status
        });
      }
    } catch (error) {
      console.error('Error syncing payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync payment status'
      });
    }
  });

// POST /razorpay/payment-success - Handle Razorpay payment success
router.post('/razorpay/payment-success', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    console.log('Processing Razorpay payment success:', {
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      user_id: userId
    });

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Payment ID and Order ID are required'
      });
    }

    // Find the payment record by order ID with row lock to prevent race conditions
    const [payments] = await connection.query(
      'SELECT * FROM payments WHERE razorpay_order_id = ? AND user_id = ? FOR UPDATE',
      [razorpay_order_id, userId]
    );

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const payment = payments[0];

    // Check if payment is already processed to prevent duplicate processing
    if (payment.status === 'captured' || payment.status === 'completed') {
      await connection.rollback();
      console.log('Payment already processed:', payment.id);
      return res.json({
        success: true,
        message: 'Payment already processed',
        payment_id: payment.id,
        booking_id: payment.booking_id,
        already_processed: true
      });
    }

    // Verify payment signature (security best practice)
    try {
      const { validateWebhookSignature } = require('../../config/razorpay');
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keySecret) {
        const isValidSignature = validateWebhookSignature(
          `${razorpay_order_id}|${razorpay_payment_id}`,
          razorpay_signature,
          keySecret
        );
        if (!isValidSignature) {
          await connection.rollback();
          console.error('Invalid payment signature:', razorpay_signature);
          return res.status(400).json({
            success: false,
            message: 'Invalid payment signature'
          });
        }
      } else {
        console.warn('RAZORPAY_KEY_SECRET not set; skipping payment signature verification.');
      }
    } catch (signatureError) {
      console.warn('Signature validation error, proceeding without verification:', signatureError.message);
    }

    // Update payment record with success details
    await connection.query(
      `UPDATE payments 
       SET razorpay_payment_id = ?, 
           status = 'captured', 
           captured_at = NOW()
       WHERE id = ?`,
      [razorpay_payment_id, payment.id]
    );

    // Also complete related UPI transaction if this payment originated from UPI flow
    try {
      if (payment.upi_transaction_id) {
        await connection.query(
          `UPDATE upi_transactions
           SET status = 'completed', completed_at = NOW(),
               payment_gateway_response = JSON_SET(COALESCE(payment_gateway_response, '{}'), '$.razorpay_payment_id', ?)
           WHERE id = ? AND status <> 'completed'`,
          [razorpay_payment_id, payment.upi_transaction_id]
        );
      } else if (payment.razorpay_order_id) {
        await connection.query(
          `UPDATE upi_transactions
           SET status = 'completed', completed_at = NOW(),
               payment_gateway_response = JSON_SET(COALESCE(payment_gateway_response, '{}'), '$.razorpay_payment_id', ?)
           WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_order_id')) = ?
             AND status <> 'completed'`,
          [razorpay_payment_id, payment.razorpay_order_id]
        );
      }
    } catch (txnErr) {
      console.warn('Warning: failed to update upi_transactions on success callback:', txnErr.message);
    }

    // Update booking payment status if booking_id exists
    if (payment.booking_id) {
      // Check current booking payment status to avoid overwriting
      const [bookings] = await connection.query(
        'SELECT payment_status FROM bookings WHERE id = ?',
        [payment.booking_id]
      );
      
      if (bookings.length > 0 && bookings[0].payment_status !== 'paid') {
        await connection.query(
          `UPDATE bookings 
           SET payment_status = 'paid', 
               payment_method = 'Razorpay', 
               payment_completed_at = NOW(),
               updated_at = NOW()
           WHERE id = ?`,
          [payment.booking_id]
        );
        
        console.log('Booking payment status updated:', payment.booking_id);
      }
      // Ensure service_status is completed if it was waiting for payment
      const [svcRows] = await connection.query(
        'SELECT service_status FROM bookings WHERE id = ? FOR UPDATE',
        [payment.booking_id]
      );
      if (svcRows.length && svcRows[0].service_status === 'payment_required') {
        await connection.query(
          `UPDATE bookings
           SET service_status = 'completed', updated_at = NOW()
           WHERE id = ?`,
          [payment.booking_id]
        );
        // Notify via sockets
        try {
          const io = req.app.get('io');
          if (io) {
            io.to(`booking_${payment.booking_id}`).emit('status_update', {
              booking_id: payment.booking_id,
              status: 'completed',
              message: 'Service completed after online payment'
            });
            io.to(`booking_${payment.booking_id}`).emit('payment_update', {
              booking_id: payment.booking_id,
              payment_status: 'paid',
              payment_method: 'Razorpay',
              message: 'Payment captured successfully'
            });
          }
        } catch (socketErr) {
          console.error('Socket emit error (payment-success):', socketErr.message);
        }
      } else {
        console.log('Booking payment already marked as paid:', payment.booking_id);
      }
    }

    await connection.commit();
    
    console.log('Payment processing completed successfully:', payment.id);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      payment_id: payment.id,
      booking_id: payment.booking_id,
      payment_status: 'captured'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error processing Razorpay payment success:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment success'
    });
  } finally {
    connection.release();
  }
});

// POST /razorpay/webhook - Handle Razorpay webhooks
router.post('/razorpay/webhook', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);
    
    // Verify webhook signature
    const { validateWebhookSignature } = require('../../config/razorpay');
    const isValidSignature = validateWebhookSignature(webhookBody, webhookSignature);
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    console.log('Received Razorpay webhook:', event, payload?.payment?.entity?.id);

    await connection.beginTransaction();

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(connection, payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(connection, payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(connection, payload.order.entity);
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    await connection.commit();
    res.status(200).json({ status: 'ok' });

  } catch (error) {
    await connection.rollback();
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  } finally {
    connection.release();
  }
});

// Helper function to handle payment captured webhook
async function handlePaymentCaptured(connection, paymentEntity) {
  const { id: paymentId, order_id: orderId, amount, status } = paymentEntity;
  
  console.log('Processing payment.captured webhook:', { paymentId, orderId, amount, status });
  
  // Find payment record by order ID
  const [payments] = await connection.query(
    'SELECT * FROM payments WHERE razorpay_order_id = ? FOR UPDATE',
    [orderId]
  );
  
  if (payments.length === 0) {
    console.warn('Payment record not found for order:', orderId);
    return;
  }
  
  const payment = payments[0];
  
  // Skip if already processed
  if (payment.status === 'captured') {
    console.log('Payment already captured:', payment.id);
    return;
  }
  
  // Update payment status
  await connection.query(
    `UPDATE payments 
     SET razorpay_payment_id = ?, 
         status = 'captured', 
         captured_at = NOW()
     WHERE id = ?`,
    [paymentId, payment.id]
  );
  
  // Update booking if exists
  if (payment.booking_id) {
    await connection.query(
      `UPDATE bookings 
       SET payment_status = 'paid', 
           payment_method = 'Razorpay', 
           payment_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = ? AND payment_status != 'paid'`,
      [payment.booking_id]
    );
  }
  
  console.log('Payment captured via webhook:', payment.id);
}

// Helper function to handle payment failed webhook
async function handlePaymentFailed(connection, paymentEntity) {
  const { id: paymentId, order_id: orderId, error_description } = paymentEntity;
  
  console.log('Processing payment.failed webhook:', { paymentId, orderId, error_description });
  
  // Find payment record by order ID
  const [payments] = await connection.query(
    'SELECT * FROM payments WHERE razorpay_order_id = ? FOR UPDATE',
    [orderId]
  );
  
  if (payments.length === 0) {
    console.warn('Payment record not found for order:', orderId);
    return;
  }
  
  const payment = payments[0];
  
  // Update payment status
  await connection.query(
    `UPDATE payments 
     SET razorpay_payment_id = ?, 
         status = 'failed'
     WHERE id = ?`,
    [paymentId, payment.id]
  );
  
  console.log('Payment failed via webhook:', payment.id);
}

// Helper function to handle order paid webhook
async function handleOrderPaid(connection, orderEntity) {
  const { id: orderId, amount_paid, status } = orderEntity;
  
  console.log('Processing order.paid webhook:', { orderId, amount_paid, status });
  
  // Find payment record by order ID
  const [payments] = await connection.query(
    'SELECT * FROM payments WHERE razorpay_order_id = ? FOR UPDATE',
    [orderId]
  );
  
  if (payments.length === 0) {
    console.warn('Payment record not found for order:', orderId);
    return;
  }
  
  const payment = payments[0];
  
  // Update payment status if not already captured
  if (payment.status !== 'captured') {
    await connection.query(
      `UPDATE payments 
       SET status = 'captured', 
           captured_at = NOW()
       WHERE id = ?`,
      [payment.id]
    );
    
    // Update booking if exists
    if (payment.booking_id) {
      await connection.query(
        `UPDATE bookings 
         SET payment_status = 'paid', 
             payment_method = 'Razorpay', 
             payment_completed_at = NOW(),
             updated_at = NOW()
         WHERE id = ? AND payment_status != 'paid'`,
        [payment.booking_id]
      );
    }
  }
  
  console.log('Order paid via webhook:', payment.id);
}

module.exports = router;
