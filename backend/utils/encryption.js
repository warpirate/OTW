const crypto = require('crypto');

/**
 * Secure encryption utility for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
class EncryptionService {
  constructor() {
    // Get master encryption key from environment
    // This should be a 32-byte (256-bit) key stored securely
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!this.masterKey) {
      console.warn('⚠️  MASTER_ENCRYPTION_KEY not set. Generating temporary key (NOT FOR PRODUCTION)');
      // Generate a temporary key for development only
      this.masterKey = crypto.randomBytes(32).toString('hex');
    }
    
    // Ensure key is exactly 32 bytes
    this.keyBuffer = Buffer.from(this.masterKey.slice(0, 64), 'hex');
    if (this.keyBuffer.length !== 32) {
      throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
    
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // 128 bits for GCM
    this.authTagLength = 16; // 128 bits authentication tag
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Encrypted data in format: iv:authTag:encryptedData (all hex encoded)
   */
  encrypt(plaintext) {
    try {
      if (!plaintext) {
        throw new Error('Cannot encrypt empty data');
      }

      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Return format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted data
   * @param {string} encryptedData - Data in format: iv:authTag:encryptedData
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('Cannot decrypt empty data');
      }

      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt data - data may be corrupted or key is incorrect');
    }
  }

  /**
   * Create SHA256 hash of data (for audit logging)
   * @param {string} data - Data to hash
   * @returns {string} - Hex encoded hash
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Mask sensitive data for display
   * @param {string} data - Data to mask
   * @param {number} visibleChars - Number of characters to show at start and end
   * @returns {string} - Masked data
   */
  mask(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars * 2) {
      return '****';
    }
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const masked = '*'.repeat(Math.min(data.length - visibleChars * 2, 12));
    return `${start}${masked}${end}`;
  }

  /**
   * Generate a secure random key
   * @param {number} length - Length in bytes (default 32 for AES-256)
   * @returns {string} - Hex encoded random key
   */
  static generateKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Export singleton instance
module.exports = new EncryptionService();
