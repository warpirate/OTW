// Global configuration for client-side environment variables
// This file centralizes access to environment variables used throughout the
// frontend application. Adjust the variable names if you change your .env keys.

// Environment detection
export const NODE_ENV = import.meta.env.MODE || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
export const API_URL = import.meta.env.VITE_API_URL || `${API_BASE_URL}/api`;

// Socket Configuration
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

// Google Maps API key for map services
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Environment-specific configuration
export const config = {
  api: {
    baseUrl: API_BASE_URL,
    url: API_URL,
    timeout: IS_PRODUCTION ? 30000 : 10000,
  },
  socket: {
    url: SOCKET_URL,
    options: {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    },
  },
  maps: {
    apiKey: GOOGLE_MAPS_API_KEY,
  },
  app: {
    name: 'OTW',
    version: '1.0.0',
    environment: NODE_ENV,
  },
};

export default config;