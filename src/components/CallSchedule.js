import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import './Dashboard.css';

const CallSchedule = () => {
  const [leads, setLeads] = useState([]);
  const [callSchedules, setCallSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    leadId: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });
  // Remove filterStatus state and dropdown
  // const [filterStatus, setFilterStatus] = useState('all');
  const [deletingSchedules, setDeletingSchedules] = useState(new Set());

  // Fetch leads and call schedules
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch leads - request all leads without pagination
      const leadsResponse = await fetch('http://localhost:5001/api/leads?limit=10000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch call schedules
      const schedulesResponse = await fetch('http://localhost:5001/api/call-schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        setLeads(leadsData.leads);
      }

      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        console.log('Fetched call schedules:', schedulesData);
        setCallSchedules(schedulesData.callSchedules);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up periodic refresh to update upcoming call indicators
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Refresh every 30 seconds
    
    // Listen for lead deletion events from other components
    const handleLeadDeleted = (event) => {
      const { leadId } = event.detail;
      // Remove the deleted lead from local state immediately
      setLeads(prevLeads => prevLeads.filter(lead => lead._id !== leadId));
      // Also remove any call schedules associated with this lead
      setCallSchedules(prevSchedules => 
        prevSchedules.filter(schedule => schedule.leadId && schedule.leadId._id !== leadId)
      );
    };
    
    // Listen for leads imported events from other components
    const handleLeadsImported = (event) => {
      const { count } = event.detail;
      // Refresh data to get the newly imported leads
      fetchData();
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      const { leadId, newStatus } = event.detail;
      // Update the lead status in local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead._id === leadId 
            ? { ...lead, status: newStatus }
            : lead
        )
      );
    };
    
    window.addEventListener('leadDeleted', handleLeadDeleted);
    window.addEventListener('leadsImported', handleLeadsImported);
    window.addEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('leadDeleted', handleLeadDeleted);
      window.removeEventListener('leadsImported', handleLeadsImported);
      window.removeEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    };
  }, []);

  const handleScheduleCall = (lead) => {
    setSelectedLead(lead);
    setScheduleForm({
      leadId: lead._id,
      scheduledDate: '',
      scheduledTime: '',
      notes: ''
    });
    setShowScheduleModal(true);
  };

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      console.log('Submitting schedule form:', scheduleForm);
      
      const response = await fetch('http://localhost:5001/api/call-schedules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleForm)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Call scheduled successfully:', result);
        alert('Call scheduled successfully!');
        setShowScheduleModal(false);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        console.error('Failed to schedule call:', error);
        alert(error.message || 'Failed to schedule call');
      }
    } catch (error) {
      console.error('Error scheduling call:', error);
      alert('Failed to schedule call');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled call?')) {
      return;
    }

    try {
      // Add to deleting set
      setDeletingSchedules(prev => new Set(prev).add(scheduleId));
      
      // Optimistic update - remove from UI immediately
      setCallSchedules(prev => prev.filter(schedule => schedule._id !== scheduleId));
      
      const token = localStorage.getItem('token');
      console.log('Deleting call schedule:', scheduleId);
      
      const response = await fetch(`http://localhost:5001/api/call-schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Call schedule deleted successfully:', result);
        alert('Call schedule deleted successfully!');
        // No need to fetchData() since we already updated the UI optimistically
      } else {
        const error = await response.json();
        console.error('Failed to delete call schedule:', error);
        alert(error.message || 'Failed to delete call schedule');
        // Revert optimistic update on error
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting call schedule:', error);
      alert('Failed to delete call schedule');
      // Revert optimistic update on error
      fetchData();
    } finally {
      // Remove from deleting set
      setDeletingSchedules(prev => {
        const newSet = new Set(prev);
        newSet.delete(scheduleId);
        return newSet;
      });
    }
  };

  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleChatClick = async (scheduleId) => {
    // Find the schedule to get lead information
    const schedule = callSchedules.find(s => s._id === scheduleId);
    
    if (schedule && schedule.leadId) {
      // Create a simple chat object with lead information
      const chatData = {
        _id: `temp-${scheduleId}`,
        participantName: schedule.leadId.name || 'Unknown Lead',
        participantEmail: schedule.leadId.email || '',
        participantId: schedule.leadId,
        callScheduleId: schedule,
        messages: []
      };
      
      setSelectedChat(chatData);
      setChatMessages([]);
      setShowChatModal(true);

      // Try to load existing messages from backend
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5001/api/chats/call-schedule/${scheduleId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.chat && data.chat.messages) {
            setChatMessages(data.chat.messages);
            setSelectedChat(prev => ({
              ...prev,
              _id: data.chat._id
            }));
          }
        }
      } catch (error) {
        console.log('No existing chat found, starting new conversation');
      }
    } else {
      alert('Lead information not found for this call schedule');
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    setSendingMessage(true);
    
    try {
      const token = localStorage.getItem('token');
      const schedule = selectedChat.callScheduleId; // Use the schedule object directly
      
      if (!schedule || !schedule.leadId) {
        alert('Lead information not found');
        return;
      }

      // Create or get chat
      const createChatResponse = await fetch('http://localhost:5001/api/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantId: schedule.leadId._id,
          participantModel: 'Lead',
          callScheduleId: schedule._id
        })
      });

      let chatId;
      if (createChatResponse.ok) {
        const chatData = await createChatResponse.json();
        chatId = chatData.chat._id;
      } else {
        // Try to get existing chat
        const getChatResponse = await fetch(`http://localhost:5001/api/chats/call-schedule/${schedule._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (getChatResponse.ok) {
          const chatData = await getChatResponse.json();
          chatId = chatData.chat._id;
        } else {
          throw new Error('Failed to create or get chat');
        }
      }

      // Send the message
      const sendMessageResponse = await fetch(`http://localhost:5001/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (sendMessageResponse.ok) {
        const messageData = await sendMessageResponse.json();
        
        // Get the updated chat with all messages
        const getUpdatedChatResponse = await fetch(`http://localhost:5001/api/chats/${chatId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (getUpdatedChatResponse.ok) {
          const updatedChatData = await getUpdatedChatResponse.json();
          setChatMessages(updatedChatData.chat.messages || []);
        }
        
        setNewMessage('');
      } else {
        const errorData = await sendMessageResponse.json();
        alert(`Failed to send message: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Error sending message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'New': '#3498db',
      'Contacted': '#f39c12',
      'Qualified': '#27ae60',
      'Proposal Sent': '#9b59b6',
      'Negotiation': '#e67e22',
      'Closed': '#2ecc71',
      'Lost': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getCallStatusColor = (status) => {
    const colors = {
      'Scheduled': '#3498db',
      'Completed': '#27ae60',
      'Cancelled': '#e74c3c',
      'No Show': '#f39c12'
    };
    return colors[status] || '#95a5a6';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    // If it's an ISO timestamp (contains 'T' or is a Date object)
    if (typeof timeString === 'string' && (timeString.includes('T') || timeString.includes('Z'))) {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    // If it's just a time string (HH:MM format)
    if (typeof timeString === 'string' && timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
    }
    // If it's a Date object
    if (timeString instanceof Date) {
      return timeString.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return timeString;
  };

  const isUpcomingCall = (schedule) => {
    const now = new Date();
    const callDate = new Date(schedule.scheduledDate);
    const [hours, minutes] = schedule.scheduledTime.split(':');
    callDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const timeDiff = callDate.getTime() - now.getTime();
    // Return true if call is within the next 10 minutes
    return timeDiff > 0 && timeDiff <= 600000; // 10 minutes in milliseconds
  };

  // Always show all leads
  const filteredLeads = leads;

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading Call Schedule...</p>
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
            <h2>Innovatiq Media Call Schedule 📞</h2>
            <p>Schedule and manage calls with your Innovatiq Media leads</p>
          </div>
          {/* Removed filter dropdown */}
        </div>

        {/* Leads Table */}
        <div className="content-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Available Leads</h2>
              <p>Click "Schedule Call" to set up a call with any lead (Qualified leads are excluded as they become customers)</p>
            </div>
          </div>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead._id}>
                    <td>
                      <div className="lead-name">
                        <div className="lead-avatar">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        {lead.name}
                      </div>
                    </td>
                    <td>{lead.email}</td>
                    <td>{lead.phone || 'N/A'}</td>
                    <td>{lead.company || 'N/A'}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(lead.status) }}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="schedule-btn"
                        onClick={() => handleScheduleCall(lead)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        Schedule Call
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheduled Calls */}
        <div className="content-section">
          <div className="section-header">
            <h3>Scheduled Calls</h3>
            <p>Your upcoming and past scheduled calls</p>
          </div>
          
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Chat</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {callSchedules.map((schedule) => (
                  <tr key={schedule._id} className={isUpcomingCall(schedule) ? 'upcoming-call-row' : ''}>
                    <td>
                      <div className="lead-name">
                        <div className="lead-avatar">
                          {schedule.leadId && schedule.leadId.name ? schedule.leadId.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        {schedule.leadId && schedule.leadId.name ? schedule.leadId.name : 'Lead Not Found'}
                        {isUpcomingCall(schedule) && (
                          <span className="upcoming-indicator">⏰</span>
                        )}
                      </div>
                    </td>
                    <td>{formatDate(schedule.scheduledDate)}</td>
                    <td>{formatTime(schedule.scheduledTime)}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getCallStatusColor(schedule.status) }}
                      >
                        {schedule.status}
                      </span>
                    </td>
                    <td>{schedule.notes || 'No notes'}</td>
                    <td>
                      <button 
                        className="chat-btn"
                        onClick={() => handleChatClick(schedule._id)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                        </svg>
                        Chat
                      </button>
                    </td>
                    <td>
                      <button 
                        className={`action-btn delete ${deletingSchedules.has(schedule._id) ? 'deleting' : ''}`}
                        onClick={() => handleDeleteSchedule(schedule._id)}
                        disabled={deletingSchedules.has(schedule._id)}
                      >
                        {deletingSchedules.has(schedule._id) ? (
                          <div className="mini-spinner"></div>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {callSchedules.length === 0 && (
                          <div className="empty-state">
              <div className="empty-icon">📞</div>
              <h3>No Scheduled Calls</h3>
              <p>Schedule your first call with an Innovatiq Media lead to get started!</p>
            </div>
            )}
          </div>
        </div>

        {/* Schedule Call Modal */}
        {showScheduleModal && (
          <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
            <div className="modal schedule-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  Schedule Call with {selectedLead?.name}
                </h3>
              </div>
              <form onSubmit={handleSubmitSchedule} className="schedule-form">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📅</span>
                    Date
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="date"
                      value={scheduleForm.scheduledDate}
                      onChange={(e) => setScheduleForm({
                        ...scheduleForm,
                        scheduledDate: e.target.value
                      })}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="schedule-input date-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🕐</span>
                    Time
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="time"
                      value={scheduleForm.scheduledTime}
                      onChange={(e) => setScheduleForm({
                        ...scheduleForm,
                        scheduledTime: e.target.value
                      })}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      required
                      className="schedule-input time-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📝</span>
                    Notes
                  </label>
                  <textarea
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({
                      ...scheduleForm,
                      notes: e.target.value
                    })}
                    placeholder="Add any notes about the call, agenda items, or important points to discuss..."
                    rows={4}
                    className="schedule-textarea"
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    Schedule Call
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {showChatModal && selectedChat && (
          <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
            <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Important Chat with {selectedChat.participantName}</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowChatModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-chat-messages">
                {chatMessages.length > 0 ? (
                  chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.sender === 'user' ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-messages">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <form onSubmit={sendChatMessage} className="modal-message-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sendingMessage}
                />
                <button type="submit" disabled={!newMessage.trim() || sendingMessage}>
                  {sendingMessage ? (
                    <div className="mini-spinner"></div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CallSchedule; 