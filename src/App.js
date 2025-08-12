import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/auth';
import { Dashboard, AdminDashboard } from './pages/dashboard';
import { Leads } from './pages/leads';
import { Call, CallDone, CallNotDone, FollowUp } from './pages/call';
import { ProtectedRoute } from './components/layout';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads" 
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call" 
              element={
                <ProtectedRoute>
                  <Call />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-done" 
              element={
                <ProtectedRoute>
                  <CallDone />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-not-done" 
              element={
                <ProtectedRoute>
                  <CallNotDone />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/follow-up" 
              element={
                <ProtectedRoute>
                  <FollowUp />
                </ProtectedRoute>
              } 
            />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
