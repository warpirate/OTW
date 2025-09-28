import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/payment`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthService.getToken('customer');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      AuthService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const PaymentService = {
  // UPI Payment Methods Management
  upiMethods: {
    // Get all UPI payment methods for the user
    getAll: async () => {
      try {
        const response = await apiClient.get('/upi-methods');
        return response.data;
      } catch (error) {
        console.error('Error fetching UPI methods:', error);
        throw error;
      }
    },

    // Add a new UPI payment method
    add: async (upiData) => {
      try {
        const response = await apiClient.post('/upi-methods', upiData);
        return response.data;
      } catch (error) {
        console.error('Error adding UPI method:', error);
        throw error;
      }
    },

    // Set a UPI method as default
    setDefault: async (methodId) => {
      try {
        const response = await apiClient.patch(`/upi-methods/${methodId}/set-default`);
        return response.data;
      } catch (error) {
        console.error('Error setting default UPI method:', error);
        throw error;
      }
    },

    // Delete a UPI payment method
    delete: async (methodId) => {
      try {
        const response = await apiClient.delete(`/upi-methods/${methodId}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting UPI method:', error);
        throw error;
      }
    }
  },

  // UPI Payment Processing
  upi: {
    // Initiate UPI payment
    initiate: async (paymentData) => {
      try {
        const response = await apiClient.post('/upi/initiate', paymentData);
        return response.data;
      } catch (error) {
        console.error('Error initiating UPI payment:', error);
        throw error;
      }
    },

    // Verify UPI payment status
    verify: async (paymentId) => {
      try {
        const response = await apiClient.get(`/upi/verify/${paymentId}`);
        return response.data;
      } catch (error) {
        console.error('Error verifying UPI payment:', error);
        throw error;
      }
    },

    // Refund UPI payment
    refund: async (paymentId, refundData) => {
      try {
        const response = await apiClient.post(`/upi/refund/${paymentId}`, refundData);
        return response.data;
      } catch (error) {
        console.error('Error refunding UPI payment:', error);
        throw error;
      }
    }
  },

  // Payment History
  history: {
    // Get payment history
    get: async (params = {}) => {
      try {
        console.log('PaymentService.history.get called with params:', params);
        const response = await apiClient.get('/history', { params });
        console.log('PaymentService.history.get response:', response);
        console.log('PaymentService.history.get response.data:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching payment history:', error);
        console.error('Error response:', error.response);
        throw error;
      }
    },

    // Debug payment records (development only)
    debug: async () => {
      try {
        console.log('PaymentService.history.debug called');
        const response = await apiClient.get('/debug-payments');
        console.log('PaymentService.history.debug response:', response);
        return response.data;
      } catch (error) {
        console.error('Error debugging payments:', error);
        throw error;
      }
    },

    // Fix orphaned UPI transactions by creating payment records (development only)
    fixOrphaned: async () => {
      try {
        console.log('PaymentService.history.fixOrphaned called');
        const response = await apiClient.post('/fix-orphaned-payments');
        console.log('PaymentService.history.fixOrphaned response:', response);
        return response.data;
      } catch (error) {
        console.error('Error fixing orphaned payments:', error);
        throw error;
      }
    },

    // Sync payment status with Razorpay (development only)
    syncStatus: async (transactionId) => {
      try {
        console.log('PaymentService.history.syncStatus called for:', transactionId);
        const response = await apiClient.post('/sync-payment-status', {
          transaction_id: transactionId
        });
        console.log('PaymentService.history.syncStatus response:', response);
        return response.data;
      } catch (error) {
        console.error('Error syncing payment status:', error);
        throw error;
      }
    }
  },

  // Utility Methods
  utils: {
    // Validate UPI ID format
    validateUPIId: (upiId) => {
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
      return upiRegex.test(upiId);
    },

    // Detect UPI provider from UPI ID
    detectProvider: (upiId) => {
      const providerMap = {
        'paytm': 'Paytm',
        'gpay': 'Google Pay',
        'phonepe': 'PhonePe',
        'amazon': 'Amazon Pay',
        'bhim': 'BHIM',
        'ybl': 'Yono SBI',
        'hdfc': 'HDFC Bank',
        'icici': 'ICICI Bank',
        'axis': 'Axis Bank',
        'kotak': 'Kotak Bank',
        'pnb': 'Punjab National Bank',
        'sbi': 'State Bank of India'
      };

      const domain = upiId.split('@')[1]?.toLowerCase();
      if (!domain) return 'Unknown';

      // Check for exact matches
      for (const [key, value] of Object.entries(providerMap)) {
        if (domain.includes(key)) {
          return value;
        }
      }

      // Check for bank-specific patterns
      if (domain.includes('bank') || domain.includes('biz')) {
        return 'Bank UPI';
      }

      return 'Other';
    },

    // Format payment status for display
    formatStatus: (status) => {
      const statusMap = {
        'created': 'Pending',
        'authorized': 'Processing',
        'captured': 'Completed',
        'failed': 'Failed',
        'refunded': 'Refunded',
        // Legacy status mappings
        'pending': 'Pending',
        'processing': 'Processing',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
      };
      return statusMap[status] || status;
    },

    // Format amount for display
    formatAmount: (payment) => {
      const amount = payment.amount_paid || payment.amount || 0;
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(amount);
    },

    // Format date for display
    formatDate: (dateString) => {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};

export default PaymentService;
