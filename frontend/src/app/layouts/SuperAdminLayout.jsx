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
          <nav className="flex flex-col space-y-2">
            <NavLink
              to="/superadmin/dashboard"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-tachometer-alt mr-2"></i> Dashboard
            </NavLink>
            <NavLink
              to="/superadmin/admins"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-user-shield mr-2"></i> Admin Management
            </NavLink>
            <NavLink
              to="/superadmin/settings"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-cogs mr-2"></i> System Settings
            </NavLink>
            <NavLink
              to="/superadmin/audit-logs"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-clipboard-list mr-2"></i> Audit Logs
            </NavLink>
            <NavLink
              to="/superadmin/reports"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-file-alt mr-2"></i> Reports
            </NavLink>
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
              <div className="relative">
                <button className="btn-icon">
                  <i className="fas fa-bell text-gray-600"></i>
                </button>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
              <div className="flex items-center">
                <img
                  src="https://via.placeholder.com/40"
                  alt="Super Admin"
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Super Admin</p>
                </div>
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
