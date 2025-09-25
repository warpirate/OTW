/**
 * Database Retry Utility
 * Provides retry mechanisms with exponential backoff for database operations
 * Specifically handles lock timeout and connection timeout scenarios
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a database operation with exponential backoff
 * @param {Function} operation - The database operation to retry
 * @param {Object} options - Retry configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {Array<string>} options.retryableErrors - Error codes that should trigger a retry
 * @returns {Promise} - Result of the operation or throws the final error
 */
async function retryDatabaseOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryableErrors = [
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK', 
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ER_TOO_MANY_USER_CONNECTIONS'
    ]
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the operation
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if this error is retryable
      const isRetryable = retryableErrors.includes(error.code) || 
                         retryableErrors.includes(error.errno?.toString());
      
      // If this is the last attempt or error is not retryable, throw the error
      if (attempt === maxRetries || !isRetryable) {
        console.error(`Database operation failed after ${attempt + 1} attempts:`, {
          error: error.message,
          code: error.code,
          errno: error.errno,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      console.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, {
        error: error.message,
        code: error.code,
        errno: error.errno
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Wrapper for database transactions with retry logic
 * @param {Object} pool - Database connection pool
 * @param {Function} transactionFn - Function that performs the transaction
 * @param {Object} retryOptions - Retry configuration options
 * @returns {Promise} - Result of the transaction
 */
async function retryTransaction(pool, transactionFn, retryOptions = {}) {
  return retryDatabaseOperation(async () => {
    const connection = await pool.getConnection();
    
    try {
      // Set connection timeout to prevent long-running transactions
      await connection.query('SET SESSION innodb_lock_wait_timeout = 10');
      await connection.beginTransaction();
      
      const result = await transactionFn(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }, retryOptions);
}

/**
 * Wrapper for simple database queries with retry logic
 * @param {Object} pool - Database connection pool
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @param {Object} retryOptions - Retry configuration options
 * @returns {Promise} - Query result
 */
async function retryQuery(pool, query, params = [], retryOptions = {}) {
  return retryDatabaseOperation(async () => {
    const [result] = await pool.query(query, params);
    return result;
  }, retryOptions);
}

/**
 * Check if an error indicates no drivers are available
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error indicates no drivers available
 */
function isNoDriversError(error) {
  const noDriversIndicators = [
    'ER_LOCK_WAIT_TIMEOUT',
    'ER_LOCK_DEADLOCK'
  ];
  
  return noDriversIndicators.includes(error.code) || 
         noDriversIndicators.includes(error.errno?.toString());
}

/**
 * Check if an error indicates a temporary service issue
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error indicates temporary service issue
 */
function isTemporaryServiceError(error) {
  const temporaryErrorIndicators = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ER_TOO_MANY_USER_CONNECTIONS'
  ];
  
  return temporaryErrorIndicators.includes(error.code) || 
         temporaryErrorIndicators.includes(error.errno?.toString());
}

module.exports = {
  retryDatabaseOperation,
  retryTransaction,
  retryQuery,
  isNoDriversError,
  isTemporaryServiceError
};
