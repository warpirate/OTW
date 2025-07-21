import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthService from './app/services/auth.service';
// jwtDecode import removed as we're using AuthService now
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

// Worker Components
import WorkerLogin from './app/auth/WorkerLogin';
import WorkerSignup from './app/auth/WorkerSignup';
import WorkerDashboard from './app/features/worker/WorkerDashboard';
import WorkerJobs from './app/features/worker/WorkerJobs';
import WorkerSchedule from './app/features/worker/WorkerSchedule';

// Protected Route Components
const AdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    console.log('AdminProtectedRoute: Checking authentication...');
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('admin');
      console.log('AdminProtectedRoute: isLoggedIn =', isLoggedIn);
      
      if (!isLoggedIn) return false;
      
      // Verify user has admin role
      const user = AuthService.getCurrentUser('admin');
      console.log('AdminProtectedRoute: user =', user);
      
      const hasRole = user && user.role === 'admin';
      console.log('AdminProtectedRoute: hasRole =', hasRole);
      return hasRole;
    };
    
    const authStatus = checkAuth();
    console.log('AdminProtectedRoute: Setting isAuthenticated =', authStatus);
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      console.log('AdminProtectedRoute: Storage event detected');
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      console.log('AdminProtectedRoute: Navigation event detected');
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
        console.log('AdminProtectedRoute: Auth status changed to', newStatus);
        setIsAuthenticated(newStatus);
      }
    }, 1000); // Check every second
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(interval);
    };
  }, [isAuthenticated]);
  
  if (isChecking) {
    return <div>Checking authentication...</div>;
  }
  
  if (!isAuthenticated) {
    console.log('AdminProtectedRoute: Redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }
  
  console.log('AdminProtectedRoute: Rendering protected content');
  return children;
};

const SuperAdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    console.log('SuperAdminProtectedRoute: Checking authentication...');
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('super admin');
      console.log('SuperAdminProtectedRoute: isLoggedIn =', isLoggedIn);
      
      if (!isLoggedIn) return false;
      
      // Verify user has super admin role
      const user = AuthService.getCurrentUser('super admin');
      console.log('SuperAdminProtectedRoute: user =', user);
      
      const hasRole = user && user.role === 'super admin';
      console.log('SuperAdminProtectedRoute: hasRole =', hasRole);
      return hasRole;
    };
    
    const authStatus = checkAuth();
    console.log('SuperAdminProtectedRoute: Setting isAuthenticated =', authStatus);
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      console.log('SuperAdminProtectedRoute: Storage event detected');
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      console.log('SuperAdminProtectedRoute: Navigation event detected');
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
        console.log('SuperAdminProtectedRoute: Auth status changed to', newStatus);
        setIsAuthenticated(newStatus);
      }
    }, 1000); // Check every second
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(interval);
    };
  }, [isAuthenticated]);
  
  if (isChecking) {
    return <div>Checking authentication...</div>;
  }
  
  if (!isAuthenticated) {
    console.log('SuperAdminProtectedRoute: Redirecting to login');
    return <Navigate to="/superadmin/login" replace />;
  }
  
  console.log('SuperAdminProtectedRoute: Rendering protected content');
  return children;
};

const WorkerProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    console.log('WorkerProtectedRoute: Checking authentication...');
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('worker');
      console.log('WorkerProtectedRoute: isLoggedIn =', isLoggedIn);
      
      if (!isLoggedIn) return false;
      
      // Verify user has worker role
      const user = AuthService.getCurrentUser('worker');
      console.log('WorkerProtectedRoute: user =', user);
      
      const hasRole = user && user.role === 'worker';
      console.log('WorkerProtectedRoute: hasRole =', hasRole);
      return hasRole;
    };
    
    const authStatus = checkAuth();
    console.log('WorkerProtectedRoute: Setting isAuthenticated =', authStatus);
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      console.log('WorkerProtectedRoute: Storage event detected');
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      console.log('WorkerProtectedRoute: Navigation event detected');
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
        console.log('WorkerProtectedRoute: Auth status changed to', newStatus);
        setIsAuthenticated(newStatus);
      }
    }, 1000); // Check every second
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(interval);
    };
  }, [isAuthenticated]);
  
  if (isChecking) {
    return <div>Checking authentication...</div>;
  }
  
  if (!isAuthenticated) {
    console.log('WorkerProtectedRoute: Redirecting to login');
    return <Navigate to="/worker/login" replace />;
  }
  
  console.log('WorkerProtectedRoute: Rendering protected content');
  return children;
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

          {/* Worker Routes */}
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/worker/signup" element={<WorkerSignup />} />
          <Route path="/worker" element={
            <WorkerProtectedRoute>
              <CustomerLayout />
            </WorkerProtectedRoute>
          }>
            <Route index element={<Navigate to="/worker/dashboard" replace />} />
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="jobs" element={<WorkerJobs />} />
            <Route path="schedule" element={<WorkerSchedule />} />
            <Route path="earnings" element={<div className="p-8 text-center">Worker Earnings Page (Coming Soon)</div>} />
            <Route path="profile" element={<div className="p-8 text-center">Worker Profile Page (Coming Soon)</div>} />
          </Route>

          {/* Default Redirect Based on Domain */}
          <Route
            path="*"
            element={isSuperAdminDomain ? <Navigate to="/superadmin/login" replace /> : isAdminDomain ? <Navigate to="/admin/login" replace /> : <Navigate to="/" replace />}
          />
        </Routes>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
