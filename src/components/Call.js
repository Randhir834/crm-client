import React, { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import { getApiUrl } from '../config/api';
import './Dashboard.css';

// Add custom styles for auto-scheduled indicator
const autoScheduledStyles = `
  .auto-scheduled-indicator {
    display: none !important;
  }
  
  .auto-scheduled-indicator::before {
    content: "🔽 LOW PRIORITY";
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: #e74c3c;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: bold;
    white-space: nowrap;
  }
  
  .auto-scheduled-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 1;
  }
  
  .edit-auto-scheduled-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s ease;
    margin-left: 8px;
  }
  
  .edit-auto-scheduled-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  .countdown-timer {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    margin-left: 6px;
    font-weight: 500;
  }
  
  /* High priority styling when call is due soon or overdue */
  .auto-scheduled-indicator.high-priority {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
    opacity: 1;
    animation: urgent-pulse 1s infinite;
  }
  
  .auto-scheduled-indicator.high-priority::before {
    content: "🔥 HIGH PRIORITY";
    background: #f39c12;
  }
  
  @keyframes urgent-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  /* Make lead cards adjust size according to content */
  .lead-card {
    height: auto !important;
    min-height: 200px;
    display: flex;
    flex-direction: column;
  }
  
  .lead-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .lead-points {
    flex: 1;
    min-height: 60px;
  }
  
  .points-content {
    max-height: none;
    overflow: visible;
  }
  
  .residual-call-section {
    margin-top: auto;
    padding-top: 15px;
  }
  
  .scheduled-calls-list {
    max-height: none;
    overflow: visible;
  }
  
  .scheduled-call-item {
    margin-bottom: 10px;
  }
  
  /* Ensure proper spacing between elements */
  .lead-card-header,
  .lead-card-content,
  .lead-card-actions {
    padding: 15px;
  }
  
  .lead-card-header {
    padding-bottom: 10px;
  }
  
  .lead-card-content {
    padding-top: 10px;
    padding-bottom: 10px;
  }
  
  .lead-card-actions {
    padding-top: 10px;
    margin-top: auto;
  }
`;

const Call = () => {
  const [leads, setLeads] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(new Set());
  const [importantPoints, setImportantPoints] = useState({});
  const [editingPoints, setEditingPoints] = useState(new Set());
  const [tempPoints, setTempPoints] = useState({});
  const [loadingPoints, setLoadingPoints] = useState(new Set());
  const [creatingPoint, setCreatingPoint] = useState(new Set());
  const [updatingPoint, setUpdatingPoint] = useState(new Set());
  const [deletingPoint, setDeletingPoint] = useState(new Set());
  const [scheduledCalls, setScheduledCalls] = useState({});
  const [callStatus, setCallStatus] = useState({});
  const [showResidualCallForm, setShowResidualCallForm] = useState({});
  const [residualCallData, setResidualCallData] = useState({});
  const [creatingScheduledCall, setCreatingScheduledCall] = useState(new Set());
  const [forceUpdate, setForceUpdate] = useState(0);
  const [countdowns, setCountdowns] = useState({});

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const now = new Date();
        const newCountdowns = {};
        
        Object.entries(scheduledCalls).forEach(([leadId, calls]) => {
          try {
            const autoScheduledCall = calls.find(call => 
              call.notes === 'Auto-scheduled after call not connected' && 
              call.status === 'pending'
            );
            
            if (autoScheduledCall) {
              const timeLeft = new Date(autoScheduledCall.scheduledTime) - now;
              if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                newCountdowns[leadId] = `${hours}h ${minutes}m`;
                
                // Show notification when call is due in 15 minutes or less
                if (timeLeft <= 15 * 60 * 1000 && timeLeft > 0) {
                  const lead = leads.find(l => l._id === leadId);
                  if (lead && !lead.notificationShown) {
                    // Show browser notification if supported
                    if ('Notification' in window && Notification.permission === 'granted') {
                      try {
                        new Notification('Call Reminder', {
                          body: `Time to call ${lead.name || 'lead'} - scheduled call is due soon!`,
                          icon: '/favicon.ico'
                        });
                      } catch (notificationError) {
                        console.warn('Failed to show notification:', notificationError);
                      }
                    }
                    
                    // Mark notification as shown to avoid spam
                    setLeads(prev => prev.map(l => 
                      l._id === leadId ? { ...l, notificationShown: true } : l
                    ));
                  }
                }
              } else {
                newCountdowns[leadId] = 'Overdue';
              }
            }
          } catch (leadError) {
            // Silent error handling for individual lead processing
            console.warn('Error processing lead countdown:', leadId, leadError);
          }
        });
        
        setCountdowns(newCountdowns);
      } catch (error) {
        // Silent error handling for countdown timer
        console.warn('Countdown timer error:', error);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [scheduledCalls, leads]);

  // Handle call connected
  const handleCallConnected = async (leadId) => {
    try {
      // Update call status locally
      setCallStatus(prev => ({ ...prev, [leadId]: 'connected' }));
      
      // Mark the lead as completed in the backend
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/leads/${leadId}/complete-call`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          callStatus: 'completed',
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Remove the lead from the active leads list
        setLeads(prev => prev.filter(lead => lead._id !== leadId));
        
        // Remove from scheduled calls if any
        setScheduledCalls(prev => {
          const newScheduledCalls = { ...prev };
          delete newScheduledCalls[leadId];
          return newScheduledCalls;
        });
        
        // Remove from call status
        setCallStatus(prev => {
          const newCallStatus = { ...prev };
          delete newCallStatus[leadId];
          return newCallStatus;
        });
        
      } else {
        console.error('Failed to complete call:', response.status);
        alert('Failed to complete call. Please try again.');
      }
    } catch (error) {
      console.error('Error completing call:', error);
      alert('Error completing call. Please try again.');
    }
  };

  // Handle call not connected
  const handleCallNotConnected = async (leadId) => {
    try {
      // Ask user for confirmation before auto-scheduling
      const confirmed = window.confirm(
        'Call not connected. Would you like to automatically schedule a follow-up call for 2 hours later?'
      );
      
      if (!confirmed) {
        // Just update the call status locally without scheduling
        setCallStatus(prev => ({ ...prev, [leadId]: 'not_connected' }));
        return;
      }
      
      // Update call status locally immediately for better UX
      setCallStatus(prev => ({ ...prev, [leadId]: 'not_connected' }));
      
      // Call the backend to automatically schedule a call for 2 hours later
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/leads/${leadId}/call-not-connected`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message with scheduled time
        const scheduledTime = new Date(result.scheduledTime);
        const timeString = scheduledTime.toLocaleString();
        alert(`✅ Call not connected!\n\n📞 Follow-up call automatically scheduled for:\n${timeString}\n\nYou'll be notified 15 minutes before the scheduled time.`);
        
        // IMMEDIATELY update local scheduledCalls state to trigger re-sorting
        const newScheduledCall = {
          _id: result.scheduledCall._id,
          leadId: leadId,
          scheduledTime: result.scheduledTime,
          status: 'pending',
          notes: 'Auto-scheduled after call not connected',
          createdBy: result.scheduledCall.createdBy,
          createdAt: result.scheduledCall.createdAt,
          updatedAt: result.scheduledCall.updatedAt
        };
        
        setScheduledCalls(prev => ({
          ...prev,
          [leadId]: [...(prev[leadId] || []), newScheduledCall]
        }));
        
        // Force immediate re-render to update priority sorting
        setForceUpdate(prev => prev + 1);
        
        // Also refresh scheduled calls for this lead to ensure consistency
        try {
          await fetchScheduledCallsForLead(leadId, true);
        } catch (refreshError) {
          // Silent error handling for refresh - don't show to user
          console.warn('Silent refresh failed for lead:', leadId, refreshError);
        }
        
      } else {
        console.error('Failed to handle call not connected:', response.status);
        // Show user-friendly error message
        alert('Call marked as not connected, but there was an issue scheduling the follow-up call. You can manually schedule it later.');
      }
    } catch (error) {
      console.error('Error handling call not connected:', error);
      // Show user-friendly error message
      alert('Call marked as not connected, but there was an issue scheduling the follow-up call. You can manually schedule it later.');
    }
  };

  // Handle residual call form toggle
  const toggleResidualCallForm = (leadId) => {
    setShowResidualCallForm(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
    
    if (!showResidualCallForm[leadId]) {
      // Pre-fill with auto-scheduled time if available
      const leadScheduledCalls = scheduledCalls[leadId] || [];
      const autoScheduledCall = leadScheduledCalls.find(call => 
        call.notes === 'Auto-scheduled after call not connected' && 
        call.status === 'pending'
      );
      
      let defaultTime = '';
      if (autoScheduledCall) {
        // Format the date for datetime-local input
        const date = new Date(autoScheduledCall.scheduledTime);
        defaultTime = date.toISOString().slice(0, 16);
      }
      
      setResidualCallData(prev => ({
        ...prev,
        [leadId]: {
          scheduledTime: defaultTime
        }
      }));
    }
  };

  // Handle residual call data change
  const handleResidualCallDataChange = (leadId, field, value) => {
    setResidualCallData(prev => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        [field]: value
      }
    }));
  };

  // Create scheduled call
  const createScheduledCall = async (leadId) => {
    const data = residualCallData[leadId];
    
    if (!data.scheduledTime) {
      alert('Please select a time for the residual call');
      return;
    }

    if (creatingScheduledCall.has(leadId)) return;

    setCreatingScheduledCall(prev => new Set(prev).add(leadId));

    try {
      const token = localStorage.getItem('token');
      
      // Check if there's an existing auto-scheduled call to update
      const leadScheduledCalls = scheduledCalls[leadId] || [];
      const existingAutoScheduledCall = leadScheduledCalls.find(call => 
        call.notes === 'Auto-scheduled after call not connected' && 
        call.status === 'pending'
      );
      
      let response;
      if (existingAutoScheduledCall) {
        // Update existing auto-scheduled call
        response = await fetch(getApiUrl(`api/scheduled-calls/${existingAutoScheduledCall._id}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scheduledTime: data.scheduledTime,
            notes: 'Auto-scheduled after call not connected (updated)'
          })
        });
      } else {
        // Create new scheduled call
        response = await fetch(getApiUrl('api/scheduled-calls'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            leadId,
            scheduledTime: data.scheduledTime,
            notes: ''
          })
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        // Refresh scheduled calls for this lead
        await fetchScheduledCallsForLead(leadId);
        
        // Hide form and clear data
        setShowResidualCallForm(prev => ({
          ...prev,
          [leadId]: false
        }));
        
        setResidualCallData(prev => {
          const newData = { ...prev };
          delete newData[leadId];
          return newData;
        });

        // Force re-render to update priority sorting
        setForceUpdate(prev => prev + 1);

      } else {
        console.error('Failed to create/update scheduled call:', response.status);
        alert('Failed to schedule call. Please try again.');
      }
    } catch (error) {
      console.error('Error creating/updating scheduled call:', error);
      alert('Error scheduling call. Please try again.');
    } finally {
      setCreatingScheduledCall(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  // Fetch scheduled calls for a lead
  const fetchScheduledCallsForLead = async (leadId, silent = false, retryCount = 0) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/scheduled-calls/lead/${leadId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledCalls(prev => ({
          ...prev,
          [leadId]: data.scheduledCalls || []
        }));
        
        // Trigger priority update after loading scheduled calls
        // This ensures proper sorting after page refresh
        if (!silent) {
          setTimeout(() => {
            setForceUpdate(prev => prev + 1);
          }, 50);
        }
      } else {
        if (!silent) {
          console.error(`Failed to fetch scheduled calls for lead ${leadId}:`, response.status);
        }
        
        // Retry logic for silent calls (auto-refresh)
        if (silent && retryCount < 2) {
          setTimeout(() => {
            fetchScheduledCallsForLead(leadId, true, retryCount + 1);
          }, 5000); // Wait 5 seconds before retry
        }
      }
    } catch (error) {
      if (!silent) {
        console.error(`Error fetching scheduled calls for lead ${leadId}:`, error);
      }
      
      // Retry logic for silent calls (auto-refresh)
      if (silent && retryCount < 2) {
        setTimeout(() => {
          fetchScheduledCallsForLead(leadId, true, retryCount + 1);
        }, 5000); // Wait 5 seconds before retry
      }
    }
  };

  // Delete scheduled call
  const deleteScheduledCall = async (leadId, scheduledCallId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled call?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/scheduled-calls/${scheduledCallId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setScheduledCalls(prev => ({
          ...prev,
          [leadId]: prev[leadId].filter(call => call._id !== scheduledCallId)
        }));

      } else {
        console.error('Failed to delete scheduled call:', response.status);
        alert('Failed to delete scheduled call. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting scheduled call:', error);
      alert('Error deleting scheduled call. Please try again.');
    }
  };


  // Fetch leads from API
  const fetchLeads = useCallback(async (silent = false, retryCount = 0) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads?limit=10000'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const leadsData = data.leads || [];
        
        setLeads(leadsData);
        
        // Fetch important points for all leads (only if not silent)
        if (!silent) {
          await fetchImportantPointsForLeads(leadsData);
        }
        
        // Fetch scheduled calls for all leads (always needed for priority sorting)
        await Promise.all(leadsData.map(lead => fetchScheduledCallsForLead(lead._id, silent)));
        
        // Force priority recalculation after loading all data
        // This ensures proper sorting after page refresh
        if (!silent) {
          setTimeout(() => {
            setForceUpdate(prev => prev + 1);
            console.log('Forcing priority recalculation after loading all data');
          }, 200);
        }
      } else {
        if (!silent) {
          console.error('Failed to fetch leads:', response.status, response.statusText);
        }
        
        // Retry logic for silent calls (auto-refresh)
        if (silent && retryCount < 2) {
          setTimeout(() => {
            fetchLeads(true, retryCount + 1);
          }, 10000); // Wait 10 seconds before retry
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Error fetching leads:', error);
      }
      
      // Retry logic for silent calls (auto-refresh)
      if (silent && retryCount < 2) {
        setTimeout(() => {
          fetchLeads(true, retryCount + 1);
        }, 10000); // Wait 10 seconds before retry
      }
    } finally {
      // Only set initialLoad to false on the first load, not during silent refreshes
      if (!silent) {
        setInitialLoad(false);
      }
    }
  }, []);

  // Fetch important points for all leads
  const fetchImportantPointsForLeads = async (leadsData) => {
    try {
      const token = localStorage.getItem('token');
      const pointsPromises = leadsData.map(async (lead) => {
        setLoadingPoints(prev => new Set(prev).add(lead._id));
        
        try {
          const response = await fetch(getApiUrl(`api/important-points/lead/${lead._id}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            return { leadId: lead._id, points: data.importantPoints || [] };
          } else {
            console.error(`Failed to fetch points for lead ${lead._id}:`, response.status);
            return { leadId: lead._id, points: [] };
          }
        } catch (error) {
          console.error(`Error fetching points for lead ${lead._id}:`, error);
          return { leadId: lead._id, points: [] };
        } finally {
          setLoadingPoints(prev => {
            const newSet = new Set(prev);
            newSet.delete(lead._id);
            return newSet;
          });
        }
      });

      const pointsResults = await Promise.all(pointsPromises);
      const pointsMap = {};
      pointsResults.forEach(result => {
        pointsMap[result.leadId] = result.points;
      });

      setImportantPoints(pointsMap);
    } catch (error) {
      console.error('Error fetching important points:', error);
    }
  };

  // Initialize leads on component mount
  useEffect(() => {
    fetchLeads();
    
    // Request notification permission for call reminders
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [fetchLeads]);

  // Immediate priority check when component mounts
  useEffect(() => {
    if (leads.length > 0 && Object.keys(scheduledCalls).length > 0) {
      // Check if any auto-scheduled calls are due immediately
      const now = new Date();
      let needsImmediateUpdate = false;
      
      Object.entries(scheduledCalls).forEach(([leadId, calls]) => {
        const autoScheduledCall = calls.find(call => 
          (call.notes === 'Auto-scheduled after call not connected' || 
           call.notes === 'Auto-scheduled after call not connected (updated)') && 
          call.status === 'pending'
        );
        
        if (autoScheduledCall) {
          const callTime = new Date(autoScheduledCall.scheduledTime);
          const timeDiff = callTime - now;
          const minutesDiff = Math.floor(timeDiff / (1000 * 60));
          
          // If call is due within 30 minutes or overdue, it needs immediate priority update
          if (minutesDiff <= 30) {
            needsImmediateUpdate = true;
          }
        }
      });
      
      // Force immediate re-render if priority needs updating
      if (needsImmediateUpdate) {
        setForceUpdate(prev => prev + 1);
      }
      
      // Always force a re-render after initial load to ensure proper sorting
      // This fixes the issue where auto-scheduled calls don't get proper priority after refresh
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 100); // Small delay to ensure all data is loaded
    }
  }, [leads, scheduledCalls]);

  // Additional priority recalculation after scheduled calls are fully loaded
  useEffect(() => {
    if (leads.length > 0 && Object.keys(scheduledCalls).length > 0) {
      // Wait a bit more to ensure all data is properly loaded
      const timer = setTimeout(() => {
        // Force a re-render to ensure proper priority sorting
        setForceUpdate(prev => prev + 1);
      }, 500); // 500ms delay to ensure complete data loading

      return () => clearTimeout(timer);
    }
  }, [leads, scheduledCalls]);

  // Comprehensive priority initialization after all data is loaded
  useEffect(() => {
    if (leads.length > 0 && Object.keys(scheduledCalls).length > 0 && !initialLoad) {
      // This runs after the initial load is complete
      const timer = setTimeout(() => {
        // Check if any auto-scheduled calls need priority updates
        const now = new Date();
        let needsPriorityUpdate = false;
        
        Object.entries(scheduledCalls).forEach(([leadId, calls]) => {
          const autoScheduledCall = calls.find(call => 
            (call.notes === 'Auto-scheduled after call not connected' || 
             call.notes === 'Auto-scheduled after call not connected (updated)') && 
            call.status === 'pending'
          );
          
          if (autoScheduledCall) {
            const callTime = new Date(autoScheduledCall.scheduledTime);
            const timeDiff = callTime - now;
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));
            
            // If call is due within 30 minutes or overdue, it needs priority update
            if (minutesDiff <= 30) {
              needsPriorityUpdate = true;
            }
          }
        });
        
        // Force re-render to ensure proper priority sorting
        if (needsPriorityUpdate) {
          setForceUpdate(prev => prev + 1);
        }
        
        // Always force one more re-render to ensure proper sorting after refresh
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
        }, 200);
      }, 1000); // 1 second delay to ensure all data is fully processed

      return () => clearTimeout(timer);
    }
  }, [leads, scheduledCalls, initialLoad]);

  // Immediate priority check on mount - more aggressive approach
  useEffect(() => {
    if (leads.length > 0 && Object.keys(scheduledCalls).length > 0) {
      // Force immediate priority calculation
      setForceUpdate(prev => prev + 1);
      
      // Additional checks with delays to ensure proper sorting
      const timers = [
        setTimeout(() => setForceUpdate(prev => prev + 1), 100),
        setTimeout(() => setForceUpdate(prev => prev + 1), 500),
        setTimeout(() => setForceUpdate(prev => prev + 1), 1000),
        setTimeout(() => setForceUpdate(prev => prev + 1), 2000)
      ];
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [leads, scheduledCalls]);

  // Manual priority recalculation function
  const recalculatePriorities = useCallback(() => {
    console.log('Manually recalculating priorities...');
    setForceUpdate(prev => prev + 1);
  }, []);

  // Expose the function globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.recalculatePriorities = recalculatePriorities;
    }
  }, [recalculatePriorities]);

  // Check scheduled call times every minute to update priority
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update sorting when time changes
      setForceUpdate(prev => prev + 1);
    }, 30000); // Check every 30 seconds for more responsive updates

    return () => clearInterval(interval);
  }, [scheduledCalls]);

  // Silent auto-refresh for leads data
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        // Silently refresh leads data in the background
        await fetchLeads(true); // true = silent mode
      } catch (error) {
        // Silent error handling for background refresh
        console.warn('Silent leads refresh failed:', error);
      }
    }, 120000); // Refresh every 2 minutes to avoid overwhelming the server

    return () => clearInterval(refreshInterval);
  }, [fetchLeads]);

  // More frequent priority updates for better user experience
  useEffect(() => {
    const priorityInterval = setInterval(() => {
      // Update priority sorting more frequently without fetching new data
      setForceUpdate(prev => prev + 1);
    }, 15000); // Check every 15 seconds for priority updates

    return () => clearInterval(priorityInterval);
  }, []);

  // Very frequent time check to catch scheduled times immediately
  useEffect(() => {
    const timeCheckInterval = setInterval(() => {
      try {
        // Check if any scheduled calls have reached their time
        const now = new Date();
        let needsUpdate = false;
        
        Object.entries(scheduledCalls).forEach(([leadId, calls]) => {
          const pendingCalls = calls.filter(call => call.status === 'pending');
          pendingCalls.forEach(call => {
            const callTime = new Date(call.scheduledTime);
            if (callTime <= now && !call.isOverdue) {
              // Mark this call as overdue for immediate visual update
              call.isOverdue = true;
              needsUpdate = true;
            }
          });
        });
        
        // Force re-render if any calls became overdue
        if (needsUpdate) {
          setForceUpdate(prev => prev + 1);
        }
      } catch (error) {
        // Silent error handling for time check
        console.warn('Time check failed:', error);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timeCheckInterval);
  }, [scheduledCalls, leads]);

  // Refresh scheduled calls data more frequently to detect time changes
  useEffect(() => {
    const scheduledCallsInterval = setInterval(async () => {
      // Only refresh if we have leads
      if (leads.length > 0) {
        try {
          // Silently refresh scheduled calls for all leads to check timing
          await Promise.all(leads.map(lead => fetchScheduledCallsForLead(lead._id, true)));
          // Force re-render to update priority sorting
          setForceUpdate(prev => prev + 1);
        } catch (error) {
          // Silent error handling for background refresh
          console.warn('Silent scheduled calls refresh failed:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(scheduledCallsInterval);
  }, [leads, fetchScheduledCallsForLead]);

  // Special effect for auto-scheduled call priority updates
  useEffect(() => {
    const autoSchedulePriorityInterval = setInterval(() => {
      try {
        const now = new Date();
        let needsPriorityUpdate = false;
        
        // Check if any auto-scheduled calls have become due or overdue
        Object.entries(scheduledCalls).forEach(([leadId, calls]) => {
          const autoScheduledCall = calls.find(call => 
            (call.notes === 'Auto-scheduled after call not connected' || 
             call.notes === 'Auto-scheduled after call not connected (updated)') && 
            call.status === 'pending'
          );
          
          if (autoScheduledCall) {
            const callTime = new Date(autoScheduledCall.scheduledTime);
            const timeDiff = callTime - now;
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));
            
            // If call is due within 30 minutes or overdue, it should be high priority
            if (minutesDiff <= 30) {
              needsPriorityUpdate = true;
            }
          }
        });
        
        // Force re-render if priority needs updating
        if (needsPriorityUpdate) {
          setForceUpdate(prev => prev + 1);
        }
      } catch (error) {
        // Silent error handling for priority updates
        console.warn('Auto-schedule priority update failed:', error);
      }
    }, 10000); // Check every 10 seconds for priority updates

    return () => clearInterval(autoSchedulePriorityInterval);
  }, [scheduledCalls]);

  // Refresh data when page becomes visible (user returns from another tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && leads.length > 0) {
        // Page became visible, refresh scheduled calls to check timing
        try {
          await Promise.all(leads.map(lead => fetchScheduledCallsForLead(lead._id, true)));
          setForceUpdate(prev => prev + 1);
        } catch (error) {
          // Silent error handling for visibility change refresh
          console.warn('Visibility change refresh failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [leads, fetchScheduledCallsForLead]);

  // Sort leads based on scheduled call priority
  const getSortedLeads = () => {
    // Use forceUpdate to ensure this function recalculates when time changes
    const _ = forceUpdate;
    
    if (!leads.length || !scheduledCalls) return [];
    
    const sortedLeads = [...leads].sort((a, b) => {
      const aScheduledCalls = scheduledCalls[a._id] || [];
      const bScheduledCalls = scheduledCalls[b._id] || [];
      
      const now = new Date();
      
      // Get the next pending scheduled call for each lead
      const aNextCall = aScheduledCalls
        .filter(call => call.status === 'pending')
        .sort((x, y) => new Date(x.scheduledTime) - new Date(y.scheduledTime))[0];
      
      const bNextCall = bScheduledCalls
        .filter(call => call.status === 'pending')
        .sort((x, y) => new Date(x.scheduledTime) - new Date(y.scheduledTime))[0];
      
      // Check if leads have overdue calls (scheduled time has passed)
      const aIsOverdue = aNextCall && new Date(aNextCall.scheduledTime) <= now;
      const bIsOverdue = bNextCall && new Date(bNextCall.scheduledTime) <= now;
      
      // Priority 1: Overdue calls go to the top (earliest overdue first)
      if (aIsOverdue && bIsOverdue) {
        return new Date(aNextCall.scheduledTime) - new Date(bNextCall.scheduledTime);
      }
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;
      
      // Priority 2: Leads without scheduled calls (normal priority)
      if (!aNextCall && !bNextCall) return 0;
      if (!aNextCall && bNextCall) return -1;
      if (aNextCall && !bNextCall) return 1;
      
      // Priority 3: Future scheduled calls - IMPROVED LOGIC
      const aTime = new Date(aNextCall.scheduledTime);
      const bTime = new Date(bNextCall.scheduledTime);
      
      // Check if either call is an auto-scheduled call
      const aIsAutoScheduled = aNextCall.notes === 'Auto-scheduled after call not connected' || 
                               aNextCall.notes === 'Auto-scheduled after call not connected (updated)';
      const bIsAutoScheduled = bNextCall.notes === 'Auto-scheduled after call not connected' || 
                               bNextCall.notes === 'Auto-scheduled after call not connected (updated)';
      
      // Calculate time differences for priority
      const aTimeDiff = aTime - now;
      const bTimeDiff = bTime - now;
      const aMinutesDiff = Math.floor(aTimeDiff / (1000 * 60));
      const bMinutesDiff = Math.floor(bTimeDiff / (1000 * 60));
      
      // Debug logging for auto-scheduled calls
      if (aIsAutoScheduled || bIsAutoScheduled) {
        console.log('Priority calculation:', {
          leadA: a.name || a._id,
          leadB: b.name || b._id,
          aIsAutoScheduled,
          bIsAutoScheduled,
          aMinutesDiff,
          bMinutesDiff,
          aTime: aTime.toLocaleString(),
          bTime: bTime.toLocaleString()
        });
      }
      
      // If both are auto-scheduled, sort by urgency (due soonest first)
      if (aIsAutoScheduled && bIsAutoScheduled) {
        // If one is due within 30 minutes, it gets higher priority
        if (aMinutesDiff <= 30 && bMinutesDiff > 30) return -1;
        if (bMinutesDiff <= 30 && aMinutesDiff > 30) return 1;
        // Otherwise sort by time (earliest first)
        return aTime - bTime;
      }
      
      // If only one is auto-scheduled, check if it's due soon
      if (aIsAutoScheduled && !bIsAutoScheduled) {
        // Auto-scheduled call gets higher priority if due within 30 minutes
        if (aMinutesDiff <= 30) return -1;
        // Otherwise goes to bottom
        return 1;
      }
      if (!aIsAutoScheduled && bIsAutoScheduled) {
        // Auto-scheduled call gets higher priority if due within 30 minutes
        if (bMinutesDiff <= 30) return 1;
        // Otherwise goes to bottom
        return -1;
      }
      
      // If neither is auto-scheduled, sort by time (earliest first)
      return aTime - bTime;
    });
    
    return sortedLeads;
  };

  // Get priority status for a lead
  const getLeadPriority = (leadId) => {
    if (!scheduledCalls) return { status: 'normal', text: 'Loading...' };
    
    const leadScheduledCalls = scheduledCalls[leadId] || [];
    if (leadScheduledCalls.length === 0) return { status: 'normal', text: 'No scheduled calls' };
    
    const now = new Date();
    const nextCall = leadScheduledCalls
      .filter(call => call.status === 'pending')
      .sort((x, y) => new Date(x.scheduledTime) - new Date(y.scheduledTime))[0];
    
    if (!nextCall) return { status: 'normal', text: 'No pending calls' };
    
    const callTime = new Date(nextCall.scheduledTime);
    const timeDiff = callTime - now;
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    
    // Check if this is an auto-scheduled call
    const isAutoScheduled = nextCall.notes === 'Auto-scheduled after call not connected' || 
                           nextCall.notes === 'Auto-scheduled after call not connected (updated)';
    
    if (callTime <= now) {
      return { 
        status: 'urgent', 
        text: `Overdue: ${Math.abs(minutesDiff)} min ago`,
        minutes: -Math.abs(minutesDiff)
      };
    } else if (minutesDiff <= 30) {
      return { 
        status: 'soon', 
        text: `Due in ${minutesDiff} min`,
        minutes: minutesDiff
      };
    } else if (isAutoScheduled) {
      return { 
        status: 'scheduled', 
        text: `Auto-scheduled for ${callTime.toLocaleTimeString()} (Low Priority)`,
        minutes: minutesDiff
      };
    } else {
      return { 
        status: 'scheduled', 
        text: `Scheduled for ${callTime.toLocaleTimeString()}`,
        minutes: minutesDiff
      };
    }
  };

  // Handle status change
  const handleStatusChange = async (leadId, newStatus) => {
    if (updatingStatus.has(leadId)) return;
    
    setUpdatingStatus(prev => new Set(prev).add(leadId));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/leads/${leadId}/status`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead._id === leadId 
              ? { ...lead, status: newStatus }
              : lead
          )
        );
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('leadStatusUpdated', {
          detail: { leadId, newStatus }
        }));
        
      } else {
        console.error('Failed to update lead status:', response.status);
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };



  // Handle editing points
  const handleEditPoints = (leadId, currentPoints) => {
    setEditingPoints(prev => new Set(prev).add(leadId));
    setTempPoints(prev => ({ ...prev, [leadId]: currentPoints || '' }));
  };

  // Handle creating a new important point
  const handleCreatePoint = async (leadId) => {
    const combinedContent = tempPoints[`new_${leadId}`] || '';
    
    if (!combinedContent.trim()) {
      alert('Please enter some content for the important points');
      return;
    }

    if (creatingPoint.has(leadId)) return;

    setCreatingPoint(prev => new Set(prev).add(leadId));

    try {
      const token = localStorage.getItem('token');
      
      // Split content by newlines and filter out empty lines
      const allPoints = combinedContent
        .split('\n')
        .map(point => point.trim())
        .filter(point => point.length > 0);
      
      // Clear existing points from local state first
      setImportantPoints(prev => ({
        ...prev,
        [leadId]: []
      }));
      
      // Delete all existing points from database
      const existingPoints = importantPoints[leadId] || [];
      for (const point of existingPoints) {
        try {
          await fetch(getApiUrl(`api/important-points/${point._id}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Error deleting existing point:', error);
        }
      }
      
      // Create new points with ONLY the current content from textarea
      const newPoints = [];
      for (const content of allPoints) {
        try {
          const response = await fetch(getApiUrl('api/important-points'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ leadId, content })
          });

          if (response.ok) {
            const data = await response.json();
            newPoints.push(data.importantPoint);
          } else {
            console.error('Failed to create important point:', response.status);
            alert(`Failed to create point: "${content}". Please try again.`);
          }
        } catch (error) {
          console.error('Error creating important point:', error);
          alert(`Error creating point: "${content}". Please try again.`);
        }
      }
      
      // Update local state with ONLY the new points
      setImportantPoints(prev => ({
        ...prev,
        [leadId]: newPoints
      }));

      // Clear temp points
      setTempPoints(prev => {
        const newTemp = { ...prev };
        delete newTemp[`new_${leadId}`];
        return newTemp;
      });

    } catch (error) {
      console.error('Error handling important points:', error);
      alert('Error handling important points. Please try again.');
    } finally {
      setCreatingPoint(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  // Handle updating an important point
  const handleUpdatePoint = async (leadId, pointId, newContent) => {
    if (!newContent.trim()) {
      alert('Please enter some content for the important point');
      return;
    }

    if (updatingPoint.has(pointId)) return;

    setUpdatingPoint(prev => new Set(prev).add(pointId));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/important-points/${pointId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setImportantPoints(prev => ({
          ...prev,
          [leadId]: prev[leadId].map(point => 
            point._id === pointId ? data.importantPoint : point
          )
        }));

        // Exit editing mode
        setEditingPoints(prev => {
          const newSet = new Set(prev);
          newSet.delete(leadId);
          return newSet;
        });

        // Clear temp points
        setTempPoints(prev => {
          const newTemp = { ...prev };
          delete newTemp[pointId];
          return newTemp;
        });

      } else {
        console.error('Failed to update important point:', response.status);
        alert('Failed to update important point. Please try again.');
      }
    } catch (error) {
      console.error('Error updating important point:', error);
      alert('Error updating important point. Please try again.');
    } finally {
      setUpdatingPoint(prev => {
        const newSet = new Set(prev);
        newSet.delete(pointId);
        return newSet;
      });
    }
  };

  // Handle deleting an important point
  const handleDeletePoint = async (leadId, pointId) => {
    if (!window.confirm('Are you sure you want to delete this important point?')) {
      return;
    }

    if (deletingPoint.has(pointId)) return;

    setDeletingPoint(prev => new Set(prev).add(pointId));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/important-points/${pointId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setImportantPoints(prev => ({
          ...prev,
          [leadId]: prev[leadId].filter(point => point._id !== pointId)
        }));

      } else {
        console.error('Failed to delete important point:', response.status);
        alert('Failed to delete important point. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting important point:', error);
      alert('Error deleting important point. Please try again.');
    } finally {
      setDeletingPoint(prev => {
        const newSet = new Set(prev);
        newSet.delete(pointId);
        return newSet;
      });
    }
  };



  // Handle canceling point editing
  const handleCancelEdit = (pointId) => {
    setEditingPoints(prev => {
      const newSet = new Set(prev);
      newSet.delete(pointId);
      return newSet;
    });
    setTempPoints(prev => {
      const newTemp = { ...prev };
      delete newTemp[pointId];
      return newTemp;
    });
  };







  const getStatusColor = (status) => {
    const statusColors = {
      'New': '#3498db',
      'Qualified': '#27ae60',
      'Negotiation': '#f39c12',
      'Closed': '#2ecc71',
      'Lost': '#e74c3c'
    };
    return statusColors[status] || '#95a5a6';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusOptions = ['New', 'Qualified', 'Negotiation', 'Closed', 'Lost'];
  


  if (initialLoad || !scheduledCalls) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading leads...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{autoScheduledStyles}</style>
      <div className="dashboard-container">
        {/* Page Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Innovatiq Media Call</h1>
            <p>View and manage your leads for calling</p>
          </div>
          
          {/* Total Leads Counter - Small and upper right */}
          <div className="header-actions">
            <div className="quick-stats">
              <span className="stat-highlight">{leads.length} Leads Left</span>
            </div>
          </div>
        </div>

        {/* Leads Cards Grid */}
        <div className="leads-cards-grid">
          {getSortedLeads().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3>No leads found</h3>
              <p>Start by importing some leads to get started</p>
            </div>
          ) : (
            getSortedLeads().map((lead) => (
                              <div key={lead._id} className="lead-card">
                  <div className="lead-card-header">
                    <div className="lead-avatar">
                      {getInitials(lead.name)}
                    </div>
                    <div className="lead-info">
                      <h3 className="lead-name">{lead.name || 'Unnamed Lead'}</h3>
                      <p className="lead-phone">{lead.phone || 'No phone'}</p>
                      {/* Priority indicator */}
                      {(() => {
                        const priority = getLeadPriority(lead._id);
                        if (priority.status !== 'normal') {
                          return (
                            <div className={`priority-indicator ${priority.status}`}>
                              <span className="priority-text">{priority.text}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="status-section">
                      {/* Priority position indicator */}
                      {(() => {
                        const priority = getLeadPriority(lead._id);
                        if (priority.status === 'urgent') {
                          return (
                            <div className="priority-badge urgent-badge" title="High Priority - Call Now!">
                              🔥 URGENT
                            </div>
                          );
                        } else if (priority.status === 'soon') {
                          return (
                            <div className="priority-badge soon-badge" title="Call Soon">
                              ⏰ SOON
                            </div>
                          );
                        }
                        return null;
                      })()}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      disabled={updatingStatus.has(lead._id)}
                      className="status-select"
                      style={{ 
                        backgroundColor: getStatusColor(lead.status),
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: updatingStatus.has(lead._id) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status} style={{ backgroundColor: 'white', color: 'black' }}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {updatingStatus.has(lead._id) && (
                      <div className="status-updating">
                        <div className="mini-spinner"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="lead-card-content">
                  {lead.notes && (
                    <div className="lead-service">
                      <strong>Service:</strong> {lead.notes}
                    </div>
                  )}
                  
                  {/* Source field hidden */}
                  
                  {lead.assignedTo && (
                    <div className="lead-assigned">
                      <strong>Assigned to:</strong> {lead.assignedTo.name}
                    </div>
                  )}
                  
                  <div className="points-title-section">
                    <h4 className="points-title">Important Points</h4>
                  </div>
                  
                  <div className="lead-points">
                    {loadingPoints.has(lead._id) ? (
                      <div className="points-loading">
                        <div className="mini-spinner"></div>
                        <span>Loading important points...</span>
                      </div>
                    ) : (
                      <div className="points-display">
                        {/* Combined points input and display in single container */}
                        <div className="add-new-point">
                          <textarea
                            value={(() => {
                              // Always show the current user input if it exists
                              if (tempPoints[`new_${lead._id}`] !== undefined) {
                                return tempPoints[`new_${lead._id}`];
                              }
                              
                              // Only show existing points if no user input and points exist
                              if (importantPoints[lead._id] && importantPoints[lead._id].length > 0) {
                                return importantPoints[lead._id]
                                  .map(point => point.content)
                                  .join('\n');
                              }
                              
                              return '';
                            })()}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setTempPoints(prev => ({ ...prev, [`new_${lead._id}`]: newValue }));
                            }}
                            placeholder="Type or edit important points here... (one per line)"
                            className="new-point-textarea"
                            rows="6"
                            disabled={creatingPoint.has(lead._id)}
                            readOnly={false}
                          />
                          
                          <div className="new-point-actions">
                            <button
                              onClick={() => handleCreatePoint(lead._id)}
                              disabled={creatingPoint.has(lead._id)}
                              className="action-btn add-btn"
                            >
                              {creatingPoint.has(lead._id) ? (
                                <div className="mini-spinner"></div>
                              ) : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17,21 17,13 7,13 7,21"></polyline>
                                    <polyline points="7,3 7,8 15,8"></polyline>
                                  </svg>
                                  Save All Points
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="lead-date">
                    <strong>Created:</strong> {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                  
                  {/* Residual Call Section */}
                  <div className="residual-call-section">
                    <div className="residual-call-header">
                      <button 
                        onClick={() => toggleResidualCallForm(lead._id)}
                        className="residual-call-toggle-btn"
                      >
                        {showResidualCallForm[lead._id] ? 'Cancel' : 'Schedule Call'}
                      </button>
                    </div>
                    
                    {/* Auto-scheduled call indicator */}
                    {callStatus[lead._id] === 'not_connected' && (
                      <div className={`auto-scheduled-indicator ${
                        (() => {
                          const leadScheduledCalls = scheduledCalls[lead._id] || [];
                          const autoScheduledCall = leadScheduledCalls.find(call => 
                            call.notes === 'Auto-scheduled after call not connected' && 
                            call.status === 'pending'
                          );
                          if (autoScheduledCall) {
                            const timeLeft = new Date(autoScheduledCall.scheduledTime) - new Date();
                            // Apply high priority styling when call is due in 30 minutes or less, or overdue
                            return timeLeft <= 30 * 60 * 1000 ? 'high-priority' : '';
                          }
                          return '';
                        })()
                      }`}>
                        <span className="auto-scheduled-text">
                          ⏰ Auto-scheduled for {
                            (() => {
                              const leadScheduledCalls = scheduledCalls[lead._id] || [];
                              const autoScheduledCall = leadScheduledCalls.find(call => 
                                call.notes === 'Auto-scheduled after call not connected' && 
                                call.status === 'pending'
                              );
                              if (autoScheduledCall) {
                                return new Date(autoScheduledCall.scheduledTime).toLocaleString();
                              }
                              return '2 hours later';
                            })()
                          }
                          {countdowns[lead._id] && (
                            <span className="countdown-timer">
                              ({countdowns[lead._id]})
                            </span>
                          )}
                        </span>
                        <button 
                          onClick={() => toggleResidualCallForm(lead._id)}
                          className="edit-auto-scheduled-btn"
                          title="Edit scheduled time"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    
                    {/* Residual Call Form */}
                    {showResidualCallForm[lead._id] && (
                      <div className="residual-call-form">
                        <div className="form-group">
                          <label>Call Time:</label>
                          <input
                            type="datetime-local"
                            value={residualCallData[lead._id]?.scheduledTime || ''}
                            onChange={(e) => handleResidualCallDataChange(lead._id, 'scheduledTime', e.target.value)}
                            className="datetime-input"
                            required
                          />
                        </div>
                        <div className="form-actions">
                          <button
                            onClick={() => createScheduledCall(lead._id)}
                            disabled={creatingScheduledCall.has(lead._id) || !residualCallData[lead._id]?.scheduledTime}
                            className="schedule-call-btn"
                          >
                            {creatingScheduledCall.has(lead._id) ? (
                              <div className="mini-spinner"></div>
                            ) : (
                              'Schedule Call'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Scheduled Calls Display */}
                    {scheduledCalls[lead._id] && scheduledCalls[lead._id].length > 0 && (
                      <div className="scheduled-calls-list">
                        <h5>Upcoming Calls:</h5>
                        {scheduledCalls[lead._id].map((scheduledCall) => (
                          <div key={scheduledCall._id} className="scheduled-call-item">
                            <div className="scheduled-call-info">
                              <div className="scheduled-call-time">
                                <strong>Time:</strong> {new Date(scheduledCall.scheduledTime).toLocaleString()}
                              </div>
                              {scheduledCall.notes && (
                                <div className="scheduled-call-notes">
                                  <strong>Notes:</strong> {scheduledCall.notes}
                                </div>
                              )}
                              <div className="scheduled-call-status">
                                <span className={`status-badge ${scheduledCall.status}`}>
                                  {scheduledCall.status}
                                </span>
                              </div>
                            </div>
                            <div className="scheduled-call-actions">
                              <button
                                onClick={() => deleteScheduledCall(lead._id, scheduledCall._id)}
                                className="delete-scheduled-call-btn"
                                title="Delete scheduled call"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="lead-card-actions">
                  <button 
                    className={`action-btn call-connected-btn ${callStatus[lead._id] === 'connected' ? 'called' : ''}`}
                    onClick={() => handleCallConnected(lead._id)}
                  >
                    Call Connected
                  </button>
                  
                  <button 
                    className={`action-btn call-not-connected-btn ${callStatus[lead._id] === 'not_connected' ? 'called' : ''}`}
                    onClick={() => handleCallNotConnected(lead._id)}
                  >
                    Call Not Connected
                  </button>
                  
                  {/* Edit button hidden */}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Call; 