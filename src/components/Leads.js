import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';
import './Dashboard.css';

const Leads = () => {
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load
  const [uploading, setUploading] = useState(false); // Separate state for file upload
  const [deletingLeads, setDeletingLeads] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // Track automatic refresh state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [importErrors, setImportErrors] = useState({ 
    message: '', 
    errors: [], 
    duplicateEmails: [], 
    existingEmails: [], 
    fileError: null, 
    detectedColumns: [],
    headerRow: [],
    suggestion: null,
    summary: null
  });
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
        setLeads(leadsData);
        
        // Debug: Log all leads data
        console.log('All leads data:', leadsData);
        console.log('Total leads fetched:', leadsData.length);
        
        // Maintain current filter when refreshing
        let filtered;
        if (activeFilter === 'All') {
          filtered = leadsData; // Show all leads
        } else {
          filtered = leadsData.filter(lead => lead.status === activeFilter);
        }
        setFilteredLeads(filtered);
        console.log(`Filtered leads for ${activeFilter}: ${filtered.length} leads`);
        console.log('Filtered leads data:', filtered);
        
        console.log('Leads refreshed successfully:', leadsData.length || 0, 'leads loaded');
        
        // Show success message for automatic refresh
        if (isAutomaticRefresh) {
          console.log('Upcoming leads loaded automatically');
        }
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
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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
        console.log(`Initial load: Set New leads filter with ${newLeads.length} leads`);
      }
    };
    
    initializeLeads();
    
    // Listen for lead deletion events from other components
    const handleLeadDeleted = (event) => {
      const { leadId } = event.detail;
      console.log('Lead deletion event received:', leadId);
      // Refresh leads list to show updated data
      fetchLeads(true); // Automatic refresh
      fetchStats();
    };
    
    // Listen for leads imported events from other components
    const handleLeadsImported = (event) => {
      const { count } = event.detail;
      console.log('Leads imported event received:', count);
      // Refresh leads list to show new leads
      fetchLeads(true); // Automatic refresh
      fetchStats();
    };
    
    // Listen for lead status update events from other components
    const handleLeadStatusUpdated = (event) => {
      const { leadId, newStatus } = event.detail;
      console.log('Lead status update event received:', leadId, newStatus);
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
      console.log(`useEffect: Updated filtered leads for "${activeFilter}": ${filtered.length} leads`);
      console.log('All leads statuses:', leads.map(lead => ({ id: lead._id, name: lead.name, status: lead.status })));
      
      // Special logging for New leads
      if (activeFilter === 'New') {
        const newLeads = leads.filter(lead => lead.status === 'New');
        console.log(`All leads with "New" status: ${newLeads.length}`, newLeads.map(lead => ({ id: lead._id, name: lead.name, status: lead.status })));
      }
    } else if (leads.length === 0) {
      // Clear filtered leads if no leads exist
      setFilteredLeads([]);
      console.log(`useEffect: No leads available, cleared filtered leads for "${activeFilter}"`);
    }
  }, [activeFilter, leads]);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Clear the file input for future uploads
    event.target.value = '';

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setImportErrors({
        message: 'File too large',
        errors: [],
        duplicateEmails: [],
        existingEmails: [],
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
        duplicateEmails: [],
        existingEmails: [],
        fileError: `File type "${fileExtension}" is not supported. Please use ${allowedExtensions.join(', ')} files.`
      });
      setShowErrorModal(true);
      return;
    }

    console.log('📁 Uploading file:', {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      type: file.type,
      extension: fileExtension
    });

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

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
      console.log('📊 Import response:', data);

      if (response.ok && data.success) {
        // Success case - show success message with import stats
        const successMessage = data.message || `Successfully imported ${data.validLeads} leads!`;
        
        // Show a more detailed success message if there were any issues
        if (data.summary && (data.summary.duplicates > 0 || data.summary.existing > 0 || data.summary.invalid > 0)) {
          const details = [];
          if (data.summary.invalid > 0) details.push(`${data.summary.invalid} invalid`);
          if (data.summary.duplicates > 0) details.push(`${data.summary.duplicates} duplicates`);
          if (data.summary.existing > 0) details.push(`${data.summary.existing} already exist`);
          
          alert(`${successMessage}\n\nNote: Some leads were not imported (${details.join(', ')}).\nCheck the import summary for details.`);
          
          // Show the error modal with the partial success information
          setImportErrors({
            message: `${successMessage} (with some issues)`,
            errors: data.errors || [],
            duplicateEmails: data.duplicateEmails || [],
            existingEmails: data.existingEmails || [],
            detectedColumns: data.detectedColumns || [],
            headerRow: data.headerRow || [],
            summary: data.summary || {}
          });
          setShowErrorModal(true);
        } else {
          // Clean success with no issues
          alert(successMessage);
        }
        
        // Dispatch custom event to notify other components about new leads
        window.dispatchEvent(new CustomEvent('leadsImported', { 
          detail: { count: data.validLeads || 0 } 
        }));
        
        // Refresh the leads list and stats
        await fetchLeads();
        await fetchStats();
        
        // If we're currently on New leads filter, refresh the filtered view
        if (activeFilter === 'New') {
          const newLeads = leads.filter(lead => lead.status === 'New');
          setFilteredLeads(newLeads);
          console.log(`After import: Updated New leads view with ${newLeads.length} leads`);
        }
      } else {
        // Error case - show error modal with details
        console.error('❌ Upload failed:', data);
        
        // Set error data for modal display with enhanced error information
        setImportErrors({
          message: data.message || 'Error importing file',
          errors: data.errors || [],
          duplicateEmails: data.duplicateEmails || [],
          existingEmails: data.existingEmails || [],
          fileError: data.error || null,
          detectedColumns: data.detectedColumns || [],
          headerRow: data.headerRow || [],
          suggestion: data.suggestion || null
        });
        setShowErrorModal(true);
        
        // Log detailed error information for debugging
        if (data.errors && data.errors.length) {
          console.error(`Validation errors (${data.errors.length}):`, data.errors);
        }
        if (data.duplicateEmails && data.duplicateEmails.length) {
          console.error(`Duplicate emails (${data.duplicateEmails.length}):`, data.duplicateEmails);
        }
        if (data.existingEmails && data.existingEmails.length) {
          console.error(`Existing emails (${data.existingEmails.length}):`, data.existingEmails);
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
        duplicateEmails: [],
        existingEmails: [],
        fileError: error.message || 'Unknown error occurred'
      });
      setShowErrorModal(true);
    } finally {
      setUploading(false);
    }
  };



  const handleExport = async (status = null) => {
    try {
      const token = localStorage.getItem('token');
      
      // Build the export URL with optional status filter
      let exportUrl = getApiUrl('api/leads/export/excel');
      if (status && status !== 'All') {
        exportUrl += `?status=${encodeURIComponent(status)}`;
      }
      
      console.log(`📤 Exporting leads${status ? ` with status: ${status}` : ''}`);
      
      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Check content type to ensure we received an Excel file
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
          const errorText = await response.text();
          console.error('Export returned wrong content type:', contentType, errorText);
          alert('Error: Server did not return a valid Excel file. Please try again later.');
          return;
        }
        
        const blob = await response.blob();
        if (blob.size === 0) {
          alert('No leads found to export.');
          return;
        }
        
        // Get filename from Content-Disposition header if available
        let filename = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
          const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        }
        
        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Export successful: ${filename}`);
      } else if (response.status === 404) {
        alert('No leads found to export.');
      } else {
        // Try to get detailed error message
        let errorMessage = 'Error exporting leads';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If we can't parse JSON, use status text
          errorMessage = `Error exporting leads: ${response.statusText || response.status}`;
        }
        
        alert(errorMessage);
        console.error('Export failed:', response.status, response.statusText);
      }
    } catch (error) {
      alert('Error exporting leads. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

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

        // Show success message
        alert('Lead deleted successfully! Upcoming leads have been automatically loaded.');
      } else {
        alert('Error deleting lead');
        // Refresh data if delete failed
        fetchLeads();
        fetchStats();
      }
    } catch (error) {
      alert('Error deleting lead. Please try again.');
      console.error('Delete error:', error);
      // Refresh data if there was an error
      fetchLeads();
      fetchStats();
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
      console.log(`Processing lead ${leadId}: ${newStatus}`);
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
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead._id === leadId 
              ? { ...lead, status: newStatus }
              : lead
          )
        );

        // Update the main leads list with the new status immediately
        setLeads(prevLeads => {
          const updatedLeads = prevLeads.map(lead => 
            lead._id === leadId 
              ? { ...lead, status: newStatus }
              : lead
          );
          
          // Immediately update filtered leads based on the new leads array
          const newFilteredLeads = updatedLeads.filter(lead => lead.status === activeFilter);
          setFilteredLeads(newFilteredLeads);
          
          console.log(`Lead ${leadId} status updated to ${newStatus}`);
          console.log(`Updated ${activeFilter} leads count: ${newFilteredLeads.length}`);
          
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
          setStats(statsData.stats);
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

        // Refresh data in background to ensure everything is in sync
        setTimeout(async () => {
          await fetchLeads(true);
        }, 500);

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
                <div className="dropdown">
                  <button className="export-button" onClick={() => handleExport(activeFilter)}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    Export {activeFilter !== 'All' ? activeFilter : ''} Leads
                  </button>
                </div>
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
                    <th>Source</th>
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
                      <td>{lead.source}</td>
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
                <h3>{importErrors.summary ? "Import Summary" : "Import Errors"}</h3>
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
                <div className={`error-message ${importErrors.summary ? "success-message" : ""}`}>
                  <p><strong>{importErrors.message}</strong></p>
                  {importErrors.fileError && (
                    <p className="file-error">File Error: {importErrors.fileError}</p>
                  )}
                </div>
                
                {/* **MODIFIED**: Display detected columns on error for easier debugging */}
                {importErrors.detectedColumns && importErrors.detectedColumns.length > 0 && (
                  <div className="detected-columns-info" style={{marginBottom: 12, background: '#f8f8f8', padding: '8px 12px', borderRadius: '4px'}}>
                    <strong>Detected Columns:</strong>
                    <ul style={{margin: '6px 0 0 0', paddingLeft: 18, listStyleType: 'disc'}}>
                      {importErrors.detectedColumns.map((col, idx) => (
                        <li key={idx}>{col}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Import Summary (if partial success) */}
                {importErrors.summary && (
                  <div className="import-summary" style={{marginBottom: 16}}>
                    <h4>Import Summary:</h4>
                    <ul style={{margin: '6px 0 0 0', paddingLeft: 18}}>
                      <li><strong>Total leads processed:</strong> {importErrors.summary.total || 0}</li>
                      <li><strong>Successfully imported:</strong> {importErrors.summary.valid || 0}</li>
                      {importErrors.summary.invalid > 0 && (
                        <li><strong>Invalid leads:</strong> {importErrors.summary.invalid}</li>
                      )}
                      {importErrors.summary.duplicates > 0 && (
                        <li><strong>Duplicate emails in file:</strong> {importErrors.summary.duplicates}</li>
                      )}
                      {importErrors.summary.existing > 0 && (
                        <li><strong>Already existing in database:</strong> {importErrors.summary.existing}</li>
                      )}
                    </ul>
                  </div>
                )}
                
                {/* Suggestion from backend */}
                {importErrors.suggestion && (
                  <div className="suggestion-info" style={{marginBottom: 16}}>
                    <h4>Suggestion:</h4>
                    <p>{importErrors.suggestion}</p>
                  </div>
                )}
                
                {/* Header row from file
                {importErrors.headerRow && importErrors.headerRow.length > 0 && (
                  <div className="header-row-info" style={{marginBottom: 12}}>
                    <strong>Header Row:</strong>
                    <ul style={{margin: '6px 0 0 0', paddingLeft: 18}}>
                      {importErrors.headerRow.map((col, idx) => (
                        <li key={idx}>{col || '<empty>'}</li>
                      ))}
                    </ul>
                  </div>
                )} */}
                
                {importErrors.errors && importErrors.errors.length > 0 && (
                  <div className="validation-errors">
                    <h4>Validation Errors ({importErrors.errors.length})</h4>
                    <div className="error-list">
                      {importErrors.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="error-item">
                          <span className="error-icon">⚠️</span>
                          <span className="error-text">
                            {typeof error === 'object' && error.row ? 
                              <><strong>Row {error.row}:</strong> {error.message}</> : 
                              error}
                          </span>
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
                
                {/* Duplicate emails within file */}
                {importErrors.duplicateEmails && importErrors.duplicateEmails.length > 0 && (
                  <div className="duplicate-errors">
                    <h4>Duplicate Emails in File ({importErrors.duplicateEmails.length})</h4>
                    <div className="error-list">
                      {importErrors.duplicateEmails.slice(0, 10).map((dup, index) => (
                        <div key={index} className="error-item">
                          <span className="error-icon">📧</span>
                          <span className="error-text">
                            <strong>{typeof dup === 'object' ? dup.email : dup}</strong>
                            {typeof dup === 'object' && dup.count && ` - ${dup.count} occurrences`}
                            {typeof dup === 'object' && dup.rows && ` (rows: ${dup.rows.slice(0, 3).join(', ')}${dup.rows.length > 3 ? '...' : ''})`}
                          </span>
                        </div>
                      ))}
                      {importErrors.duplicateEmails.length > 10 && (
                        <div className="error-item">
                          <span className="error-text">
                            ... and {importErrors.duplicateEmails.length - 10} more duplicates
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Existing emails in database */}
                {importErrors.existingEmails && importErrors.existingEmails.length > 0 && (
                  <div className="existing-errors">
                    <h4>Already Existing in Database ({importErrors.existingEmails.length})</h4>
                    <div className="error-list">
                      {importErrors.existingEmails.slice(0, 10).map((existing, index) => (
                        <div key={index} className="error-item">
                          <span className="error-icon">🔄</span>
                          <span className="error-text">
                            <strong>{typeof existing === 'object' ? existing.email : existing}</strong>
                            {typeof existing === 'object' && existing.name && existing.existingName && 
                              ` - New: ${existing.name}, Existing: ${existing.existingName}`}
                          </span>
                        </div>
                      ))}
                      {importErrors.existingEmails.length > 10 && (
                        <div className="error-item">
                          <span className="error-text">
                            ... and {importErrors.existingEmails.length - 10} more existing emails
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
                    <li><strong>Duplicates:</strong> Remove duplicate emails from your file</li>
                    <li><strong>Existing Emails:</strong> Update existing leads instead of importing as new</li>
                    <li><strong>File Format:</strong> Ensure file is CSV, XLSX, or XLS and properly formatted</li>
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
      </div>
    </Layout>
  );
};

export default Leads;