/**
 * Centralized API configuration for TerraMatch.
 * Reads the backend base URL from VITE_API_URL environment variable with localhost fallback.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
