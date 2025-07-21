import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../config';

// API base URL for settings endpoints
const SETTINGS_API_URL = `${API_BASE_URL}/api/settings`;

// Create axios instance with default config
const settingsClient = axios.create({
  baseURL: SETTINGS_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token
settingsClient.interceptors.request.use(
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
settingsClient.interceptors.response.use(
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

// System Settings Service
const SettingsService = {
  // Get all system settings
  getSettings: async () => {
    try {
      const response = await settingsClient.get('/');
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  // Update system settings
  updateSettings: async (settingsData) => {
    try {
      const response = await settingsClient.put('/', settingsData);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  // Update specific setting category
  updateCategorySettings: async (category, settings) => {
    try {
      const response = await settingsClient.put(`/${category}`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating category settings:', error);
      throw error;
    }
  },

  // Reset settings to default
  resetSettings: async (category = null) => {
    try {
      const url = category ? `/reset/${category}` : '/reset';
      const response = await settingsClient.post(url);
      return response.data;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }
};

export default SettingsService;
