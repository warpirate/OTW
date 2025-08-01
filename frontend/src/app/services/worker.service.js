import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/worker-management`,
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
      // Use AuthService for proper token cleanup
      AuthService.logout(null, 'worker');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/worker/login')) {
        window.location.href = '/worker/login';
      }
    }
    return Promise.reject(error);
  }
);

class WorkerService {
  /**
   * Register a new worker
   */
  static async registerWorker(userData) {
    try {
      const response = await apiClient.post('/worker/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get worker profile
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/worker/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update worker profile
   */
  static async updateProfile(updateData) {
    try {
      const response = await apiClient.put('/worker/profile', updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating worker profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }
  
  /**
   * Get dashboard stats
   */
  static async getDashboardStats() {
    try {
      const response = await apiClient.get('/worker/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to load stats');
    }
  }
  
    // Alias to reuse existing axios client for settings endpoints
  static _client = apiClient;

  // Convert backend flat schema to frontend nested schema
  static _toFrontendSettings(data) {
    const notifications = {
      newJobAlerts: data.notify_on_job_alerts ?? true,
      messageAlerts: data.notify_on_messages ?? true,
      paymentAlerts: data.notify_on_payments ?? true,
      promotionalEmails: data.notify_by_email ?? false,
      smsNotifications: data.notify_by_sms ?? false,
      pushNotifications: data.notify_by_push ?? true
    };

    const availability = {
      auto_accept_jobs: data.auto_accept_jobs ?? false,
      max_jobs_per_day: data.max_jobs_per_day ?? 5,
      working_hours: {
        start: data.working_hours_start ?? '09:00',
        end: data.working_hours_end ?? '18:00'
      },
      weekend_work: data.allow_weekend_work ?? true,
      holiday_work: data.allow_holiday_work ?? false
    };

    const privacy = {
      show_profile_to_customers: data.profile_visibility === 'public',
      show_rating_publicly: data.display_rating ?? true,
      allow_direct_contact: data.allow_direct_contact ?? true,
      share_location_data: data.location_sharing_mode !== 'off'
    };

    const preferences = {
      language: data.preferred_language ?? 'en',
      currency: data.preferred_currency ?? 'INR',
      distance_unit: data.distance_unit ?? 'km',
      time_format: data.time_format ?? '24h'
    };

    return {
      ...data, // keep original flat fields for convenience
      notifications,
      availability,
      privacy,
      preferences
    };
  }

  // Convert frontend nested schema back to backend flat schema
  static _toBackendSettings(settings) {
    return {
      // Notifications
      notify_on_job_alerts: settings.notifications?.newJobAlerts ?? settings.notify_on_job_alerts,
      notify_on_messages: settings.notifications?.messageAlerts ?? settings.notify_on_messages,
      notify_on_payments: settings.notifications?.paymentAlerts ?? settings.notify_on_payments,
      notify_by_email: settings.notifications?.promotionalEmails ?? settings.notify_by_email,
      notify_by_sms: settings.notifications?.smsNotifications ?? settings.notify_by_sms,
      notify_by_push: settings.notifications?.pushNotifications ?? settings.notify_by_push,

      // Availability
      auto_accept_jobs: settings.availability?.auto_accept_jobs ?? settings.auto_accept_jobs,
      max_jobs_per_day: settings.availability?.max_jobs_per_day ?? settings.max_jobs_per_day,
      allow_weekend_work: settings.availability?.weekend_work ?? settings.allow_weekend_work,
      allow_holiday_work: settings.availability?.holiday_work ?? settings.allow_holiday_work,

      // Privacy
      profile_visibility: settings.privacy?.show_profile_to_customers ? 'public' : 'platform_only',
      display_rating: settings.privacy?.show_rating_publicly ?? settings.display_rating,
      allow_direct_contact: settings.privacy?.allow_direct_contact ?? settings.allow_direct_contact,
      location_sharing_mode: settings.privacy?.share_location_data ? 'on_job' : 'off',

      // Preferences
      preferred_language: settings.preferences?.language ?? settings.preferred_language,
      preferred_currency: settings.preferences?.currency ?? settings.preferred_currency,
      distance_unit: settings.preferences?.distance_unit ?? settings.distance_unit,
      time_format: settings.preferences?.time_format ?? settings.time_format,

      // Working hours (optional extension)
      working_hours_start: settings.availability?.working_hours?.start,
      working_hours_end: settings.availability?.working_hours?.end
    };
  }

  static async getSettings() {
    try {
      const { data } = await WorkerService._client.get('/worker/settings');
      return WorkerService._toFrontendSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  // Update system settings
  static async updateSettings(settingsData) {
    try {
      const backendPayload = WorkerService._toBackendSettings(settingsData);
      const response = await WorkerService._client.put('/worker/settings', backendPayload);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Update specific setting category
    static async updateCategorySettings(category, settings) {
    try {
      const response = await WorkerService._client.put(`/worker/settings/${category}`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating category settings:', error);
      throw error;
    }
  }

  // Reset settings to default
  static async resetSettings(category = null) {
    try {
      const url = category ? `/worker/settings/reset/${category}` : '/worker/settings/reset';
      const response = await WorkerService._client.post(url);
      return response.data;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }

  /**
   * Booking Requests Management
   */
  
  /**
   * Get booking requests for worker
   */
  static async getBookingRequests(status = null, page = 1, limit = 20) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) {
        params.append('status', status);
      }
      
      const response = await WorkerService._client.get(`/worker/booking-requests?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      throw new Error(error.response?.data?.message || 'Failed to load booking requests');
    }
  }
  
  /**
   * Update booking request status (accept/reject)
   */
  static async updateBookingRequest(requestId, status, reason = null) {
    try {
      const response = await WorkerService._client.put(`/worker/booking-requests/${requestId}`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error updating booking request:', error);
      throw new Error(error.response?.data?.message || 'Failed to update booking request');
    }
  }

  /**
   * Admin Functions
   */
  
  /**
   * Get all workers (Admin only)
  //  */
  // static async getAllWorkers(page = 1, limit = 20, filters = {}) {
  //   try {
  //     const params = new URLSearchParams({
  //       page: page.toString(),
  //       limit: limit.toString(),
  //       ...filters
  //     });
      
  //     const response = await apiClient.get(`/worker/all?${params}`);
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  
  // /**
  //  * Get specific worker by ID (Admin only)
  //  */
  // static async getWorkerById(workerId) {
  //   try {
  //     const response = await apiClient.get(`/worker/${workerId}`);
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  
  // /**
  //  * Update worker verification status (Admin only)
  //  */
  // static async updateVerificationStatus(workerId, verified) {
  //   try {
  //     const response = await apiClient.patch(`/worker/${workerId}/verify`, {
  //       verified
  //     });
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  
  // /**
  //  * Update worker activity status (Admin only)
  //  */
  // static async updateActivityStatus(workerId, active) {
  //   try {
  //     const response = await apiClient.patch(`/worker/${workerId}/activity`, {
  //       active
  //     });
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  
}

export default WorkerService;
