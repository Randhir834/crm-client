import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './Navigation';
import CallNotification from './CallNotification';
import axios from 'axios';
import './Layout.css';

const Layout = ({ children }) => {
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [notificationsToShow, setNotificationsToShow] = useState([]);
  const [shownNotificationIds, setShownNotificationIds] = useState(new Set());

  const fetchUpcomingCalls = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/call-schedules/upcoming', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setUpcomingCalls(response.data.callSchedules);
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming calls:', error);
    }
  }, []);

  const checkAndShowNotifications = useCallback(() => {
    const now = new Date();
    upcomingCalls.forEach(call => {
      // Parse the scheduled date and time
      const callDate = new Date(call.scheduledDate);
      const [hours, minutes] = call.scheduledTime.split(':');
      callDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const timeDiff = callDate.getTime() - now.getTime();

      // Check if the call is within the next 2 minutes (120,000 ms) and hasn't been shown
      if (timeDiff > 0 && timeDiff <= 120000 && !shownNotificationIds.has(call._id)) {
        // Add to notifications to be displayed
        setNotificationsToShow(prev => [...prev, call]);
        
        // Mark as shown to prevent re-triggering
        setShownNotificationIds(prev => new Set(prev).add(call._id));

        // Optional: Show a browser notification if permission is granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Upcoming Call', {
            body: `You have a scheduled call with ${call.leadId.name} in a moment.`,
            icon: '/favicon.ico'
          });
        }
      }
    });
  }, [upcomingCalls, shownNotificationIds]);

  // Main effect for fetching and checking notifications
  useEffect(() => {
    fetchUpcomingCalls(); // Fetch on initial load

    // Listen for call schedule events
    const handleCallScheduleCreated = (event) => {
  
      fetchUpcomingCalls();
    };
    
    const handleCallScheduleDeleted = (event) => {
  
      fetchUpcomingCalls();
    };
    
    // Add event listeners
    window.addEventListener('callScheduleCreated', handleCallScheduleCreated);
    window.addEventListener('callScheduleDeleted', handleCallScheduleDeleted);

    // Periodically fetch for new or updated call schedules
    const fetchInterval = setInterval(fetchUpcomingCalls, 60000); // every 1 minute

    // Periodically check for notifications
    const checkInterval = setInterval(checkAndShowNotifications, 10000); // every 10 seconds

    return () => {
      clearInterval(fetchInterval);
      clearInterval(checkInterval);
      window.removeEventListener('callScheduleCreated', handleCallScheduleCreated);
      window.removeEventListener('callScheduleDeleted', handleCallScheduleDeleted);
    };
  }, [fetchUpcomingCalls, checkAndShowNotifications]);

  const handleCloseNotification = (callId) => {
    // Remove the notification from the screen
    setNotificationsToShow(prev => prev.filter(c => c._id !== callId));
  };

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        {children}
      </main>

      {/* Render notifications */}
      {notificationsToShow.map(call => (
        <CallNotification
          key={call._id}
          call={call}
          onClose={() => handleCloseNotification(call._id)}
          onDismiss={() => handleCloseNotification(call._id)}
        />
      ))}
    </div>
  );
};

export default Layout;