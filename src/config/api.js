// API Configuration
const API_CONFIG = {
  // Use environment variable if available, otherwise use localhost for development
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  
  // For local development, we're using localhost:5001 by default
  // For production, set REACT_APP_API_URL to the deployed server URL
};

export const API_BASE_URL = API_CONFIG.BASE_URL;

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export default API_CONFIG;
