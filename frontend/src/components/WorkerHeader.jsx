import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  User as UserIcon,
  FileText
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../app/utils/themeUtils';
import AuthService from '../app/services/auth.service';

const WorkerHeader = ({ 
  title = "Worker Dashboard", 
  showBackButton = false, 
  backUrl = "/worker/dashboard",
  user = null,
  profile = null 
}) => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    return cleanup;
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    AuthService.logout(navigate, 'worker');
  };

  const getWorkerDisplayName = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.name) {
      return user.name;
    }
    return 'Worker';
  };

  const getUserInitials = () => {
    const firstName = profile?.firstName || user?.firstName || '';
    const lastName = profile?.lastName || user?.lastName || '';
    return (firstName[0] || '').toUpperCase() + (lastName[0] || '').toUpperCase();
  };

  return (
    <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Title and back button */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => navigate(backUrl)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notifications */}
            <button 
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button 
              onClick={() => navigate('/worker/settings')}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`flex items-center space-x-2 sm:space-x-3 rounded-lg px-2 py-1 sm:px-3 sm:py-2 transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>
                <div className="hidden sm:flex sm:flex-col sm:items-start">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {getWorkerDisplayName()}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {user?.email || ''}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''} ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
              </button>

              {menuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg ring-1 ring-black/5 z-50 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                  role="menu"
                >
                  <div className="py-2">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/worker/profile'); }}
                      className={`w-full px-4 py-2 flex items-center space-x-2 transition-colors ${darkMode ? 'hover:bg-blue-900/40 hover:text-blue-200' : 'hover:bg-blue-50 hover:text-blue-700'}`}
                      role="menuitem"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>View Profile</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/worker/documents'); }}
                      className={`w-full px-4 py-2 flex items-center space-x-2 transition-colors ${darkMode ? 'hover:bg-blue-900/40 hover:text-blue-200' : 'hover:bg-blue-50 hover:text-blue-700'}`}
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Documents</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/worker/settings'); }}
                      className={`w-full px-4 py-2 flex items-center space-x-2 transition-colors ${darkMode ? 'hover:bg-blue-900/40 hover:text-blue-200' : 'hover:bg-blue-50 hover:text-blue-700'}`}
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className={`my-1 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`} />
                  <div className="py-2">
                    <button
                      onClick={handleLogout}
                      className={`w-full px-4 py-2 flex items-center space-x-2 transition-colors ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default WorkerHeader;
