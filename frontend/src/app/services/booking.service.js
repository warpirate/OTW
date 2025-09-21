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

const BookingService = {
  // Address Management
  addresses: {
    // Get all addresses for the customer
    getAll: async () => {
      try {
        const response = await apiClient.get('/addresses');
        return response.data;
      } catch (error) {
        console.error('Error fetching addresses:', error);
        throw error;
      }
    },

    // Add new address
    create: async (addressData) => {
      try {
        const response = await apiClient.post('/addresses', addressData);
        return response.data;
      } catch (error) {
        console.error('Error creating address:', error);
        throw error;
      }
    },

    // Update address
    update: async (addressId, addressData) => {
      try {
        const response = await apiClient.put(`/addresses/${addressId}`, addressData);
        return response.data;
      } catch (error) {
        console.error('Error updating address:', error);
        throw error;
      }
    },

    // Delete address
    delete: async (addressId) => {
      try {
        const response = await apiClient.delete(`/addresses/${addressId}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting address:', error);
        throw error;
      }
    },

    // Set address as default
    setDefault: async (addressId) => {
      try {
        const response = await apiClient.put(`/addresses/${addressId}/default`);
        return response.data;
      } catch (error) {
        console.error('Error setting default address:', error);
        throw error;
      }
    }
  },

  // Time Slot Management
  timeSlots: {
    // Get available time slots for a date
    getAvailable: async (date, subcategoryId = null) => {
      try {
        const params = { date };
        if (subcategoryId) {
          params.subcategory_id = subcategoryId;
        }
        
        const response = await apiClient.get('/bookings/available-slots', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching time slots:', error);
        throw error;
      }
    }
  },

  // Worker Availability Management
  checkWorkerAvailability: async (availabilityData) => {
    try {
      const response = await apiClient.post('/bookings/check-worker-availability', availabilityData);
      return response.data;
    } catch (error) {
      console.error('Error checking worker availability:', error);
      throw error;
    }
  },

  // Booking Management
  bookings: {
    // Create a new booking
    create: async (bookingData) => {
      try {
        const response = await apiClient.post('/bookings/create', bookingData);
        return response.data;
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
    },

    // Get booking history (cursor-based only)
    getHistory: async ({ limit = 10, lastId = null, status = null } = {}) => {
      try {
        const params = {};
        if (typeof limit !== 'undefined') params.limit = limit;
        if (lastId !== null && typeof lastId !== 'undefined') params.lastId = lastId;
        if (status) params.status = status;

        const response = await apiClient.get('/bookings/history', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching booking history:', error);
        throw error;
      }
    },

    // Get booking summary (totals independent of pagination)
    getSummary: async () => {
      try {
        const response = await apiClient.get('/bookings/summary');
        return response.data;
      } catch (error) {
        console.error('Error fetching booking summary:', error);
        throw error;
      }
    },

    // Get specific booking details
    getById: async (bookingId) => {
      try {
        const response = await apiClient.get(`/bookings/${bookingId}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching booking details:', error);
        throw error;
      }
    },

    // Cancel a booking
    cancel: async (bookingId, reason = '') => {
      try {
        const response = await apiClient.put(`/bookings/${bookingId}/cancel`, {
          cancellation_reason: reason
        });
        return response.data;
      } catch (error) {
        console.error('Error cancelling booking:', error);
        throw error;
      }
    }
  },

  // Utility methods
  utils: {
    // Simple local date builder (YYYY-MM-DD) without timezone conversion
    buildLocalDateString: (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    // Validate address data
    validateAddress: (addressData) => {
      const required = ['address', 'pin_code', 'city', 'state', 'country'];
      const errors = {};

      required.forEach(field => {
        if (!addressData[field] || addressData[field].trim() === '') {
          errors[field] = `${field.replace('_', ' ')} is required`;
        }
      });

      // Validate pin code format (assuming Indian pin codes)
      if (addressData.pin_code && !/^\d{6}$/.test(addressData.pin_code)) {
        errors.pin_code = 'Pin code must be 6 digits';
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    },

    // Get next available dates (excluding past dates and optionally Sundays)
    getAvailableDates: (daysCount = 14, excludeSundays = false) => {
      const dates = [];
      const today = new Date();
      
      for (let i = 0; i < daysCount; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Skip Sundays if specified
        if (excludeSundays && date.getDay() === 0) {
          continue;
        }
        
        dates.push({
          date: BookingService.utils.buildLocalDateString(date),
          displayDate: date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          shortDate: date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          isToday: i === 0,
          isTomorrow: i === 1
        });
      }
      
      return dates;
    },

    // Map backend booking data to frontend format
    mapBookingData: (backendBooking) => {
      return {
        booking_id: backendBooking.id,
        service_name: backendBooking.service_name,
        subcategory_name: backendBooking.service_description,
        status: backendBooking.service_status,
        payment_status: backendBooking.payment_status,
        payment_method: backendBooking.payment_method,
        payment_completed_at: backendBooking.payment_completed_at,
        // scheduled_time is stored in UTC (YYYY-MM-DD HH:mm:ss). Parse to local for UI.
        booking_date: backendBooking.scheduled_time ? new Date((backendBooking.scheduled_time + 'Z').replace(' ', 'T')) : null,
        time_slot: backendBooking.scheduled_time ? new Date((backendBooking.scheduled_time + 'Z').replace(' ', 'T')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        address: backendBooking.display_address || backendBooking.address,
        total_amount: backendBooking.display_price || backendBooking.price,
        gst_amount: backendBooking.gst,
        provider_name: backendBooking.provider_name || 'Not Assigned',
        provider_phone: backendBooking.provider_phone,
        created_at: backendBooking.created_at,
        notes: backendBooking.notes,
        // Rating and review fields
        rating: backendBooking.rating,
        review: backendBooking.review,
        rating_submitted_at: backendBooking.rating_submitted_at
      };
    },

    // Map backend booking list to frontend format (cursor fields only)
    mapBookingList: (backendResponse) => {
      const bookings = backendResponse.bookings || [];
      const hasMore = typeof backendResponse.hasMore === 'boolean'
        ? backendResponse.hasMore
        : (typeof backendResponse.hasMore === 'string' ? backendResponse.hasMore === 'true' : false);
      const lastId = typeof backendResponse.lastId !== 'undefined' ? backendResponse.lastId : null;

      return {
        bookings: bookings.map(BookingService.utils.mapBookingData),
        hasMore,
        lastId
      };
    }
  }
};

export default BookingService;