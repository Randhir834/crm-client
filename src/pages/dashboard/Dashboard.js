import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/layout/Layout';
import { LoadingSpinner } from '../../components/ui';
import '../../styles/global.css';
import './Dashboard.css';
import axios from 'axios';
import { getApiUrl } from '../../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState({
    loginTime: null,
    currentDuration: 0,
    totalSessionTime: 0,
    last24HoursUsage: 0,
    lastLogoutTime: null,
    lastUpdated: null
  });
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();

    // Fetch session information
    fetchSessionInfo();
    
    // Request notification permissions
    requestNotificationPermission();
    
    // Listen for lead deletion events from other components
    const handleLeadDeleted = (event) => {
      // Update stats by reducing total and active leads count
      setStats(prevStats => ({
        ...prevStats,
        totalLeads: Math.max(0, prevStats.totalLeads - 1),
        activeLeads: Math.max(0, prevStats.activeLeads - 1)
      }));
      
      // Remove any activities related to the deleted lead
      setRecentActivity(prevActivities => 
        prevActivities.filter(activity => !activity.id.includes(event.detail.leadId))
      );
    };
    
    // Listen for leads imported events from other components
    const handleLeadsImported = (event) => {
      // Update stats by increasing total and active leads count
      setStats(prevStats => ({
        ...prevStats,
        totalLeads: prevStats.totalLeads + event.detail.count,
        activeLeads: prevStats.activeLeads + event.detail.count
      }));
      
      // Refresh dashboard data to get updated activity feed
      fetchDashboardData();
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      // Refresh dashboard data to get updated statistics and activity feed
      fetchDashboardData();
    };
    
    window.addEventListener('leadDeleted', handleLeadDeleted);
    window.addEventListener('leadsImported', handleLeadsImported);
    window.addEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    
    return () => {
      window.removeEventListener('leadDeleted', handleLeadDeleted);
      window.removeEventListener('leadsImported', handleLeadsImported);
      window.removeEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    };
  }, []);

  // Fetch dashboard statistics and recent activity
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Fetch leads statistics
      const leadsStatsResponse = await axios.get(getApiUrl('api/leads/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });



      // Fetch all leads for activity feed
      const leadsResponse = await axios.get(getApiUrl('api/leads?limit=10000'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (leadsStatsResponse.data && leadsResponse.data) {
        const leadsStats = leadsStatsResponse.data.stats || {};
        const leads = leadsResponse.data.leads || [];
        
        // Calculate statistics using stats data
        const totalLeads = leadsStats.total || 0;
        const activeLeads = (leadsStats.new || 0) + (leadsStats.qualified || 0) + (leadsStats.negotiation || 0);

        setStats({
          totalLeads,
          activeLeads
        });

              

        // Generate comprehensive recent activity
        const activities = [];

        // Add lead activities
        leads.forEach(lead => {
          // New lead added
          activities.push({
            id: `lead_${lead._id}`,
            type: 'lead_added',
            message: `New lead "${lead.name}" added`,
            time: new Date(lead.createdAt || lead.created_at || Date.now()),
            details: `Lead added`,
            status: lead.status
          });

          // Lead status changes (if updated recently)
          if (lead.updatedAt || lead.updated_at) {
            const updatedAt = new Date(lead.updatedAt || lead.updated_at);
            const createdAt = new Date(lead.createdAt || lead.created_at || Date.now());
            
            if (updatedAt.getTime() !== createdAt.getTime()) {
              activities.push({
                id: `lead_update_${lead._id}`,
                type: 'lead_updated',
                message: `Lead "${lead.name}" status updated`,
                time: updatedAt,
                details: `Status: ${lead.status}`,
                status: lead.status
              });
            }
          }
        });

        // Sort by time and take most recent 8 activities
        const allActivity = activities
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 8);

        // If no activities found, add some fallback activities
        if (allActivity.length === 0) {
          const fallbackActivities = [
            {
              id: 'welcome_1',
              type: 'system_update',
              message: 'Welcome to Innovatiq Media CRM!',
              time: new Date(),
              details: 'Start by adding leads to your pipeline',
              status: 'active'
            }
          ];
          
          if (totalLeads > 0) {
            fallbackActivities.push({
              id: 'stats_1',
              type: 'lead_added',
              message: `You have ${totalLeads} leads in your Innovatiq Media pipeline`,
              time: new Date(Date.now() - 3600000), // 1 hour ago
              details: `${activeLeads} active leads • ${totalLeads - activeLeads} completed`,
              status: 'active'
            });
          }
          
          setRecentActivity(fallbackActivities);
        } else {
          setRecentActivity(allActivity);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      // Set fallback data
      setStats({
        totalLeads: 0,
        activeLeads: 0
      });
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up periodic refresh of session info and dashboard data
  useEffect(() => {
    const sessionInterval = setInterval(() => {
      fetchSessionUpdates();
    }, 10000); // Refresh every 10 seconds for real-time updates

    const dashboardInterval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // Refresh dashboard data every 30 seconds

    return () => {
      clearInterval(sessionInterval);
      clearInterval(dashboardInterval);
    };
  }, []);

  // Fetch session information
  const fetchSessionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
    
        

        
        const response = await axios.get(getApiUrl('api/sessions/stats'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const { currentSession, totalSessionTime, last24HoursUsage, lastLogoutTime } = response.data.stats;
          

          
          setSessionInfo({
            loginTime: currentSession ? new Date(currentSession.loginTime) : null,
            currentDuration: currentSession ? currentSession.duration : 0,
            totalSessionTime: totalSessionTime || 0,
            last24HoursUsage: last24HoursUsage || 0,
            lastLogoutTime: lastLogoutTime ? new Date(lastLogoutTime) : null,
            lastUpdated: new Date()
          });
        }
      } else {

        // Fallback: use localStorage login time if no session data
        const loginTime = localStorage.getItem('loginTime');
        if (loginTime) {
          const loginDate = new Date(loginTime);
          const currentDuration = Date.now() - loginDate.getTime();
          setSessionInfo({
            loginTime: loginDate,
            currentDuration: currentDuration,
            totalSessionTime: 0,
            last24HoursUsage: 0,
            lastLogoutTime: null,
            lastUpdated: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching session info:', error);
      // Fallback: use localStorage login time if API fails
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime) {
        const loginDate = new Date(loginTime);
        const currentDuration = Date.now() - loginDate.getTime();
        setSessionInfo({
          loginTime: loginDate,
          currentDuration: currentDuration,
          totalSessionTime: 0,
          last24HoursUsage: 0,
          lastLogoutTime: null,
          lastUpdated: new Date()
        });
      }
    }
  };

  // Fetch real-time session updates
  const fetchSessionUpdates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get(getApiUrl('api/sessions/updates'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const { currentSession, lastLogoutTime, last24HoursUsage } = response.data.updates;
          

          
          setSessionInfo(prev => {
            const newLastLogoutTime = lastLogoutTime ? new Date(lastLogoutTime) : prev.lastLogoutTime;
            
            // Check if last logout time changed
            if (prev.lastLogoutTime && newLastLogoutTime && 
                prev.lastLogoutTime.getTime() !== newLastLogoutTime.getTime()) {

              setShowNotification(true);
              // Hide notification after 5 seconds
              setTimeout(() => setShowNotification(false), 5000);
            }
            
            return {
              ...prev,
              loginTime: currentSession ? new Date(currentSession.loginTime) : prev.loginTime,
              currentDuration: currentSession ? currentSession.duration : prev.currentDuration,
              last24HoursUsage: last24HoursUsage || prev.last24HoursUsage,
              lastLogoutTime: newLastLogoutTime,
              lastUpdated: new Date()
            };
          });
        }
      }
    } catch (error) {
      console.error('Error fetching session updates:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
      
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };



  // Update current session duration every second
  useEffect(() => {
    if (sessionInfo.loginTime) {
      const interval = setInterval(() => {
        setSessionInfo(prev => ({
          ...prev,
          currentDuration: Date.now() - prev.loginTime.getTime()
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sessionInfo.loginTime]);

  // Format duration helper function
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0m 0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format time helper function
  const formatTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format relative time helper function
  const formatRelativeTime = (date) => {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const activityDate = new Date(date);
    const diffInSeconds = Math.floor((now - activityDate) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return activityDate.toLocaleDateString();
    }
  };

  // Format date and time helper function (commented out as not currently used)
  // const formatDateTime = (date) => {
  //   if (!date) return 'Never';
  //   return new Date(date).toLocaleString('en-US', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //     hour12: true
  //   });
  // };



  const getActivityIcon = (type) => {
    switch (type) {
      case 'lead_added':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        );
      case 'lead_updated':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        );
      case 'report_generated':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        );
      case 'system_update':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading Dashboard..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">
        {/* Notification for logout time update */}
        {showNotification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            border: '1px solid #c3e6cb',
            animation: 'slideIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Last logout time updated!</span>
            </div>
          </div>
        )}
        {/* Welcome Section */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h2>Welcome back, {user && user.name}! 👋</h2>
            <p>Here's what's happening with your Innovatiq Media business today.</p>
          </div>

          {/* Actions Box */}
          <div className="header-actions-box">
            <div className="actions-card">
              <div className="actions-content">
                <div className="action-item">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div className="action-details">
                    <span className="action-label">Login Time</span>
                    <span className="action-value">
                      {sessionInfo.loginTime ? formatTime(sessionInfo.loginTime) : 'Loading...'}
                    </span>
                  </div>
                </div>
                
                <div className="action-item">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="action-details">
                    <span className="action-label">Current Duration</span>
                    <span className="action-value">
                      {sessionInfo.loginTime ? formatDuration(sessionInfo.currentDuration) : '0m 0s'}
                    </span>
                  </div>
                </div>
                

              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Leads</h3>
              <p className="stat-number">{stats.totalLeads}</p>
              <span className="stat-change positive">Active leads in your pipeline</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Active Leads</h3>
              <p className="stat-number">{stats.activeLeads}</p>
              <span className="stat-change positive">Leads in progress</span>
            </div>
          </div>
        </div>



        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                      <p className="activity-message">{activity.message}</p>
                      {activity.details && (
                        <p className="activity-details">{activity.details}</p>
                      )}
                      <span className="activity-time">
                        {formatRelativeTime(activity.time)}
                      </span>
                    </div>
                    {activity.status && (
                      <div className="activity-status">
                        <span className={`status-badge status-${activity.status.toLowerCase()}`}>
                          {activity.status}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-activity">
                  <div className="empty-icon">📊</div>
                  <p>No recent activity</p>
                  <span>Activities will appear here as you work with your Innovatiq Media leads</span>
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;