import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

// API base URL
const API_BASE_URL_FULL = `${API_BASE_URL}/api/categories`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL_FULL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    // Get token from AuthService based on current role
    const token = AuthService.getToken();
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
      AuthService.logout();
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Categories API
export const CategoryService = {
  // Get all categories
  getAllCategories: async (page = 1, limit = 10) => {
    try {
      const response = await apiClient.get('/get-categories', {
        params: { page, limit }
      });
      if (Array.isArray(response.data)) {
        response.data.category_data = response.data.category_data.map(category => ({
          ...category,
          isActive: category.is_active,
        }));
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get category by ID
  getCategoryById: async (id) => {
    try {
      const response = await apiClient.get(`/get-category/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  },

  // Create new category
  createCategory: async (category) => {
    try {
      const response = await apiClient.post('/create-category', category);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  // Update existing category
  updateCategory: async (id, category) => {
    try {
      const updatedCategory = {
        ...category,
        is_active: category.isActive !== undefined ? category.isActive : category.is_active
      };
      const response = await apiClient.put(`/edit-category/${id}`, updatedCategory);
      return response.data;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (id) => {
    try {
      // First get all subcategories for this category
      const subcategories = await apiClient.get(`/sub-categories?categoryId=${id}`);
      // If there are subcategories, delete them first
      if (subcategories.data && subcategories.data.length > 0) {
        await Promise.all(subcategories.data.map(subcategory => {
          return apiClient.delete(`/delete-sub-category/${id}/${subcategory.id}`);
        }));
      }
      // Now delete the category
      const response = await apiClient.delete(`/delete-category/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  },

  // Subcategories

  // Create subcategory
  createSubcategory: async (categoryId, subcategory) => {
    try {
      const response = await apiClient.post(
        `/create-sub-category?categoryId=${categoryId}`,
        subcategory
      );
      return response.data;
    } catch (error) {
      console.error(`Error creating subcategory for category ${categoryId}:`, error);
      throw error;
    }
  },

  // Get all subcategories
  getAllSubCategories: async (categoryId) => {
    try {
      const response = await apiClient.get(`/sub-categories?categoryId=${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },

  // Update subcategory
  updateSubcategory: async (categoryId, subcategoryId, subcategory) => {
    try {
      const response = await apiClient.put(
        `/${categoryId}/subcategories/${subcategoryId}`,
        subcategory
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating subcategory ${subcategoryId}:`, error);
      throw error;
    }
  },

  // Delete subcategory
  deleteSubcategory: async (categoryId, subcategoryId) => {
    try {
      if (!categoryId || !subcategoryId) {
        throw new Error('Both categoryId and subcategoryId are required');
      }
      const response = await apiClient.delete(
        `/delete-sub-category/${categoryId}/${subcategoryId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default {
  CategoryService
};