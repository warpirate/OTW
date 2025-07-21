import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// API base URL for audit logs endpoints
const AUDIT_API_URL = 'http://localhost:5050/api/audit-logs';

// Create axios instance with default config
const auditClient = axios.create({
  baseURL: AUDIT_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token
auditClient.interceptors.request.use(
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
auditClient.interceptors.response.use(
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

// Audit Logs Service
const AuditLogsService = {
  // Get audit logs with filtering
  getAuditLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.action && filters.action !== 'All') {
        params.append('action', filters.action);
      }
      if (filters.user) {
        params.append('user', filters.user);
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
      const url = queryString ? `/?${queryString}` : '/';
      
      const response = await auditClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Create audit log entry
  createAuditLog: async (logData) => {
    try {
      const response = await auditClient.post('/', logData);
      return response.data;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  },

  // Get audit log by ID
  getAuditLogById: async (id) => {
    try {
      const response = await auditClient.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  },

  // Export audit logs
  exportAuditLogs: async (format = 'csv', filters = {}) => {
    try {
      const params = new URLSearchParams({ format });
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'All') {
          params.append(key, filters[key]);
        }
      });

      const response = await auditClient.get(`/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }
};

export default AuditLogsService;
