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
        prevActivities.filter(activity => !activity.leadId || activity.leadId !== event.detail.leadId)
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
      
      // Add import activity to recent activity
      const importActivity = {
        id: `import_${Date.now()}`,
        type: 'lead_added',
        message: `${event.detail.count} leads imported`,
        time: new Date(),
        details: `Bulk import completed successfully`,
        status: 'active'
      };
      
      setRecentActivity(prevActivities => [importActivity, ...prevActivities.slice(0, 9)]);
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      // Refresh dashboard data to get updated statistics and activity feed
      fetchDashboardData();
    };

    // Listen for call completion events
    const handleCallCompleted = (event) => {
      const { leadId, leadName, duration } = event.detail;
      
      const callActivity = {
        id: `call_completed_${Date.now()}`,
        type: 'call_completed',
        message: `Call completed with "${leadName}"`,
        time: new Date(),
        details: `Call duration: ${formatDuration(duration || 0)}`,
        status: 'completed',
        leadId: leadId
      };
      
      setRecentActivity(prevActivities => [callActivity, ...prevActivities.slice(0, 9)]);
    };

    // Listen for follow-up scheduling events
    const handleFollowUpScheduled = (event) => {
      const { leadId, leadName, followUpDate } = event.detail;
      
      const followUpActivity = {
        id: `followup_scheduled_${Date.now()}`,
        type: 'followup_scheduled',
        message: `Follow-up scheduled for "${leadName}"`,
        time: new Date(),
        details: `Follow-up date: ${new Date(followUpDate).toLocaleDateString()}`,
        status: 'scheduled',
        leadId: leadId
      };
      
      setRecentActivity(prevActivities => [followUpActivity, ...prevActivities.slice(0, 9)]);
    };

    // Listen for notes added events
    const handleNotesAdded = (event) => {
      const { leadId, leadName, notes } = event.detail;
      
      const notesActivity = {
        id: `notes_added_${Date.now()}`,
        type: 'notes_added',
        message: `Notes added to "${leadName}"`,
        time: new Date(),
        details: `Notes: ${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}`,
        status: 'active',
        leadId: leadId
      };
      
      setRecentActivity(prevActivities => [notesActivity, ...prevActivities.slice(0, 9)]);
    };

    // Listen for lead assignment events
    const handleLeadAssigned = (event) => {
      const { leadId, leadName, assignedTo } = event.detail;
      
      const assignmentActivity = {
        id: `lead_assigned_${Date.now()}`,
        type: 'lead_assigned',
        message: `Lead "${leadName}" assigned`,
        time: new Date(),
        details: `Assigned to: ${assignedTo}`,
        status: 'active',
        leadId: leadId
      };
      
      setRecentActivity(prevActivities => [assignmentActivity, ...prevActivities.slice(0, 9)]);
    };
    
    window.addEventListener('leadDeleted', handleLeadDeleted);
    window.addEventListener('leadsImported', handleLeadsImported);
    window.addEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    window.addEventListener('callCompleted', handleCallCompleted);
    window.addEventListener('followUpScheduled', handleFollowUpScheduled);
    window.addEventListener('notesAdded', handleNotesAdded);
    window.addEventListener('leadAssigned', handleLeadAssigned);
    
    return () => {
      window.removeEventListener('leadDeleted', handleLeadDeleted);
      window.removeEventListener('leadsImported', handleLeadsImported);
      window.removeEventListener('leadStatusUpdated', handleLeadStatusUpdated);
      window.removeEventListener('callCompleted', handleCallCompleted);
      window.removeEventListener('followUpScheduled', handleFollowUpScheduled);
      window.removeEventListener('notesAdded', handleNotesAdded);
      window.removeEventListener('leadAssigned', handleLeadAssigned);
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
            details: `Phone: ${lead.phone} • Status: ${lead.status}`,
            status: lead.status,
            leadId: lead._id
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
                details: `Status changed to: ${lead.status}`,
                status: lead.status,
                leadId: lead._id
              });
            }
          }

          // Lead assignment (if assigned to someone)
          if (lead.assignedTo && lead.assignedTo !== lead.createdBy) {
            activities.push({
              id: `lead_assigned_${lead._id}`,
              type: 'lead_assigned',
              message: `Lead "${lead.name}" assigned`,
              time: new Date(lead.updatedAt || lead.updated_at || Date.now()),
              details: `Assigned to team member`,
              status: lead.status,
              leadId: lead._id
            });
          }

          // Notes added (if lead has notes)
          if (lead.notes && lead.notes.trim()) {
            activities.push({
              id: `lead_notes_${lead._id}`,
              type: 'notes_added',
              message: `Notes added to "${lead.name}"`,
              time: new Date(lead.updatedAt || lead.updated_at || Date.now()),
              details: `Notes: ${lead.notes.substring(0, 50)}${lead.notes.length > 50 ? '...' : ''}`,
              status: lead.status,
              leadId: lead._id
            });
          }

          // Call completion status (if callCompleted field exists)
          if (lead.callCompleted) {
            activities.push({
              id: `call_completed_${lead._id}`,
              type: 'call_completed',
              message: `Call completed with "${lead.name}"`,
              time: new Date(lead.updatedAt || lead.updated_at || Date.now()),
              details: `Call marked as completed`,
              status: 'completed',
              leadId: lead._id
            });
          }

          // Follow-up scheduling (if followUpDate field exists)
          if (lead.followUpDate) {
            activities.push({
              id: `followup_scheduled_${lead._id}`,
              type: 'followup_scheduled',
              message: `Follow-up scheduled for "${lead.name}"`,
              time: new Date(lead.followUpDate),
              details: `Follow-up date: ${new Date(lead.followUpDate).toLocaleDateString()}`,
              status: 'scheduled',
              leadId: lead._id
            });
          }

          // Service information (if service field exists)
          if (lead.service) {
            activities.push({
              id: `service_added_${lead._id}`,
              type: 'service_added',
              message: `Service "${lead.service}" added to "${lead.name}"`,
              time: new Date(lead.updatedAt || lead.updated_at || Date.now()),
              details: `Service: ${lead.service}`,
              status: lead.status,
              leadId: lead._id
            });
          }
        });

        // Add system activities
        if (totalLeads > 0) {
          activities.push({
            id: 'system_stats',
            type: 'system_update',
            message: `Pipeline Overview`,
            time: new Date(Date.now() - 1800000), // 30 minutes ago
            details: `${totalLeads} total leads • ${activeLeads} active • ${totalLeads - activeLeads} completed`,
            status: 'active'
          });
        }

        // Sort by time and take most recent 10 activities (increased from 8)
        const allActivity = activities
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 10);

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
      case 'lead_assigned':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-3.7 3.7V22h8zm-8 0v-6h-3l3-3h.5c.28 0 .5.22.5.5V16h2.5V22h-3z"/>
          </svg>
        );
      case 'notes_added':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        );
      case 'call_completed':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
        );
      case 'followup_scheduled':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        );
      case 'service_added':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
              <div className="activity-filters">
                <span className="activity-count">{recentActivity.length} activities</span>
              </div>
            </div>
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item" 
                       onClick={() => activity.leadId ? window.location.href = `/leads/${activity.leadId}` : null}>
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
                    {activity.leadId && (
                      <div className="activity-action">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
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