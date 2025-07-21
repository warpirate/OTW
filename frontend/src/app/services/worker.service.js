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
      console.log('WorkerService: Registering worker with data:', {
        ...userData,
        password: '[HIDDEN]'
      });
      
      const response = await apiClient.post('/worker/register', userData);
      
      console.log('WorkerService: Registration successful');
      return response.data;
    } catch (error) {
      console.error('WorkerService: Registration failed:', error.response?.data || error);
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
      console.error('WorkerService: Get profile failed:', error.response?.data || error);
      throw error;
    }
  }
  
  /**
   * Update worker profile
   */
  static async updateProfile(updateData) {
    try {
      console.log('WorkerService: Updating profile with:', updateData);
      
      const response = await API.put('/worker/profile', updateData);
      
      console.log('WorkerService: Profile update successful');
      return response.data;
    } catch (error) {
      console.error('WorkerService: Profile update failed:', error.response?.data || error);
      throw error;
    }
  }
  
  /**
   * Get dashboard stats
   */
  static async getDashboardStats() {
    try {
      const response = await API.get('/worker/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('WorkerService: Get dashboard stats failed:', error.response?.data || error);
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
      
      const response = await API.get(`/worker/all?${params}`);
      return response.data;
    } catch (error) {
      console.error('WorkerService: Get all workers failed:', error.response?.data || error);
      throw error;
    }
  }
  
  /**
   * Get specific worker by ID (Admin only)
   */
  static async getWorkerById(workerId) {
    try {
      const response = await API.get(`/worker/${workerId}`);
      return response.data;
    } catch (error) {
      console.error('WorkerService: Get worker by ID failed:', error.response?.data || error);
      throw error;
    }
  }
  
  /**
   * Update worker verification status (Admin only)
   */
  static async updateVerificationStatus(workerId, verified) {
    try {
      console.log(`WorkerService: ${verified ? 'Verifying' : 'Unverifying'} worker ${workerId}`);
      
      const response = await API.patch(`/worker/${workerId}/verify`, {
        verified
      });
      
      console.log('WorkerService: Verification status updated successfully');
      return response.data;
    } catch (error) {
      console.error('WorkerService: Update verification failed:', error.response?.data || error);
      throw error;
    }
  }
  
  /**
   * Update worker activity status (Admin only)
   */
  static async updateActivityStatus(workerId, active) {
    try {
      console.log(`WorkerService: ${active ? 'Activating' : 'Deactivating'} worker ${workerId}`);
      
      const response = await API.patch(`/worker/${workerId}/activity`, {
        active
      });
      
      console.log('WorkerService: Activity status updated successfully');
      return response.data;
    } catch (error) {
      console.error('WorkerService: Update activity failed:', error.response?.data || error);
      throw error;
    }
  }
}

export default WorkerService;
