import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/admin/pricing`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthService.getToken('admin');
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
      AuthService.logout(null, 'admin');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const PricingAdminService = {
  // Vehicle Types Management
  vehicleTypes: {
    // Get all vehicle types
    getAll: async () => {
      try {
        const response = await apiClient.get('/vehicle-types');
        return response.data;
      } catch (error) {
        console.error('Error fetching vehicle types:', error);
        throw error;
      }
    },

    // Create new vehicle type
    create: async (vehicleTypeData) => {
      try {
        const response = await apiClient.post('/vehicle-types', vehicleTypeData);
        return response.data;
      } catch (error) {
        console.error('Error creating vehicle type:', error);
        throw error;
      }
    },

    // Update vehicle type
    update: async (id, vehicleTypeData) => {
      try {
        const response = await apiClient.put(`/vehicle-types/${id}`, vehicleTypeData);
        return response.data;
      } catch (error) {
        console.error('Error updating vehicle type:', error);
        throw error;
      }
    },

    // Delete vehicle type
    delete: async (id) => {
      try {
        const response = await apiClient.delete(`/vehicle-types/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting vehicle type:', error);
        throw error;
      }
    }
  },

  // Pricing Rules Management
  rules: {
    // Get all pricing rules
    getAll: async () => {
      try {
        const response = await apiClient.get('/rules');
        return response.data;
      } catch (error) {
        console.error('Error fetching pricing rules:', error);
        throw error;
      }
    },

    // Update pricing rule
    update: async (id, ruleValue) => {
      try {
        const response = await apiClient.put(`/rules/${id}`, { rule_value: ruleValue });
        return response.data;
      } catch (error) {
        console.error('Error updating pricing rule:', error);
        throw error;
      }
    }
  },

  // Surge Management
  surge: {
    // Get current surge information
    getCurrent: async () => {
      try {
        const response = await apiClient.get('/surge/current');
        return response.data;
      } catch (error) {
        console.error('Error fetching current surge:', error);
        throw error;
      }
    },

    // Get surge history
    getHistory: async (hours = 24) => {
      try {
        const response = await apiClient.get('/surge/history', { 
          params: { hours } 
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching surge history:', error);
        throw error;
      }
    },

    // Get surge zones
    getZones: async () => {
      try {
        const response = await apiClient.get('/surge/zones');
        return response.data;
      } catch (error) {
        console.error('Error fetching surge zones:', error);
        throw error;
      }
    },

    // Update surge zone multiplier
    updateZone: async (zoneId, surgeMultiplier) => {
      try {
        const response = await apiClient.put(`/surge/zones/${zoneId}`, { 
          surge_multiplier: surgeMultiplier 
        });
        return response.data;
      } catch (error) {
        console.error('Error updating surge zone:', error);
        throw error;
      }
    }
  },

  // Utility methods
  utils: {
    // Validate vehicle type data
    validateVehicleType: (vehicleTypeData) => {
      const errors = {};
      
      if (!vehicleTypeData.name) {
        errors.name = 'Vehicle type name is required';
      }
      
      if (!vehicleTypeData.display_name) {
        errors.display_name = 'Display name is required';
      }
      
      if (!vehicleTypeData.base_fare || vehicleTypeData.base_fare <= 0) {
        errors.base_fare = 'Base fare must be greater than 0';
      }
      
      if (!vehicleTypeData.rate_per_km || vehicleTypeData.rate_per_km <= 0) {
        errors.rate_per_km = 'Rate per km must be greater than 0';
      }
      
      if (!vehicleTypeData.rate_per_min || vehicleTypeData.rate_per_min <= 0) {
        errors.rate_per_min = 'Rate per minute must be greater than 0';
      }
      
      if (!vehicleTypeData.minimum_fare || vehicleTypeData.minimum_fare <= 0) {
        errors.minimum_fare = 'Minimum fare must be greater than 0';
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    },

    // Format currency for display
    formatCurrency: (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount);
    },

    // Format percentage for display
    formatPercentage: (value) => {
      return `${(value * 100).toFixed(1)}%`;
    },

    // Get surge level color
    getSurgeColor: (multiplier) => {
      if (multiplier <= 1) return 'text-green-600 bg-green-100';
      if (multiplier <= 1.5) return 'text-yellow-600 bg-yellow-100';
      if (multiplier <= 2.0) return 'text-orange-600 bg-orange-100';
      return 'text-red-600 bg-red-100';
    },

    // Calculate fare estimate
    calculateFareEstimate: (vehicleType, distance, duration, surgeMultiplier = 1, nightMultiplier = 1) => {
      const baseFare = parseFloat(vehicleType.base_fare);
      const freeKm = parseFloat(vehicleType.free_km_threshold || 0);
      const billableDistance = Math.max(0, distance - freeKm);
      
      const distanceComponent = billableDistance * parseFloat(vehicleType.rate_per_km);
      const timeComponent = duration * parseFloat(vehicleType.rate_per_min);
      const vehicleMultiplier = parseFloat(vehicleType.vehicle_multiplier || 1);
      
      const subtotal = (baseFare + distanceComponent + timeComponent) * vehicleMultiplier;
      const surgeComponent = subtotal * (surgeMultiplier - 1);
      const nightComponent = subtotal * (nightMultiplier - 1);
      
      const total = subtotal + surgeComponent + nightComponent;
      const minimumFare = parseFloat(vehicleType.minimum_fare);
      
      return {
        base_fare: baseFare,
        distance_component: distanceComponent,
        time_component: timeComponent,
        surge_component: surgeComponent,
        night_component: nightComponent,
        subtotal: subtotal,
        total_fare: Math.max(total, minimumFare),
        minimum_fare_applied: total < minimumFare
      };
    },

    // Validate surge multiplier
    validateSurgeMultiplier: (multiplier) => {
      const numMultiplier = parseFloat(multiplier);
      if (isNaN(numMultiplier)) {
        return { isValid: false, error: 'Surge multiplier must be a number' };
      }
      if (numMultiplier < 1.0) {
        return { isValid: false, error: 'Surge multiplier cannot be less than 1.0' };
      }
      if (numMultiplier > 5.0) {
        return { isValid: false, error: 'Surge multiplier cannot exceed 5.0' };
      }
      return { isValid: true };
    },

    // Get pricing rule category display name
    getRuleCategoryName: (category) => {
      const categoryMap = {
        'general': 'General Settings',
        'surge': 'Surge Pricing',
        'night': 'Night Hours',
        'cancellation': 'Cancellation Policy',
        'fare': 'Fare Rules'
      };
      return categoryMap[category] || category;
    }
  }
};

export default PricingAdminService;
