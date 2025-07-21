import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// API base URL for dashboard endpoints
const DASHBOARD_API_URL = 'http://localhost:5050/api/dashboard';

// Create axios instance with default config
const dashboardClient = axios.create({
  baseURL: DASHBOARD_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token
dashboardClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        
        if (decoded.exp < now) {
          console.warn('Token expired');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_info');
          throw new Error('Token expired');
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
        throw new Error('Invalid token');
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
dashboardClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_info');
      
      if (!window.location.pathname.includes('/superadmin/login')) {
        window.location.href = '/superadmin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Dashboard Service
const DashboardService = {
  // Get platform statistics
  getStats: async () => {
    try {
      const response = await dashboardClient.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent admin actions
  getRecentActions: async (limit = 10) => {
    try {
      const response = await dashboardClient.get(`/recent-actions?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent actions:', error);
      throw error;
    }
  },

  // Get user growth data
  getUserGrowth: async (period = '30d') => {
    try {
      const response = await dashboardClient.get(`/user-growth?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      throw error;
    }
  },

  // Get revenue data
  getRevenueData: async (period = '30d') => {
    try {
      const response = await dashboardClient.get(`/revenue?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
  }
};

export default DashboardService;
