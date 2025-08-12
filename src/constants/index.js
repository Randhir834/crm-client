// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    USERS: '/api/auth/users',
    STATS: '/api/auth/stats',
  },
  LEADS: {
    BASE: '/api/leads',
    STATS: '/api/leads/stats',
    EXPORT: '/api/leads/export/excel',
  },
  SESSIONS: {
    BASE: '/api/sessions',
    ALL: '/api/sessions/all',
  },
  IMPORTANT_POINTS: {
    BASE: '/api/important-points',
  },
};

// Lead statuses
export const LEAD_STATUSES = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  NEGOTIATION: 'Negotiation',
  CLOSED: 'Closed',
  LOST: 'Lost',
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// App routes
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  LEADS: '/leads',
};

// Validation rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  PHONE_MAX_LENGTH: 20,
}; 