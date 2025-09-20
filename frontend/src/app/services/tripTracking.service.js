import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/worker/trip`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthService.getToken('worker');
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
      AuthService.logout(null, 'worker');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const TripTrackingService = {
  // Trip Management
  trip: {
    // Start a trip
    start: async (bookingId, startLocation, startTime) => {
      try {
        const response = await apiClient.post('/start', {
          booking_id: bookingId,
          start_location: startLocation,
          start_time: startTime || new Date().toISOString()
        });
        return response.data;
      } catch (error) {
        console.error('Error starting trip:', error);
        throw error;
      }
    },

    // Update location during trip
    updateLocation: async (bookingId, location, additionalData = {}) => {
      try {
        const response = await apiClient.post('/location-update', {
          booking_id: bookingId,
          location,
          speed_kmh: additionalData.speed_kmh,
          bearing: additionalData.bearing,
          accuracy_meters: additionalData.accuracy_meters
        });
        return response.data;
      } catch (error) {
        console.error('Error updating location:', error);
        throw error;
      }
    },

    // End a trip
    end: async (bookingId, endLocation, endTime, additionalCharges = {}) => {
      try {
        const response = await apiClient.post('/end', {
          booking_id: bookingId,
          end_location: endLocation,
          end_time: endTime || new Date().toISOString(),
          additional_charges: additionalCharges
        });
        return response.data;
      } catch (error) {
        console.error('Error ending trip:', error);
        throw error;
      }
    },

    // Pause a trip
    pause: async (bookingId, reason, location) => {
      try {
        const response = await apiClient.post('/pause', {
          booking_id: bookingId,
          reason,
          location
        });
        return response.data;
      } catch (error) {
        console.error('Error pausing trip:', error);
        throw error;
      }
    },

    // Resume a trip
    resume: async (bookingId, location) => {
      try {
        const response = await apiClient.post('/resume', {
          booking_id: bookingId,
          location
        });
        return response.data;
      } catch (error) {
        console.error('Error resuming trip:', error);
        throw error;
      }
    },

    // Get trip status
    getStatus: async (bookingId) => {
      try {
        const response = await apiClient.get(`/${bookingId}/status`);
        return response.data;
      } catch (error) {
        console.error('Error getting trip status:', error);
        throw error;
      }
    }
  },

  // Utility methods
  utils: {
    // Calculate distance between two points using Haversine formula
    calculateDistance: (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    },

    // Calculate total distance from route coordinates
    calculateRouteDistance: (coordinates) => {
      if (!coordinates || coordinates.length < 2) return 0;
      
      let totalDistance = 0;
      for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        totalDistance += this.calculateDistance(
          prev.lat, prev.lng, 
          curr.lat, curr.lng
        );
      }
      return totalDistance;
    },

    // Format trip duration
    formatDuration: (startTime, endTime) => {
      if (!startTime || !endTime) return 'N/A';
      
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end - start;
      const minutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`;
      }
      return `${minutes}m`;
    },

    // Format distance for display
    formatDistance: (distance) => {
      if (!distance) return 'N/A';
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    },

    // Get trip status display info
    getStatusDisplay: (status) => {
      const statusMap = {
        'not_started': { 
          label: 'Not Started', 
          color: 'text-gray-600 bg-gray-100',
          icon: '⏳'
        },
        'in_progress': { 
          label: 'In Progress', 
          color: 'text-blue-600 bg-blue-100',
          icon: '🚗'
        },
        'paused': { 
          label: 'Paused', 
          color: 'text-yellow-600 bg-yellow-100',
          icon: '⏸️'
        },
        'completed': { 
          label: 'Completed', 
          color: 'text-green-600 bg-green-100',
          icon: '✅'
        },
        'cancelled': { 
          label: 'Cancelled', 
          color: 'text-red-600 bg-red-100',
          icon: '❌'
        }
      };
      return statusMap[status] || statusMap['not_started'];
    },

    // Validate location data
    validateLocation: (location) => {
      const errors = {};
      
      if (!location) {
        errors.location = 'Location is required';
        return { isValid: false, errors };
      }
      
      if (!location.lat || typeof location.lat !== 'number') {
        errors.lat = 'Valid latitude is required';
      }
      
      if (!location.lng || typeof location.lng !== 'number') {
        errors.lng = 'Valid longitude is required';
      }
      
      if (location.lat < -90 || location.lat > 90) {
        errors.lat = 'Latitude must be between -90 and 90';
      }
      
      if (location.lng < -180 || location.lng > 180) {
        errors.lng = 'Longitude must be between -180 and 180';
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    },

    // Calculate trip progress percentage
    calculateProgress: (elapsedMinutes, estimatedDuration) => {
      if (!elapsedMinutes || !estimatedDuration) return 0;
      return Math.min(100, Math.round((elapsedMinutes / estimatedDuration) * 100));
    },

    // Get estimated arrival time
    getEstimatedArrival: (startTime, estimatedDuration) => {
      if (!startTime || !estimatedDuration) return null;
      
      const start = new Date(startTime);
      const arrival = new Date(start.getTime() + (estimatedDuration * 60 * 1000));
      return arrival.toISOString();
    },

    // Format additional charges
    formatAdditionalCharges: (charges) => {
      const formatted = {};
      
      if (charges.tip) {
        formatted.tip = parseFloat(charges.tip).toFixed(2);
      }
      
      if (charges.waiting_charges) {
        formatted.waiting_charges = parseFloat(charges.waiting_charges).toFixed(2);
      }
      
      if (charges.toll_charges) {
        formatted.toll_charges = parseFloat(charges.toll_charges).toFixed(2);
      }
      
      if (charges.promo_discount) {
        formatted.promo_discount = parseFloat(charges.promo_discount).toFixed(2);
      }
      
      return formatted;
    }
  }
};

export default TripTrackingService;
