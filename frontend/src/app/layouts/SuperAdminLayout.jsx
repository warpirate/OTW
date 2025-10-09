import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import AuthService from '../services/auth.service';

const SuperAdminLayout = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    AuthService.logout(navigate, 'super admin');
  };
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-6">OMW Super Admin</h1>
          <nav className="flex flex-col">
            <NavLink
              to="/superadmin/dashboard"
              className={({ isActive }) =>
                isActive 
                  ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                  : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
              }
            >
              <i className="fas fa-tachometer-alt mr-2"></i> Dashboard
            </NavLink>
            <NavLink
              to="/superadmin/admins"
              className={({ isActive }) =>
                isActive 
                  ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                  : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
              }
            >
              <i className="fas fa-user-shield mr-2"></i> Admin Management
            </NavLink>
            <NavLink
              to="/superadmin/settings"
              className={({ isActive }) =>
                isActive 
                  ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                  : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
              }
            >
              <i className="fas fa-cogs mr-2"></i> System Settings
            </NavLink>
            <NavLink
              to="/superadmin/audit-logs"
              className={({ isActive }) =>
                isActive 
                  ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                  : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
              }
            >
              <i className="fas fa-clipboard-list mr-2"></i> Audit Logs
            </NavLink>
            
            {/* Site Management Section */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs uppercase text-gray-400 mb-2 px-2">Site Management</p>
              <NavLink
                to="/superadmin/site-settings"
                className={({ isActive }) =>
                  isActive 
                    ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                    : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
                }
              >
                <i className="fas fa-globe mr-2"></i> Site Settings
              </NavLink>
              <NavLink
                to="/superadmin/content-pages"
                className={({ isActive }) =>
                  isActive 
                    ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                    : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
                }
              >
                <i className="fas fa-file-alt mr-2"></i> Content Pages
              </NavLink>
              <NavLink
                to="/superadmin/social-links"
                className={({ isActive }) =>
                  isActive 
                    ? 'flex items-center px-4 py-3 text-white bg-purple-600 rounded-lg mb-2 font-medium' 
                    : 'flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg mb-2 font-medium transition-colors duration-200'
                }
              >
                <i className="fas fa-share-alt mr-2"></i> Social Links
              </NavLink>
            </div>
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Super Admin Panel</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-700">Super Admin</p>
              </div>
              <button 
                className="btn-icon" 
                onClick={handleLogout} 
                title="Logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
