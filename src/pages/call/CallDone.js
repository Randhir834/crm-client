import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';

import { LoadingSpinner } from '../../components/ui';
import { getApiUrl } from '../../services/api';
import '../../styles/global.css';
import './call.css';

const CallDone = () => {

  const [completedLeads, setCompletedLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  // Fetch completed calls from API
  const fetchCompletedCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/completed-calls'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const completedData = data.completedLeads || [];
        setCompletedLeads(completedData);
      } else {
        setError('Failed to fetch completed calls');
        console.error('Failed to fetch completed calls:', response.status, response.statusText);
      }
    } catch (error) {
      setError('Error fetching completed calls');
      console.error('Error fetching completed calls:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletedCalls();
  }, [fetchCompletedCalls]);



  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading hot leads..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="call-page">
          <div className="call-header">
            <h1>Hot Lead</h1>
            <p>View your completed calls</p>
          </div>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={fetchCompletedCalls} className="retry-button">
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
            <h1>Hot Lead</h1>
            <p>View your Hot leads</p>
          </div>
          <div className="header-controls">
            <div className="leads-count">
              <span className="count-text">Completed Calls</span>
              <span className="count-badge">{completedLeads.length}</span>
            </div>
          </div>
        </div>

        {completedLeads.length === 0 ? (
          <div className="no-leads">
            <div className="no-leads-icon">✅</div>
            <h3>No completed calls yet</h3>
            <p>Complete some calls from the Call page to see them here</p>
          </div>
        ) : (
          <div className="leads-grid">
            {completedLeads.map((lead) => (
              <div key={lead._id} className="lead-card completed-call">
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
                                scheduledAt: null
                              })
                            });

                            if (response.ok) {
                              // Remove the lead from the completed list
                              setCompletedLeads(prevLeads => prevLeads.filter(l => l._id !== lead._id));
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
                          setCompletedLeads(prevLeads => 
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
                              fetchCompletedCalls();
                            }
                          } catch (error) {
                            console.error('Error saving points:', error);
                            alert('Error saving points');
                            // Revert the change if save failed
                            fetchCompletedCalls();
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
                  
                  <div className="lead-completed">
                    <span className="label">✅ Completed:</span>
                    <span className="value">{formatDate(lead.callCompletedAt)}</span>
                  </div>
                  
                  {lead.callHistory && lead.callHistory.length > 0 && (
                    <div className="call-history">
                      <span className="label">📋 Call Result:</span>
                      <span className="value">{lead.callHistory[lead.callHistory.length - 1].status}</span>
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

export default CallDone; 