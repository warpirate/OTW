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
      // Soft delete the category - backend automatically disables subcategories
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
      console.error(`Error deleting subcategory ${subcategoryId}:`, error);
      throw error;
    }
  },

  // Toggle subcategory status
  toggleSubcategoryStatus: async (subcategoryId, isActive) => {
    try {
      const response = await apiClient.put(
        `/subcategories/${subcategoryId}/toggle-status`,
        { is_active: isActive }
      );
      return response.data;
    } catch (error) {
      console.error(`Error toggling subcategory ${subcategoryId} status:`, error);
      throw error;
    }
  },

  // ===========================
  // Image Upload Functions
  // ===========================

  /**
   * Upload category image to S3
   * @param {number} categoryId - Category ID
   * @param {File} file - Image file to upload
   * @returns {Promise<string>} - S3 URL of uploaded image
   */
  uploadCategoryImage: async (categoryId, file) => {
    try {
      // Step 1: Get presigned URL from backend
      const presignResponse = await apiClient.post(
        `/categories/${categoryId}/image/presign`,
        {
          fileName: file.name,
          fileType: file.type
        }
      );

      const { uploadUrl, fileUrl } = presignResponse.data;

      // Step 2: Upload file directly to S3 using presigned URL
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      // Return the S3 URL to be saved in database
      return fileUrl;
    } catch (error) {
      console.error('Error uploading category image:', error);
      throw error;
    }
  },

  /**
   * Upload subcategory image to S3
   * @param {number} subcategoryId - Subcategory ID
   * @param {File} file - Image file to upload
   * @returns {Promise<string>} - S3 URL of uploaded image
   */
  uploadSubcategoryImage: async (subcategoryId, file) => {
    try {
      // Step 1: Get presigned URL from backend
      const presignResponse = await apiClient.post(
        `/subcategories/${subcategoryId}/image/presign`,
        {
          fileName: file.name,
          fileType: file.type
        }
      );

      const { uploadUrl, fileUrl } = presignResponse.data;

      // Step 2: Upload file directly to S3 using presigned URL
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      // Return the S3 URL to be saved in database
      return fileUrl;
    } catch (error) {
      console.error('Error uploading subcategory image:', error);
      throw error;
    }
  },

  /**
   * Get presigned URL to view category image
   * @param {number} categoryId - Category ID
   * @returns {Promise<string>} - Presigned URL to view image
   */
  getCategoryImageUrl: async (categoryId) => {
    try {
      const response = await apiClient.get(`/categories/${categoryId}/image/presign`);
      return response.data.url;
    } catch (error) {
      console.error('Error getting category image URL:', error);
      throw error;
    }
  },

  /**
   * Get presigned URL to view subcategory image
   * @param {number} subcategoryId - Subcategory ID
   * @returns {Promise<string>} - Presigned URL to view image
   */
  getSubcategoryImageUrl: async (subcategoryId) => {
    try {
      const response = await apiClient.get(`/subcategories/${subcategoryId}/image/presign`);
      return response.data.url;
    } catch (error) {
      console.error('Error getting subcategory image URL:', error);
      throw error;
    }
  },

  /**
   * Get public presigned URL to view category image (for customer landing page)
   * @param {number} categoryId - Category ID
   * @returns {Promise<string>} - Presigned URL to view image
   */
  getPublicCategoryImageUrl: async (categoryId) => {
    try {
      const response = await apiClient.get(`/public/categories/${categoryId}/image`);
      return response.data.url;
    } catch (error) {
      console.error('Error getting public category image URL:', error);
      throw error;
    }
  },

  /**
   * Get public presigned URL to view subcategory image (for customer landing page)
   * @param {number} subcategoryId - Subcategory ID
   * @returns {Promise<string>} - Presigned URL to view image
   */
  getPublicSubcategoryImageUrl: async (subcategoryId) => {
    try {
      const response = await apiClient.get(`/public/subcategories/${subcategoryId}/image`);
      return response.data.url;
    } catch (error) {
      console.error('Error getting public subcategory image URL:', error);
      throw error;
    }
  }
};

export default {
  CategoryService
};