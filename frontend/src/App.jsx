import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthService from './app/services/auth.service';
// jwtDecode import removed as we're using AuthService now
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './app/contexts/CartContext';
import { initializeTheme } from './app/utils/themeUtils';

// Lazy-loaded components (route-level code splitting)
const CustomerLayout = lazy(() => import('./app/layouts/CustomerLayout'));
const LandingPage = lazy(() => import('./app/customer/LandingPage'));
const CustomerLogin = lazy(() => import('./app/auth/CustomerLogin'));
const CustomerSignup = lazy(() => import('./app/auth/CustomerSignup'));
const ForgotPassword = lazy(() => import('./app/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./app/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./app/auth/VerifyEmail'));
const CategoryServices = lazy(() => import('./app/customer/CategoryServices'));
const Cart = lazy(() => import('./app/customer/Cart'));
const CheckoutSuccess = lazy(() => import('./app/customer/CheckoutSuccess'));
const Booking = lazy(() => import('./app/customer/Booking'));
const BookingSuccess = lazy(() => import('./app/customer/BookingSuccess'));
const CustomerProfile = lazy(() => import('./app/customer/CustomerProfile'));
const Bookings = lazy(() => import('./app/customer/Bookings'));
const SearchResults = lazy(() => import('./app/customer/SearchResults'));
const AboutUs = lazy(() => import('./app/customer/AboutUs'));
const Careers = lazy(() => import('./app/customer/Careers'));
const Blog = lazy(() => import('./app/customer/Blog'));
const Contact = lazy(() => import('./app/customer/Contact'));
const Terms = lazy(() => import('./app/customer/Terms'));
const Privacy = lazy(() => import('./app/customer/Privacy'));
const DynamicPage = lazy(() => import('./components/DynamicPage'));
const DriverBooking = lazy(() => import('./app/customer/DriverBooking'));
const BookingTracking = lazy(() => import('./app/customer/BookingTracking'));
const ServiceTracking = lazy(() => import('./app/customer/ServiceTracking'));
const PaymentMethods = lazy(() => import('./app/customer/PaymentMethods'));
const AddUPIMethod = lazy(() => import('./app/customer/AddUPIMethod'));
const PaymentHistory = lazy(() => import('./app/customer/PaymentHistory'));
const Payment = lazy(() => import('./app/customer/Payment'));

// Admin
const AdminLayout = lazy(() => import('./app/layouts/AdminLayout'));
const AdminLogin = lazy(() => import('./app/auth/AdminLogin'));
const AdminDashboard = lazy(() => import('./app/features/admin/Dashboard'));
const UserManagement = lazy(() => import('./app/features/admin/UserManagement'));
const ProviderDetailsPage = lazy(() => import('./app/features/admin/ProviderDetailsPage'));
const CustomerManagement = lazy(() => import('./app/features/admin/CustomerManagement'));
const CustomerDetailsPage = lazy(() => import('./app/features/admin/CustomerDetailsPage'));
const CategoryManagement = lazy(() => import('./app/features/admin/CategoryManagement'));
const CategoryDetailsPage = lazy(() => import('./app/features/admin/CategoryDetailsPage'));
const DisputeManagement = lazy(() => import('./app/features/admin/DisputeManagement'));
const PricingManagement = lazy(() => import('./app/features/admin/PricingManagement'));
const SurgeMonitoring = lazy(() => import('./app/features/admin/SurgeMonitoring'));
const PayoutManagement = lazy(() => import('./app/features/admin/PayoutManagement'));

// SuperAdmin
const SuperAdminLayout = lazy(() => import('./app/layouts/SuperAdminLayout'));
const SuperAdminLogin = lazy(() => import('./app/auth/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./app/features/superadmin/Dashboard'));
const AdminManagement = lazy(() => import('./app/features/superadmin/AdminManagement'));
const SystemSettings = lazy(() => import('./app/features/superadmin/SystemSettings'));
const AuditLogs = lazy(() => import('./app/features/superadmin/AuditLogs'));
// Site Management Components
const SiteSettings = lazy(() => import('./app/components/SuperAdmin/SiteSettings'));
const ContentPages = lazy(() => import('./app/components/SuperAdmin/ContentPages'));
const SocialLinks = lazy(() => import('./app/components/SuperAdmin/SocialLinks'));

// Worker
const WorkerLayout = lazy(() => import('./app/layouts/WorkerLayout'));
const WorkerLogin = lazy(() => import('./app/auth/WorkerLogin'));
const WorkerSignup = lazy(() => import('./app/auth/WorkerSignup'));
const WorkerDashboard = lazy(() => import('./app/features/worker/WorkerDashboard'));
const WorkerJobs = lazy(() => import('./app/features/worker/WorkerJobs'));
const WorkerJobTracking = lazy(() => import('./app/features/worker/WorkerJobTracking'));
const WorkerSchedule = lazy(() => import('./app/features/worker/WorkerSchedule'));
const WorkerProfile = lazy(() => import('./app/features/worker/WorkerProfile'));
const WorkerSettings = lazy(() => import('./app/features/worker/WorkerSettings'));
const WorkerDocuments = lazy(() => import('./app/features/worker/WorkerDocuments'));
const WorkerPayments = lazy(() => import('./app/features/worker/WorkerPayments'));

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

  // Idle-time prefetch for a few high-traffic routes to improve subsequent navigation
  useEffect(() => {
    const id = setTimeout(() => {
      Promise.all([
        import('./app/auth/CustomerLogin'),
        import('./app/auth/CustomerSignup'),
        import('./app/customer/CategoryServices'),
        import('./app/customer/Cart'),
      ]).catch(() => {});
    }, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CartProvider>
        <div className="App">
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent"></div>
              </div>
            }
          >
          <Routes>
            {/* Standalone Info Pages */}
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            
            {/* Dynamic Content Pages */}
            <Route path="/:pageKey" element={<DynamicPage />} />
            {/* Customer Routes */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<CustomerLogin />} />
              <Route path="signup" element={<CustomerSignup />} />
              <Route path="verify-email" element={<VerifyEmail />} />
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
            <Route path="booking-tracking/:bookingId" element={
              <CustomerProtectedRoute>
                <BookingTracking />
              </CustomerProtectedRoute>
            } />
            <Route path="service-tracking/:bookingId" element={
              <CustomerProtectedRoute>
                <ServiceTracking />
              </CustomerProtectedRoute>
            } />
            <Route path="payment-methods" element={
              <CustomerProtectedRoute>
                <PaymentMethods />
              </CustomerProtectedRoute>
            } />
            <Route path="add-upi-method" element={
              <CustomerProtectedRoute>
                <AddUPIMethod />
              </CustomerProtectedRoute>
            } />
            <Route path="payment-history" element={
              <CustomerProtectedRoute>
                <PaymentHistory />
              </CustomerProtectedRoute>
            } />
            <Route path="payment" element={
              <CustomerProtectedRoute>
                <Payment />
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
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="customer/:customerId" element={<CustomerDetailsPage />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="provider/:providerId" element={<ProviderDetailsPage />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="category/:categoryId" element={<CategoryDetailsPage />} />
              <Route path="disputes" element={<DisputeManagement />} />
              <Route path="pricing" element={<PricingManagement />} />
              <Route path="surge" element={<SurgeMonitoring />} />
              <Route path="payouts" element={<PayoutManagement />} />
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
              <Route path="site-settings" element={<SiteSettings />} />
              <Route path="content-pages" element={<ContentPages />} />
              <Route path="social-links" element={<SocialLinks />} />
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
              <Route path="job-tracking/:bookingId" element={<WorkerJobTracking />} />
              <Route path="schedule" element={<WorkerSchedule />} />
              <Route path="payments" element={<WorkerPayments />} />
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
          </Suspense>
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
