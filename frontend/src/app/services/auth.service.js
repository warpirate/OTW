import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// API base URLs - adjust these to match your backend API
const AUTH_API_URL = 'http://localhost:5050/api/auth';
const ADMIN_API_URL = 'http://localhost:5050/api/admin';

// Create axios instance with default config for auth endpoints
const authClient = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create axios instance with default config for admin endpoints
const adminClient = axios.create({
  baseURL: ADMIN_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        if (decoded.exp < now) {
          console.warn("Token expired");
          // Clear expired token
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_info');
        } else {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        // Clear invalid token
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global axios interceptor for all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");

  if (token) {
    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        console.warn("Token expired");
        // Clear expired token
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      // Clear invalid token
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_info');
    }
  }

  return config;
});

// Global axios response interceptor to handle unauthorized responses
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Handle unauthorized access
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_info');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication Service
const AuthService = {
  // Register new user
  register: async (userData) => {
    try {
      // Ensure userData has firstName, lastName, email, password, role_id
      const registerData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role_id: userData.role_id || 1 // Default to customer role
      };
      
      const response = await authClient.post('/register', registerData);
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  },

  // Login user with email and password
  login: async (email, password, role = 'customer') => {
    try {
      const response = await authClient.post('/login', { email, password, role });
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },

  // Login with phone OTP
  loginWithOTP: async (phone, otp) => {
    try {
      const response = await authClient.post('/login-otp', { phone, otp });
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Error during OTP login:', error);
      throw error;
    }
  },

  // Request OTP for phone verification
  requestOTP: async (phone) => {
    try {
      const response = await authClient.post('/request-otp', { phone });
      return response.data;
    } catch (error) {
      console.error('Error requesting OTP:', error);
      throw error;
    }
  },

  // Verify email
  verifyEmail: async (token) => {
    try {
      const response = await authClient.post('/verify-email', { token });
      return response.data;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user_info');
    if (userStr) return JSON.parse(userStr);
    return null;
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!localStorage.getItem('jwt_token');
  },

  // Get JWT token
  getToken: () => {
    return localStorage.getItem('jwt_token');
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await authClient.post('/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Error in forgot password process:', error);
      throw error;
    }
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    try {
      const response = await authClient.post('/reset-password', { token, password: newPassword });
      return response.data;
    } catch (error) {
      console.error('Error in password reset:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await authClient.put('/profile', userData);
      if (response.data.user) {
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Handle social login/signup
  socialAuth: async (provider, token) => {
    try {
      const response = await authClient.post('/social-auth', { provider, token });
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error(`Error during ${provider} authentication:`, error);
      throw error;
    }
  }
};

// Admin Service functions integrated into AuthService
const AdminService = {
  // Get all admins
  getAdmins: async () => {
    try {
      const response = await adminClient.get('/');
      return response.data;
    } catch (error) {
      console.error('Error fetching admins:', error);
      throw error;
    }
  },

  // Create new admin
  createAdmin: async (adminData) => {
    try {
      const response = await adminClient.post('/', adminData);
      return response.data;
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  },

  // Update admin
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

  // Update admin status
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

// Export both services
export { AdminService };
export default AuthService;
