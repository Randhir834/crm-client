import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { getApiUrl } from '../../services/api';
import '../../styles/global.css';
import './call.css';

const FollowUp = () => {
  const { user: authUser } = useAuth();
  const [scheduledLeads, setScheduledLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch scheduled calls from API
  const fetchScheduledCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/scheduled-calls'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const scheduledData = data.scheduledLeads || [];
        setScheduledLeads(scheduledData);
      } else {
        setError('Failed to fetch scheduled calls');
        console.error('Failed to fetch scheduled calls:', response.status, response.statusText);
      }
    } catch (error) {
      setError('Error fetching scheduled calls');
      console.error('Error fetching scheduled calls:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduledCalls();
  }, [fetchScheduledCalls]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading scheduled calls..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="call-page">
          <div className="call-header">
            <h1>Follow Up</h1>
            <p>View your scheduled calls</p>
          </div>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={fetchScheduledCalls} className="retry-button">
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
            <h1>Follow Up</h1>
            <p>View your scheduled calls</p>
          </div>
          <div className="leads-count">
            <span className="count-text">Scheduled Calls</span>
            <span className="count-badge">{scheduledLeads.length}</span>
          </div>
        </div>

        {scheduledLeads.length === 0 ? (
          <div className="no-leads">
            <div className="no-leads-icon">📅</div>
            <h3>No scheduled calls yet</h3>
            <p>Schedule some calls from the Call page to see them here</p>
          </div>
        ) : (
          <div className="leads-grid">
            {scheduledLeads.map((lead) => (
              <div key={lead._id} className="lead-card scheduled-call">
                <div className="lead-header">
                  <div className="lead-name">{lead.name}</div>
                  <div className="header-right">
                    <div className="scheduled-badge">
                      <span>📅 SCHEDULED</span>
                    </div>
                    <button 
                      className="delete-button"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to move this lead back to the Call page?')) {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(getApiUrl(`api/leads/${lead._id}/restore`), {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                callCompleted: false,
                                callCompletedAt: null,
                                callCompletedBy: null,
                                scheduledAt: null
                              })
                            });

                            if (response.ok) {
                              // Remove the lead from the scheduled list
                              setScheduledLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                              alert('Lead moved back to Call page successfully!');
                            } else {
                              alert('Failed to move lead back to Call page');
                            }
                          } catch (error) {
                            console.error('Error restoring lead:', error);
                            alert('Error moving lead back to Call page');
                          }
                        }
                      }}
                      title="Move lead back to Call page"
                    >
                      ↩️
                    </button>
                  </div>
                </div>
                
                <div className="lead-details">
                  {lead.phone && (
                    <div className="lead-phone">
                      <span className="label">📞 Phone:</span>
                      <span className="value">{lead.phone}</span>
                    </div>
                  )}
                  
                  <div className="lead-service">
                    <span className="label">📝 Service:</span>
                    <span className="value">{lead.notes || 'N/A'}</span>
                  </div>
                  
                  <div className="lead-points">
                    <span className="label">⭐ Points:</span>
                    <div className="points-input-container">
                      <textarea
                        className="points-textarea"
                        placeholder="Write your points here..."
                        value={lead.points || ''}
                        onChange={(e) => {
                          // Update the local state immediately for responsive UI
                          setScheduledLeads(prevLeads => 
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
                              fetchScheduledCalls();
                            }
                          } catch (error) {
                            console.error('Error saving points:', error);
                            alert('Error saving points');
                            // Revert the change if save failed
                            fetchScheduledCalls();
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
                  
                  <div className="lead-scheduled">
                    <span className="label">📅 Scheduled For:</span>
                    <span className="value scheduled-time">{formatDateTime(lead.scheduledAt)}</span>
                  </div>
                  
                  {lead.notConnectedAt && (
                    <div className="lead-not-connected-info">
                      <span className="label">❌ Auto-scheduled from Not Connected:</span>
                      <span className="value">{formatDate(lead.notConnectedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FollowUp; 