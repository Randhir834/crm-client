// API Configuration
const API_CONFIG = {
  // Use environment variable if available, otherwise use production URL
  BASE_URL: process.env.REACT_APP_API_URL || 'https://crm-server1.onrender.com',
  
  // For local development, you can set REACT_APP_API_URL=http://localhost:5001 in .env file
  // For production, it will use the deployed server URL
};

export const API_BASE_URL = API_CONFIG.BASE_URL;

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export default API_CONFIG;
