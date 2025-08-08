import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import './Auth.css';
import logoImage from '../assets/logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(getApiUrl('api/auth/forgot-password'), {
        email: email,
        clientUrl: window.location.origin
      });

      setMessage(response.data.message);
      setIsSuccess(true);
      setEmail('');
    } catch (error) {
      setError(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
    if (message) setMessage('');
  };

  return (
    <div className="login-two-column-container">
      <div className="login-left">
        <div className="login-left-center">
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 24}}>
            <svg width="64" height="64" viewBox="0 0 64 64" className="animated-svg-logo-dark">
              <g>
                {/* Shield shape */}
                <path d="M32 8 L56 20 V32 C56 48 32 56 32 56 C32 56 8 48 8 32 V20 Z" fill="#23272f" stroke="#0ea5e9" strokeWidth="3" />
                {/* Question mark */}
                <text x="32" y="38" textAnchor="middle" fontSize="24" fill="#fbbf24" fontWeight="bold">
                  ?
                  <animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="font-size" values="24;28;24" dur="1.2s" repeatCount="indefinite" />
                </text>
                {/* Glow effect */}
                <ellipse cx="32" cy="44" rx="10" ry="4" fill="#0ea5e9" opacity="0.15">
                  <animate attributeName="rx" values="10;14;10" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.3;0.15" dur="1.2s" repeatCount="indefinite" />
                </ellipse>
              </g>
            </svg>
          </div>
          <h2 style={{ textAlign: 'center', width: '100%' }}>Forgot Password?</h2>
          <p className="auth-subtitle" style={{ textAlign: 'center', width: '100%', marginBottom: 32 }}>
            Enter your email to reset your password
          </p>
          {error && (
            <div className="error-message">
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <span>{error}</span>
            </div>
          )}
          {isSuccess && message && (
            <div className="success-message">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span>{message}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <div className="label-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                Email Address
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                />
                <div className="input-border"></div>
              </div>
            </div>
            <button 
              type="submit" 
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Sending reset link...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Send Reset Link
                </>
              )}
            </button>
          </form>
          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="login-right">
        <img src="/logo192.png" alt="Forgot Visual" className="login-animation-image" />
      </div>
    </div>
  );
};

export default ForgotPassword; 