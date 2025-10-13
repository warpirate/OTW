const pool = require('../config/db');
const encryption = require('./encryption');

/**
 * API Key Manager - Centralized utility to fetch decrypted API keys from database
 * This replaces direct process.env access for sensitive credentials
 */
class ApiKeyManager {
  constructor() {
    // Cache for API keys to reduce database queries
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.lastFetch = new Map();
  }

  /**
   * Get a decrypted API key from database
   * @param {string} keyName - Name of the key (e.g., 'RAZORPAY_KEY_ID')
   * @param {boolean} useCache - Whether to use cached value (default: true)
   * @returns {Promise<string|null>} - Decrypted key value or null if not found
   */
  async getKey(keyName, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.isCacheValid(keyName)) {
        return this.cache.get(keyName);
      }

      // Fetch from database
      const [keys] = await pool.query(
        'SELECT key_value FROM payment_api_keys WHERE key_name = ? AND is_active = TRUE LIMIT 1',
        [keyName]
      );

      if (keys.length === 0) {
        console.warn(`⚠️  API key not found in database: ${keyName}`);
        // Fallback to environment variable
        return process.env[keyName] || null;
      }

      // Decrypt the value
      const decryptedValue = encryption.decrypt(keys[0].key_value);

      // Update cache
      this.cache.set(keyName, decryptedValue);
      this.lastFetch.set(keyName, Date.now());

      return decryptedValue;
    } catch (error) {
      console.error(`❌ Error fetching API key ${keyName}:`, error.message);
      // Fallback to environment variable
      return process.env[keyName] || null;
    }
  }

  /**
   * Get multiple API keys at once
   * @param {string[]} keyNames - Array of key names
   * @returns {Promise<Object>} - Object with key names as properties
   */
  async getKeys(keyNames) {
    const result = {};
    
    for (const keyName of keyNames) {
      result[keyName] = await this.getKey(keyName);
    }
    
    return result;
  }

  /**
   * Check if cached value is still valid
   * @param {string} keyName - Name of the key
   * @returns {boolean}
   */
  isCacheValid(keyName) {
    if (!this.cache.has(keyName)) {
      return false;
    }

    const lastFetchTime = this.lastFetch.get(keyName);
    if (!lastFetchTime) {
      return false;
    }

    return (Date.now() - lastFetchTime) < this.cacheTimeout;
  }

  /**
   * Clear cache for a specific key or all keys
   * @param {string|null} keyName - Key name to clear, or null to clear all
   */
  clearCache(keyName = null) {
    if (keyName) {
      this.cache.delete(keyName);
      this.lastFetch.delete(keyName);
    } else {
      this.cache.clear();
      this.lastFetch.clear();
    }
  }

  /**
   * Get all Razorpay credentials
   * @returns {Promise<Object>}
   */
  async getRazorpayCredentials() {
    return await this.getKeys([
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET'
    ]);
  }

  /**
   * Get all AWS credentials
   * @returns {Promise<Object>}
   */
  async getAWSCredentials() {
    return await this.getKeys([
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_BUCKET_NAME'
    ]);
  }

  /**
   * Get all Email credentials
   * @returns {Promise<Object>}
   */
  async getEmailCredentials() {
    return await this.getKeys([
      'USER_GMAIL',
      'USER_PASSWORD'
    ]);
  }

  /**
   * Get JWT credentials
   * @returns {Promise<Object>}
   */
  async getJWTCredentials() {
    return await this.getKeys([
      'JWT_SECRET',
      'JWT_EXPIRATION'
    ]);
  }

  /**
   * Get Google Maps API key
   * @returns {Promise<string|null>}
   */
  async getGoogleMapsKey() {
    return await this.getKey('GOOGLE_MAPS_API_KEY');
  }

  /**
   * Refresh all cached keys from database
   */
  async refreshCache() {
    try {
      const [keys] = await pool.query(
        'SELECT key_name, key_value FROM payment_api_keys WHERE is_active = TRUE'
      );

      for (const key of keys) {
        try {
          const decryptedValue = encryption.decrypt(key.key_value);
          this.cache.set(key.key_name, decryptedValue);
          this.lastFetch.set(key.key_name, Date.now());
        } catch (error) {
          console.error(`Error decrypting key ${key.key_name}:`, error.message);
        }
      }

      console.log(`✅ Refreshed ${keys.length} API keys in cache`);
    } catch (error) {
      console.error('❌ Error refreshing API key cache:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new ApiKeyManager();
