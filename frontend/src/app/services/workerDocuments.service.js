import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/worker`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create a separate client for file uploads
const fileApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/worker`,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

// Add a request interceptor to include JWT token in the headers
const addAuthInterceptor = (client) => {
  client.interceptors.request.use(
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
};

// Add response interceptor for error handling
const addResponseInterceptor = (client) => {
  client.interceptors.response.use(
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
};

// Apply interceptors to both clients
addAuthInterceptor(apiClient);
addAuthInterceptor(fileApiClient);
addResponseInterceptor(apiClient);
addResponseInterceptor(fileApiClient);

class WorkerDocumentsService {
  
  /**
   * Banking Details Management
   */
  
  /**
   * Get all banking details for the worker
   */
  static async getBankingDetails() {
    try {
      const response = await apiClient.get('/banking-details');
      return response.data;
    } catch (error) {
      console.error('Error fetching banking details:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch banking details');
    }
  }
  
  /**
   * Create new banking details
   */
  static async createBankingDetails(bankingData) {
    try {
      const response = await apiClient.post('/banking-details', bankingData);
      return response.data;
    } catch (error) {
      console.error('Error creating banking details:', error);
      throw new Error(error.response?.data?.message || 'Failed to create banking details');
    }
  }
  
  /**
   * Update existing banking details
   */
  static async updateBankingDetails(bankingId, bankingData) {
    try {
      const response = await apiClient.put(`/banking-details/${bankingId}`, bankingData);
      return response.data;
    } catch (error) {
      console.error('Error updating banking details:', error);
      throw new Error(error.response?.data?.message || 'Failed to update banking details');
    }
  }
  
  /**
   * Delete banking details
   */
  static async deleteBankingDetails(bankingId) {
    try {
      const response = await apiClient.delete(`/banking-details/${bankingId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting banking details:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete banking details');
    }
  }
  
  /**
   * Documents Management
   */
  
  /**
   * Get all documents for the worker
   */
  static async getDocuments() {
    try {
      const response = await apiClient.get('/documents');
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch documents');
    }
  }
  
  /**
   * Upload a new document
   */
  static async uploadDocument(documentData) {
    try {
      const formData = new FormData();
      formData.append('document_type', documentData.document_type);
      formData.append('document', documentData.document);
      
      const response = await fileApiClient.post('/documents', formData);
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload document');
    }
  }
  
  /**
   * Delete a document
   */
  static async deleteDocument(documentId) {
    try {
      const response = await apiClient.delete(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete document');
    }
  }
  
  /**
   * Qualifications Management
   */
  
  /**
   * Get all qualifications for the worker
   */
  static async getQualifications() {
    try {
      const response = await apiClient.get('/qualifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching qualifications:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch qualifications');
    }
  }
  
  /**
   * Create new qualification
   */
  static async createQualification(qualificationData) {
    try {
      const response = await apiClient.post('/qualifications', qualificationData);
      return response.data;
    } catch (error) {
      console.error('Error creating qualification:', error);
      throw new Error(error.response?.data?.message || 'Failed to create qualification');
    }
  }
  
  /**
   * Delete a qualification
   */
  static async deleteQualification(qualificationId) {
    try {
      const response = await apiClient.delete(`/qualifications/${qualificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting qualification:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete qualification');
    }
  }
  
  /**
   * Driver Details Management
   */
  
  /**
   * Check if worker is registered as a driver
   */
  static async checkDriverStatus() {
    try {
      const response = await apiClient.get('/check-driver-status');
      return response.data;
    } catch (error) {
      console.error('Error checking driver status:', error);
      throw new Error(error.response?.data?.message || 'Failed to check driver status');
    }
  }
  
  /**
   * Get driver details for the worker
   */
  static async getDriverDetails() {
    try {
      const response = await apiClient.get('/driver-details');
      return response.data;
    } catch (error) {
      console.error('Error fetching driver details:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch driver details');
    }
  }
  
  /**
   * Create or update driver details
   */
  static async saveDriverDetails(driverData) {
    try {
      const response = await apiClient.post('/driver-details', driverData);
      return response.data;
    } catch (error) {
      console.error('Error saving driver details:', error);
      throw new Error(error.response?.data?.message || 'Failed to save driver details');
    }
  }
  
  /**
   * Utility Methods
   */
  
  /**
   * Get document type label
   */
  static getDocumentTypeLabel(type) {
    const labels = {
      'identity_proof': 'Identity Proof (Aadhar/PAN)',
      'address_proof': 'Address Proof',
      'drivers_license': "Driver's License",
      'trade_certificate': 'Trade Certificate',
      'background_check': 'Background Check',
      'vehicle_registration': 'Vehicle Registration'
    };
    return labels[type] || type;
  }
  
  /**
   * Get status badge CSS classes
   */
  static getStatusBadge(status) {
    const colors = {
      'pending_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'unverified': 'bg-gray-100 text-gray-800',
      'verified': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
}

export default WorkerDocumentsService;
