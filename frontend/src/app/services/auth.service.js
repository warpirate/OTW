import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../config';

// API base URLs - adjust these to match your backend API
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
 
// Create axios instance with default config for auth endpoints
const authClient = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});


// Add a request interceptor to include JWT token in the headers
authClient.interceptors.request.use(
  (config) => {
    const currentRole = localStorage.getItem('current_role');
    let token = null;
    
    if (currentRole) {
      // Get role-specific token
      const { tokenKey } = AuthService._getStorageKeys(currentRole);
      token = localStorage.getItem(tokenKey);
    }
    
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        if (decoded.exp < now) {
          // Clear expired tokens
          if (currentRole) {
            const { tokenKey, userKey } = AuthService._getStorageKeys(currentRole);
            localStorage.removeItem(tokenKey);
            localStorage.removeItem(userKey);
            localStorage.removeItem('current_role');
          }
        } else {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        // Clear invalid tokens
        if (currentRole) {
          const { tokenKey, userKey } = AuthService._getStorageKeys(currentRole);
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userKey);
          localStorage.removeItem('current_role');
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);



// Authentication Service
const AuthService = {
  // Register new user
  register: async (userData) => {
    try {
      // Ensure userData has firstName, lastName, email, password, role_id
      const registerData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role_id: userData.role_id || 1 // Default to customer role
      };
      
      const response = await authClient.post('/register', registerData);
      // Do NOT auto-login after registration; require email verification
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Login user with email and password
  login: async (email, password, role = 'customer') => {
    try {
      // Include role in login request
      const response = await authClient.post('/login', { email, password, role });
      if (response.data.token) {
        // Make sure the user object has a role property
        const user = response.data.user;
        if (!user.role && role) {
          user.role = role; // Set role if not provided by backend
        }
        
        // Use the store tokens helper
        AuthService._storeTokens(response.data.token, user);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Login with phone OTP
  loginWithOTP: async (phone, otp, role = 'customer') => {
    try {
      const response = await authClient.post('/login-otp', { phone, otp, role });
      if (response.data.token) {
        // Make sure the user object has a role property
        const user = response.data.user;
        if (!user.role && role) {
          user.role = role; // Set role if not provided by backend
        }
        
        // Use the store tokens helper
        AuthService._storeTokens(response.data.token, user);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Request OTP for phone verification
  requestOTP: async (phone) => {
    try {
      const response = await authClient.post('/request-otp', { phone });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify email
  verifyEmail: async (token) => {
    try {
      const response = await authClient.post('/verify-email', { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Resend verification email
  resendVerification: async (email) => {
    try {
      const response = await authClient.post('/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Forgot password - request reset link
  forgotPassword: async (email) => {
    try {
      const response = await authClient.post('/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reset password - update password
  resetPassword: async (token, password) => {
    try {
      const response = await authClient.post('/reset-password', { token, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get role-specific storage keys
  _getStorageKeys: (role = null) => {
    // If role is provided, use role-specific keys
    if (role) {
      // Convert role to a consistent format (lowercase, spaces to underscores)
      const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');
      return {
        tokenKey: `jwt_token_${normalizedRole}`,
        userKey: `user_info_${normalizedRole}`
      };
    }
    
    // Otherwise use default keys (for backward compatibility)
    return {
      tokenKey: 'jwt_token',
      userKey: 'user_info'
    };
  },
  
  // Logout user with role-based support
  logout: (navigate = null, role = null) => {
    // Get current role if not specified
    const currentRole = role || localStorage.getItem('current_role');
    
    // If role is specified or found in localStorage, only log out that role
    if (currentRole) {
      const { tokenKey, userKey } = AuthService._getStorageKeys(currentRole);
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      
      // If we're logging out the current role, clear the current_role marker
      if (localStorage.getItem('current_role') === currentRole) {
        localStorage.removeItem('current_role');
      }
      
      // Dispatch custom event for this role logout
      const logoutEvent = new Event(`${currentRole}_logout`);
      window.dispatchEvent(logoutEvent);
      
      // Clear local cart storage if customer is logging out
      if (currentRole === 'customer') {
        localStorage.removeItem('otw_cart');
      }
      
      // Redirect based on role
      if (navigate) {
        if (currentRole === 'admin') {
          navigate('/admin/login');
        } else if (currentRole === 'customer') {
          navigate('/');
        } else if (currentRole === 'worker') {
          navigate('/worker/login');
        } else if (currentRole === 'super admin') {
          navigate('/superadmin/login');
        }
      }
    } else {
      // Full logout - remove all role-based tokens
      const roles = ['admin', 'customer', 'worker', 'super admin'];
      
      roles.forEach(r => {
        const { tokenKey, userKey } = AuthService._getStorageKeys(r);
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        
        // Dispatch custom event for each role logout
        const logoutEvent = new Event(`${r}_logout`);
        window.dispatchEvent(logoutEvent);
      });
      
      // Clear local cart storage
      localStorage.removeItem('otw_cart');
      localStorage.removeItem('current_role');
      
      // Default redirect to login
      if (navigate) {
        navigate('/login');
      }
    }
    
    // Return true to indicate successful logout
    return true;
  },
  
  // Store tokens with role-based support
  _storeTokens: (token, user) => {
    if (!user || !user.role) {
      return;
    }
    
    // Store tokens in role-specific keys only
    const { tokenKey, userKey } = AuthService._getStorageKeys(user.role);
    
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(user));
    
    // Store the current active role
    localStorage.setItem('current_role', user.role);
    
    // Dispatch custom event for login
    const loginEvent = new Event(`${user.role}_login`);
    window.dispatchEvent(loginEvent);
  },
  

  // Get current user with role-based support
  getCurrentUser: (role = null) => {
    try {
      // If role is not specified, check current_role
      const userRole = role || localStorage.getItem('current_role');
      
      const { userKey } = AuthService._getStorageKeys(userRole);
      
      const userJson = localStorage.getItem(userKey);
      
      const user = userJson ? JSON.parse(userJson) : null;
      
      return user;
    } catch (error) {
      return null;
    }
  },

  // Check if user is logged in with role-based support
  isLoggedIn: (role = null) => {
    try {
      // If role is not specified, check current_role
      const userRole = role || localStorage.getItem('current_role');
      const { tokenKey } = AuthService._getStorageKeys(userRole);
      const token = localStorage.getItem(tokenKey);
      if (!token) return false;
      
      // Validate that token isn't expired
      const decoded = jwtDecode(token);
      return decoded.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  },

  // Get JWT token with role-based support
  getToken: (role = null) => {
    try {
      // If role is not specified, check current_role
      const userRole = role || localStorage.getItem('current_role');
      const { tokenKey } = AuthService._getStorageKeys(userRole);
      const token = localStorage.getItem(tokenKey);
      if (!token) return null;
      
      // Validate token isn't expired
      const decoded = jwtDecode(token);
      return decoded.exp > Date.now() / 1000 ? token : null;
    } catch (error) {
      return null;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await authClient.post('/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    try {
      const response = await authClient.post('/reset-password', { token, password: newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData, role = null) => {
    try {
      const response = await authClient.put('/profile', userData);
      if (response.data.user) {
        const currentRole = role || localStorage.getItem('current_role');
        if (currentRole) {
          // Use role-specific storage
          const { userKey } = AuthService._getStorageKeys(currentRole);
          localStorage.setItem(userKey, JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Handle social login/signup
  socialAuth: async (provider, token, role = 'customer') => {
    try {
      const response = await authClient.post('/social-auth', { provider, token, role });
      if (response.data.token && response.data.user) {
        // Ensure the user has a role property
        const user = { ...response.data.user };
        if (!user.role && role) {
          user.role = role;
        }
        
        // Store tokens with role-based keys
        AuthService._storeTokens(response.data.token, user);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Admin Service functions integrated into AuthService
// const AdminService = {
//   // Get all admins
//   getAdmins: async () => {
//     try {
//       const response = await adminClient.get('/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching admins:', error);
//       throw error;
//     }
//   },

//   // Create new admin
//   createAdmin: async (adminData) => {
//     try {
//       const response = await adminClient.post('/', adminData);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating admin:', error);
//       throw error;
//     }
//   },

//   // Update admin
//   updateAdmin: async (id, adminData) => {
//     try {
//       const response = await adminClient.put(`/${id}`, adminData);
//       return response.data;
//     } catch (error) {
//       console.error('Error updating admin:', error);
//       throw error;
//     }
//   },

//   // Delete admin
//   deleteAdmin: async (id) => {
//     try {
//       const response = await adminClient.delete(`/${id}`);
//       return response.data;
//     } catch (error) {
//       console.error('Error deleting admin:', error);
//       throw error;
//     }
//   },

//   // Get admin by ID
//   getAdminById: async (id) => {
//     try {
//       const response = await adminClient.get(`/${id}`);
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching admin:', error);
//       throw error;
//     }
//   },

//   // Update admin status
//   updateAdminStatus: async (id, status) => {
//     try {
//       const response = await adminClient.patch(`/${id}/status`, { status });
//       return response.data;
//     } catch (error) {
//       console.error('Error updating admin status:', error);
//       throw error;
//     }
//   }
// };

// Export both services
// export { AdminService };
export default AuthService;
