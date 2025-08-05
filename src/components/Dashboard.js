import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import './Dashboard.css';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    totalCalls: 0,
    conversionRate: 0,
    totalCustomers: 0,
    activeCustomers: 0
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
      const { leadId } = event.detail;
      // Update stats by reducing total and active leads count
      setStats(prevStats => ({
        ...prevStats,
        totalLeads: Math.max(0, prevStats.totalLeads - 1),
        activeLeads: Math.max(0, prevStats.activeLeads - 1)
      }));
      
      // Remove any activities related to the deleted lead
      setRecentActivity(prevActivities => 
        prevActivities.filter(activity => !activity.id.includes(leadId))
      );
    };
    
    // Listen for leads imported events from other components
    const handleLeadsImported = (event) => {
      const { count } = event.detail;
      // Update stats by increasing total and active leads count
      setStats(prevStats => ({
        ...prevStats,
        totalLeads: prevStats.totalLeads + count,
        activeLeads: prevStats.activeLeads + count
      }));
      
      // Refresh dashboard data to get updated activity feed
      fetchDashboardData();
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      const { leadId, newStatus } = event.detail;
      
      // Refresh dashboard data to get updated statistics and activity feed
      fetchDashboardData();
    };

    // Listen for customer events from other components
    const handleCustomerAdded = (event) => {
      // Refresh dashboard data to get updated statistics and activity feed
      fetchDashboardData();
    };

    const handleCustomerDeleted = (event) => {
      // Refresh dashboard data to get updated statistics and activity feed
      fetchDashboardData();
    };

    const handleCustomerStatusChanged = (event) => {
      // Refresh dashboard data to get updated statistics and activity feed
      fetchDashboardData();
    };
    
    window.addEventListener('leadDeleted', handleLeadDeleted);
    window.addEventListener('leadsImported', handleLeadsImported);
    window.addEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    window.addEventListener('customerAdded', handleCustomerAdded);
    window.addEventListener('customerDeleted', handleCustomerDeleted);
    window.addEventListener('customerStatusChanged', handleCustomerStatusChanged);
    
    return () => {
      window.removeEventListener('leadDeleted', handleLeadDeleted);
      window.removeEventListener('leadsImported', handleLeadsImported);
      window.removeEventListener('leadStatusUpdated', handleLeadStatusUpdated);
      window.removeEventListener('customerAdded', handleCustomerAdded);
      window.removeEventListener('customerDeleted', handleCustomerDeleted);
      window.removeEventListener('customerStatusChanged', handleCustomerStatusChanged);
    };
  }, []);

  // Fetch dashboard statistics and recent activity
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping dashboard data fetch');
        setIsLoading(false);
        return;
      }

      console.log('Fetching dashboard data...');

      // Fetch leads statistics
      const leadsStatsResponse = await axios.get(getApiUrl('api/leads/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch all leads for activity feed
      const leadsResponse = await axios.get(getApiUrl('api/leads?limit=1000'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch call schedules statistics
      const callsStatsResponse = await axios.get(getApiUrl('api/call-schedules/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch all call schedules for activity feed
      const callsResponse = await axios.get(getApiUrl('api/call-schedules'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch customers statistics
      const customersStatsResponse = await axios.get(getApiUrl('api/customers/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch all customers for activity feed
      const customersResponse = await axios.get(getApiUrl('api/customers'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (leadsStatsResponse.data && leadsResponse.data && callsStatsResponse.data && callsResponse.data && customersStatsResponse.data && customersResponse.data) {
        const leadsStats = leadsStatsResponse.data.stats || {};
        const leads = leadsResponse.data.leads || [];
        const callsStats = callsStatsResponse.data.stats || {};
        const calls = callsResponse.data.callSchedules || [];
        const customersStats = customersStatsResponse.data.stats || {};
        const customers = customersResponse.data.customers || [];
        
        console.log('API Responses:', {
          leadsStatsResponse: leadsStatsResponse.data,
          leadsResponse: leadsResponse.data,
          callsStatsResponse: callsStatsResponse.data,
          callsResponse: callsResponse.data,
          customersStatsResponse: customersStatsResponse.data,
          customersResponse: customersResponse.data
        });
        
        console.log('Processed data:', {
          leadsStats: leadsStats,
          callsStats: callsStats,
          customersStats: customersStats,
          leadsCount: leads.length,
          callsCount: calls.length,
          customersCount: customers.length,
          leadsSample: leads.slice(0, 2),
          callsSample: calls.slice(0, 2),
          customersSample: customers.slice(0, 2)
        });
        
        // Calculate statistics using stats data
        const totalLeads = leadsStats.total || 0;
        const activeLeads = (leadsStats.new || 0) + (leadsStats.qualified || 0) + (leadsStats.negotiation || 0);
        
        const totalCalls = callsStats.total || calls.length;
        const completedCalls = callsStats.completed || calls.filter(call => call.status === 'Completed').length;
        const conversionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
        const totalCustomers = customersStats.total || customers.length;
        const activeCustomers = customersStats.active || customers.filter(customer => customer.status === 'active').length;
        
        console.log('Calculated stats:', {
          totalLeads,
          activeLeads,
          totalCalls,
          completedCalls,
          conversionRate,
          totalCustomers,
          activeCustomers,
          leadsStats,
          callsStats,
          customersStats
        });

        setStats({
          totalLeads,
          activeLeads,
          totalCalls,
          conversionRate,
          totalCustomers,
          activeCustomers
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
            details: `${lead.company || 'No company'} • ${lead.email}`,
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

        // Add call activities
        calls.forEach(call => {
          // Call scheduled
          activities.push({
            id: `call_${call._id}`,
            type: 'call_scheduled',
            message: `Call scheduled with ${call.leadId?.name || 'Lead'}`,
            time: new Date(call.createdAt || call.created_at || Date.now()),
            details: `${formatDate(call.scheduledDate)} at ${call.scheduledTime}`,
            status: call.status
          });

          // Call status changes
          if (call.status !== 'Scheduled') {
            activities.push({
              id: `call_status_${call._id}`,
              type: 'call_completed',
              message: `Call with ${call.leadId?.name || 'Lead'} ${call.status.toLowerCase()}`,
              time: new Date(call.updatedAt || call.updated_at || call.createdAt || call.created_at || Date.now()),
              details: `Status: ${call.status}`,
              status: call.status
            });
          }
        });

        // Add customer activities
        customers.forEach(customer => {
          // New customer added
          activities.push({
            id: `customer_${customer._id}`,
            type: 'customer_added',
            message: `New customer "${customer.name}" added`,
            time: new Date(customer.createdAt || customer.created_at || Date.now()),
            details: `${customer.company || 'No company'} • ${customer.email}`,
            status: customer.status
          });

          // Customer conversion from lead
          if (customer.convertedFrom && customer.convertedFrom.leadId) {
            activities.push({
              id: `conversion_${customer._id}`,
              type: 'lead_updated',
              message: `Lead converted to customer: "${customer.name}"`,
              time: new Date(customer.convertedFrom.convertedAt || customer.createdAt || customer.created_at || Date.now()),
              details: `Converted from qualified lead • ${customer.email}`,
              status: 'Converted'
            });
          }
        });

        // Add upcoming call reminders
        const now = new Date();
        calls.filter(call => call.status === 'Scheduled').forEach(call => {
          const callDate = new Date(call.scheduledDate);
          const [hours, minutes] = call.scheduledTime.split(':');
          callDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          const timeDiff = callDate.getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          // Show upcoming calls within next 24 hours
          if (timeDiff > 0 && hoursDiff <= 24) {
            activities.push({
              id: `upcoming_${call._id}`,
              type: 'call_upcoming',
              message: `Upcoming call with ${call.leadId?.name || 'Lead'}`,
              time: callDate,
              details: `In ${Math.ceil(hoursDiff)} hours • ${call.scheduledTime}`,
              status: 'upcoming'
            });
          }
        });

        // Sort by time and take most recent 8 activities
        const allActivity = activities
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 8);

        console.log('Generated activities:', allActivity);

        // If no activities found, add some fallback activities
        if (allActivity.length === 0) {
          const fallbackActivities = [
            {
              id: 'welcome_1',
              type: 'system_update',
              message: 'Welcome to Innovatiq Media CRM!',
              time: new Date(),
              details: 'Start by adding leads and scheduling calls',
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
          
          if (totalCalls > 0) {
            fallbackActivities.push({
              id: 'calls_1',
              type: 'call_scheduled',
              message: `You have ${totalCalls} scheduled calls`,
              time: new Date(Date.now() - 7200000), // 2 hours ago
              details: `${completedCalls} completed • ${totalCalls - completedCalls} pending`,
              status: 'active'
            });
          }
          
          if (totalCustomers > 0) {
            fallbackActivities.push({
              id: 'customers_1',
              type: 'customer_added',
              message: `You have ${totalCustomers} customers`,
              time: new Date(Date.now() - 10800000), // 3 hours ago
              details: `${activeCustomers} active • ${totalCustomers - activeCustomers} inactive`,
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
        activeLeads: 0,
        totalCalls: 0,
        conversionRate: 0,
        totalCustomers: 0,
        activeCustomers: 0
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
        console.log('Fetching session info...');
        

        
        const response = await axios.get(getApiUrl('api/sessions/stats'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const { currentSession, totalSessionTime, last24HoursUsage, lastLogoutTime } = response.data.stats;
          
          console.log('Session stats received:', {
            currentSession,
            totalSessionTime,
            last24HoursUsage,
            lastLogoutTime: lastLogoutTime ? new Date(lastLogoutTime) : null
          });
          
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
        console.log('No token found, using fallback data');
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
          
          console.log('Session updates received:', {
            currentSession,
            lastLogoutTime: lastLogoutTime ? new Date(lastLogoutTime) : null,
            last24HoursUsage
          });
          
          setSessionInfo(prev => {
            const newLastLogoutTime = lastLogoutTime ? new Date(lastLogoutTime) : prev.lastLogoutTime;
            
            // Check if last logout time changed
            if (prev.lastLogoutTime && newLastLogoutTime && 
                prev.lastLogoutTime.getTime() !== newLastLogoutTime.getTime()) {
              console.log('Last logout time changed from', prev.lastLogoutTime, 'to', newLastLogoutTime);
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
          console.log('Notification permission granted');
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
      case 'call_scheduled':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        );
      case 'call_completed':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        );
      case 'call_upcoming':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'customer_added':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
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
        <div className="dashboard-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading Dashboard...</p>
          </div>
        </div>
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

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Calls</h3>
              <p className="stat-number">{stats.totalCalls}</p>
              <span className="stat-change positive">Scheduled calls</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Conversion Rate</h3>
              <p className="stat-number">{stats.conversionRate}%</p>
              <span className="stat-change positive">Call completion rate</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Customers</h3>
              <p className="stat-number">{stats.totalCustomers}</p>
              <span className="stat-change positive">{stats.activeCustomers} active customers</span>
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
                  <span>Activities will appear here as you work with your Innovatiq Media leads and calls</span>
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