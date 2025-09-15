const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { validateWebhookSignature } = require('../../config/razorpay');

// Middleware to parse raw body for webhook signature verification
const rawBodyParser = (req, res, next) => {
  if (req.get('content-type') === 'application/json') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      try {
        req.body = JSON.parse(data);
        next();
      } catch (error) {
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  } else {
    next();
  }
};

// POST /razorpay/webhook - Handle Razorpay webhooks
router.post('/razorpay/webhook', rawBodyParser, async (req, res) => {
  try {
    const signature = req.get('X-Razorpay-Signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error('Missing webhook signature or secret');
      return res.status(400).json({ error: 'Missing signature or secret' });
    }

    // Validate webhook signature
    const isValidSignature = validateWebhookSignature(
      req.rawBody,
      signature,
      webhookSecret
    );

    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Received Razorpay webhook:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      
      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
      
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle payment captured event
async function handlePaymentCaptured(payment) {
  try {
    console.log('Processing payment captured:', payment.id);
    
    // Find the UPI transaction by Razorpay payment ID
    const [transactions] = await pool.query(
      'SELECT * FROM upi_transactions WHERE upi_transaction_id = ?',
      [payment.id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for payment:', payment.id);
      return;
    }

    const transaction = transactions[0];

    // Update transaction status
    await pool.query(
      `UPDATE upi_transactions 
       SET status = 'completed', 
           completed_at = NOW(),
           payment_gateway_response = ?
       WHERE id = ?`,
      [JSON.stringify(payment), transaction.id]
    );

    // Update booking payment status if booking_id exists
    if (transaction.booking_id) {
      await pool.query(
        'UPDATE bookings SET payment_status = "paid" WHERE id = ?',
        [transaction.booking_id]
      );
    }

    // Create or update payment record in main payments table
    const [existingPayment] = await pool.query(
      'SELECT id FROM payments WHERE upi_transaction_id = ?',
      [transaction.id]
    );

    if (existingPayment.length === 0) {
      await pool.query(
        `INSERT INTO payments 
         (booking_id, user_id, upi_transaction_id, method, payment_type, status, amount_paid, currency, captured_at) 
         VALUES (?, ?, ?, 'upi', 'upi', 'captured', ?, 'INR', NOW())`,
        [transaction.booking_id || null, transaction.user_id, transaction.id, transaction.amount]
      );
    } else {
      await pool.query(
        `UPDATE payments 
         SET status = 'captured', captured_at = NOW() 
         WHERE upi_transaction_id = ?`,
        [transaction.id]
      );
    }

    console.log('Payment captured processed successfully for transaction:', transaction.id);
  } catch (error) {
    console.error('Error processing payment captured:', error);
  }
}

// Handle payment failed event
async function handlePaymentFailed(payment) {
  try {
    console.log('Processing payment failed:', payment.id);
    
    // Find the UPI transaction by Razorpay payment ID
    const [transactions] = await pool.query(
      'SELECT * FROM upi_transactions WHERE upi_transaction_id = ?',
      [payment.id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for payment:', payment.id);
      return;
    }

    const transaction = transactions[0];

    // Update transaction status
    await pool.query(
      `UPDATE upi_transactions 
       SET status = 'failed', 
           failure_reason = ?,
           payment_gateway_response = ?
       WHERE id = ?`,
      [
        payment.error_description || 'Payment failed',
        JSON.stringify(payment),
        transaction.id
      ]
    );

    console.log('Payment failed processed successfully for transaction:', transaction.id);
  } catch (error) {
    console.error('Error processing payment failed:', error);
  }
}

// Handle payment authorized event
async function handlePaymentAuthorized(payment) {
  try {
    console.log('Processing payment authorized:', payment.id);
    
    // Find the UPI transaction by Razorpay payment ID
    const [transactions] = await pool.query(
      'SELECT * FROM upi_transactions WHERE upi_transaction_id = ?',
      [payment.id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for payment:', payment.id);
      return;
    }

    const transaction = transactions[0];

    // Update transaction status
    await pool.query(
      `UPDATE upi_transactions 
       SET status = 'processing', 
           payment_gateway_response = ?
       WHERE id = ?`,
      [JSON.stringify(payment), transaction.id]
    );

    console.log('Payment authorized processed successfully for transaction:', transaction.id);
  } catch (error) {
    console.error('Error processing payment authorized:', error);
  }
}

// Handle order paid event
async function handleOrderPaid(order) {
  try {
    console.log('Processing order paid:', order.id);
    
    // Find transactions by Razorpay order ID
    const [transactions] = await pool.query(
      `SELECT ut.* FROM upi_transactions ut 
       WHERE JSON_EXTRACT(payment_gateway_response, '$.razorpay_order_id') = ?`,
      [order.id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for order:', order.id);
      return;
    }

    for (const transaction of transactions) {
      // Update transaction status
      await pool.query(
        `UPDATE upi_transactions 
         SET status = 'completed', 
             completed_at = NOW(),
             payment_gateway_response = JSON_SET(COALESCE(payment_gateway_response, '{}'), '$.order_status', 'paid')
         WHERE id = ?`,
        [transaction.id]
      );

      // Update booking payment status if booking_id exists
      if (transaction.booking_id) {
        await pool.query(
          'UPDATE bookings SET payment_status = "paid" WHERE id = ?',
          [transaction.booking_id]
        );
      }
    }

    console.log('Order paid processed successfully for order:', order.id);
  } catch (error) {
    console.error('Error processing order paid:', error);
  }
}

module.exports = router;
