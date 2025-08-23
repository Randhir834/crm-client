import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';

import { LoadingSpinner } from '../../components/ui';
import { getApiUrl } from '../../services/api';
import '../../styles/global.css';
import './call.css';

const Call = () => {

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User filter state
  const [users, setUsers] = useState([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState('');
  const [filteredLeads, setFilteredLeads] = useState([]);

  // Fetch users for the filter dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/auth/users/list'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  // Memoized function to update filtered leads
  const updateFilteredLeads = useCallback((leadsData) => {
    // First, filter out scheduled calls (they should not appear in the call queue)
    const unscheduledLeads = leadsData.filter(lead => !lead.scheduledAt);
    
    if (selectedUserFilter) {
      // Filter unscheduled leads by selected user
      const filtered = unscheduledLeads.filter(lead => 
        lead.assignedTo && 
        (lead.assignedTo._id === selectedUserFilter || lead.assignedTo === selectedUserFilter)
      );
      setFilteredLeads(filtered);
    } else {
      // Show all unscheduled leads (no user filtering)
      setFilteredLeads(unscheduledLeads);
    }
  }, [selectedUserFilter]);

  // Effect to update filtered leads when filter changes
  useEffect(() => {
    updateFilteredLeads(leads);
  }, [selectedUserFilter, leads, updateFilteredLeads]);

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
        updateFilteredLeads(leadsData);
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
  }, [updateFilteredLeads]);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [fetchLeads, fetchUsers]);



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
            <p>Manage your leads, make calls, and view completed calls</p>
          </div>
          <div className="header-controls">
            {/* User Filter Dropdown */}
            <div className="user-filter-container">
              <select
                className="user-filter-select"
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="leads-count">
              <span className="count-text">Available Calls</span>
              <span className="count-badge">
                {selectedUserFilter ? `${filteredLeads.length}/${leads.filter(lead => !lead.scheduledAt).length}` : leads.filter(lead => !lead.scheduledAt).length}
              </span>
            </div>
          </div>
        </div>





        {filteredLeads.length === 0 ? (
          <div className="no-leads">
            <div className="no-leads-icon"></div>
            <h3>{selectedUserFilter ? 'No available calls for selected user' : 'No available calls'}</h3>
            <p>
              {selectedUserFilter ? (
                <>
                  No available calls found for <strong>{users.find(u => u._id === selectedUserFilter)?.name || 'selected user'}</strong>.
                  <br />
                  <button 
                    className="clear-filter-link"
                    onClick={() => setSelectedUserFilter('')}
                  >
                    Clear filter to see all available calls
                  </button>
                </>
              ) : (
                'All leads have been scheduled or completed. Upload new leads from the Leads page to get started.'
              )}
            </p>
          </div>
        ) : (
          <div className="leads-grid">
            {filteredLeads.map((lead) => (
              <div key={lead._id} className="lead-card">
                <div className="lead-header">
                  <div className="lead-name">
                    {lead.name}
                  </div>
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
                              // Remove the lead from both lists
                              setLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                              setFilteredLeads(prevFiltered => prevFiltered.filter(l => l._id !== lead._id));
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
                          // Update both states immediately for responsive UI
                          const updatedLead = { ...lead, points: e.target.value };
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? updatedLead
                                : l
                            )
                          );
                          setFilteredLeads(prevFiltered => 
                            prevFiltered.map(l => 
                              l._id === lead._id 
                                ? updatedLead
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
                          // Update the lead in both lists to show it as completed
                          const updatedLead = { 
                            ...lead, 
                            callCompleted: true, 
                            callCompletedAt: new Date().toISOString(),
                            callCompletedBy: lead.assignedTo?._id || lead.createdBy?._id
                          };
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? updatedLead
                                : l
                            )
                          );
                          setFilteredLeads(prevFiltered => 
                            prevFiltered.map(l => 
                              l._id === lead._id 
                                ? updatedLead
                                : l
                            )
                          );
                          // Show success message
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
                          // Move the lead to the end of the queue after marking as not connected
                          const updatedLead = { ...lead, notConnectedAt: new Date().toISOString() };
                          setLeads(prevLeads => {
                            const otherLeads = prevLeads.filter(l => l._id !== lead._id);
                            return [...otherLeads, updatedLead];
                          });
                          setFilteredLeads(prevFiltered => {
                            const otherFiltered = prevFiltered.filter(l => l._id !== lead._id);
                            return [...otherFiltered, updatedLead];
                          });
                          // Show success message
                          alert('Call marked as not connected and moved to end of queue!');
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
                      const updatedLead = { ...lead, showSchedulePicker: !lead.showSchedulePicker };
                      setLeads(prevLeads => 
                        prevLeads.map(l => 
                          l._id === lead._id 
                            ? updatedLead
                            : { ...l, showSchedulePicker: false }
                        )
                      );
                      setFilteredLeads(prevFiltered => 
                        prevFiltered.map(l => 
                          l._id === lead._id 
                            ? updatedLead
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
                          const updatedLead = { ...lead, showSchedulePicker: false };
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? updatedLead
                                : l
                            )
                          );
                          setFilteredLeads(prevFiltered => 
                            prevFiltered.map(l => 
                              l._id === lead._id 
                                ? updatedLead
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
                          const updatedLead = { ...lead, tempScheduledAt: e.target.value };
                          setLeads(prevLeads => 
                            prevLeads.map(l => 
                              l._id === lead._id 
                                ? updatedLead
                                : l
                            )
                          );
                          setFilteredLeads(prevFiltered => 
                            prevFiltered.map(l => 
                              l._id === lead._id 
                                ? updatedLead
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
                                  // Update the lead in the leads list to show it as scheduled
                                  const updatedLead = { ...lead, scheduledAt: new Date(scheduledAt).toISOString() };
                                  setLeads(prevLeads => {
                                    const newLeads = prevLeads.map(l => 
                                      l._id === lead._id 
                                        ? updatedLead
                                        : l
                                    );
                                    // Update filtered leads to immediately remove the scheduled call
                                    updateFilteredLeads(newLeads);
                                    return newLeads;
                                  });
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
                            const updatedLead = { ...lead, showSchedulePicker: false, tempScheduledAt: null };
                            setLeads(prevLeads => 
                              prevLeads.map(l => 
                                l._id === lead._id 
                                  ? updatedLead
                                  : l
                              )
                            );
                            setFilteredLeads(prevFiltered => 
                              prevFiltered.map(l => 
                                l._id === lead._id 
                                  ? updatedLead
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