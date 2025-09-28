import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import WorkerHeader from '../../../components/WorkerHeader';
const WorkerSchedule = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAvailable, setIsAvailable] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  
  const [availability, setAvailability] = useState({
    monday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    saturday: { enabled: true, slots: [{ start: '10:00', end: '16:00' }] },
    sunday: { enabled: false, slots: [] }
  });

  const [newSlot, setNewSlot] = useState({ start: '09:00', end: '17:00' });

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    
    // Get user data using AuthService for worker role
    const userInfo = AuthService.getCurrentUser('worker');
    const userRole = userInfo?.role?.toLowerCase();
    if (userInfo && (userRole === 'worker' || userRole === 'provider')) {
      setUser(userInfo);
    } else {
      navigate('/worker/login');
    }
    
    return cleanup;
  }, [navigate]);

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const toggleDayAvailability = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        enabled: !prev[day.toLowerCase()].enabled
      }
    }));
  };

  const addTimeSlot = (day) => {
    if (newSlot.start && newSlot.end && newSlot.start < newSlot.end) {
      setAvailability(prev => ({
        ...prev,
        [day.toLowerCase()]: {
          ...prev[day.toLowerCase()],
          slots: [...prev[day.toLowerCase()].slots, { ...newSlot }]
        }
      }));
      setNewSlot({ start: '09:00', end: '17:00' });
      setShowAddSlot(false);
    }
  };

  const updateTimeSlot = (day, index, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        slots: prev[day.toLowerCase()].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const removeTimeSlot = (day, index) => {
    setAvailability(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        slots: prev[day.toLowerCase()].slots.filter((_, i) => i !== index)
      }
    }));
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCurrentWeekDates = () => {
    const today = new Date(currentDate);
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(today.getDate() - daysFromMonday);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getCurrentWeekDates();

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

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
                My Schedule
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/worker/settings')}
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/worker/profile')}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Profile"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <span className={`hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.firstName} {user?.lastName}
                </span>
              </button>
              <div className="flex items-center space-x-2">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Available for work:
                </label>
                <button
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={goToPreviousWeek}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Week</span>
          </button>
          
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          
          <button
            onClick={goToNextWeek}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <span>Next Week</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Availability Settings */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm mb-8`}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Weekly Availability
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Set your working hours for each day of the week
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {daysOfWeek.map((day, dayIndex) => {
                const dayKey = day.toLowerCase();
                const dayAvailability = availability[dayKey];
                const weekDate = weekDates[dayIndex];
                const isToday = weekDate.toDateString() === new Date().toDateString();
                
                return (
                  <div key={day} className={`p-4 rounded-lg border ${
                    darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-3">
                        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {day}
                        </h4>
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {isToday && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => toggleDayAvailability(day)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          dayAvailability.enabled ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            dayAvailability.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {dayAvailability.enabled && (
                      <div className="space-y-3">
                        {dayAvailability.slots.map((slot, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                              className={`px-3 py-2 border rounded-lg ${
                                darkMode 
                                  ? 'bg-gray-800 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>to</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                              className={`px-3 py-2 border rounded-lg ${
                                darkMode 
                                  ? 'bg-gray-800 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              ({formatTime(slot.start)} - {formatTime(slot.end)})
                            </span>
                            <button
                              onClick={() => removeTimeSlot(day, index)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        
                        {showAddSlot === day ? (
                          <div className="flex items-center space-x-3 mt-3">
                            <input
                              type="time"
                              value={newSlot.start}
                              onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })}
                              className={`px-3 py-2 border rounded-lg ${
                                darkMode 
                                  ? 'bg-gray-800 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>to</span>
                            <input
                              type="time"
                              value={newSlot.end}
                              onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })}
                              className={`px-3 py-2 border rounded-lg ${
                                darkMode 
                                  ? 'bg-gray-800 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                            <button
                              onClick={() => addTimeSlot(day)}
                              className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowAddSlot(false)}
                              className="text-gray-600 hover:text-gray-700 p-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAddSlot(day)}
                            className={`flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add time slot</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 flex justify-end space-x-4">
              <button className={`px-6 py-2 rounded-lg border transition-colors ${
                darkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
                Reset to Default
              </button>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Save Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Total Hours This Week
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  42 hrs
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Available Days
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  6 days
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Booked Hours
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  18 hrs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerSchedule;
