const Razorpay = require('razorpay');
require('dotenv').config();

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Validate Razorpay configuration
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  Razorpay credentials not found in environment variables');
  console.warn('   Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
}

// Razorpay UPI configuration
const UPI_CONFIG = {
  // UPI supported methods
  supportedMethods: ['upi'],
  
  // UPI flow types
  flowTypes: {
    COLLECT: 'collect', // Customer pays via UPI app
    INTENT: 'intent'    // Customer pays via UPI ID
  },
  
  // Default UPI settings
  defaultSettings: {
    currency: 'INR',
    timeout: 300, // 5 minutes timeout
    retry_count: 3
  }
};

// Helper function to create UPI payment order
const createUPIOrder = async (amount, currency = 'INR', receipt = null) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
      notes: {
        payment_type: 'upi',
        created_via: 'omw_mobile_app'
      }
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      order: order
    };
  } catch (error) {
    console.error('Error creating Razorpay UPI order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to create UPI payment request
const createUPIPaymentRequest = async (orderId, upiId, amount, description) => {
  try {
    const paymentRequest = {
      order_id: orderId,
      method: 'upi',
      upi: {
        flow: 'collect',
        vpa: upiId
      },
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      description: description,
      notes: {
        upi_id: upiId,
        payment_type: 'upi_collect'
      }
    };

    const payment = await razorpay.payments.create(paymentRequest);
    return {
      success: true,
      payment: payment
    };
  } catch (error) {
    console.error('Error creating UPI payment request:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to verify payment
const verifyPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment: payment
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to capture payment
const capturePayment = async (paymentId, amount) => {
  try {
    const capture = await razorpay.payments.capture(paymentId, Math.round(amount * 100), 'INR');
    return {
      success: true,
      capture: capture
    };
  } catch (error) {
    console.error('Error capturing payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to refund payment
const refundPayment = async (paymentId, amount, reason = 'Refund requested by customer') => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // Convert to paise
      notes: {
        reason: reason
      }
    });
    return {
      success: true,
      refund: refund
    };
  } catch (error) {
    console.error('Error refunding payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to get payment methods
const getPaymentMethods = async () => {
  try {
    const methods = await razorpay.methods.fetchAll();
    return {
      success: true,
      methods: methods
    };
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to validate webhook signature
const validateWebhookSignature = (body, signature, secret) => {
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
};

module.exports = {
  razorpay,
  UPI_CONFIG,
  createUPIOrder,
  createUPIPaymentRequest,
  verifyPayment,
  capturePayment,
  refundPayment,
  getPaymentMethods,
  validateWebhookSignature
};
