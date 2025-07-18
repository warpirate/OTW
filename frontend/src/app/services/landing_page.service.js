import axios from 'axios';

const API_BASE_URL = 'http://localhost:5050/api/customer';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const LandingPageService = {
    getAllCategories: async (page = 1, limit = 20) => {
    try {
      const response = await apiClient.get('/get-categories',
        {
        params: { page, limit } // Pass page and limit as query parameters
      }
      );
      console.log('Fetched categories:', response);
      if (Array.isArray(response.data)) {
        response.data.category_data = response.data.category_data 
      }
      console.log('Processed categories:', response.data);
      return response.data;
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