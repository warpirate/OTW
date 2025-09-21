import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/customer/ride`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
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
      AuthService.logout(null, 'customer');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const RideQuoteService = {
  // Get fare quote for a ride
  getQuote: async (quoteData) => {
    try {
      const response = await apiClient.post('/quote', quoteData);
      return response.data;
    } catch (error) {
      console.error('Error getting ride quote:', error);
      throw error;
    }
  },

  // Get all available vehicle types
  getVehicleTypes: async () => {
    try {
      const response = await apiClient.get('/vehicle-types');
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      throw error;
    }
  },

  // Validate a quote before booking
  validateQuote: async (quoteId) => {
    try {
      const response = await apiClient.post('/quote/validate', { quote_id: quoteId });
      return response.data;
    } catch (error) {
      console.error('Error validating quote:', error);
      throw error;
    }
  },

  // Get general pricing information and current surge status
  getPricingInfo: async (lat, lng) => {
    try {
      const params = {};
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
      }
      const response = await apiClient.get('/pricing-info', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching pricing info:', error);
      throw error;
    }
  },

  // Utility methods
  utils: {
    // Calculate estimated time from pickup time
    calculateEstimatedTime: (pickupTime) => {
      const pickup = new Date(pickupTime);
      const now = new Date();
      const diffMinutes = Math.ceil((pickup - now) / (1000 * 60));
      return Math.max(0, diffMinutes);
    },

    // Format fare breakdown for display
    formatFareBreakdown: (fare) => {
      return {
        base: parseFloat(fare.base || 0).toFixed(2),
        distance: parseFloat(fare.distance || 0).toFixed(2),
        time: parseFloat(fare.time || 0).toFixed(2),
        surge: parseFloat(fare.surge || 0).toFixed(2),
        night: parseFloat(fare.night || 0).toFixed(2),
        total: parseFloat(fare.total || 0).toFixed(2)
      };
    },

    // Check if quote is about to expire
    isQuoteExpiring: (expiresAt, warningMinutes = 1) => {
      if (!expiresAt) return false;
      const expiry = new Date(expiresAt);
      const now = new Date();
      const diffMinutes = (expiry - now) / (1000 * 60);
      return diffMinutes <= warningMinutes && diffMinutes > 0;
    },

    // Check if quote has expired
    isQuoteExpired: (expiresAt) => {
      if (!expiresAt) return false;
      return new Date(expiresAt) <= new Date();
    },

    // Format distance for display
    formatDistance: (distance) => {
      if (!distance) return 'N/A';
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    },

    // Format duration for display
    formatDuration: (minutes) => {
      if (!minutes) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${mins}m`;
    },

    // Get surge level description
    getSurgeDescription: (multiplier) => {
      if (multiplier <= 1) return 'Normal pricing';
      if (multiplier <= 1.5) return 'Slight demand increase';
      if (multiplier <= 2.0) return 'Moderate demand';
      if (multiplier <= 2.5) return 'High demand';
      return 'Very high demand';
    },

    // Get vehicle type icon
    getVehicleTypeIcon: (vehicleType) => {
      const icons = {
        'bike': '🏍️',
        'auto': '🛺',
        'mini': '🚗',
        'sedan': '🚙',
        'suv': '🚐',
        'luxury': '🚘'
      };
      return icons[vehicleType?.toLowerCase()] || '🚗';
    },

    // Validate quote request data
    validateQuoteRequest: (quoteData) => {
      const errors = {};
      
      if (!quoteData.pickup?.lat || !quoteData.pickup?.lng) {
        errors.pickup = 'Pickup location is required';
      }
      
      if (!quoteData.drop?.lat || !quoteData.drop?.lng) {
        errors.drop = 'Drop location is required';
      }
      
      if (!quoteData.vehicle_type_id) {
        errors.vehicle_type_id = 'Vehicle type is required';
      }
      
      if (!quoteData.pickup_time) {
        errors.pickup_time = 'Pickup time is required';
      } else {
        const pickupTime = new Date(quoteData.pickup_time);
        const now = new Date();
        const bufferMinutes = 2; // Allow 2 minutes buffer for timing issues
        const bufferTime = new Date(now.getTime() - bufferMinutes * 60 * 1000);
        if (pickupTime < bufferTime) {
          errors.pickup_time = 'Pickup time cannot be in the past';
        }
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
  }
};

export default RideQuoteService;
