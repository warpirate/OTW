// Global configuration for client-side environment variables
// This file centralizes access to environment variables used throughout the
// frontend application. Adjust the variable names if you change your .env keys.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';
