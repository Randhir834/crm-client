import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { getApiUrl } from '../config/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalLeads: 0,
    totalCustomers: 0,
    totalChats: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingUser, setUpdatingUser] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAdminData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Fetch system stats
      const statsResponse = await fetch(getApiUrl('api/auth/stats'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || {
          totalUsers: 0,
          activeUsers: 0,
          totalLeads: 0,
          totalCustomers: 0,
          totalChats: 0
        });
      } else {
        console.error('Failed to fetch stats:', statsResponse.status);
      }

      // Fetch all users with session data
      const usersResponse = await fetch(getApiUrl('api/sessions/all'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      } else {
        console.error('Failed to fetch users with sessions:', usersResponse.status);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data. Please try again.');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      setUpdatingUser(userId);
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/auth/users/${userId}/role`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId 
              ? { ...user, role: newRole }
              : user
          )
        );

      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role. Please try again.');
    } finally {
      setUpdatingUser(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return '0m';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getSessionStatus = (user) => {
    if (user.sessions?.current) {
      return (
        <span className="status-badge online">
          <span className="status-dot"></span>
          Online
        </span>
      );
    } else if (user.sessions?.lastCompleted) {
      return (
        <span className="status-badge offline">
          <span className="status-dot"></span>
          Offline
        </span>
      );
    } else {
      return (
        <span className="status-badge never-logged">
          <span className="status-dot"></span>
          Never Logged In
        </span>
      );
    }
  };

  const getLastActivity = (user) => {
    if (user.sessions?.current) {
      return formatDate(user.sessions.current.loginTime);
    } else if (user.sessions?.lastCompleted) {
      return formatDate(user.sessions.lastCompleted.logoutTime);
    } else {
      return 'Never';
    }
  };

  const getDailyUsage = (user) => {
    const dailyTime = user.sessions?.totalSessionTime || 0;
    return formatDuration(dailyTime);
  };

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading Admin Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Error Loading Dashboard</h2>
            <p>{error}</p>
            <button 
              className="btn-primary"
              onClick={fetchAdminData}
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h2>Admin Dashboard</h2>
            <p>System overview and user management for Innovatiq Media CRM</p>
          </div>
          <div className="header-actions">
            
          </div>
        </div>

        {/* System Statistics */}
        <div className="stats-grid">
          <div className="stat-card total-users">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <div className="stat-number">{stats.totalUsers}</div>
            </div>
          </div>

          <div className="stat-card active-users">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Active Users</h3>
              <div className="stat-number">{stats.activeUsers}</div>
            </div>
          </div>

          <div className="stat-card total-leads">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Leads</h3>
              <div className="stat-number">{stats.totalLeads}</div>
            </div>
          </div>

          <div className="stat-card total-customers">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Customers</h3>
              <div className="stat-number">{stats.totalCustomers}</div>
            </div>
          </div>

          <div className="stat-card total-chats">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Active Chats</h3>
              <div className="stat-number">{stats.totalChats}</div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="content-section">
          <div className="section-header">
            <div className="section-title">
              <h2>👥 User Management</h2>
              <p>Manage user roles and permissions • {users.length} total users</p>
            </div>
            <div className="section-actions">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/register', { state: { fromAdmin: true } })}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '16px', height: '16px', marginRight: '8px'}}>
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8c0-.55-.45-1-1-1s-1 .45-1 1v2H2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Registration
              </button>
            </div>
          </div>
          
          <div className="table-container">
            {users.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>First Login Time</th>
                    <th>Last Activity</th>
                    <th>Daily Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-name">
                          <div className="user-avatar">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          {user.name}
                        </div>
                      </td>
                      <td className="user-email">{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {getSessionStatus(user)}
                      </td>
                      <td>
                        <div className="activity-info">
                          <div className="activity-time">{formatDate(user.firstLoginTime)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="activity-info">
                          <div className="activity-time">{getLastActivity(user)}</div>
                          {user.sessions?.current && (
                            <div className="current-session">
                              <small>Current session: {formatDuration(Date.now() - new Date(user.sessions.current.loginTime).getTime())}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="usage-info">
                          <div className="daily-usage">{getDailyUsage(user)}</div>
                          {user.sessions?.lastCompleted && (
                            <div className="last-session">
                              <small>Last: {formatDuration(user.sessions.lastCompleted.duration)}</small>
                            </div>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No Users Found</h3>
                <p>There are no users in the system yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;