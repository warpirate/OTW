import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import AuthService from '../services/auth.service';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(() => AuthService.getCurrentUser('admin'));
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  
  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Refresh user on login/logout events for admin role
    const refreshUser = () => setAdminUser(AuthService.getCurrentUser('admin'));
    window.addEventListener('admin_login', refreshUser);
    window.addEventListener('admin_logout', refreshUser);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('admin_login', refreshUser);
      window.removeEventListener('admin_logout', refreshUser);
    };
  }, []);
  
  const handleLogout = () => {
    // Use role-specific logout for admin
    AuthService.logout(navigate, 'admin');
  };
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-6">OMW Admin</h1>
          <nav className="flex flex-col space-y-2">
            {/*
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-chart-line mr-2"></i> Dashboard
            </NavLink>
            */}
            <NavLink
              to="/admin/customers"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-user mr-2"></i> Customers
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-users mr-2"></i> Worker Management
            </NavLink>
            <NavLink
              to="/admin/categories"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-tags mr-2"></i> Categories
            </NavLink>
            {/*
            <NavLink
              to="/admin/disputes"
              className={({ isActive }) =>
                isActive ? 'nav-tab-active' : 'nav-tab-inactive'
              }
            >
              <i className="fas fa-exclamation-triangle mr-2"></i> Disputes
            </NavLink>
            */}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Admin Panel</h1>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {/* 
              <div className="relative">
                <button className="btn-icon" aria-label="Notifications">
                  <i className="fas fa-bell text-gray-600"></i>
                </button>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
              */}

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  title="Account menu"
                >
                  <div className="hidden sm:flex flex-col mr-1">
                    <span className="text-sm font-medium text-gray-800">
                      {(adminUser?.name) || [adminUser?.firstName, adminUser?.lastName].filter(Boolean).join(' ') || adminUser?.username || 'Admin'}
                    </span>
                    {adminUser?.email && (
                      <span className="text-xs text-gray-500">{adminUser.email}</span>
                    )}
                  </div>
                  <i className="fas fa-chevron-down text-gray-500"></i>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <i className="fas fa-sign-out-alt mr-2"></i> Logout
                    </button>
                  </div>
                )}
              </div>
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

export default AdminLayout;
