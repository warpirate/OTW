import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/customer`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    // Get token from AuthService based on current role (customer by default)
    const token = AuthService.getToken('customer');
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
      AuthService.logout(null, 'customer');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const LandingPageService = {
    getAllCategories: async (page = 1, limit = 20) => {
    try {
      const response = await apiClient.get('/get-categories',
        {
        params: { page, limit } // Pass page and limit as query parameters
      }
      );
      console.log('Fetched categories:', response);
      console.log('Response data structure:', {
        isArray: Array.isArray(response.data),
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        data: response.data
      });
      
      // If response.data is an array, it means the categories are directly in the array
      // If it's an object, it might have a category_data property
      let processedData;
      if (Array.isArray(response.data)) {
        processedData = { category_data: response.data };
      } else {
        processedData = response.data;
      }
      
      console.log('Processed categories:', processedData);
      return processedData;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
    getAllSubCategories: async (categoryId) => {
    try {
      console.log("CATE ID ", categoryId);
      const response = await apiClient.get(`/sub-categories?categoryId=${categoryId}`);
      console.log('Fetched subcategories:', response);
      return response.data;

    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },
}