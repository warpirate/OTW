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
    console.log('=== RAZORPAY WEBHOOK CALLED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw body:', req.rawBody);
    console.log('Parsed body:', JSON.stringify(req.body, null, 2));

    const signature = req.get('X-Razorpay-Signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log('Signature:', signature);
    console.log('Webhook secret configured:', !!webhookSecret);

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
    console.log('Event payload:', JSON.stringify(event.payload, null, 2));

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        console.log('Processing payment.captured event');
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
    console.log('Payment order_id:', payment.order_id);
    
    // Find the UPI transaction by Razorpay order ID (stored in payment_gateway_response)
    const [transactions] = await pool.query(
      `SELECT * FROM upi_transactions 
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_order_id')) = ?`,
      [payment.order_id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for payment:', payment.id, 'with order_id:', payment.order_id);
      // Let's also try to find by payment ID if stored somewhere
      const [altTransactions] = await pool.query(
        `SELECT * FROM upi_transactions 
         WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_payment_id')) = ?`,
        [payment.id]
      );
      
      if (altTransactions.length === 0) {
        console.error('Transaction not found by payment ID either');
        return;
      } else {
        console.log('Found transaction by payment ID');
        transactions.push(...altTransactions);
      }
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

    // Create payment record for payment history
    await pool.query(
      `INSERT INTO payments (user_id, booking_id, upi_transaction_id, amount_paid, status, method, payment_type, captured_at)
       VALUES (?, ?, ?, ?, 'captured', 'upi', 'upi', NOW())
       ON DUPLICATE KEY UPDATE status = 'captured', captured_at = NOW()`,
      [transaction.user_id, transaction.booking_id, transaction.id, transaction.amount]
    );

    // Update booking payment status if booking_id exists
    if (transaction.booking_id) {
      await pool.query(
        'UPDATE bookings SET payment_status = "paid", payment_method = "UPI Payment", payment_completed_at = NOW(), updated_at = NOW() WHERE id = ?',
        [transaction.booking_id]
      );

      // Emit Socket.IO event to notify customer and worker that payment is completed
      try {
        const io = require('../../server').get('io');
        if (io) {
          io.to(`booking_${transaction.booking_id}`).emit('payment_update', {
            booking_id: transaction.booking_id,
            payment_status: 'paid',
            payment_method: 'UPI Payment',
            message: 'Payment completed successfully'
          });
        }
      } catch (socketError) {
        console.error('Socket error in webhook payment processing:', socketError);
      }
    }

    // Update payment record in main payments table
    const [updateResult] = await pool.query(
      `UPDATE payments
       SET status = 'captured', method = 'upi', amount_paid = ?, captured_at = NOW()
       WHERE upi_transaction_id = ?`,
      [transaction.amount, transaction.id]
    );

    console.log('Payment update result:', updateResult);

    // If no rows were updated, the payment record might not exist
    if (updateResult.affectedRows === 0) {
      console.log('Payment record not found, creating new one...');
      await pool.query(
        `INSERT INTO payments (user_id, booking_id, upi_transaction_id, amount_paid, status, method, payment_type, captured_at)
         VALUES (?, ?, ?, ?, 'captured', 'upi', 'upi', NOW())
         ON DUPLICATE KEY UPDATE status = 'captured', captured_at = NOW()`,
        [transaction.user_id, transaction.booking_id, transaction.id, transaction.amount]
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
    console.log('Payment order_id:', payment.order_id);
    
    // Find the UPI transaction by Razorpay order ID (stored in payment_gateway_response)
    const [transactions] = await pool.query(
      `SELECT * FROM upi_transactions 
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_order_id')) = ?`,
      [payment.order_id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for payment:', payment.id, 'with order_id:', payment.order_id);
      // Let's also try to find by payment ID if stored somewhere
      const [altTransactions] = await pool.query(
        `SELECT * FROM upi_transactions 
         WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_payment_id')) = ?`,
        [payment.id]
      );
      
      if (altTransactions.length === 0) {
        console.error('Transaction not found by payment ID either');
        return;
      } else {
        console.log('Found transaction by payment ID');
        transactions.push(...altTransactions);
      }
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
    console.log('Payment order_id:', payment.order_id);
    
    // Find the UPI transaction by Razorpay order ID (stored in payment_gateway_response)
    const [transactions] = await pool.query(
      `SELECT * FROM upi_transactions 
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_order_id')) = ?`,
      [payment.order_id]
    );

    if (transactions.length === 0) {
      console.error('Transaction not found for payment:', payment.id, 'with order_id:', payment.order_id);
      // Let's also try to find by payment ID if stored somewhere
      const [altTransactions] = await pool.query(
        `SELECT * FROM upi_transactions 
         WHERE JSON_UNQUOTE(JSON_EXTRACT(payment_gateway_response, '$.razorpay_payment_id')) = ?`,
        [payment.id]
      );
      
      if (altTransactions.length === 0) {
        console.error('Transaction not found by payment ID either');
        return;
      } else {
        console.log('Found transaction by payment ID');
        transactions.push(...altTransactions);
      }
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
