import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Filter,
  Search,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  MessageCircle,
  MoreVertical,
  Plus,
  AlertCircle
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';

const WorkerJobs = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [jobs, setJobs] = useState([
    {
      id: 1,
      title: 'Home Deep Cleaning',
      customer: 'Priya Sharma',
      date: '2024-01-18',
      time: '10:00 AM - 1:00 PM',
      status: 'upcoming',
      amount: 1500,
      address: 'Sector 21, Gurgaon',
      description: 'Deep cleaning for 3BHK apartment including kitchen and bathrooms',
      customerPhone: '+91 98765 43210',
      estimatedDuration: '3 hours'
    },
    {
      id: 2,
      title: 'Kitchen Plumbing Repair',
      customer: 'Rahul Kumar',
      date: '2024-01-17',
      time: '2:00 PM - 4:00 PM',
      status: 'in-progress',
      amount: 800,
      address: 'DLF Phase 2, Gurgaon',
      description: 'Fix kitchen sink leakage and replace faucet',
      customerPhone: '+91 87654 32109',
      estimatedDuration: '2 hours'
    },
    {
      id: 3,
      title: 'Electrical Outlet Installation',
      customer: 'Amit Singh',
      date: '2024-01-15',
      time: '11:30 AM - 12:30 PM',
      status: 'completed',
      amount: 1200,
      address: 'Cyber City, Gurgaon',
      description: 'Install 3 new electrical outlets in living room',
      customerPhone: '+91 76543 21098',
      estimatedDuration: '1 hour'
    },
    {
      id: 4,
      title: 'AC Service & Cleaning',
      customer: 'Sneha Patel',
      date: '2024-01-14',
      time: '9:00 AM - 11:00 AM',
      status: 'completed',
      amount: 900,
      address: 'Golf Course Road, Gurgaon',
      description: 'Complete AC servicing for 2 split ACs',
      customerPhone: '+91 65432 10987',
      estimatedDuration: '2 hours'
    },
    {
      id: 5,
      title: 'Bathroom Cleaning',
      customer: 'Vikram Gupta',
      date: '2024-01-12',
      time: '3:00 PM - 5:00 PM',
      status: 'cancelled',
      amount: 600,
      address: 'Sohna Road, Gurgaon',
      description: 'Deep cleaning of 2 bathrooms',
      customerPhone: '+91 54321 09876',
      estimatedDuration: '2 hours'
    }
  ]);

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    return cleanup;
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'in-progress':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'upcoming':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'cancelled':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      case 'upcoming':
        return <Calendar className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesFilter = activeFilter === 'all' || job.status === activeFilter;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterOptions = [
    { value: 'all', label: 'All Jobs', count: jobs.length },
    { value: 'upcoming', label: 'Upcoming', count: jobs.filter(j => j.status === 'upcoming').length },
    { value: 'in-progress', label: 'In Progress', count: jobs.filter(j => j.status === 'in-progress').length },
    { value: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
    { value: 'cancelled', label: 'Cancelled', count: jobs.filter(j => j.status === 'cancelled').length }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/worker/dashboard')}
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                My Jobs
              </h1>
            </div>
            
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Find New Jobs</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs, customers, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === option.value
                    ? 'bg-blue-600 text-white'
                    : darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className={`text-center py-16 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
              <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No jobs found
              </h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {searchQuery ? 'Try adjusting your search terms' : 'No jobs match the selected filter'}
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {job.title}
                      </h3>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1 capitalize">{job.status.replace('-', ' ')}</span>
                      </div>
                    </div>
                    
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                      {job.description}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {job.date}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {job.time}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {job.address}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{job.amount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Info and Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {job.customer}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Duration: {job.estimatedDuration}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {job.status === 'upcoming' && (
                      <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Start Job
                      </button>
                    )}
                    {job.status === 'in-progress' && (
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Complete Job
                      </button>
                    )}
                    <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {filteredJobs.length > 0 && (
          <div className="text-center mt-8">
            <button className={`px-6 py-3 rounded-lg border transition-colors ${
              darkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              Load More Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerJobs;
