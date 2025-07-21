import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../config';

// API base URL for admin management
const ADMIN_API_URL = `${API_BASE_URL}/api/superadmin`;

// Create axios instance with default config for admin endpoints
const adminClient = axios.create({
  baseURL: ADMIN_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token and validate it
adminClient.interceptors.request.use(
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
    } else {
      throw new Error('No authentication token found');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Handle unauthorized access
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_info');
      
      // Redirect to superadmin login if not already there
      if (!window.location.pathname.includes('/superadmin/login')) {
        window.location.href = '/superadmin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Admin Service - All CRUD operations for admin management
const AdminService = {
  // Helper to map backend admin object to frontend format
  _mapAdmin: (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone_number || '',
    role: row.role,
    status: row.is_active ? 'Active' : 'Inactive',
    createdAt: row.created_at,
  }),

  // Get all admins with optional filtering
  getAdmins: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filter parameters if provided
      if (filters.status && filters.status !== 'All') {
        params.append('status', filters.status);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.page) {
        params.append('page', filters.page);
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }

      const queryString = params.toString();
      const url = queryString ? `/?${queryString}` : '/';
      
      const response = await adminClient.get(url);
      const admins = (response.data.admins || []).map(AdminService._mapAdmin);
      return { success: true, data: admins, total: response.data.total };
    } catch (error) {
      console.error('Error fetching admins:', error);
      throw error;
    }
  },

  // Create new admin
  createAdmin: async (adminData) => {
    try {
      // backend expects phone field as phone, status optional
      console.log("admin data " ,adminData);
      const payload = {
        name: adminData.name,
        email: adminData.email,
        phone: adminData.phone,
        is_active: adminData.status === 'Active',
        role: adminData.role,
      };
      const response = await adminClient.post('/', payload);
      return { success: true, message: 'Admin created successfully', id: response.data.id };
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  },

  // Update existing admin
  updateAdmin: async (id, adminData) => {
    try {
      const response = await adminClient.put(`/${id}`, adminData);
      return response.data;
    } catch (error) {
      console.error('Error updating admin:', error);
      throw error;
    }
  },

  // Delete admin
  deleteAdmin: async (id) => {
    try {
      const response = await adminClient.delete(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  },

  // Get admin by ID
  getAdminById: async (id) => {
    try {
      const response = await adminClient.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin:', error);
      throw error;
    }
  },

  // Update admin status (active/inactive)
  updateAdminStatus: async (id, status) => {
    try {
      const response = await adminClient.patch(`/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  }
};

export default AdminService;
