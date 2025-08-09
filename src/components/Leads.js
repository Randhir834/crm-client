import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';
import './Dashboard.css';

const Leads = () => {
  const { isAdmin, user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load
  const [uploading, setUploading] = useState(false); // Separate state for file upload
  const [deletingLeads, setDeletingLeads] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // Track automatic refresh state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [importErrors, setImportErrors] = useState({ message: '', errors: [], duplicates: [], fileError: null });
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
  const [selectedFile, setSelectedFile] = useState(null);
  


  // Fetch leads from API
  const fetchLeads = async (isAutomaticRefresh = false) => {
    if (isAutomaticRefresh) {
      setRefreshing(true);
    }
    
    try {
      const token = localStorage.getItem('token');
      // Fetch all leads without pagination to show all data
      const response = await fetch(getApiUrl('api/leads?limit=1000'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const leadsData = data.leads || [];
        
        // Only update state if data has actually changed to prevent flicker
        setLeads(prevLeads => {
          // Check if the data is actually different
          if (JSON.stringify(prevLeads) === JSON.stringify(leadsData)) {
            return prevLeads; // No change needed
          }
          return leadsData;
        });
        
        // Maintain current filter when refreshing
        let filtered;
        if (activeFilter === 'All') {
          filtered = leadsData; // Show all leads
        } else {
          filtered = leadsData.filter(lead => lead.status === activeFilter);
        }
        setFilteredLeads(filtered);
      } else {
        console.error('Failed to fetch leads:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setInitialLoad(false);
      if (isAutomaticRefresh) {
        setRefreshing(false);
      }
    }
  };

  // Fetch lead statistics
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/leads/stats'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prevStats => {
          // Only update if stats have actually changed
          if (JSON.stringify(prevStats) === JSON.stringify(data.stats)) {
            return prevStats;
          }
          return data.stats;
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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
      await fetchStats();
      
      // Ensure New leads are properly filtered on initial load
      if (activeFilter === 'New' && leads.length > 0) {
        const newLeads = leads.filter(lead => lead.status === 'New');
        setFilteredLeads(newLeads);

      }
    };
    
    initializeLeads();
    
    // Listen for lead deletion events from other components
    const handleLeadDeleted = (event) => {
      const { leadId } = event.detail;
  
      // Refresh leads list to show updated data
      fetchLeads(true); // Automatic refresh
      fetchStats();
    };
    
    // Listen for leads imported events from other components
    const handleLeadsImported = (event) => {
      const { count } = event.detail;
  
      // Refresh leads list to show new leads
      fetchLeads(true); // Automatic refresh
      fetchStats();
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      const { leadId, newStatus } = event.detail;
  
      // Refresh leads list to show updated status
      fetchLeads(true); // Automatic refresh
      fetchStats();
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
      let filtered;
      if (activeFilter === 'All') {
        filtered = leads; // Show all leads
      } else {
        filtered = leads.filter(lead => lead.status === activeFilter);
      }
      setFilteredLeads(filtered);
      
      
      // Special logging for New leads
      if (activeFilter === 'New') {
        const newLeads = leads.filter(lead => lead.status === 'New');

      }
    } else if (leads.length === 0) {
      // Clear filtered leads if no leads exist
      setFilteredLeads([]);
      
    }
  }, [activeFilter, leads]);

  const handleImport = () => {
    if (isAdmin) {
      // For admin, show user selection modal first
      fetchUsers();
      setShowUserSelectionModal(true);
    } else {
      // For regular users, directly trigger file selection
      fileInputRef.current?.click();
    }
  };

  const handleUserSelection = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setShowUserSelectionModal(false);
    
    // Clear the file input
    event.target.value = '';
  };

  const handleUserConfirm = () => {
    if (!selectedUser) {
      alert('Please select a user to assign the leads to.');
      return;
    }
    
    // Trigger file selection after user is selected
    fileInputRef.current?.click();
    setShowUserSelectionModal(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Clear the file input
    event.target.value = '';

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setImportErrors({
        message: 'File too large',
        errors: [],
        duplicates: [],
        fileError: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit.`
      });
      setShowErrorModal(true);
      return;
    }

    // Validate file type
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      setImportErrors({
        message: 'Invalid file type',
        errors: [],
        duplicates: [],
        fileError: `File type "${fileExtension}" is not supported. Please use ${allowedExtensions.join(', ')} files.`
      });
      setShowErrorModal(true);
      return;
    }



    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Add assigned user if admin selected one
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
        alert(`Successfully imported ${data.count} leads!`);
        
        // Clear the selected user after successful upload
        setSelectedUser(null);
        
        // Immediately add the new leads to the current list with proper user data
        if (data.leads && data.leads.length > 0) {
          const newLeads = data.leads.map(lead => ({
            ...lead,
            createdAt: new Date().toISOString(), // Ensure proper date formatting
            // Ensure proper user assignment data
            assignedTo: lead.assignedTo || (selectedUser ? { _id: selectedUser, name: users.find(u => u._id === selectedUser)?.name || 'Unknown User' } : null),
            createdBy: lead.createdBy || { _id: user._id, name: user.name, email: user.email }
          }));
          
          // Add new leads to the beginning of the list
          setLeads(prevLeads => [...newLeads, ...prevLeads]);
          
          // Update filtered leads based on current filter
          if (activeFilter === 'All') {
            setFilteredLeads(prevFiltered => [...newLeads, ...prevFiltered]);
          } else {
            const newFilteredLeads = newLeads.filter(lead => lead.status === activeFilter);
            setFilteredLeads(prevFiltered => [...newFilteredLeads, ...prevFiltered]);
          }
        }
        
        // Fetch fresh data to ensure everything is properly loaded
        await fetchLeads(true);
        
        // Update stats immediately
        await fetchStats();
        
        // Dispatch custom event to notify other components about new leads
        window.dispatchEvent(new CustomEvent('leadsImported', { 
          detail: { count: data.count } 
        }));
      } else {
        console.error('❌ Upload failed:', data);
        
        // Set error data for modal display
        setImportErrors({
          message: data.message || 'Error importing file',
          errors: data.errors || [],
          duplicates: data.duplicates || [],
          fileError: data.error || null,
          detectedColumns: data.detectedColumns || [] // Add detected columns to state
        });
        setShowErrorModal(true);
        
        // Also log to console for debugging
        if (data.errors) {
          console.error('Validation errors:', data.errors);
        }
        if (data.duplicates) {
          console.error('Duplicate emails:', data.duplicates);
        }
        if (data.error) {
          console.error('File processing error:', data.error);
        }
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Error uploading file. Please try again.';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setImportErrors({
        message: errorMessage,
        errors: [],
        duplicates: [],
        fileError: error.message || 'Unknown error occurred'
      });
      setShowErrorModal(true);
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
        alert('Error exporting leads');
      }
    } catch (error) {
      alert('Error exporting leads. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleDeleteLead = async (leadId) => {
    // Direct deletion without confirmation
    setDeletingLeads(prev => new Set(prev).add(leadId));

    // Set loading state for specific lead
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
        // Remove the lead from local state immediately for better UX
        setLeads(prevLeads => prevLeads.filter(lead => lead._id !== leadId));
        
        // Dispatch custom event to notify other components about the deletion
        window.dispatchEvent(new CustomEvent('leadDeleted', { 
          detail: { leadId: leadId } 
        }));
        
        // Automatically refresh leads list to show upcoming leads
        await fetchLeads(true);
        
        // Update stats without full refresh
        const statsResponse = await fetch(getApiUrl('api/leads/stats'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
        }

        // Lead deleted successfully - no page refresh needed
      } else {
        // Error deleting lead - no page refresh needed
        console.error('Failed to delete lead');
      }
    } catch (error) {
      console.error('Delete error:', error);
      // Error occurred - no page refresh needed
    } finally {
      // Remove loading state for specific lead
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
        // Get the updated lead data from the response
        const responseData = await response.json();
        const updatedLead = responseData.lead;
        
        // Single state update to prevent flicker
        setLeads(prevLeads => {
          const updatedLeads = prevLeads.map(lead => 
            lead._id === leadId 
              ? { ...lead, status: newStatus }
              : lead
          );
          
          // Immediately update filtered leads based on the new leads array
          const newFilteredLeads = updatedLeads.filter(lead => lead.status === activeFilter);
          setFilteredLeads(newFilteredLeads);
          
          if (activeFilter === 'New' && newStatus !== 'New') {
            console.log(`Lead moved from New to ${newStatus}. Next new lead is now immediately visible.`);
            if (newFilteredLeads.length > 0) {
              console.log(`Next new lead now visible: ${newFilteredLeads[0].name} (${newFilteredLeads[0].email})`);
            }
          }
          
          return updatedLeads;
        });

        // Update stats immediately
        const statsResponse = await fetch(getApiUrl('api/leads/stats'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(prevStats => {
            // Only update if stats have actually changed
            if (JSON.stringify(prevStats) === JSON.stringify(statsData.stats)) {
              return prevStats;
            }
            return statsData.stats;
          });
        }

        // Dispatch custom event to notify other components about the status change
        window.dispatchEvent(new CustomEvent('leadStatusUpdated', { 
          detail: { leadId: leadId, newStatus: newStatus } 
        }));

        // Show success message with context-aware messaging about immediate updates
        if (newStatus === 'Qualified') {
          if (activeFilter === 'New') {
            alert(`✅ Lead qualified successfully! The lead has been moved to Qualified status and will no longer appear in New Leads. The next new lead is now immediately visible in the table above.`);
          } else {
            alert(`✅ Lead status updated to ${newStatus}! This lead has been automatically converted to a customer.`);
          }
          
          // Dispatch event to notify dashboard about customer conversion
          window.dispatchEvent(new CustomEvent('customerAdded', { 
            detail: { count: 1 } 
          }));
        } else {
          if (activeFilter === 'New') {
            alert(`✅ Lead status updated to ${newStatus}! The lead has been moved and will no longer appear in New Leads. The next new lead is now immediately visible in the table above.`);
          } else {
            alert(`✅ Lead status updated to ${newStatus}! The change is immediately reflected in your view.`);
          }
        }

        // No background refresh needed - state is already updated correctly

      } else {
        const data = await response.json();
        alert(data.message || 'Error updating lead status');
      }
    } catch (error) {
      alert('Error updating lead status. Please try again.');
      console.error('Status update error:', error);
    } finally {
      setProcessingLead(null);
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead({
      _id: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      status: lead.status,
      source: lead.source || '',
      notes: lead.notes || ''
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
        
        // Dispatch event to notify dashboard
        window.dispatchEvent(new CustomEvent('leadUpdated', { 
          detail: { lead: editingLead } 
        }));
        
        // Automatically refresh leads list to show updated data
        await fetchLeads(true);
        await fetchStats(); // Refresh stats
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update lead');
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead');
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
    let filtered;
    if (status === 'All') {
      filtered = leads; // Show all leads
    } else {
      filtered = leads.filter(lead => lead.status === status);
    }
    setFilteredLeads(filtered);
    console.log(`Filtering leads for status "${status}": Found ${filtered.length} leads`);
    console.log('All leads before filtering:', leads.map(lead => ({ id: lead._id, name: lead.name, status: lead.status })));
    console.log('Filtered leads:', filtered.map(lead => ({ id: lead._id, name: lead.name, status: lead.status })));
  };

  const getFilterButtonClass = (status) => {
    return `stat-card ${status}-leads ${activeFilter === status ? 'active-filter' : ''}`;
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
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
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
            <div className="section-actions">
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
            {refreshing && (
              <div className="refresh-indicator">
                <div className="mini-spinner"></div>
                <span>Refreshing leads...</span>
              </div>
            )}
            

            
            {filteredLeads.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Phone</th>
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
                      <td>{lead.company}</td>
                      <td>{lead.email}</td>
                      <td>{lead.phone}</td>
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

        {/* Import Error Modal */}
        {showErrorModal && (
          <div className="modal-overlay" onClick={() => setShowErrorModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Import Errors</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowErrorModal(false)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              
              <div className="modal-content">
                <div className="error-message">
                  <p><strong>{importErrors.message}</strong></p>
                  {importErrors.fileError && (
                    <p className="file-error">File Error: {importErrors.fileError}</p>
                  )}
                </div>
                
                {importErrors.detectedColumns && (
                  <div className="detected-columns-info" style={{marginBottom: 12}}>
                    <strong>Detected Columns:</strong>
                    <ul style={{margin: '6px 0 0 0', paddingLeft: 18}}>
                      {importErrors.detectedColumns.map((col, idx) => (
                        <li key={idx}>{col}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {importErrors.errors.length > 0 && (
                  <div className="validation-errors">
                    <h4>Validation Errors ({importErrors.errors.length})</h4>
                    <div className="error-list">
                      {importErrors.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="error-item">
                          <span className="error-icon">⚠️</span>
                          <span className="error-text">{error}</span>
                        </div>
                      ))}
                      {importErrors.errors.length > 10 && (
                        <div className="error-item">
                          <span className="error-text">
                            ... and {importErrors.errors.length - 10} more errors
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {importErrors.duplicates.length > 0 && (
                  <div className="duplicate-errors">
                    <h4>Duplicate Emails ({importErrors.duplicates.length})</h4>
                    <div className="error-list">
                      {importErrors.duplicates.slice(0, 10).map((email, index) => (
                        <div key={index} className="error-item">
                          <span className="error-icon">📧</span>
                          <span className="error-text">{email}</span>
                        </div>
                      ))}
                      {importErrors.duplicates.length > 10 && (
                        <div className="error-item">
                          <span className="error-text">
                            ... and {importErrors.duplicates.length - 10} more duplicates
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="import-help">
                  <h4>How to fix these errors:</h4>
                  <ul>
                    <li><strong>Name:</strong> Must be at least 2 characters long</li>
                    <li><strong>Email:</strong> Must be a valid email format (e.g., user@example.com)</li>
                    <li><strong>Status:</strong> Must be one of: New, Qualified, Negotiation, Closed, Lost</li>
                    <li><strong>Duplicates:</strong> Remove or update existing leads with the same email</li>
                  </ul>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setShowErrorModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={editingLead.email}
                      onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
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
                    <label>Company</label>
                    <input
                      type="text"
                      value={editingLead.company}
                      onChange={(e) => setEditingLead({...editingLead, company: e.target.value})}
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
                  <div className="form-group">
                    <label>Source</label>
                    <input
                      type="text"
                      value={editingLead.source}
                      onChange={(e) => setEditingLead({...editingLead, source: e.target.value})}
                      placeholder="e.g., Website, Referral, Social Media"
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
                        {user.name} ({user.email})
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