import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';

import { LoadingSpinner } from '../../components/ui';
import { getApiUrl } from '../../services/api';
import '../../styles/global.css';
import './call.css';

const CallNotDone = () => {

  const [notConnectedLeads, setNotConnectedLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  // Fetch not connected calls from API
  const fetchNotConnectedCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/not-connected-calls'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const notConnectedData = data.notConnectedLeads || [];
        setNotConnectedLeads(notConnectedData);
      } else {
        setError('Failed to fetch not connected calls');
        console.error('Failed to fetch not connected calls:', response.status, response.statusText);
      }
    } catch (error) {
      setError('Error fetching not connected calls');
      console.error('Error fetching not connected calls:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotConnectedCalls();
  }, [fetchNotConnectedCalls]);



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
        <LoadingSpinner message="Loading not connected calls..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="call-page">
          <div className="call-header">
            <h1>Call Not Done</h1>
            <p>View your not connected calls</p>
          </div>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={fetchNotConnectedCalls} className="retry-button">
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
            <h1>Call Not Done</h1>
            <p>View your not connected calls</p>
          </div>
          <div className="header-controls">
            <div className="leads-count">
              <span className="count-text">Not Connected Calls</span>
              <span className="count-badge">{notConnectedLeads.length}</span>
            </div>
          </div>
        </div>

        {notConnectedLeads.length === 0 ? (
          <div className="no-leads">
            <div className="no-leads-icon">❌</div>
            <h3>No not connected calls yet</h3>
            <p>Mark some calls as not connected from the Call page to see them here</p>
          </div>
        ) : (
          <div className="leads-grid">
            {notConnectedLeads.map((lead) => (
              <div key={lead._id} className="lead-card not-connected-call">
                <div className="lead-header">
                  <div className="lead-name">{lead.name}</div>
                  <div className="header-right">
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
                                scheduledAt: null,
                                notConnectedAt: null
                              })
                            });

                            if (response.ok) {
                              // Remove the lead from the not connected list
                              setNotConnectedLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
                              // Force refresh to ensure proper state
                              setTimeout(() => fetchNotConnectedCalls(), 100);
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
                          setNotConnectedLeads(prevLeads => 
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
                              fetchNotConnectedCalls();
                            }
                          } catch (error) {
                            console.error('Error saving points:', error);
                            alert('Error saving points');
                            // Revert the change if save failed
                            fetchNotConnectedCalls();
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
                  
                  <div className="lead-not-connected">
                    <span className="label">❌ Not Connected:</span>
                    <span className="value">{formatDate(lead.notConnectedAt)}</span>
                  </div>
                  
                  <div className="lead-follow-up">
                    <span className="label">📅 Follow-up Scheduled:</span>
                    <span className="value follow-up-time">{formatDateTime(lead.scheduledAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CallNotDone; 