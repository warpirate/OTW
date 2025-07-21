import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

// API base URL for reports endpoints
const REPORTS_API_URL = `${API_BASE_URL}/api/reports`;

// Create axios instance with default config
const reportsClient = axios.create({
  baseURL: REPORTS_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token
reportsClient.interceptors.request.use(
  (config) => {
    // Use role-based token (super admin or admin typically for reports)
    const currentRole = localStorage.getItem('current_role');
    const token = AuthService.getToken(currentRole);
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token for reports access');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
reportsClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Use AuthService for proper token cleanup (for super admin or admin)
      const currentRole = localStorage.getItem('current_role');
      AuthService.logout(null, currentRole);
      
      // Redirect to appropriate login page
      if (!window.location.pathname.includes('/login')) {
        if (currentRole === 'super admin') {
          window.location.href = '/superadmin/login';
        } else if (currentRole === 'admin') {
          window.location.href = '/admin/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Reports Service
const ReportsService = {
  // Get all available report templates
  getReportTemplates: async () => {
    try {
      const response = await reportsClient.get('/templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching report templates:', error);
      throw error;
    }
  },

  // Generate a report
  generateReport: async (reportData) => {
    try {
      const response = await reportsClient.post('/generate', reportData);
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Get generated reports list
  getGeneratedReports: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.category && filters.category !== 'All') {
        params.append('category', filters.category);
      }
      if (filters.status && filters.status !== 'All') {
        params.append('status', filters.status);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      if (filters.page) {
        params.append('page', filters.page);
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }

      const queryString = params.toString();
      const url = queryString ? `/generated?${queryString}` : '/generated';
      
      const response = await reportsClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching generated reports:', error);
      throw error;
    }
  },

  // Download a generated report
  downloadReport: async (reportId, format = 'pdf') => {
    try {
      const response = await reportsClient.get(`/download/${reportId}?format=${format}`, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Delete a generated report
  deleteReport: async (reportId) => {
    try {
      const response = await reportsClient.delete(`/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Schedule a report
  scheduleReport: async (scheduleData) => {
    try {
      const response = await reportsClient.post('/schedule', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  },

  // Get scheduled reports
  getScheduledReports: async () => {
    try {
      const response = await reportsClient.get('/scheduled');
      return response.data;
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw error;
    }
  }
};

export default ReportsService;
