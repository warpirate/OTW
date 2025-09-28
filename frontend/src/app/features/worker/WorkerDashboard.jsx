import React, { useState, useEffect, useRef } from 'react';
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
  XCircle,
  DollarSign
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import WorkerService from '../../services/worker.service';
import WorkerHeader from '../../../components/WorkerHeader';

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

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        totalJobs: statsResponse.total_jobs || 0,
        completedJobs: statsResponse.completed_jobs || 0,
        pendingJobs: statsResponse.active_jobs || 0,
        totalEarnings: statsResponse.total_earnings || 0,
        rating: statsResponse.rating || 0,
        totalReviews: statsResponse.total_reviews || 0
      });

      // Fetch recent jobs (provider categories)
      const jobsResponse = await WorkerService.getRecentBookings(5);
      const formattedJobs = jobsResponse.bookings?.map(booking => ({
        id: booking.id,
        title: booking.service_name || booking.subcategory_name || 'Service',
        customer: booking.customer_name || 'Customer',
        date: booking.scheduled_time ? new Date(booking.scheduled_time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
        time: booking.scheduled_time ? new Date(booking.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
        status: booking.service_status || 'pending',
        amount: booking.display_price || booking.estimated_cost || 0,
        address: booking.display_address || booking.address || 'Address not available',
        rating: booking.rating,
        review: booking.review
      })) || [];
      
      setRecentJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-blue-600 bg-blue-100';
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

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-3 h-3 text-yellow-400 fill-current opacity-50" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-3 h-3 text-gray-300" />
      );
    }
    
    return stars;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <WorkerHeader 
        title="OMW Worker"
        showBackButton={false}
        user={user}
        profile={profile}
      />

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
          {/* Total Jobs Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Total Jobs
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalJobs}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Completed Jobs Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Completed
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.completedJobs}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Earnings Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Total Earnings
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₹{stats.totalEarnings.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Rating Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Rating
                </p>
                <div className="flex items-center space-x-2">
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.rating > 0 ? stats.rating.toFixed(1) : '0.0'}
                  </p>
                  {stats.rating > 0 && (
                    <div className="flex items-center space-x-1">
                      {renderStars(stats.rating)}
                    </div>
                  )}
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border`}>
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Recent Jobs
              </h3>
              <Link
                to="/worker/jobs"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentJobs.map((job) => (
              <div key={job.id} className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {job.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                        {job.customer}
                      </p>
                      <div className="flex items-center space-x-4 mb-2">
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
                      </div>
                      
                      {/* Rating display for completed jobs */}
                      {job.status === 'completed' && job.rating && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {renderStars(job.rating)}
                          </div>
                          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {job.rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₹{job.amount}
                      </p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)} mt-1`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1 capitalize">{job.status}</span>
                      </div>
                    </div>
                    <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} transition-colors`}>
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/worker/jobs"
              className={`${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'} p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md group`}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  View Jobs
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage your jobs
                </p>
              </div>
            </Link>



            <Link
              to="/worker/payments"
              className={`${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'} p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md group`}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  Cash Payments
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage payments
                </p>
              </div>
            </Link>

            <Link
              to="/worker/profile"
              className={`${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'} p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md group`}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
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
    </div>
  );
};

export default WorkerDashboard;
