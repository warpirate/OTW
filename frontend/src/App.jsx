import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthService from './app/services/auth.service';
// jwtDecode import removed as we're using AuthService now
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './app/contexts/CartContext';
import { initializeTheme } from './app/utils/themeUtils';

// Customer Components
import CustomerLayout from './app/layouts/CustomerLayout';
import LandingPage from './app/customer/LandingPage';
import CustomerLogin from './app/auth/CustomerLogin';
import CustomerSignup from './app/auth/CustomerSignup';
import ForgotPassword from './app/auth/ForgotPassword';
import ResetPassword from './app/auth/ResetPassword';
import CategoryServices from './app/customer/CategoryServices';
import Cart from './app/customer/Cart';
import CheckoutSuccess from './app/customer/CheckoutSuccess';
import Booking from './app/customer/Booking';
import BookingSuccess from './app/customer/BookingSuccess';
import CustomerProfile from './app/customer/CustomerProfile';
import Bookings from './app/customer/Bookings';
import SearchResults from './app/customer/SearchResults';
import AboutUs from './app/customer/AboutUs';
import Careers from './app/customer/Careers';
import Blog from './app/customer/Blog';
import Contact from './app/customer/Contact';
import Terms from './app/customer/Terms';
import Privacy from './app/customer/Privacy';
import DriverBooking from './app/customer/DriverBooking';

// Admin Components
import AdminLayout from './app/layouts/AdminLayout';
import AdminLogin from './app/auth/AdminLogin';
import AdminDashboard from './app/features/admin/Dashboard';
import UserManagement from './app/features/admin/UserManagement';
import ProviderDetailsPage from './app/features/admin/ProviderDetailsPage';
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
import WorkerLayout from './app/layouts/WorkerLayout';
import WorkerLogin from './app/auth/WorkerLogin';
import WorkerSignup from './app/auth/WorkerSignup';
import WorkerDashboard from './app/features/worker/WorkerDashboard';
import WorkerJobs from './app/features/worker/WorkerJobs';
import WorkerSchedule from './app/features/worker/WorkerSchedule';
import WorkerProfile from './app/features/worker/WorkerProfile';
import WorkerSettings from './app/features/worker/WorkerSettings';
import WorkerDocuments from './app/features/worker/WorkerDocuments';

// Protected Route Components
const CustomerProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('customer');
      
      if (!isLoggedIn) return false;
      
      // Verify user has customer role
      const user = AuthService.getCurrentUser('customer');
      
      const hasRole = user && user.role === 'customer';
      return hasRole;
    };
    
    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
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
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('admin');
      
      if (!isLoggedIn) return false;
      
      // Verify user has admin role
      const user = AuthService.getCurrentUser('admin');
      
      const hasRole = user && user.role === 'admin';
      return hasRole;
    };
    
    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
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
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

const SuperAdminProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('super admin');
      
      if (!isLoggedIn) return false;
      
      // Verify user has super admin role
      const user = AuthService.getCurrentUser('super admin');
      
      const hasRole = user && user.role === 'super admin';
      return hasRole;
    };
    
    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
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
    return <Navigate to="/superadmin/login" replace />;
  }
  
  return children;
};

const WorkerProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      // Use the role-specific authentication check
      const isLoggedIn = AuthService.isLoggedIn('worker');
      
      if (!isLoggedIn) return false;
      
      // Verify user has worker role (handle case sensitivity)
      const user = AuthService.getCurrentUser('worker');
      
      const userRole = user?.role?.toLowerCase();
      const hasRole = user && (userRole === 'worker' || userRole === 'provider');
      return hasRole;
    };
    
    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);
    setIsChecking(false);
    
    const handleStorage = () => {
      setIsAuthenticated(checkAuth());
    };
    
    const handleNavigation = () => {
      setIsAuthenticated(checkAuth());
    };
    
    // Listen for localStorage changes and navigation events
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleNavigation);
    
    const interval = setInterval(() => {
      const newStatus = checkAuth();
      if (isAuthenticated !== newStatus) {
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
    return <Navigate to="/worker/login" replace />;
  }
  
  return children;
};

function App() {
  // Check the domain to determine which panel to show
  const [isAdminDomain, setIsAdminDomain] = useState(false);
  const [isSuperAdminDomain, setIsSuperAdminDomain] = useState(false);

  useEffect(() => {
    // Initialize theme on app start
    initializeTheme();
    
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
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CartProvider>
        <div className="App">
          <Routes>
            {/* Standalone Info Pages */}
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Customer Routes */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<CustomerLogin />} />
              <Route path="signup" element={<CustomerSignup />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password/:token" element={<ResetPassword />} />
              <Route path="category/:categoryId/:categoryName" element={<CategoryServices />} />
              <Route path="search" element={<SearchResults />} />
              <Route path="cart" element={<Cart />} />
              <Route path="booking" element={
                <CustomerProtectedRoute>
                  <Booking />
                </CustomerProtectedRoute>
              } />
              <Route path="booking-success" element={
                <CustomerProtectedRoute>
                  <BookingSuccess />
                </CustomerProtectedRoute>
              } />
              <Route path="checkout-success" element={<CheckoutSuccess />} />
              <Route path="profile" element={
                <CustomerProtectedRoute>
                  <CustomerProfile />
                </CustomerProtectedRoute>
              } />
                      <Route path="bookings" element={
              <CustomerProtectedRoute>
                <Bookings />
              </CustomerProtectedRoute>
            } />
            <Route path="driver" element={
              <CustomerProtectedRoute>
                <DriverBooking />
              </CustomerProtectedRoute>
            } />
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
              <Route path="provider/:providerId" element={<ProviderDetailsPage />} />
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
            <Route path="/worker/forgot-password" element={<ForgotPassword />} />
            <Route path="/worker/reset-password/:token" element={<ResetPassword />} />
            <Route path="/worker/signup" element={<WorkerSignup />} />
            <Route path="/worker" element={
              <WorkerProtectedRoute>
                <WorkerLayout />
              </WorkerProtectedRoute>
            }>
              <Route index element={<Navigate to="/worker/dashboard" replace />} />
              <Route path="dashboard" element={<WorkerDashboard />} />
              <Route path="jobs" element={<WorkerJobs />} />
              <Route path="schedule" element={<WorkerSchedule />} />
              <Route path="earnings" element={<div className="p-8 text-center">Worker Earnings Page (Coming Soon)</div>} />
              <Route path="profile" element={<WorkerProfile />} />
              <Route path="documents" element={<WorkerDocuments />} />
              <Route path="settings" element={<WorkerSettings />} />
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
          theme="colored"
        />
      </CartProvider>
    </Router>
  );
}

export default App;
