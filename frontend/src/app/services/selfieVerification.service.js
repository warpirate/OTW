import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

class SelfieVerificationService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/worker-management/selfie-verification`;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders() {
    const token = AuthService.getToken('worker');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get authentication headers for file upload
   */
  getFileUploadHeaders() {
    const token = AuthService.getToken('worker');
    return {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type for FormData, let browser set it with boundary
    };
  }

  /**
   * Upload selfie for job completion verification
   * @param {number} bookingId - Booking ID
   * @param {File} selfieFile - Selfie image file
   * @param {Object} location - GPS coordinates {latitude, longitude}
   * @param {string} timestamp - Capture timestamp
   * @returns {Promise<Object>} Upload result
   */
  async uploadSelfie(bookingId, selfieFile, location, timestamp) {
    try {
      const formData = new FormData();
      formData.append('selfie', selfieFile);
      formData.append('bookingId', bookingId.toString());
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('timestamp', timestamp);

      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers: this.getFileUploadHeaders(),
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload selfie');
      }

      return {
        success: true,
        data: data,
        verification: data.verification
      };
    } catch (error) {
      console.error('Selfie upload error:', error);
      throw new Error(error.message || 'Failed to upload selfie');
    }
  }

  /**
   * Get selfie verification status for a booking
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object>} Verification status
   */
  async getVerificationStatus(bookingId) {
    try {
      const response = await fetch(`${this.baseURL}/status/${bookingId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get verification status');
      }

      return {
        success: true,
        verification: data.verification
      };
    } catch (error) {
      console.error('Get verification status error:', error);
      throw new Error(error.message || 'Failed to get verification status');
    }
  }

  /**
   * Get selfie verification requirements for a booking
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object>} Verification requirements
   */
  async getVerificationRequirements(bookingId) {
    try {
      const response = await fetch(`${this.baseURL}/requirements/${bookingId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get verification requirements');
      }

      return {
        success: true,
        requirements: data.requirements
      };
    } catch (error) {
      console.error('Get verification requirements error:', error);
      throw new Error(error.message || 'Failed to get verification requirements');
    }
  }

  /**
   * Generate presigned URL for selfie upload (alternative method)
   * @param {number} bookingId - Booking ID
   * @param {string} fileType - File MIME type
   * @returns {Promise<Object>} Presigned URL data
   */
  async generatePresignedUrl(bookingId, fileType) {
    try {
      const response = await fetch(`${this.baseURL}/presign`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          bookingId,
          fileType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate upload URL');
      }

      return {
        success: true,
        presignedUrl: data.presignedUrl,
        s3Key: data.s3Key,
        expiresIn: data.expiresIn
      };
    } catch (error) {
      console.error('Generate presigned URL error:', error);
      throw new Error(error.message || 'Failed to generate upload URL');
    }
  }

  /**
   * Upload file directly to S3 using presigned URL
   * @param {string} presignedUrl - Presigned URL from generatePresignedUrl
   * @param {File} file - File to upload
   * @param {string} contentType - File content type
   * @returns {Promise<Object>} Upload result
   */
  async uploadToS3(presignedUrl, file, contentType) {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: file
      });

      if (!response.ok) {
        throw new Error('Failed to upload to S3');
      }

      return {
        success: true,
        message: 'File uploaded successfully'
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  /**
   * Complete selfie verification workflow
   * @param {number} bookingId - Booking ID
   * @param {File} selfieFile - Selfie image file
   * @param {Object} location - GPS coordinates
   * @param {string} timestamp - Capture timestamp
   * @returns {Promise<Object>} Complete verification result
   */
  async completeSelfieVerification(bookingId, formData) {
    try {
      // FormData is already structured, just send it
      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers: this.getFileUploadHeaders(),
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload selfie');
      }

      return {
        success: true,
        data: data,
        verification: data.verification
      };
    } catch (error) {
      console.error('Complete selfie verification error:', error);
      throw error;
    }
  }

  /**
   * Check if selfie verification is required for job completion
   * @param {number} bookingId - Booking ID
   * @returns {Promise<boolean>} Whether selfie is required
   */
  async isSelfieRequired(bookingId) {
    try {
      const status = await this.getVerificationStatus(bookingId);
      return status.verification.required && !status.verification.uploaded;
    } catch (error) {
      console.error('Check selfie requirement error:', error);
      return false; // Default to not required if check fails
    }
  }

  /**
   * Get verification summary for display
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object>} Verification summary
   */
  async getVerificationSummary(bookingId) {
    try {
      const [status, requirements] = await Promise.all([
        this.getVerificationStatus(bookingId),
        this.getVerificationRequirements(bookingId)
      ]);

      return {
        success: true,
        summary: {
          required: status.verification.required,
          uploaded: status.verification.uploaded,
          status: status.verification.status,
          details: status.verification.verificationDetails,
          requirements: requirements.requirements,
          canUpload: requirements.requirements.jobCompleted && 
                    requirements.requirements.hasProfilePicture &&
                    !status.verification.uploaded
        }
      };
    } catch (error) {
      console.error('Get verification summary error:', error);
      throw new Error(error.message || 'Failed to get verification summary');
    }
  }
}

export default new SelfieVerificationService();
