/**
 * Debug utility to test timezone conversion
 * Use this to verify that UTC conversion is working properly
 */

import { formatToLocalDateTime, formatToLocalTime, getUserTimezone, getTimezoneInfo } from './timezone';

// Test the timezone conversion with sample data
export const debugTimezoneConversion = () => {
  console.log('=== TIMEZONE DEBUG INFO ===');
  
  const timezoneInfo = getTimezoneInfo();
  console.log('Current Timezone:', timezoneInfo);
  
  // Test with sample UTC datetime (like what comes from database)
  const sampleUTCDateTime = '2025-08-20 12:30:00'; // This should be UTC
  const sampleISODateTime = '2025-08-20T12:30:00.000Z'; // This is definitely UTC
  
  console.log('Sample UTC DateTime (MySQL format):', sampleUTCDateTime);
  console.log('Sample ISO DateTime:', sampleISODateTime);
  
  const converted1 = formatToLocalDateTime(sampleUTCDateTime);
  const converted2 = formatToLocalDateTime(sampleISODateTime);
  
  console.log('Converted MySQL format to local:', converted1);
  console.log('Converted ISO format to local:', converted2);
  
  const time1 = formatToLocalTime(sampleUTCDateTime);
  const time2 = formatToLocalTime(sampleISODateTime);
  
  console.log('Time only (MySQL):', time1);
  console.log('Time only (ISO):', time2);
  
  // Expected: For IST (UTC+5:30), 12:30 UTC should become 18:00 (6:00 PM)
  console.log('Expected for IST: 12:30 UTC should show as 6:00 PM local');
  console.log('=== END TIMEZONE DEBUG ===');
};

// Call this function to debug
if (typeof window !== 'undefined') {
  window.debugTimezone = debugTimezoneConversion;
}

export default debugTimezoneConversion;
