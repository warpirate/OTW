const Razorpay = require('razorpay');
require('dotenv').config();

// Check if Razorpay keys are available
const hasRazorpayKeys = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

// Initialize Razorpay only if keys are available
if (hasRazorpayKeys) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Razorpay:', error.message);
    razorpay = null;
  }
} else {
  console.warn('⚠️  Razorpay credentials not found in environment variables');
  console.warn('   Payment processing will use mock functions for testing');
  console.warn('   Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file for live payments');
}

// Mock functions for when Razorpay is not available
const createMockOrder = async (amount, currency = 'INR', receipt = null) => {
  console.log(`🔧 MOCK: Creating order for ₹${amount/100} (${currency})`);
  return {
    success: true,
    order: {
      id: `mock_order_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: currency,
      receipt: receipt || `mock_receipt_${Date.now()}`,
      status: 'created'
    }
  };
};

const createMockPayment = async (orderId, upiId, amount, description) => {
  console.log(`🔧 MOCK: Processing UPI payment for ₹${amount/100} via ${upiId}`);
  return {
    success: true,
    payment: {
      id: `mock_payment_${Date.now()}`,
      order_id: orderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      upi: { vpa: upiId }
    }
  };
};

const createMockVerification = async (paymentId) => {
  console.log(`🔧 MOCK: Verifying payment ${paymentId}`);
  return {
    success: true,
    payment: {
      id: paymentId,
      status: 'captured',
      amount: 100000, // ₹1000 in paise
      currency: 'INR'
    }
  };
};

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
  // Use mock function if Razorpay is not available
  if (!hasRazorpayKeys || !razorpay) {
    return await createMockOrder(amount, currency, receipt);
  }

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
  // Use mock function if Razorpay is not available
  if (!hasRazorpayKeys || !razorpay) {
    return await createMockPayment(orderId, upiId, amount, description);
  }

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
  // Use mock function if Razorpay is not available
  if (!hasRazorpayKeys || !razorpay) {
    return await createMockVerification(paymentId);
  }

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
  // Use mock function if Razorpay is not available
  if (!hasRazorpayKeys || !razorpay) {
    console.log(`🔧 MOCK: Capturing payment ${paymentId} for ₹${amount/100}`);
    return {
      success: true,
      capture: {
        id: `mock_capture_${Date.now()}`,
        payment_id: paymentId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        status: 'captured'
      }
    };
  }

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
  // Use mock function if Razorpay is not available
  if (!hasRazorpayKeys || !razorpay) {
    console.log(`🔧 MOCK: Refunding payment ${paymentId} for ₹${amount/100}`);
    return {
      success: true,
      refund: {
        id: `mock_refund_${Date.now()}`,
        payment_id: paymentId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        status: 'processed'
      }
    };
  }

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
  // Use mock function if Razorpay is not available
  if (!hasRazorpayKeys || !razorpay) {
    console.log('🔧 MOCK: Returning mock payment methods');
    return {
      success: true,
      methods: {
        upi: ['gpay', 'paytm', 'phonepe', 'bhim'],
        cards: ['credit_card', 'debit_card'],
        netbanking: ['sbi', 'hdfc', 'icici']
      }
    };
  }

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
  razorpay: razorpay || null, // Return null if not initialized
  hasRazorpayKeys,
  UPI_CONFIG,
  createUPIOrder,
  createUPIPaymentRequest,
  verifyPayment,
  capturePayment,
  refundPayment,
  getPaymentMethods,
  validateWebhookSignature
};
