import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/customer/driver`,
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

export const DriverService = {
  // Location Search
  location: {
    // Search for location suggestions using Google Maps Places API
    search: async (query) => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key not configured');
          return [];
        }

        // Use Google Maps Places Autocomplete API
        const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&components=country:in`;
        const autocompleteResponse = await fetch(autocompleteUrl);
        const autocompleteData = await autocompleteResponse.json();

        if (autocompleteData.status !== 'OK' && autocompleteData.status !== 'ZERO_RESULTS') {
          console.error('Google Places API error:', autocompleteData.status);
          return [];
        }

        if (!autocompleteData.predictions || autocompleteData.predictions.length === 0) {
          return [];
        }

        // Get place details for each prediction to obtain coordinates
        const locations = await Promise.all(
          autocompleteData.predictions.slice(0, 5).map(async (prediction) => {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${apiKey}`;
              const detailsResponse = await fetch(detailsUrl);
              const detailsData = await detailsResponse.json();

              if (detailsData.status === 'OK' && detailsData.result?.geometry?.location) {
                return {
                  display: prediction.description,
                  lat: detailsData.result.geometry.location.lat,
                  lng: detailsData.result.geometry.location.lng
                };
              }
              return null;
            } catch (e) {
              console.error('Error fetching place details:', e);
              return null;
            }
          })
        );

        return locations.filter(loc => loc !== null);
      } catch (error) {
        console.error('Error searching locations:', error);
        throw error;
      }
    },
    
    // Reverse geocoding using Google Maps Geocoding API
    reverse: async (lat, lng) => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key not configured');
          return null;
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const data = await response.json();

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
          console.error('Google Geocoding API error:', data.status);
          return null;
        }

        return data.results[0];
      } catch (error) {
        console.error('Error in reverse geocoding:', error);
        throw error;
      }
    }
  },

  // Driver Search
  search: {
    // Search for available drivers
    available: async (searchCriteria) => {
      try {
        const response = await apiClient.post('/search', searchCriteria);
        return response.data;
      } catch (error) {
        console.error('Error searching drivers:', error);
        throw error;
      }
    }
  },

  // Backwards-compatible alias used by DriverBooking.jsx
  // Calls the same backend endpoint as search.available
  searchNearbyDrivers: async (searchCriteria) => {
    try {
      const response = await apiClient.post('/search', searchCriteria);
      return response.data;
    } catch (error) {
      console.error('Error searching nearby drivers:', error);
      throw error;
    }
  },

  // Driver Booking
  booking: {
    // Create a new driver booking
    create: async (bookingData) => {
      try {
        const response = await apiClient.post('/book-ride', bookingData);
        return response.data;
      } catch (error) {
        console.error('Error creating driver booking:', error);
        throw error;
      }
    },

    // Get driver booking details
    getById: async (bookingId) => {
      try {
        const response = await apiClient.get(`/booking/${bookingId}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching driver booking:', error);
        throw error;
      }
    },

    // Update booking status
    updateStatus: async (bookingId, status) => {
      try {
        const response = await apiClient.put(`/booking/${bookingId}/status`, { status });
        return response.data;
      } catch (error) {
        console.error('Error updating booking status:', error);
        throw error;
      }
    }
  },

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

  // Utility methods
  utils: {
    // Calculate estimated price based on distance and service type
    calculatePrice: (distance, serviceType, duration = 1) => {
      const baseRates = {
        'driver': 15, // per km
        'rental': 25, // per km
        'chauffeur': 20 // per km
      };

      const baseRate = baseRates[serviceType] || 15;
      const distanceCost = distance * baseRate;
      const timeCost = duration * 100; // 100 per hour
      
      return {
        base_price: distanceCost,
        time_cost: timeCost,
        total: distanceCost + timeCost,
        breakdown: {
          distance: distance,
          distance_rate: baseRate,
          duration: duration,
          time_rate: 100
        }
      };
    },

    // Format distance for display
    formatDistance: (distance) => {
      if (!distance) return 'N/A';
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    },

    // Format time for display
    formatTime: (minutes) => {
      if (!minutes) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${mins}m`;
    },

    // Format price for display
    formatPrice: (price) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
      }).format(price);
    },

    // Get vehicle type display name
    getVehicleTypeName: (vehicleType) => {
      const types = {
        'sedan': 'Sedan',
        'suv': 'SUV',
        'hatchback': 'Hatchback',
        'van': 'Van',
        'bike': 'Bike'
      };
      return types[vehicleType] || vehicleType;
    },

    // Get service type display name
    getServiceTypeName: (serviceType) => {
      const types = {
        'driver': 'Driver for Hire',
        'rental': 'Car Rental',
        'chauffeur': 'Chauffeur Service'
      };
      return types[serviceType] || serviceType;
    },

    // Validate booking data
    validateBookingData: (bookingData) => {
      const errors = {};
      
      if (!bookingData.pickup_address) {
        errors.pickup_address = 'Pickup address is required';
      }
      
      if (!bookingData.scheduled_time) {
        errors.scheduled_time = 'Scheduled time is required';
      }
      
      if (!bookingData.service_type) {
        errors.service_type = 'Service type is required';
      }
      
      if (!bookingData.provider_id) {
        errors.provider_id = 'Driver selection is required';
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    },

    // Get driver rating display
    getRatingDisplay: (rating) => {
      if (!rating) return 'No rating';
      return `${rating.toFixed(1)} ⭐`;
    },

    // Get driver experience display
    getExperienceDisplay: (years) => {
      if (!years) return 'No experience';
      return `${years} year${years > 1 ? 's' : ''} experience`;
    },

    // Get vehicle capacity display
    getVehicleCapacityDisplay: (vehicleType) => {
      const capacities = {
        'sedan': '4 passengers',
        'suv': '6 passengers',
        'hatchback': '5 passengers',
        'van': '8 passengers',
        'bike': '2 passengers'
      };
      return capacities[vehicleType] || '4 passengers';
    },

    // Parse booking details from address field
    parseBookingDetails: (address) => {
      try {
        return JSON.parse(address);
      } catch (e) {
        return { pickup_address: address };
      }
    },

    // Get booking status display
    getStatusDisplay: (status) => {
      const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
      };
      return statusMap[status] || status;
    },

    // Get booking status color
    getStatusColor: (status) => {
      const colorMap = {
        'pending': 'text-yellow-600 bg-yellow-100',
        'confirmed': 'text-green-600 bg-green-100',
        'in_progress': 'text-blue-600 bg-blue-100',
        'completed': 'text-gray-600 bg-gray-100',
        'cancelled': 'text-red-600 bg-red-100'
      };
      return colorMap[status] || 'text-gray-600 bg-gray-100';
    }
  }
};

 