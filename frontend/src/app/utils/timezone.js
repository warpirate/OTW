/**
 * Generic Timezone Utility for the entire application
 * Handles UTC to local timezone conversions consistently
 */

/**
 * Get the user's current timezone
 * @returns {string} The user's timezone (e.g., 'Asia/Kolkata')
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Convert UTC datetime string to local Date object
 * @param {string} utcDatetime - UTC datetime in various formats
 * @returns {Date|null} Local Date object or null if invalid
 */
export const convertUTCToLocal = (utcDatetime) => {
  if (!utcDatetime) return null;
  
  let utcDate;
  
  try {
    // Handle ISO format (2025-08-20T07:00:00.000Z)
    if (typeof utcDatetime === 'string' && utcDatetime.includes('T')) {
      utcDate = new Date(utcDatetime);
    }
    // Handle MySQL datetime format (YYYY-MM-DD HH:mm:ss) - assume UTC
    else if (typeof utcDatetime === 'string' && utcDatetime.includes(' ')) {
      // Convert MySQL datetime to ISO format and add Z for UTC
      const isoString = utcDatetime.replace(' ', 'T') + 'Z';
      utcDate = new Date(isoString);
    }
    // Handle other formats
    else {
      utcDate = new Date(utcDatetime);
    }
    
    // Validate the date
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid UTC datetime:', utcDatetime);
      return null;
    }
    
    return utcDate;
  } catch (error) {
    console.error('Error parsing UTC datetime:', utcDatetime, error);
    return null;
  }
};

/**
 * Format a UTC datetime to local timezone string
 * @param {string|Date} utcDatetime - UTC datetime
 * @param {Object} options - Formatting options
 * @returns {string|null} Formatted local datetime string
 */
export const formatToLocalDateTime = (utcDatetime, options = {}) => {
  const localDate = utcDatetime instanceof Date ? utcDatetime : convertUTCToLocal(utcDatetime);
  if (!localDate) return null;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getUserTimezone(),
    hour12: true
  };
  
  return localDate.toLocaleString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format a UTC datetime to local time only
 * @param {string|Date} utcDatetime - UTC datetime
 * @returns {string|null} Formatted local time string (e.g., "6:00 PM")
 */
export const formatToLocalTime = (utcDatetime) => {
  const localDate = utcDatetime instanceof Date ? utcDatetime : convertUTCToLocal(utcDatetime);
  if (!localDate) return null;
  
  return localDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: getUserTimezone()
  });
};

/**
 * Format a UTC datetime to local date only
 * @param {string|Date} utcDatetime - UTC datetime
 * @returns {string|null} Formatted local date string (e.g., "Aug 20, 2025")
 */
export const formatToLocalDate = (utcDatetime) => {
  const localDate = utcDatetime instanceof Date ? utcDatetime : convertUTCToLocal(utcDatetime);
  if (!localDate) return null;
  
  return localDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: getUserTimezone()
  });
};

/**
 * Get timezone offset information
 * @returns {Object} Timezone information
 */
export const getTimezoneInfo = () => {
  const timezone = getUserTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
  
  return {
    timezone,
    timeZoneName,
    offset: now.getTimezoneOffset()
  };
};

/**
 * Check if a datetime string is already formatted (to avoid double conversion)
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if already formatted
 */
export const isAlreadyFormatted = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Check for common formatted date patterns
  return dateString.includes(',') || 
         dateString.includes('AM') || 
         dateString.includes('PM') ||
         /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(dateString);
};

/**
 * Smart date formatter that handles both raw UTC and pre-formatted dates
 * @param {string|Date} dateInput - Date input to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const smartFormatDate = (dateInput, options = {}) => {
  if (!dateInput) return 'N/A';
  
  // If already formatted, return as is
  if (isAlreadyFormatted(dateInput)) {
    return dateInput;
  }
  
  // Otherwise, convert and format
  return formatToLocalDateTime(dateInput, options) || 'Invalid Date';
};

export default {
  getUserTimezone,
  convertUTCToLocal,
  formatToLocalDateTime,
  formatToLocalTime,
  formatToLocalDate,
  getTimezoneInfo,
  isAlreadyFormatted,
  smartFormatDate
};
