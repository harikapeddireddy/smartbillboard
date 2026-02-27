import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallback from './components/AuthCallback';
import Landing from './pages/Landing';
import Login from './pages/Login';
import TwoStepVerification from './pages/TwoStepVerification';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRequests from './pages/admin/AdminRequests';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentRequests from './pages/agent/AgentRequests';
import HoardingDetails from './pages/customer/HoardingDetails';
import Bookings from './pages/customer/Bookings';
import PaymentSuccess from './pages/customer/PaymentSuccess';
import '@/App.css';

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id synchronously
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<TwoStepVerification />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminRequests />
          </ProtectedRoute>
        }
      />
      
      {/* Customer Routes */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute requiredRole="customer">
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/hoardings/:id"
        element={
          <ProtectedRoute requiredRole="customer">
            <HoardingDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/bookings"
        element={
          <ProtectedRoute requiredRole="customer">
            <Bookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-success"
        element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      
      {/* Agent Routes */}
      <Route
        path="/agent/dashboard"
        element={
          <ProtectedRoute requiredRole="agent">
            <AgentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agent/requests"
        element={
          <ProtectedRoute requiredRole="agent">
            <AgentRequests />
          </ProtectedRoute>
        }
      />
      
      <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen"><p>Access Denied</p></div>} />
      <Route path="*" element={<div className="flex items-center justify-center min-h-screen"><p>Page Not Found</p></div>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
