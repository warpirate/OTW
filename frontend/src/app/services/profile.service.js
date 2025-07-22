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

const ProfileService = {
  // Get customer profile data
  getProfile: async () => {
    try {
      const response = await apiClient.get('/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update customer profile data
  updateProfile: async (profileData) => {
    try {
      const user = AuthService.getCurrentUser('customer');
      if (!user) {
        throw new Error('User not authenticated');
      }

      const customerId = user.customer_id || user.id;
      const response = await apiClient.put(`/${customerId}`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Validate profile data before sending
  validateProfileData: (profileData) => {
    const errors = {};
    
    // Validate PIN code format (assuming it should be numeric and 6 digits)
    if (profileData.pin_code && !/^\d{6}$/.test(profileData.pin_code)) {
      errors.pin_code = 'PIN code must be 6 digits';
    }
    
    // Validate latitude range
    if (profileData.location_lat && (profileData.location_lat < -90 || profileData.location_lat > 90)) {
      errors.location_lat = 'Latitude must be between -90 and 90';
    }
    
    // Validate longitude range
    if (profileData.location_lng && (profileData.location_lng < -180 || profileData.location_lng > 180)) {
      errors.location_lng = 'Longitude must be between -180 and 180';
    }
    
    // Validate required fields if provided
    if (profileData.city && profileData.city.trim().length < 2) {
      errors.city = 'City name must be at least 2 characters';
    }
    
    if (profileData.state && profileData.state.trim().length < 2) {
      errors.state = 'State name must be at least 2 characters';
    }
    
    if (profileData.country && profileData.country.trim().length < 2) {
      errors.country = 'Country name must be at least 2 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Get profile completion status
  getProfileCompletionStatus: (profileData) => {
    const requiredFields = ['address', 'city', 'state', 'country', 'pin_code'];
    const completedFields = requiredFields.filter(field => 
      profileData[field] && profileData[field].toString().trim().length > 0
    );
    
    return {
      completionPercentage: Math.round((completedFields.length / requiredFields.length) * 100),
      completedFields: completedFields.length,
      totalFields: requiredFields.length,
      missingFields: requiredFields.filter(field => 
        !profileData[field] || profileData[field].toString().trim().length === 0
      )
    };
  },

  // Format profile data for display
  formatProfileData: (profileData) => {
    return {
      ...profileData,
      fullAddress: [
        profileData.address,
        profileData.city,
        profileData.state,
        profileData.country,
        profileData.pin_code
      ].filter(Boolean).join(', '),
      
      hasLocation: profileData.location_lat && profileData.location_lng,
      
      displayName: profileData.name || 'Customer',
      
      formattedPhone: profileData.phone_number ? 
        profileData.phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : 
        null
    };
  }
};

export default ProfileService; 