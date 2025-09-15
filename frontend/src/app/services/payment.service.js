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
        const response = await apiClient.get('/history', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching payment history:', error);
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
        'pending': 'Pending',
        'processing': 'Processing',
        'completed': 'Completed',
        'failed': 'Failed',
        'cancelled': 'Cancelled',
        'refunded': 'Refunded'
      };
      return statusMap[status] || status;
    },

    // Format amount for display
    formatAmount: (amount) => {
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
