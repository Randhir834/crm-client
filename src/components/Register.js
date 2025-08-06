import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';
import './Auth.css';
import logoImage from '../assets/logo.png';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);

  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we came from admin dashboard
  const isFromAdmin = location.state?.fromAdmin || document.referrer.includes('/admin');

  useEffect(() => {
    clearError();
    checkIfFirstUser();
  }, [clearError]);

  const checkIfFirstUser = async () => {
    try {
      const response = await fetch(getApiUrl('api/auth/check-first-user'));
      if (response.ok) {
        const data = await response.json();
        setIsFirstUser(data.isFirstUser);
        if (data.isFirstUser) {
          setFormData(prev => ({ ...prev, role: 'admin' }));
        }
      }
    } catch (error) {
      console.error('Error checking first user:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role
    });
    setIsSubmitting(false);

    if (result.success) {
      // Navigate back to admin dashboard if accessed from admin, otherwise to login
      if (isFromAdmin) {
        navigate('/admin');
      } else {
        navigate('/login');
      }
    }
  };

  return (
    <div className="login-two-column-container">
      <div className="login-left">
        {isFromAdmin && (
          <></>
        )}
        <div className="auth-header">
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 24}}>
            <svg width="64" height="64" viewBox="0 0 64 64" className="animated-svg-logo-register">
              <g>
                {/* User head */}
                <circle cx="32" cy="24" r="10" fill="#0ea5e9">
                  <animate attributeName="r" values="10;12;10" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.8;1" dur="1.4s" repeatCount="indefinite" />
                </circle>
                {/* User body */}
                <ellipse cx="32" cy="42" rx="16" ry="10" fill="#23272f" opacity="0.85">
                  <animate attributeName="rx" values="16;18;16" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.85;1;0.85" dur="1.4s" repeatCount="indefinite" />
                </ellipse>
                {/* Plus sign */}
                <g>
                  <rect x="44" y="36" width="12" height="4" rx="2" fill="#22c55e">
                    <animate attributeName="width" values="12;16;12" dur="1.4s" repeatCount="indefinite" />
                  </rect>
                  <rect x="49" y="31" width="4" height="14" rx="2" fill="#22c55e">
                    <animate attributeName="height" values="14;18;14" dur="1.4s" repeatCount="indefinite" />
                  </rect>
                </g>
              </g>
            </svg>
          </div>
          <h2>Create New Account</h2>
          <p className="auth-subtitle">
            {isFirstUser 
              ? 'Welcome! You\'re setting up the first admin account' 
              : 'Join us today'
            }
          </p>
        </div>
        {error && (
          <div className="error-message">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter your full name"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your password"
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? 'error' : ''}
              disabled={isFirstUser}
            >
              <option value="user">👤 User Account</option>
              <option value="admin">👑 Admin Account</option>
            </select>
            {errors.role && <span className="error-text">{errors.role}</span>}
            <div className="role-description">
              {isFirstUser && (
                <p className="role-info admin">
                  <strong>🎉 First User Setup:</strong> You're creating the first account in the system. 
                  This will automatically be an admin account with full system access.
                </p>
              )}
              {!isFirstUser && formData.role === 'user' && (
                <></>
              )}
              {!isFirstUser && formData.role === 'admin' && (
                <></>
              )}
            </div>
          </div>
          <button 
            type="submit" 
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
      <div className="login-right">
        <img src="/logo192.png" alt="Register Visual" className="login-animation-image register-animation-image" />
      </div>
    </div>
  );
};

export default Register; 