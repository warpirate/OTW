import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://localhost:5050/api/categories';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
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

// Categories API
export const CategoryService = {
  // Get all categories
  getAllCategories: async (page = 1, limit = 10) => {
    try {
      const response = await apiClient.get('/get-categories',
        {
        params: { page, limit } // Pass page and limit as query parameters
      }
      );
      console.log('Fetched categories:', response);
      if (Array.isArray(response.data)) {
        response.data.category_data = response.data.category_data.map(category => ({
          ...category,
          isActive: category.is_active,
        }));
      }
      console.log('Processed categories:', response.data);
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
      // Ensure is_active is set based on isActive
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
      console.log("CATE ID ", categoryId);
      const response = await apiClient.get(`/sub-categories?categoryId=${categoryId}`);
      console.log('Fetched subcategories:', response);
      return response.data;

    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },

  // Update subcategory
  updateSubcategory: async (categoryId, subcategoryId, subcategory) => {
    try {
      console.log("CATE ID ", categoryId);
      console.log("SUB ID ", subcategoryId);
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
      
      console.log(`Deleting subcategory with categoryId=${categoryId} and subcategoryId=${subcategoryId}`);
      
      const response = await apiClient.delete(
        `/delete-sub-category/${categoryId}/${subcategoryId}`
      );
      
      console.log('Delete subcategory response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error deleting subcategory ${subcategoryId} from category ${categoryId}:`, error);
      throw error;
    }
  }
  // get details of categories along with sub categories

};


export default {
  CategoryService
};