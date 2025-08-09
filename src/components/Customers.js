import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { getApiUrl } from '../config/api';

const Customers = () => {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    status: 'active',
    notes: ''
  });

  // Fetch customers data
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/customers'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        console.error('Failed to fetch customers');
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('api/customers'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCustomer)
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewCustomer({
                name: '',
      phone: '',
      status: 'active',
      notes: ''
        });
        
        // Dispatch event to notify dashboard
        window.dispatchEvent(new CustomEvent('customerAdded', { 
          detail: { count: 1 } 
        }));
        
        fetchCustomers(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl(`api/customers/${customerId}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

              if (response.ok) {
        // Find the customer to check if it was active
        const customer = customers.find(c => c._id === customerId);
        const wasActive = customer && customer.status === 'active';
        
        // Dispatch event to notify dashboard
        window.dispatchEvent(new CustomEvent('customerDeleted', { 
          detail: { customerId, wasActive } 
        }));
        
        fetchCustomers(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete customer');
      }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer');
      }
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer({
      _id: customer._id,
      name: customer.name,
      phone: customer.phone || '',
      status: customer.status,
      notes: customer.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/customers/${editingCustomer._id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingCustomer)
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingCustomer(null);
        
        // Dispatch event to notify dashboard
        window.dispatchEvent(new CustomEvent('customerUpdated', { 
          detail: { customer: editingCustomer } 
        }));
        
        fetchCustomers(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer');
    }
  };

  const handleStatusChange = async (customerId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`api/customers/${customerId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Find the customer to check previous status
        const customer = customers.find(c => c._id === customerId);
        const wasActive = customer && customer.status === 'active';
        const isActive = newStatus === 'active';
        
        // Update local state
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer._id === customerId 
              ? { ...customer, status: newStatus }
              : customer
          )
        );
        
        // Update dashboard stats if status changed from active to inactive or vice versa
        if (wasActive !== isActive) {
          window.dispatchEvent(new CustomEvent('customerStatusChanged', { 
            detail: { customerId, wasActive, isActive } 
          }));
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update customer status');
      }
    } catch (error) {
      console.error('Error updating customer status:', error);
      alert('Error updating customer status');
    }
  };

  const exportData = async () => {
    try {
      // Create CSV content from customers data
      const csvContent = [
        ['Name', 'Phone', 'Status', 'Joined Date', 'Notes'],
        ...customers.map(customer => [
          customer.name,
          customer.phone,
          customer.status,
          formatDate(customer.createdAt),
          customer.notes || ''
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export customers data');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#27ae60';
      case 'inactive':
        return '#e74c3c';
      case 'pending':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCustomers = customers;

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading customers...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Innovatiq Media Customers Management</h1>
            <p>Manage and track your Innovatiq Media customers effectively</p>
          </div>
        </div>



        <div className="content-section">
          <div className="section-header">
            <h2>Recent Customers</h2>
            <div className="section-actions">
              <button 
                className="import-button"
                onClick={() => setShowAddModal(true)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add Customer
              </button>
              <button className="export-button" onClick={exportData}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Export
              </button>
            </div>
          </div>

          <div className="table-container">
            {filteredCustomers.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>


                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id}>
                      <td>
                        <div className="lead-name">
                          <div className="lead-avatar">
                            <span>{customer.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span>{customer.name}</span>
                        </div>
                      </td>


                      <td>{customer.phone}</td>
                      <td>
                        <select
                          className="status-select"
                          value={customer.status}
                          onChange={(e) => handleStatusChange(customer._id, e.target.value)}
                          style={{ backgroundColor: getStatusColor(customer.status) }}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                        </select>
                      </td>
                      <td>{formatDate(customer.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          {isAdmin && (
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteCustomer(customer._id)}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                              </svg>
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
                <div className="empty-icon">👥</div>
                <h3>No Customers Found</h3>
                <p>Add your first customer to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Customer Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Customer</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowAddModal(false)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddCustomer} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      required
                    />
                  </div>

                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    />
                  </div>

                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newCustomer.status}
                    onChange={(e) => setNewCustomer({...newCustomer, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                    rows={3}
                    placeholder="Add any notes about this customer..."
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditModal && editingCustomer && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Customer</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowEditModal(false)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateCustomer} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={editingCustomer.name}
                      onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                      required
                    />
                  </div>

                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editingCustomer.phone}
                      onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                    />
                  </div>

                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingCustomer.status}
                    onChange={(e) => setEditingCustomer({...editingCustomer, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={editingCustomer.notes}
                    onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                    rows={3}
                    placeholder="Add any notes about this customer..."
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
                    Update Customer
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

export default Customers; 