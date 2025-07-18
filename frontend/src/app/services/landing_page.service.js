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