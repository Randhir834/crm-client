import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './Layout';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';
import './Dashboard.css';

const Leads = () => {
  const { isAdmin, user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingLeads, setDeletingLeads] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);


  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    qualified: 0,
    negotiation: 0,
    closed: 0,
    lost: 0
  });
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [activeFilter, setActiveFilter] = useState('New');

  const [processingLead, setProcessingLead] = useState(null);

  const fileInputRef = useRef(null);
  
  // New state for user selection modal
  const [showUserSelectionModal, setShowUserSelectionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);


  // Memoized function to update stats based on leads data
  const updateStatsFromLeads = useCallback((leadsData) => {
    const newStats = {
      total: leadsData.length,
      new: leadsData.filter(lead => lead.status === 'New').length,
      qualified: leadsData.filter(lead => lead.status === 'Qualified').length,
      negotiation: leadsData.filter(lead => lead.status === 'Negotiation').length,
      closed: leadsData.filter(lead => lead.status === 'Closed').length,
      lost: leadsData.filter(lead => lead.status === 'Lost').length
    };
    setStats(newStats);
  }, []);

  // Memoized function to update filtered leads
  const updateFilteredLeads = useCallback((leadsData, statusFilter) => {
    let filtered = leadsData;
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }
    

    
    setFilteredLeads(filtered);
  }, []);

  // Fetch leads from API
  const fetchLeads = async (isAutomaticRefresh = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads?limit=1000'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const leadsData = data.leads || [];
        
        setLeads(leadsData);
        updateFilteredLeads(leadsData, activeFilter);
        updateStatsFromLeads(leadsData);
      } else {
        console.error('Failed to fetch leads:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setInitialLoad(false);
    }
  };

  // Fetch users for assignment (admin only)
  const fetchUsers = async () => {
    if (!isAdmin) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/auth/users'), {
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
  };



  useEffect(() => {
    const initializeLeads = async () => {
      await fetchLeads();
      
      // Ensure New leads are properly filtered on initial load
      if (activeFilter === 'New' && leads.length > 0) {
        updateFilteredLeads(leads, activeFilter);
      }
    };
    
    initializeLeads();
    
    // Listen for lead deletion events from other components
    const handleLeadDeleted = (event) => {
      fetchLeads(true);
    };
    
    // Listen for leads imported events from other components
    const handleLeadsImported = (event) => {
      fetchLeads(true);
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      fetchLeads(true);
    };
    
    window.addEventListener('leadDeleted', handleLeadDeleted);
    window.addEventListener('leadsImported', handleLeadsImported);
    window.addEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    
    return () => {
      window.removeEventListener('leadDeleted', handleLeadDeleted);
      window.removeEventListener('leadsImported', handleLeadsImported);
      window.removeEventListener('leadStatusUpdated', handleLeadStatusUpdated);
    };
  }, []);

  // Effect to update filtered leads when activeFilter or leads change
  useEffect(() => {
    if (leads.length > 0) {
      updateFilteredLeads(leads, activeFilter);
    } else if (leads.length === 0) {
      setFilteredLeads([]);
    }
  }, [activeFilter, leads, updateFilteredLeads]);

  const handleImport = () => {
    if (isAdmin) {
      fetchUsers();
      setShowUserSelectionModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };



  const handleUserConfirm = () => {
    if (!selectedUser) {
      return;
    }
    
    fileInputRef.current?.click();
    setShowUserSelectionModal(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';



    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    if (isAdmin && selectedUser) {
      formData.append('assignedTo', selectedUser);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {

        
        setSelectedUser(null);
        
        // Optimistically update the UI
        if (data.leads && data.leads.length > 0) {
          const newLeads = data.leads.map(lead => ({
            ...lead,
            createdAt: new Date().toISOString(),
            assignedTo: lead.assignedTo || (selectedUser ? { _id: selectedUser, name: users.find(u => u._id === selectedUser)?.name || 'Unknown User' } : null),
            createdBy: lead.createdBy || { _id: user._id, name: user.name }
          }));
          
          setLeads(prevLeads => [...newLeads, ...prevLeads]);
        }
        
        // Refresh data in background
        fetchLeads(true);
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('leadsImported', { 
          detail: { count: data.count } 
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/export/excel'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

      } else {

      }
    } catch (error) {

      console.error('Export error:', error);
    }
  };

  const handleDeleteLead = async (leadId) => {
    setDeletingLeads(prev => new Set(prev).add(leadId));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/leads/${leadId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Optimistically remove the lead from local state
        setLeads(prevLeads => prevLeads.filter(lead => lead._id !== leadId));
        
        // Update stats immediately
        setStats(prevStats => ({
          ...prevStats,
          total: prevStats.total - 1
        }));
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('leadDeleted', { 
          detail: { leadId: leadId } 
        }));
        

        
        // Refresh in background
        fetchLeads(true);
      } else {
        console.error('Failed to delete lead');

      }
    } catch (error) {
      console.error('Delete error:', error);

    } finally {
      setDeletingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      setProcessingLead(leadId);
      
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
        // Optimistically update the lead status
        setLeads(prevLeads => {
          const updatedLeads = prevLeads.map(lead => 
            lead._id === leadId 
              ? { ...lead, status: newStatus }
              : lead
          );
          
          // Update filtered leads immediately
          updateFilteredLeads(updatedLeads, activeFilter);
          
          return updatedLeads;
        });

        // Update stats immediately
        setStats(prevStats => {
          const newStats = { ...prevStats };
          
          // Decrease count from old status
          if (activeFilter !== 'All') {
            const oldStatus = leads.find(lead => lead._id === leadId)?.status;
            if (oldStatus && newStats[oldStatus.toLowerCase()] > 0) {
              newStats[oldStatus.toLowerCase()]--;
            }
          }
          
          // Increase count for new status
          if (newStats[newStatus.toLowerCase()] !== undefined) {
            newStats[newStatus.toLowerCase()]++;
          }
          
          return newStats;
        });

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('leadStatusUpdated', { 
          detail: { leadId: leadId, newStatus: newStatus } 
        }));

        // Refresh in background
        fetchLeads(true);
      } else {
        console.error('Failed to update lead status');
      }
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setProcessingLead(null);
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead({
      _id: lead._id,
      name: lead.name,
      phone: lead.phone || '',
      service: lead.service || '',
      status: lead.status,
      
      notes: lead.notes || '',

    });
    setShowEditModal(true);
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/leads/${editingLead._id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingLead)
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingLead(null);
        
        // Optimistically update the lead in local state
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead._id === editingLead._id 
              ? { ...lead, ...editingLead }
              : lead
          )
        );
        
        // Dispatch event to notify dashboard
        window.dispatchEvent(new CustomEvent('leadUpdated', { 
          detail: { lead: editingLead } 
        }));
        

        
        // Refresh in background
        fetchLeads(true);
      } else {
        console.error('Failed to update lead');
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return '#3B82F6';
      case 'Qualified': return '#10B981';
      case 'Negotiation': return '#F59E0B';
      case 'Closed': return '#059669';
      case 'Lost': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const filterLeads = (status) => {
    setActiveFilter(status);
    updateFilteredLeads(leads, status);
  };







  if (initialLoad) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading leads...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">



        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
        />
        
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Innovatiq Media Leads Management</h1>
            <p>Track, manage, and convert your leads into successful partnerships</p>
          </div>
          <div className="header-actions">
            <div className="quick-stats">
              <span className="stat-highlight">{stats.total} Total Leads</span>
              <span className="stat-highlight">{stats.new} New This Month</span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div 
            className={`stat-card total-leads ${activeFilter === 'All' ? 'active-filter' : ''}`}
            onClick={() => filterLeads('All')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Total Leads</p>
            </div>
          </div>

          <div 
            className={`stat-card new-leads ${activeFilter === 'New' ? 'active-filter' : ''}`}
            onClick={() => filterLeads('New')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.new}</h3>
              <p>New Leads</p>
            </div>
          </div>

          <div 
            className={`stat-card qualified-leads ${activeFilter === 'Qualified' ? 'active-filter' : ''}`}
            onClick={() => filterLeads('Qualified')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.qualified}</h3>
              <p>Qualified</p>
            </div>
          </div>

          <div 
            className={`stat-card negotiation-leads ${activeFilter === 'Negotiation' ? 'active-filter' : ''}`}
            onClick={() => filterLeads('Negotiation')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.negotiation}</h3>
              <p>In Negotiation</p>
            </div>
          </div>

          <div 
            className={`stat-card closed-leads ${activeFilter === 'Closed' ? 'active-filter' : ''}`}
            onClick={() => filterLeads('Closed')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.closed}</h3>
              <p>Closed</p>
            </div>
          </div>

          <div 
            className={`stat-card lost-leads ${activeFilter === 'Lost' ? 'active-filter' : ''}`}
            onClick={() => filterLeads('Lost')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.lost}</h3>
              <p>Lost</p>
            </div>
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <div className="section-title">
              <h2>
                {activeFilter === 'All' ? 'All Leads' :
                 activeFilter === 'New' ? 'New Leads' :
                 activeFilter === 'Qualified' ? 'Qualified Leads' :
                 activeFilter === 'Negotiation' ? 'Leads In Negotiation' :
                 activeFilter === 'Closed' ? 'Closed Leads' :
                 activeFilter === 'Lost' ? 'Lost Leads' : 'New Leads'}
              </h2>
              <p>
                {`Showing ${filteredLeads.length} ${activeFilter === 'All' ? 'total' : activeFilter.toLowerCase()} lead${filteredLeads.length !== 1 ? 's' : ''}`}
        
              </p>
            </div>
            <div className="section-filters">

            </div>
            <div className="section-actions">
              {isAdmin && (
                <button 
                  className={`import-button ${uploading ? 'uploading' : ''}`}
                  onClick={handleImport}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="mini-spinner"></div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  )}
                  {uploading ? 'Uploading...' : 'Import'}
                </button>
              )}
              {isAdmin && (
                <button className="export-button" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  Export
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            {filteredLeads.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Uploaded By</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead._id}>
                      <td>
                        <div className="lead-name">
                          <div className="lead-avatar">
                            <span>{lead.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span>{lead.name}</span>
                        </div>
                      </td>
                      <td>{lead.phone}</td>
                      <td>{lead.service}</td>
                      <td>
                        <select
                          className={`status-select ${processingLead === lead._id ? 'processing' : ''}`}
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          style={{ backgroundColor: getStatusColor(lead.status) }}
                          disabled={processingLead === lead._id}
                        >
                          <option value="New">New</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Closed">Closed</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </td>
                      <td>
                        {lead.assignedTo && (lead.assignedTo.name || lead.assignedTo._id) ? (
                          <span className="uploaded-by assigned" title={`Assigned to ${lead.assignedTo.name || 'User'}`}>
                            {lead.assignedTo.name || 'User'}
                          </span>
                        ) : (
                          <span className="uploaded-by unassigned" title="No user assigned">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        {lead.createdBy && (lead.createdBy.name || lead.createdBy._id) ? (
                          <span className="uploaded-by">
                            {lead.createdBy.name || 'User'}
                          </span>
                        ) : (
                          <span className="uploaded-by unknown" title="User information not available">
                            System
                          </span>
                        )}
                      </td>
                      <td>{new Date(lead.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEditLead(lead)}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          {isAdmin && (
                            <button 
                              className={`action-btn delete ${deletingLeads.has(lead._id) ? 'deleting' : ''}`}
                              onClick={() => handleDeleteLead(lead._id)}
                              disabled={deletingLeads.has(lead._id)}
                            >
                              {deletingLeads.has(lead._id) ? (
                                <div className="mini-spinner"></div>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3>No leads found</h3>
                <p>Upload your leads data or add new leads to get started.</p>
                <button className="add-button" onClick={handleImport}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Upload Leads
                </button>
              </div>
            )}
          </div>
        </div>



        {/* Edit Lead Modal */}
        {showEditModal && editingLead && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Lead</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowEditModal(false)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateLead} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={editingLead.name}
                      onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editingLead.phone}
                      onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Service</label>
                    <input
                      type="text"
                      value={editingLead.service}
                      onChange={(e) => setEditingLead({...editingLead, service: e.target.value})}
                      placeholder="e.g., Web Design, SEO, Marketing"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editingLead.status}
                      onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                    >
                      <option value="New">New</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Closed">Closed</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>

                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={editingLead.notes}
                    onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                    rows={3}
                    placeholder="Add any notes about this lead..."
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Selection Modal */}
        {showUserSelectionModal && (
          <div className="modal-overlay" onClick={() => setShowUserSelectionModal(false)}>
            <div className="user-selection-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Select User to Assign Leads</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowUserSelectionModal(false)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              
              <div className="user-selection-content">
                <p>Please select a user to assign the imported leads to:</p>
                
                <div className="user-select-wrapper">
                  <label className="user-select-label">Select User *</label>
                  <select
                    className="user-select"
                    value={selectedUser || ''}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                  >
                    <option value="">Choose a user...</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="user-selection-help">
                  <h4>Note:</h4>
                  <ul>
                    <li>The selected user will be assigned to all imported leads</li>
                    <li>Only you (admin) and the assigned user will be able to see these leads</li>
                    <li>You can change the assignment later by editing individual leads</li>
                  </ul>
                </div>
              </div>
              
              <div className="user-selection-actions">
                <button 
                  type="button"
                  className="user-selection-btn secondary"
                  onClick={() => setShowUserSelectionModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="user-selection-btn primary"
                  onClick={handleUserConfirm}
                  disabled={!selectedUser}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Leads; 