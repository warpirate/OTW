import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/worker-management`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthService.getToken('worker');
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      AuthService.logout(null, 'worker');
      if (!window.location.pathname.includes('/worker/login')) {
        window.location.href = '/worker/login';
      }
    }
    return Promise.reject(error);
  }
);

const CashPaymentService = {
  /**
   * Get cash payments for worker's bookings
   */
  getCashPayments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await apiClient.get(`/cash-payments?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get specific cash payment details
   */
  getCashPayment: async (bookingId) => {
    try {
      const response = await apiClient.get(`/cash-payments/${bookingId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark cash payment as received
   */
  markPaymentReceived: async (bookingId, paymentData = {}) => {
    try {
      const response = await apiClient.post(`/cash-payments/${bookingId}/mark-received`, paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark payment as disputed
   */
  disputePayment: async (bookingId, reason) => {
    try {
      const response = await apiClient.put(`/cash-payments/${bookingId}/dispute`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get payment statistics for worker
   */
  getPaymentStats: async () => {
    try {
      const [pendingResponse, receivedResponse, disputedResponse] = await Promise.all([
        CashPaymentService.getCashPayments({ status: 'pending', limit: 1 }),
        CashPaymentService.getCashPayments({ status: 'received', limit: 1 }),
        CashPaymentService.getCashPayments({ status: 'disputed', limit: 1 })
      ]);

      return {
        pending: pendingResponse.pagination?.total || 0,
        received: receivedResponse.pagination?.total || 0,
        disputed: disputedResponse.pagination?.total || 0
      };
    } catch (error) {
      throw error;
    }
  }
};

export default CashPaymentService;
