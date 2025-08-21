import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';
import { formatUTCDate, formatUTCTime } from '../utils/datetime';
import { formatToLocalDateTime, formatToLocalTime } from '../utils/timezone';

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

    // Get booking history
    getHistory: async (page = 1, limit = 10, status = null) => {
      try {
        const params = { page, limit };
        if (status) {
          params.status = status;
        }
        
        const response = await apiClient.get('/bookings/history', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching booking history:', error);
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
          cancellation_reason: reason,
          client_now_utc: new Date().toISOString()
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
    // Format date for API calls or display (YYYY-MM-DD) converted from UTC to local
    formatDate: (date) => {
      return formatUTCDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
    },

    // Format time for display
    formatTime: (time) => {
      return formatUTCTime(time, { hour: '2-digit', minute: '2-digit', hour12: true });
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
          date: BookingService.utils.formatDate(date),
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
      // Use the timezone utility for proper UTC to local conversion
      const scheduledDate = formatToLocalDateTime(backendBooking.scheduled_time);
      const createdDate = formatToLocalDateTime(backendBooking.created_at);
      const timeSlot = formatToLocalTime(backendBooking.scheduled_time);

      return {
        booking_id: backendBooking.id,
        service_name: backendBooking.service_name,
        subcategory_name: backendBooking.service_description,
        status: backendBooking.service_status,
        payment_status: backendBooking.payment_status,
        // Store the already converted timezone data
        booking_date: scheduledDate || 'Invalid Date',
        time_slot: timeSlot || 'Invalid Time',
        address: backendBooking.display_address || backendBooking.address,
        total_amount: backendBooking.display_price || backendBooking.price,
        gst_amount: backendBooking.gst,
        provider_name: backendBooking.provider_name || 'Not Assigned',
        provider_phone: backendBooking.provider_phone,
        created_at: createdDate || 'Invalid Date',
        notes: backendBooking.notes
      };
    },

    // Map backend booking list to frontend format
    mapBookingList: (backendResponse) => {
      const bookings = backendResponse.bookings || [];
      return {
        bookings: bookings.map(BookingService.utils.mapBookingData),
        pagination: backendResponse.pagination || {
          current_page: 1,
          per_page: 10,
          total: bookings.length,
          total_pages: 1
        }
      };
    }
  }
};

export default BookingService; 