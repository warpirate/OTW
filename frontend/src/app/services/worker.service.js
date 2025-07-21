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
      // Use AuthService for proper token cleanup
      AuthService.logout(null, 'worker');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/worker/login')) {
        window.location.href = '/worker/login';
      }
    }
    return Promise.reject(error);
  }
);

class WorkerService {
  /**
   * Register a new worker
   */
  static async registerWorker(userData) {
    try {
      const response = await apiClient.post('/worker/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get worker profile
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/worker/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update worker profile
   */
  static async updateProfile(updateData) {
    try {
      const response = await apiClient.put('/worker/profile', updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get dashboard stats
   */
  static async getDashboardStats() {
    try {
      const response = await apiClient.get('/worker/dashboard/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Admin Functions
   */
  
  /**
   * Get all workers (Admin only)
   */
  static async getAllWorkers(page = 1, limit = 20, filters = {}) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await apiClient.get(`/worker/all?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get specific worker by ID (Admin only)
   */
  static async getWorkerById(workerId) {
    try {
      const response = await apiClient.get(`/worker/${workerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update worker verification status (Admin only)
   */
  static async updateVerificationStatus(workerId, verified) {
    try {
      const response = await apiClient.patch(`/worker/${workerId}/verify`, {
        verified
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update worker activity status (Admin only)
   */
  static async updateActivityStatus(workerId, active) {
    try {
      const response = await apiClient.patch(`/worker/${workerId}/activity`, {
        active
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default WorkerService;
