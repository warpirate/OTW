import axios from 'axios';

// API base URL - adjust this to match your backend API
const AUTH_API_URL = 'http://localhost:5050/api/auth';

// Create axios instance with default config for auth endpoints
const authClient = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication Service
const AuthService = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await authClient.post('/register', userData);
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
  login: async (email, password) => {
    try {
      const response = await authClient.post('/login', { email, password });
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

export default AuthService;
