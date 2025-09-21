// Global configuration for client-side environment variables
// This file centralizes access to environment variables used throughout the
// frontend application. Adjust the variable names if you change your .env keys.

import { config } from './environments';

// Prefer Vite env var if provided; otherwise fall back to environment config.
// IMPORTANT: This should be the server root (without "/api") because
// individual services append their own "/api/..." paths.
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL) 
  || (config && config.backend && config.backend.url) 
  || 'https://api.omwhub.com';
