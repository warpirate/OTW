import axios from 'axios';
import AuthService from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api`;

class PaymentSettingsService {
  /**
   * Get authentication token with super admin context
   */
  getAuthToken() {
    // Try super admin tokens first
    const token = AuthService.getToken('superadmin') || AuthService.getToken('super admin');
    
    if (!token) {
      console.error('No super admin token found');
      throw new Error('Authentication required');
    }
    
    return token;
  }

  /**
   * Get all payment API keys (masked)
   */
  async getAllKeys() {
    try {
      const token = this.getAuthToken();
      const response = await axios.get(`${API_URL}/superadmin/payment-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment keys:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthService.logout(null, 'super admin');
        window.location.href = '/superadmin/login';
      }
      
      throw error;
    }
  }

  /**
   * Get decrypted value for a specific key
   */
  async getDecryptedKey(keyId) {
    try {
      const token = this.getAuthToken();
      const response = await axios.get(`${API_URL}/superadmin/payment-settings/${keyId}/decrypt`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching decrypted key:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthService.logout(null, 'super admin');
        window.location.href = '/superadmin/login';
      }
      
      throw error;
    }
  }

  /**
   * Update a payment API key
   */
  async updateKey(keyId, data) {
    try {
      const token = this.getAuthToken();
      const response = await axios.put(
        `${API_URL}/superadmin/payment-settings/${keyId}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating payment key:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthService.logout(null, 'super admin');
        window.location.href = '/superadmin/login';
      }
      
      throw error;
    }
  }

  /**
   * Create a new payment API key
   */
  async createKey(data) {
    try {
      const token = this.getAuthToken();
      const response = await axios.post(
        `${API_URL}/superadmin/payment-settings`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating payment key:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthService.logout(null, 'super admin');
        window.location.href = '/superadmin/login';
      }
      
      throw error;
    }
  }

  /**
   * Delete a payment API key
   */
  async deleteKey(keyId) {
    try {
      const token = this.getAuthToken();
      const response = await axios.delete(`${API_URL}/superadmin/payment-settings/${keyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting payment key:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthService.logout(null, 'super admin');
        window.location.href = '/superadmin/login';
      }
      
      throw error;
    }
  }

  /**
   * Get audit logs for payment keys
   */
  async getAuditLogs(params = {}) {
    try {
      const token = this.getAuthToken();
      const response = await axios.get(`${API_URL}/superadmin/payment-settings/audit-logs/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        AuthService.logout(null, 'super admin');
        window.location.href = '/superadmin/login';
      }
      
      throw error;
    }
  }
}

export default new PaymentSettingsService();
