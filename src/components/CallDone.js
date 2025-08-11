import React, { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import { getApiUrl } from '../config/api';
import './Dashboard.css';

const CallDone = () => {
  const [completedCalls, setCompletedCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importantPoints, setImportantPoints] = useState({});
  const [loadingPoints, setLoadingPoints] = useState(new Set());
  const [editingPoints, setEditingPoints] = useState(new Set());
  const [tempPoints, setTempPoints] = useState({});
  const [creatingPoint, setCreatingPoint] = useState(new Set());
  const [updatingPoint, setUpdatingPoint] = useState(new Set());
  const [deletingPoint, setDeletingPoint] = useState(new Set());
  
  // Status filter state
  const [activeFilter, setActiveFilter] = useState('All');
  const [filteredCalls, setFilteredCalls] = useState([]);

  // Fetch completed calls from API
  const fetchCompletedCalls = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/completed-calls'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const completedLeads = data.completedLeads || [];
        setCompletedCalls(completedLeads);
        
        // Fetch important points for all completed leads
        await fetchImportantPointsForLeads(completedLeads);
        
        // Apply initial filtering
        filterCallsByStatus(completedLeads, activeFilter);
        setFilteredCalls(completedLeads);
      } else {
        console.error('Failed to fetch completed calls:', response.status);
      }
    } catch (error) {
      console.error('Error fetching completed calls:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  // Filter calls by status
  const filterCallsByStatus = useCallback((callsData, statusFilter) => {
    let filtered = callsData;
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = callsData.filter(call => call.status === statusFilter);
    }
    
    setFilteredCalls(filtered);
  }, []);

  // Fetch important points for completed leads
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
            return { leadId: lead._id, points: [] };
          }
        } catch (error) {
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
      // Silent error handling
    }
  };

  // Handle editing points
  const handleEditPoints = (leadId, currentPoints) => {
    setEditingPoints(prev => new Set(prev).add(leadId));
    setTempPoints(prev => ({ ...prev, [leadId]: currentPoints || '' }));
  };

  // Handle creating a new important point
  const handleCreatePoint = async (leadId) => {
    const content = tempPoints[`new_${leadId}`] || '';
    
    if (!content.trim()) {
      alert('Please enter some content for the important point');
      return;
    }

    if (creatingPoint.has(leadId)) return;

    setCreatingPoint(prev => new Set(prev).add(leadId));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/important-points'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leadId, content: content.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setImportantPoints(prev => ({
          ...prev,
          [leadId]: [data.importantPoint, ...(prev[leadId] || [])]
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
          delete newTemp[`new_${leadId}`];
          return newTemp;
        });
      } else {
        alert('Failed to create important point. Please try again.');
      }
    } catch (error) {
      alert('Error creating important point. Please try again.');
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
        alert('Failed to update important point. Please try again.');
      }
    } catch (error) {
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
        alert('Failed to delete important point. Please try again.');
      }
    } catch (error) {
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

  useEffect(() => {
    fetchCompletedCalls();
  }, [fetchCompletedCalls]);

  // Effect to update filtered calls when activeFilter changes
  useEffect(() => {
    if (completedCalls.length > 0) {
      filterCallsByStatus(completedCalls, activeFilter);
    }
  }, [activeFilter, completedCalls, filterCallsByStatus]);

  // Filter calls by status
  const filterCalls = (status) => {
    setActiveFilter(status);
    filterCallsByStatus(completedCalls, status);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading completed calls...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Innovatiq Media Call Done</h1>
            <p>View all completed and cancelled calls</p>
          </div>
        </div>

        <div className="stats-grid">
          <div 
            className={`stat-card total-leads ${activeFilter === 'All' ? 'active-filter' : ''}`}
            onClick={() => filterCalls('All')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{completedCalls.length}</h3>
              <p>Total Calls</p>
            </div>
          </div>

          <div 
            className={`stat-card qualified-leads ${activeFilter === 'Qualified' ? 'active-filter' : ''}`}
            onClick={() => filterCalls('Qualified')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{completedCalls.filter(call => call.status === 'Qualified').length}</h3>
              <p>Qualified</p>
            </div>
          </div>

          <div 
            className={`stat-card negotiation-leads ${activeFilter === 'Negotiation' ? 'active-filter' : ''}`}
            onClick={() => filterCalls('Negotiation')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{completedCalls.filter(call => call.status === 'Negotiation').length}</h3>
              <p>In Negotiation</p>
            </div>
          </div>

          <div 
            className={`stat-card closed-leads ${activeFilter === 'Closed' ? 'active-filter' : ''}`}
            onClick={() => filterCalls('Closed')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{completedCalls.filter(call => call.status === 'Closed').length}</h3>
              <p>Closed</p>
            </div>
          </div>

          <div 
            className={`stat-card lost-leads ${activeFilter === 'Lost' ? 'active-filter' : ''}`}
            onClick={() => filterCalls('Lost')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{completedCalls.filter(call => call.status === 'Lost').length}</h3>
              <p>Lost</p>
            </div>
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <div className="section-title">
              <h2>
                {activeFilter === 'All' ? 'All Completed Calls' :
                 activeFilter === 'Qualified' ? 'Qualified Calls' :
                 activeFilter === 'Negotiation' ? 'Calls In Negotiation' :
                 activeFilter === 'Closed' ? 'Closed Calls' :
                 activeFilter === 'Lost' ? 'Lost Calls' : 'Completed Calls'}
              </h2>
              <p>
                {`Showing ${filteredCalls.length} ${activeFilter === 'All' ? 'total' : activeFilter.toLowerCase()} call${filteredCalls.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="cards-container">
            {filteredCalls.length > 0 ? (
              <div className="cards-grid">
                {filteredCalls.map((lead) => (
                  <div key={lead._id} className="completed-call-card">
                    <div className="card-header">
                      <div className="lead-info">
                        <div className="lead-avatar">
                          <span>{lead.name ? lead.name.charAt(0).toUpperCase() : 'U'}</span>
                        </div>
                        <div className="lead-details">
                          <h3 className="lead-name">{lead.name || 'Unknown Lead'}</h3>
                          <p className="lead-phone">{lead.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <div className="call-status">
                        <span className="status-badge completed">
                          Completed
                        </span>
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="service-section">
                        <h4>Service</h4>
                        <p className="service-text">
                          {lead.notes ? lead.notes : 'No service details'}
                        </p>
                      </div>

                      <div className="important-points-section">
                        <h4>Important Points</h4>
                        {loadingPoints.has(lead._id) ? (
                          <div className="points-loading">
                            <div className="mini-spinner"></div>
                            <span>Loading points...</span>
                          </div>
                        ) : (
                          <>
                            {importantPoints[lead._id] && importantPoints[lead._id].length > 0 ? (
                              <div className="points-list">
                                {importantPoints[lead._id].map((point, index) => (
                                  <div key={point._id} className="point-item">
                                    <span className="point-text">{point.content}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-points">No important points recorded.</p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="call-details">
                        <div className="detail-row">
                          <span className="detail-label">Completed Date:</span>
                          <span className="detail-value">{formatDate(lead.callCompletedAt)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Completed By:</span>
                          <span className="detail-value">
                            {lead.callCompletedBy && (lead.callCompletedBy.name || lead.callCompletedBy._id) ? (
                              lead.callCompletedBy.name || 'User'
                            ) : (
                              'System'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3>No calls found</h3>
                <p>
                  {activeFilter === 'All' ? 'No completed calls found. Completed calls will appear here once they are marked as done.' :
                   `No ${activeFilter.toLowerCase()} calls found for the selected filter.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CallDone; 