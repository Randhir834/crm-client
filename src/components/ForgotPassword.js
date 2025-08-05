import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
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
      const response = await axios.post('http://localhost:5001/api/auth/forgot-password', {
        email: email
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
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-background-overlay"></div>
        <div className="auth-background-pattern"></div>
        
        {/* Floating circles */}
        <div className="floating-circle-1"></div>
        <div className="floating-circle-2"></div>
        <div className="floating-circle-3"></div>
        
        {/* Animated particles */}
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        
        {/* Geometric shapes */}
        <div className="geometric-shape triangle"></div>
        <div className="geometric-shape square"></div>
        <div className="geometric-shape hexagon"></div>
        
        {/* Wave effects */}
        <div className="wave"></div>
        <div className="wave"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">
              <img 
                src={logoImage} 
                alt="innovatiQ Media Logo" 
                className="auth-logo-image"
                onLoad={() => console.log('Logo image loaded successfully')}
                onError={(e) => {
                  console.log('Logo image failed to load');
                  console.log('Image src:', e.target.src);
                }}
              />
            </div>
          </div>
          <h2>Forgot Password</h2>
          <p className="auth-subtitle">Enter your email to reset your password</p>
        </div>

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
  );
};

export default ForgotPassword; 