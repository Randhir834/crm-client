import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios defaults
  axios.defaults.baseURL = `${API_BASE_URL}/api`;

  // Add token to requests if it exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Auto logout when user closes or navigates away from website
  useEffect(() => {
    const handleBeforeUnload = () => {
      // This will trigger when user closes tab/window
      const token = localStorage.getItem('token');
      if (token) {
        // Send logout request before page unload
        navigator.sendBeacon(`${API_BASE_URL}/api/auth/logout`, JSON.stringify({}));
      }
    };

    const handleVisibilityChange = () => {
      // This will trigger when user switches tabs or minimizes browser
      if (document.visibilityState === 'hidden') {
        const token = localStorage.getItem('token');
        if (token) {
          // Send logout request when page becomes hidden
          navigator.sendBeacon(`${API_BASE_URL}/api/auth/logout`, JSON.stringify({}));
          // Clear local storage and user state
          localStorage.removeItem('token');
          localStorage.removeItem('loginTime');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const register = async (userData) => {
    try {
      setError(null);
      await axios.post('/auth/register', userData);
      
      // Don't automatically log the user in after registration
      // Just return success without setting token or user
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (credentials) => {
    try {
  
      setError(null);
      
      const response = await axios.post('/auth/login', credentials);
      
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('loginTime', new Date().toISOString());
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint which will end session and update last logout time
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('/auth/logout');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('loginTime');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    token: localStorage.getItem('token') || null,
    register,
    login,
    logout,
    clearError,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 