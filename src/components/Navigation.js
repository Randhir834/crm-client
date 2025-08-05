import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';
import logoImage from '../assets/logo.png';

const Navigation = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Function to get the dynamic title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return isAdmin ? 'Innovatiq Media CRM - Admin Dashboard' : 'Innovatiq Media CRM';
      case '/admin':
        return 'Innovatiq Media CRM - Admin Dashboard';
      case '/leads':
        return 'Innovatiq Media CRM - Leads';
      case '/call-schedule':
        return 'Innovatiq Media CRM - Call Schedule';
      case '/customers':
        return 'Innovatiq Media CRM - Customers';
      case '/chat':
        return 'Innovatiq Media CRM - Chat';
      case '/reports':
        return 'Innovatiq Media CRM - Reports';
      default:
        return 'Innovatiq Media CRM';
    }
  };

  return (
    <nav className="app-navigation">
      <div className="nav-left">
        <div className="nav-brand">
          <div className="brand-logo">
            <img src={logoImage} alt="Innovatiq Media CRM" className="logo-image" />
          </div>
          <h1>{getPageTitle().replace(/^[^\w]*/,'')}</h1>
        </div>
      </div>
      
      <div className="nav-center">
        <div className="nav-menu">
          {isAdmin && (
            <button 
              className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              Admin
            </button>
          )}
          <button 
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-item ${isActive('/leads') ? 'active' : ''}`}
            onClick={() => navigate('/leads')}
          >
            Leads
          </button>
          <button 
            className={`nav-item ${isActive('/call-schedule') ? 'active' : ''}`}
            onClick={() => navigate('/call-schedule')}
          >
            Call Schedule
          </button>
          <button 
            className={`nav-item ${isActive('/customers') ? 'active' : ''}`}
            onClick={() => navigate('/customers')}
          >
            Customers
          </button>
          <button 
            className={`nav-item ${isActive('/chat') ? 'active' : ''}`}
            onClick={() => navigate('/chat')}
          >
            Chat
          </button>

          
        </div>
      </div>

      <div className="nav-right">
        <div className="user-menu">
          <div className="user-avatar">
            <span>{user && user.name && user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="user-info">
            <span className="user-name">{user && user.name}</span>
            <span className="user-role">{user && user.role ? user.role : 'User'}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 