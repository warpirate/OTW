import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  MessageCircle, 
  Settings,
  Bell,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import WorkerService from '../../services/worker.service';

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    totalEarnings: 0,
    rating: 0,
    totalReviews: 0
  });

  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    
    // Get user data using AuthService for worker role
    const userInfo = AuthService.getCurrentUser('worker');
    const userRole = userInfo?.role?.toLowerCase();
    if (userInfo && (userRole === 'worker' || userRole === 'provider')) {
      setUser(userInfo);
      fetchData();
      fetchProfile();
    } else {
      navigate('/worker/login');
    }
    
    return cleanup;
  }, [navigate]);

  // Refresh data every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchProfile = async () => {
    try {
      const profileData = await WorkerService.getProfile();
      console.log('Fetched worker profile:', profileData);
      setProfile(profileData?.profile || null);
    } catch (error) {
      console.error('Failed to fetch worker profile:', error);
      setProfile(null);
    }
  };

  // Helper to get the display name for the greeting and avatar
  const getWorkerDisplayName = () => {
    if (profile && (profile.firstName || profile.lastName)) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    if (user && (user.firstName || user.lastName)) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'Worker';
  };

  const fetchData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await WorkerService.getDashboardStats();
      setStats({
        totalJobs: statsResponse.total_bookings || 0,
        completedJobs: statsResponse.completed_bookings || 0,
        pendingJobs: statsResponse.pending_bookings || 0,
        totalEarnings: statsResponse.total_earnings || 0,
        rating: statsResponse.average_rating || 0,
        totalReviews: statsResponse.total_reviews || 0
      });

      // Fetch recent jobs
      const jobsResponse = await WorkerService.getRecentJobs(5);
      const formattedJobs = jobsResponse.bookings?.map(booking => ({
        id: booking.id,
        title: booking.service_name || booking.subcategory_name || 'Service',
        customer: booking.customer_name || 'Customer',
        date: booking.scheduled_time ? new Date(booking.scheduled_time).toLocaleDateString() : 'N/A',
        time: booking.scheduled_time ? new Date(booking.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A',
        status: booking.service_status || 'pending',
        amount: booking.display_price || booking.estimated_cost || 0,
        address: booking.display_address || booking.address || 'Address not available'
      })) || [];
      
      setRecentJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleLogout = () => {
    AuthService.logout(navigate, 'worker');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                OTW Worker
              </h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button 
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/worker/settings')}
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => navigate('/worker/profile')}
                  className="flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
                  aria-label="Profile"
                  title="Profile"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {(profile?.firstName?.[0] || user?.firstName?.[0] || '').toUpperCase()}{(profile?.lastName?.[0] || user?.lastName?.[0] || '').toUpperCase()}
                    </span>
                  </div>
                  <span className={`hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
                  </span>
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Welcome back, {getWorkerDisplayName() || 'Worker'}!
          </h2>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Here's your work summary for today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Total Jobs
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalJobs}
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Completed
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.completedJobs}
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Total Earnings
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Rating
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.rating} <span className="text-sm font-normal">({stats.totalReviews})</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm`}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Recent Jobs
              </h3>
              <Link
                to="/worker/jobs"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentJobs.map((job) => (
              <div key={job.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {job.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {job.customer}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {job.date}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {job.time}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {job.address}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₹{job.amount}
                      </p>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1 capitalize">{job.status}</span>
                      </div>
                    </div>
                    <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/worker/jobs"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-sm transition-colors`}
          >
            <div className="text-center">
              <Briefcase className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                View Jobs
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage your jobs
              </p>
            </div>
          </Link>

          <Link
            to="/worker/assigned-bookings"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-sm transition-colors`}
          >
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                My Bookings
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Assigned bookings
              </p>
            </div>
          </Link>

          <Link
            to="/worker/schedule"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-sm transition-colors`}
          >
            <div className="text-center">
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Schedule
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage availability
              </p>
            </div>
          </Link>

          <Link
            to="/worker/earnings"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-sm transition-colors`}
          >
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Earnings
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Track income
              </p>
            </div>
          </Link>

          <Link
            to="/worker/profile"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-sm transition-colors`}
          >
            <div className="text-center">
              <Settings className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Profile
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Edit profile
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
