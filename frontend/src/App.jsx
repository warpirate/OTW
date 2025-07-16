import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Customer Components
import CustomerLayout from './app/layouts/CustomerLayout';
import LandingPage from './app/customer/LandingPage';
import CustomerLogin from './app/auth/CustomerLogin';
import CustomerSignup from './app/auth/CustomerSignup';

// Admin Components
import AdminLayout from './app/layouts/AdminLayout';
import AdminLogin from './app/auth/AdminLogin';
import AdminDashboard from './app/features/admin/Dashboard';
import UserManagement from './app/features/admin/UserManagement';
import CategoryManagement from './app/features/admin/CategoryManagement';
import DisputeManagement from './app/features/admin/DisputeManagement';

// SuperAdmin Components
import SuperAdminLayout from './app/layouts/SuperAdminLayout';
import SuperAdminLogin from './app/auth/SuperAdminLogin';
import SuperAdminDashboard from './app/features/superadmin/Dashboard';
import AdminManagement from './app/features/superadmin/AdminManagement';
import SystemSettings from './app/features/superadmin/SystemSettings';
import AuditLogs from './app/features/superadmin/AuditLogs';
import Reports from './app/features/superadmin/Reports';

// Protected Route Components
const AdminProtectedRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken ? children : <Navigate to="/admin/login" replace />;
};

const SuperAdminProtectedRoute = ({ children }) => {
  const superAdminToken = localStorage.getItem('superAdminToken');
  return superAdminToken ? children : <Navigate to="/superadmin/login" replace />;
};

function App() {
  // Check the domain to determine which panel to show
  const [isAdminDomain, setIsAdminDomain] = useState(false);
  const [isSuperAdminDomain, setIsSuperAdminDomain] = useState(false);

  useEffect(() => {
    // In a real app, check for admin.urbango.ca or superadmin.urbango.ca
    // For development, we'll check the URL path
    const hostname = window.location.hostname;
    const path = window.location.pathname;

    if (hostname === 'admin.urbango.ca' || path.startsWith('/admin')) {
      setIsAdminDomain(true);
      setIsSuperAdminDomain(false);
    } else if (hostname === 'superadmin.urbango.ca' || path.startsWith('/superadmin')) {
      setIsAdminDomain(false);
      setIsSuperAdminDomain(true);
    } else {
      // Default to customer interface
      setIsAdminDomain(false);
      setIsSuperAdminDomain(false);
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<CustomerLogin />} />
            <Route path="signup" element={<CustomerSignup />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="disputes" element={<DisputeManagement />} />
          </Route>

          {/* SuperAdmin Routes */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin" element={
            <SuperAdminProtectedRoute>
              <SuperAdminLayout />
            </SuperAdminProtectedRoute>
          }>
            <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Default Redirect Based on Domain */}
          <Route
            path="*"
            element={isSuperAdminDomain ? <Navigate to="/superadmin/login" replace /> : isAdminDomain ? <Navigate to="/admin/login" replace /> : <Navigate to="/" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
