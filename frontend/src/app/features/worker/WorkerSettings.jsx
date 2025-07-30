import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Bell,
  Shield,
  Clock,
  Globe,
  User,
  Smartphone,
  Mail,
  MessageSquare,
  Save,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';

const WorkerSettings = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    // Notification preferences
    notifications: {
      newJobAlerts: true,
      messageAlerts: true,
      paymentAlerts: true,
      promotionalEmails: false,
      smsNotifications: true,
      pushNotifications: true
    },
    
    // Availability settings
    availability: {
      autoAcceptJobs: false,
      maxJobsPerDay: 5,
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      weekendWork: true,
      holidayWork: false
    },
    
    // Privacy settings
    privacy: {
      showProfileToCustomers: true,
      showRatingPublicly: true,
      allowDirectContact: true,
      shareLocationData: true
    },
    
    // App preferences
    preferences: {
      language: 'en',
      currency: 'INR',
      distanceUnit: 'km',
      timeFormat: '24h'
    }
  });

  // Listen for theme changes
  useEffect(() => {
    setDarkMode(isDarkMode());
    
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    
    return cleanup;
  }, []);

  // Check authentication
  useEffect(() => {
    if (!AuthService.isLoggedIn('worker')) {
      navigate('/worker/login');
      return;
    }
    
    // Load settings from localStorage or API
    loadSettings();
  }, [navigate]);

  const loadSettings = () => {
    setLoading(true);
    try {
      // For now, load from localStorage
      const savedSettings = localStorage.getItem('workerSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleNestedSettingChange = (category, parentSetting, childSetting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentSetting]: {
          ...prev[category][parentSetting],
          [childSetting]: value
        }
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // For now, save to localStorage
      localStorage.setItem('workerSettings', JSON.stringify(settings));
      
      // TODO: Send to backend API when available
      // await WorkerService.updateSettings(settings);
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings({
        notifications: {
          newJobAlerts: true,
          messageAlerts: true,
          paymentAlerts: true,
          promotionalEmails: false,
          smsNotifications: true,
          pushNotifications: true
        },
        availability: {
          autoAcceptJobs: false,
          maxJobsPerDay: 5,
          workingHours: {
            start: '09:00',
            end: '18:00'
          },
          weekendWork: true,
          holidayWork: false
        },
        privacy: {
          showProfileToCustomers: true,
          showRatingPublicly: true,
          allowDirectContact: true,
          shareLocationData: true
        },
        preferences: {
          language: 'en',
          currency: 'INR',
          distanceUnit: 'km',
          timeFormat: '24h'
        }
      });
      toast.info('Settings reset to default values');
    }
  };

  const ToggleSwitch = ({ enabled, onChange, id }) => (
    <button
      id={id}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const SettingCard = ({ title, description, icon: Icon, children }) => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const SettingRow = ({ label, description, control }) => (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className={`block text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
      <div className="ml-4">
        {control}
      </div>
    </div>
  );

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
                Settings
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/worker/profile')}
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Profile"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={handleResetSettings}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Reset to Default
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Notification Settings */}
          <SettingCard
            title="Notifications"
            description="Manage how you receive alerts and updates"
            icon={Bell}
          >
            <SettingRow
              label="New Job Alerts"
              description="Get notified when new jobs match your criteria"
              control={
                <ToggleSwitch
                  enabled={settings.notifications.newJobAlerts}
                  onChange={(value) => handleSettingChange('notifications', 'newJobAlerts', value)}
                />
              }
            />
            
            <SettingRow
              label="Message Alerts"
              description="Receive notifications for new messages from customers"
              control={
                <ToggleSwitch
                  enabled={settings.notifications.messageAlerts}
                  onChange={(value) => handleSettingChange('notifications', 'messageAlerts', value)}
                />
              }
            />
            
            <SettingRow
              label="Payment Alerts"
              description="Get notified about payments and earnings"
              control={
                <ToggleSwitch
                  enabled={settings.notifications.paymentAlerts}
                  onChange={(value) => handleSettingChange('notifications', 'paymentAlerts', value)}
                />
              }
            />
            
            <SettingRow
              label="SMS Notifications"
              description="Receive important updates via SMS"
              control={
                <ToggleSwitch
                  enabled={settings.notifications.smsNotifications}
                  onChange={(value) => handleSettingChange('notifications', 'smsNotifications', value)}
                />
              }
            />
            
            <SettingRow
              label="Push Notifications"
              description="Allow the app to send push notifications"
              control={
                <ToggleSwitch
                  enabled={settings.notifications.pushNotifications}
                  onChange={(value) => handleSettingChange('notifications', 'pushNotifications', value)}
                />
              }
            />
            
            <SettingRow
              label="Promotional Emails"
              description="Receive emails about new features and promotions"
              control={
                <ToggleSwitch
                  enabled={settings.notifications.promotionalEmails}
                  onChange={(value) => handleSettingChange('notifications', 'promotionalEmails', value)}
                />
              }
            />
          </SettingCard>

          {/* Availability Settings */}
          <SettingCard
            title="Availability"
            description="Configure your work preferences and job limits"
            icon={Clock}
          >
            <SettingRow
              label="Auto-Accept Jobs"
              description="Automatically accept jobs that match your criteria"
              control={
                <ToggleSwitch
                  enabled={settings.availability.autoAcceptJobs}
                  onChange={(value) => handleSettingChange('availability', 'autoAcceptJobs', value)}
                />
              }
            />
            
            <SettingRow
              label="Maximum Jobs Per Day"
              description="Limit the number of jobs you can take in a day"
              control={
                <select
                  value={settings.availability.maxJobsPerDay}
                  onChange={(e) => handleSettingChange('availability', 'maxJobsPerDay', parseInt(e.target.value))}
                  className={`px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num} job{num !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              }
            />
            
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Working Hours
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.availability.workingHours.start}
                    onChange={(e) => handleNestedSettingChange('availability', 'workingHours', 'start', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.availability.workingHours.end}
                    onChange={(e) => handleNestedSettingChange('availability', 'workingHours', 'end', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
            
            <SettingRow
              label="Weekend Work"
              description="Accept jobs on weekends (Saturday & Sunday)"
              control={
                <ToggleSwitch
                  enabled={settings.availability.weekendWork}
                  onChange={(value) => handleSettingChange('availability', 'weekendWork', value)}
                />
              }
            />
            
            <SettingRow
              label="Holiday Work"
              description="Accept jobs on public holidays"
              control={
                <ToggleSwitch
                  enabled={settings.availability.holidayWork}
                  onChange={(value) => handleSettingChange('availability', 'holidayWork', value)}
                />
              }
            />
          </SettingCard>

          {/* Privacy Settings */}
          <SettingCard
            title="Privacy & Security"
            description="Control your privacy and data sharing preferences"
            icon={Shield}
          >
            <SettingRow
              label="Show Profile to Customers"
              description="Allow customers to see your profile information"
              control={
                <ToggleSwitch
                  enabled={settings.privacy.showProfileToCustomers}
                  onChange={(value) => handleSettingChange('privacy', 'showProfileToCustomers', value)}
                />
              }
            />
            
            <SettingRow
              label="Show Rating Publicly"
              description="Display your rating and reviews to other users"
              control={
                <ToggleSwitch
                  enabled={settings.privacy.showRatingPublicly}
                  onChange={(value) => handleSettingChange('privacy', 'showRatingPublicly', value)}
                />
              }
            />
            
            <SettingRow
              label="Allow Direct Contact"
              description="Let customers contact you directly through the app"
              control={
                <ToggleSwitch
                  enabled={settings.privacy.allowDirectContact}
                  onChange={(value) => handleSettingChange('privacy', 'allowDirectContact', value)}
                />
              }
            />
            
            <SettingRow
              label="Share Location Data"
              description="Allow the app to use your location for job matching"
              control={
                <ToggleSwitch
                  enabled={settings.privacy.shareLocationData}
                  onChange={(value) => handleSettingChange('privacy', 'shareLocationData', value)}
                />
              }
            />
          </SettingCard>

          {/* App Preferences */}
          <SettingCard
            title="App Preferences"
            description="Customize your app experience"
            icon={Settings}
          >
            <SettingRow
              label="Language"
              description="Choose your preferred language"
              control={
                <select
                  value={settings.preferences.language}
                  onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                  className={`px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="ta">Tamil</option>
                </select>
              }
            />
            
            <SettingRow
              label="Currency"
              description="Display prices in your preferred currency"
              control={
                <select
                  value={settings.preferences.currency}
                  onChange={(e) => handleSettingChange('preferences', 'currency', e.target.value)}
                  className={`px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
              }
            />
            
            <SettingRow
              label="Distance Unit"
              description="Choose how distances are displayed"
              control={
                <select
                  value={settings.preferences.distanceUnit}
                  onChange={(e) => handleSettingChange('preferences', 'distanceUnit', e.target.value)}
                  className={`px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="km">Kilometers</option>
                  <option value="mi">Miles</option>
                </select>
              }
            />
            
            <SettingRow
              label="Time Format"
              description="Choose 12-hour or 24-hour time display"
              control={
                <select
                  value={settings.preferences.timeFormat}
                  onChange={(e) => handleSettingChange('preferences', 'timeFormat', e.target.value)}
                  className={`px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="12h">12 Hour (AM/PM)</option>
                  <option value="24h">24 Hour</option>
                </select>
              }
            />
          </SettingCard>

          {/* Data Management */}
          <SettingCard
            title="Data Management"
            description="Export, import, or delete your data"
            icon={Download}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-center space-x-2 p-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
              
              <button className="flex items-center justify-center space-x-2 p-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Import Settings</span>
              </button>
              
              <button className="flex items-center justify-center space-x-2 p-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
};

export default WorkerSettings; 