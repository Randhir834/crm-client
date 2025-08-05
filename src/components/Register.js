import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

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
      const response = await fetch('http://localhost:5001/api/auth/check-first-user');
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
    <div className="auth-container">
      <div className="auth-card">
        {isFromAdmin && (
          <div className="back-button-container">
            <button 
              type="button" 
              className="back-button"
              onClick={() => navigate('/admin')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '16px', height: '16px', marginRight: '8px'}}>
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
              </svg>
              Back to Admin Dashboard
            </button>
          </div>
        )}
        <h2>Create New Account</h2>
        <p className="auth-subtitle">
          {isFirstUser 
            ? 'Welcome! You\'re setting up the first admin account' 
            : 'Join us today'
          }
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
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
                <p className="role-info">
                  <strong>User Account:</strong> Access to your own leads, customers, and chats. 
                  Perfect for sales representatives and team members.
                </p>
              )}
              {!isFirstUser && formData.role === 'admin' && (
                <p className="role-info admin">
                  <strong>Admin Account:</strong> Full system access including user management, 
                  system statistics, and all data. For system administrators only.
                </p>
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

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 