// API Configuration
const API_CONFIG = {
  // Using localhost for development - environment variable commented out
  BASE_URL: 'http://localhost:5001',
  
  // For local development, we're using localhost:5001
  // REACT_APP_API_URL environment variable is commented out
};

export const API_BASE_URL = API_CONFIG.BASE_URL;

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export default API_CONFIG;
