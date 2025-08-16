import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { getApiUrl } from '../../services/api';
import '../../styles/global.css';
import './call.css';

const Call = () => {
  const { user: authUser } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
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
      } else {
        setError('Failed to fetch leads');
        console.error('Failed to fetch leads:', response.status, response.statusText);
      }
    } catch (error) {
      setError('Error fetching leads');
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Listen for lead updates from other components
  useEffect(() => {
    const handleLeadsUpdated = () => {
      fetchLeads();
    };

    window.addEventListener('leadsImported', handleLeadsUpdated);
    window.addEventListener('leadDeleted', handleLeadsUpdated);

    return () => {
      window.removeEventListener('leadsImported', handleLeadsUpdated);
      window.removeEventListener('leadDeleted', handleLeadsUpdated);
    };
  }, [fetchLeads]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'New': '#3B82F6',
      'Qualified': '#10B981',
      'Negotiation': '#F59E0B',
      'Closed': '#059669',
      'Lost': '#EF4444'
    };
    return statusColors[status] || '#6B7280';
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading calls..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="call-page">
          <div className="call-header">
            <h1>Call Management</h1>
            <p>Manage your leads and make calls</p>
          </div>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={fetchLeads} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="call-page">
        <div className="call-header">
          <div className="header-content">
            <h1>Call Management</h1>
            <p>Manage your leads and make calls</p>
          </div>
          <div className="leads-count">
            <span className="count-text">Total Calls</span>
            <span className="count-badge">{leads.length}</span>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="no-leads">
            <div className="no-leads-icon"></div>
            <h3>No leads available</h3>
            <p>Upload leads from the Leads page to get started</p>
          </div>
        ) : (
          <div className="leads-grid">
            {leads.map((lead) => (
              <div key={lead._id} className="lead-card">
                <div className="lead-header">
                  <div className="lead-name">{lead.name}</div>
                  <div className="header-right">
                    <div 
                      className="lead-status"
                      style={{ backgroundColor: getStatusColor(lead.status) }}
                    >
                      {lead.status}
                    </div>
                    <button 
                      className="delete-button"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this lead?')) {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(getApiUrl(`api/leads/${lead._id}`), {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              }
                            });

                            if (response.ok) {
                              // Remove the lead from the current list
                              setLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                              alert('Lead deleted successfully!');
                            } else {
                              alert('Failed to delete lead');
                            }
                          } catch (error) {
                            console.error('Error deleting lead:', error);
                            alert('Error deleting lead');
                          }
                        }
                      }}
                      title="Delete lead"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="lead-details">
                  {lead.phone && (
                    <div className="lead-phone">
                      <span className="label">Phone:</span>
                      <span className="value">{lead.phone}</span>
                    </div>
                  )}
                  
                  {lead.notes && (
                    <div className="lead-notes">
                      <span className="label">📝 Service:</span>
                      <span className="value">{lead.notes}</span>
                    </div>
                  )}
                  
                  <div className="lead-points">
                    <span className="label">⭐ Points:</span>
                    <div className="points-input-container">
                      <textarea
                        className="points-textarea"
                        placeholder="Write your points here..."
                        value={lead.points || ''}
                        onChange={(e) => {
                          // Update the local state immediately for responsive UI
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? { ...l, points: e.target.value }
                                : l
                            )
                          );
                        }}
                        onBlur={async (e) => {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(getApiUrl(`api/leads/${lead._id}/points`), {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                points: e.target.value
                              })
                            });

                            if (!response.ok) {
                              alert('Failed to save points');
                              // Revert the change if save failed
                              fetchLeads();
                            }
                          } catch (error) {
                            console.error('Error saving points:', error);
                            alert('Error saving points');
                            // Revert the change if save failed
                            fetchLeads();
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="lead-assigned">
                    <span className="label">👤 Assigned To:</span>
                    <span className="value">{lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}</span>
                  </div>
                  
                  <div className="lead-created">
                    <span className="label">📅 Created:</span>
                    <span className="value">{formatDate(lead.createdAt)}</span>
                  </div>
                  
                  {lead.lastContacted && (
                    <div className="lead-last-contacted">
                      <span className="label">🕒 Last Contacted:</span>
                      <span className="value">{formatDate(lead.lastContacted)}</span>
                    </div>
                  )}
                </div>
                
                <div className="lead-actions">
                  <button 
                    className="action-button dial-button"
                    onClick={() => {
                      // Handle dial button click
                      if (lead.phone) {
                        window.open(`tel:${lead.phone}`, '_self');
                      } else {
                        alert('No phone number available for this lead');
                      }
                    }}
                    title="Call this lead"
                  >
                    Dial
                  </button>
                  <button 
                    className="action-button connected-button"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(getApiUrl(`api/leads/${lead._id}/complete-call`), {
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
                          // Remove the lead from the current list
                          setLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                          // Optionally show a success message
                          alert('Call marked as completed!');
                        } else {
                          alert('Failed to mark call as completed');
                        }
                      } catch (error) {
                        console.error('Error completing call:', error);
                        alert('Error completing call');
                      }
                    }}
                  >
                    Hot Lead
                  </button>
                  <button 
                    className="action-button not-connected-button"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(getApiUrl(`api/leads/${lead._id}/not-connected`), {
                          method: 'PATCH',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            notConnectedAt: new Date().toISOString()
                          })
                        });

                        if (response.ok) {
                          // Remove the lead from the current list
                          setLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                          // Force refresh to ensure proper state
                          setTimeout(() => fetchLeads(), 100);
                          // Optionally show a success message
                          alert('Call marked as not connected!');
                        } else {
                          alert('Failed to mark call as not connected');
                        }
                      } catch (error) {
                        console.error('Error marking call as not connected:', error);
                        alert('Error marking call as not connected');
                      }
                    }}
                  >
                    Not Connect
                  </button>
                  <button 
                    className="action-button schedule-button"
                    onClick={() => {
                      // Toggle the schedule picker visibility
                      setLeads(prevLeads => 
                        prevLeads.map(l => 
                          l._id === lead._id 
                            ? { ...l, showSchedulePicker: !l.showSchedulePicker }
                            : { ...l, showSchedulePicker: false }
                        )
                      );
                    }}
                  >
                    Schedule
                  </button>
                </div>
                
                {/* Schedule Picker - shown inline when button is clicked */}
                {lead.showSchedulePicker && (
                  <div className="schedule-picker-container">
                    <div className="schedule-picker-header">
                      <span>📅 Schedule Call</span>
                      <button 
                        className="close-picker-btn"
                        onClick={() => {
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? { ...l, showSchedulePicker: false }
                                : l
                            )
                          );
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="schedule-picker-content">
                      <input
                        type="datetime-local"
                        className="schedule-datetime-input"
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => {
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? { ...l, tempScheduledAt: e.target.value }
                                : l
                            )
                          );
                        }}
                      />
                      <div className="schedule-actions">
                        <button 
                          className="confirm-schedule-btn"
                          onClick={async () => {
                            const scheduledAt = lead.tempScheduledAt;
                            if (scheduledAt) {
                              try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(getApiUrl(`api/leads/${lead._id}/schedule`), {
                                  method: 'PATCH',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    scheduledAt: new Date(scheduledAt).toISOString()
                                  })
                                });

                                if (response.ok) {
                                  // Remove the lead from the current list
                                  setLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                                  alert(`Call scheduled for ${new Date(scheduledAt).toLocaleString()}!`);
                                } else {
                                  alert('Failed to schedule call');
                                }
                              } catch (error) {
                                console.error('Error scheduling call:', error);
                                alert('Error scheduling call');
                              }
                            } else {
                              alert('Please select a date and time');
                            }
                          }}
                        >
                          Confirm Schedule
                        </button>
                        <button 
                          className="cancel-schedule-btn"
                          onClick={() => {
                            setLeads(prevLeads => 
                              prevLeads.map(l => 
                                l._id === lead._id 
                                  ? { ...l, showSchedulePicker: false, tempScheduledAt: null }
                                  : l
                              )
                            );
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Call; 