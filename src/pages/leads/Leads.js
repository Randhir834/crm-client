import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { getApiUrl } from '../../services/api';
import '../../styles/global.css';
import './Leads.css';

const Leads = () => {
  const { isAdmin, user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingLeads, setDeletingLeads] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);


  const [filteredLeads, setFilteredLeads] = useState([]);



  const fileInputRef = useRef(null);
  
  // New state for user selection modal
  const [showUserSelectionModal, setShowUserSelectionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);




  // Memoized function to update filtered leads
  const updateFilteredLeads = useCallback((leadsData) => {
    // Show all leads (no filtering)
    setFilteredLeads(leadsData);
  }, []);

  // Fetch leads from API
  const fetchLeads = useCallback(async (silent = false) => {
    try {
      const token = localStorage.getItem('token');
      // Request ALL leads using the dedicated endpoint
      const response = await fetch(getApiUrl('api/leads/all?limit=10000'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const leadsData = data.leads || [];
        
        if (!silent) {
          console.log('📊 Fetched leads data:', {
            total: leadsData.length,
            sampleData: leadsData.slice(0, 3).map(l => ({ name: l.name, status: l.status })),
            note: 'All leads fetched (no pagination limit)'
          });
        }
        
        setLeads(leadsData);
        updateFilteredLeads(leadsData);
      } else {
        console.error('Failed to fetch leads:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setInitialLoad(false);
    }
  }, [updateFilteredLeads]);

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
      
              // Ensure all leads are properly displayed on initial load
        if (leads.length > 0) {
          updateFilteredLeads(leads);
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
    

    
    window.addEventListener('leadDeleted', handleLeadDeleted);
    window.addEventListener('leadsImported', handleLeadsImported);
    
    return () => {
      window.removeEventListener('leadDeleted', handleLeadDeleted);
      window.removeEventListener('leadsImported', handleLeadsImported);
    };
  }, [fetchLeads, leads, updateFilteredLeads]);

  // Effect to update filtered leads when leads change
  useEffect(() => {
    if (leads.length > 0) {
      updateFilteredLeads(leads);
    } else if (leads.length === 0) {
      setFilteredLeads([]);
    }
  }, [leads, updateFilteredLeads]);

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

    // Reset file input for re-uploads
    event.target.value = '';

    console.log('🚀 Starting file upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      selectedUser: selectedUser
    });

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Add assigned user if admin has selected one
    if (isAdmin && selectedUser) {
      formData.append('assignedTo', selectedUser);
      console.log('👤 Adding assignedTo:', selectedUser);
    }

    try {
      const token = localStorage.getItem('token');
      console.log('📤 Sending upload request to server...');
      
      const response = await fetch(getApiUrl('api/leads/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('📥 Upload response received:', data);

      if (response.ok) {
        console.log('✅ Upload successful!', {
          count: data.count,
          totalLeads: data.leads ? data.leads.length : 0
        });
        
        setSelectedUser(null);
        
        // Log uploaded leads data for debugging
        if (data.leads && data.leads.length > 0) {
          console.log('🔍 Uploaded leads data:');
          data.leads.forEach((lead, index) => {
            console.log(`  Lead ${index + 1}: ${lead.name} → Status: "${lead.status}"`);
          });
        }
        
        // Optimistically update the UI
        if (data.leads && data.leads.length > 0) {
          const newLeads = data.leads.map(lead => ({
            ...lead,
            createdAt: new Date().toISOString(),
            assignedTo: lead.assignedTo || (selectedUser ? { _id: selectedUser, name: users.find(u => u._id === selectedUser)?.name || 'Unknown User' } : null),
            createdBy: lead.createdBy || { _id: user._id, name: user.name }
          }));
          
          console.log('🎯 Adding leads to UI:', newLeads.map(l => ({ name: l.name, status: l.status })));
          setLeads(prevLeads => [...newLeads, ...prevLeads]);
        }
        
        // Refresh data in background to ensure consistency
        console.log('🔄 Refreshing leads data...');
        fetchLeads(true);
        
        // Dispatch custom event for notifications
        window.dispatchEvent(new CustomEvent('leadsImported', { 
          detail: { 
            count: data.count
          } 
        }));
      } else {
        // Handle upload errors
        console.error('❌ Upload failed:', {
          status: response.status,
          message: data.message,
          error: data.error
        });
        
        alert(`Upload failed: ${data.message || 'Unknown error occurred'}. Please check the console for details.`);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`Upload error: ${error.message}. Please check your internet connection and try again.`);
    } finally {
      setUploading(false);
      console.log('🏁 Upload process completed');
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



  const handleEditLead = (lead) => {
    setEditingLead({
      _id: lead._id,
      name: lead.name,
      phone: lead.phone || '',
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











  if (initialLoad) {
    return (
      <Layout>
        <LoadingSpinner message="Loading leads..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="leads-container">
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
        />
        
        <div className="page-header">
          <div className="header-content">
            <h2>Innovatiq Media Leads Management</h2>
            <p>Track, manage, and convert your leads into successful partnerships</p>
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <div className="section-title">
              <h3>All Leads</h3>
              <p>
                {`Showing ${filteredLeads.length} total leads (All uploaded leads displayed)`}
              </p>
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
                    <th>NAME</th>
                    <th>PHONE</th>
                    <th>SERVICE</th>
                    <th>ASSIGNED TO</th>
                    <th>UPLOADED BY</th>
                    <th>CREATED</th>
                    <th>ACTIONS</th>
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
                      <td>
                        <div className="service-cell">
                          {lead.notes ? (
                            <span className="service-text" title={lead.notes}>
                              {lead.notes}
                            </span>
                          ) : (
                            <span className="no-service">No service</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {lead.assignedTo && (lead.assignedTo.name || lead.assignedTo._id) ? (
                          <span className="assigned-badge" title={`Assigned to ${lead.assignedTo.name || 'User'}`}>
                            {lead.assignedTo.name || 'User'}
                          </span>
                        ) : (
                          <span className="unassigned-badge" title="No user assigned">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        {lead.createdBy && (lead.createdBy.name || lead.createdBy._id) ? (
                          <span className="uploaded-by-badge">
                            {lead.createdBy.name || 'User'}
                          </span>
                        ) : (
                          <span className="uploaded-by-badge unknown" title="User information not available">
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