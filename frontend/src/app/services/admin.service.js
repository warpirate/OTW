import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/admin`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthService.getToken('admin') || AuthService.getToken('superadmin');
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
      // Clear tokens and redirect to login
      AuthService.logout();
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

class AdminService {
  /**
   * Get all providers with pagination, search and filters
   */
  static async getProviders(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.verified !== undefined) queryParams.append('verified', params.verified);
      if (params.active !== undefined) queryParams.append('active', params.active);

      const response = await apiClient.get(`/providers?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get specific provider by ID
   */
  static async getProvider(id) {
    try {
      const response = await apiClient.get(`/providers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update provider verification status
   */
  static async updateProviderVerification(id, verified) {
    try {
      const response = await apiClient.patch(`/providers/${id}/verify`, {
        verified
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update provider details
   */
  static async updateProvider(id, providerData) {
    try {
      const response = await apiClient.put(`/providers/${id}`, providerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete provider
   */
  static async deleteProvider(id) {
    try {
      const response = await apiClient.delete(`/providers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Toggle provider active status
   */
  static async toggleProviderActive(id, active) {
    try {
      const response = await apiClient.patch(`/providers/${id}/toggle-active`, {
        active
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve provider
   */
  static async approveProvider(id) {
    return this.updateProviderVerification(id, true);
  }

  /**
   * Reject provider
   */
  static async rejectProvider(id) {
    return this.updateProviderVerification(id, false);
  }
}

export default AdminService;
