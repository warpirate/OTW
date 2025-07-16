import React, { useState } from 'react';

// Mock system settings data
const initialSettings = {
  general: {
    siteName: 'UrbanGo',
    siteDescription: 'On-demand home services and rides platform',
    supportEmail: 'support@urbango.ca',
    supportPhone: '+91 9876543210',
    timeZone: 'Asia/Kolkata',
    defaultLanguage: 'English'
  },
  booking: {
    allowInstantBooking: true,
    minimumAdvanceBookingMinutes: 30,
    maximumAdvanceBookingDays: 14,
    cancellationWindowMinutes: 60,
    autoAssignDrivers: true
  },
  payment: {
    paymentGateway: 'Razorpay',
    currencyCode: 'INR',
    taxPercentage: 18,
    platformFeePercentage: 10,
    minimumWalletBalance: 0
  },
  notification: {
    enableEmailNotifications: true,
    enableSmsNotifications: true,
    enablePushNotifications: true,
    sendBookingReminders: true,
    reminderHoursBeforeBooking: 2
  },
  security: {
    passwordResetIntervalDays: 90,
    sessionTimeoutMinutes: 30,
    twoFactorAuthenticationRequired: false,
    maxLoginAttempts: 5,
    requireStrongPasswords: true
  }
};

const SystemSettings = () => {
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle settings change
  const handleSettingChange = (category, field, value) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [field]: value
      }
    });
  };

  // Handle checkbox change
  const handleCheckboxChange = (category, field) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [field]: !settings[category][field]
      }
    });
  };

  // Handle settings save
  const handleSaveSettings = () => {
    // In a real app, this would make an API call
    console.log('Saving settings:', settings);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>
      
      {/* Success Message */}
      {isSuccess && (
        <div className="p-4 mb-4 rounded-md bg-green-50 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-check-circle text-green-400"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Settings saved successfully!
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {Object.keys(settings).map((tab) => (
              <button
                key={tab}
                className={`
                  border-b-2 py-4 px-1 text-sm font-medium
                  ${activeTab === tab
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
                `}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
                  Site Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700">
                  Support Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="supportEmail"
                    value={settings.general.supportEmail}
                    onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="supportPhone" className="block text-sm font-medium text-gray-700">
                  Support Phone
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="supportPhone"
                    value={settings.general.supportPhone}
                    onChange={(e) => handleSettingChange('general', 'supportPhone', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  Time Zone
                </label>
                <div className="mt-1">
                  <select
                    id="timeZone"
                    value={settings.general.timeZone}
                    onChange={(e) => handleSettingChange('general', 'timeZone', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                    <option value="America/New_York">America/New_York (GMT-4)</option>
                    <option value="Europe/London">Europe/London (GMT+1)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                    <option value="Australia/Sydney">Australia/Sydney (GMT+10)</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700">
                  Site Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="siteDescription"
                    rows={3}
                    value={settings.general.siteDescription}
                    onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700">
                  Default Language
                </label>
                <div className="mt-1">
                  <select
                    id="defaultLanguage"
                    value={settings.general.defaultLanguage}
                    onChange={(e) => handleSettingChange('general', 'defaultLanguage', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                    <option>Bengali</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Booking Settings */}
        {activeTab === 'booking' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    id="allowInstantBooking"
                    type="checkbox"
                    checked={settings.booking.allowInstantBooking}
                    onChange={() => handleCheckboxChange('booking', 'allowInstantBooking')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowInstantBooking" className="ml-2 block text-sm text-gray-700">
                    Allow Instant Booking
                  </label>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    id="autoAssignDrivers"
                    type="checkbox"
                    checked={settings.booking.autoAssignDrivers}
                    onChange={() => handleCheckboxChange('booking', 'autoAssignDrivers')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoAssignDrivers" className="ml-2 block text-sm text-gray-700">
                    Auto-assign Drivers
                  </label>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="minimumAdvanceBookingMinutes" className="block text-sm font-medium text-gray-700">
                  Minimum Advance Booking (minutes)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="minimumAdvanceBookingMinutes"
                    value={settings.booking.minimumAdvanceBookingMinutes}
                    onChange={(e) => handleSettingChange('booking', 'minimumAdvanceBookingMinutes', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="maximumAdvanceBookingDays" className="block text-sm font-medium text-gray-700">
                  Maximum Advance Booking (days)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="maximumAdvanceBookingDays"
                    value={settings.booking.maximumAdvanceBookingDays}
                    onChange={(e) => handleSettingChange('booking', 'maximumAdvanceBookingDays', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="cancellationWindowMinutes" className="block text-sm font-medium text-gray-700">
                  Cancellation Window (minutes)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="cancellationWindowMinutes"
                    value={settings.booking.cancellationWindowMinutes}
                    onChange={(e) => handleSettingChange('booking', 'cancellationWindowMinutes', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Settings */}
        {activeTab === 'payment' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="paymentGateway" className="block text-sm font-medium text-gray-700">
                  Payment Gateway
                </label>
                <div className="mt-1">
                  <select
                    id="paymentGateway"
                    value={settings.payment.paymentGateway}
                    onChange={(e) => handleSettingChange('payment', 'paymentGateway', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option>Razorpay</option>
                    <option>Stripe</option>
                    <option>PayPal</option>
                    <option>PayTM</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="currencyCode" className="block text-sm font-medium text-gray-700">
                  Currency Code
                </label>
                <div className="mt-1">
                  <select
                    id="currencyCode"
                    value={settings.payment.currencyCode}
                    onChange={(e) => handleSettingChange('payment', 'currencyCode', e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>AUD</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="taxPercentage" className="block text-sm font-medium text-gray-700">
                  Tax Percentage (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="taxPercentage"
                    value={settings.payment.taxPercentage}
                    onChange={(e) => handleSettingChange('payment', 'taxPercentage', parseFloat(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="platformFeePercentage" className="block text-sm font-medium text-gray-700">
                  Platform Fee (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="platformFeePercentage"
                    value={settings.payment.platformFeePercentage}
                    onChange={(e) => handleSettingChange('payment', 'platformFeePercentage', parseFloat(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="minimumWalletBalance" className="block text-sm font-medium text-gray-700">
                  Min. Wallet Balance
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="minimumWalletBalance"
                    value={settings.payment.minimumWalletBalance}
                    onChange={(e) => handleSettingChange('payment', 'minimumWalletBalance', parseFloat(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Notification Settings */}
        {activeTab === 'notification' && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="enableEmailNotifications"
                  type="checkbox"
                  checked={settings.notification.enableEmailNotifications}
                  onChange={() => handleCheckboxChange('notification', 'enableEmailNotifications')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="enableEmailNotifications" className="ml-2 block text-sm text-gray-700">
                  Enable Email Notifications
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="enableSmsNotifications"
                  type="checkbox"
                  checked={settings.notification.enableSmsNotifications}
                  onChange={() => handleCheckboxChange('notification', 'enableSmsNotifications')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="enableSmsNotifications" className="ml-2 block text-sm text-gray-700">
                  Enable SMS Notifications
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="enablePushNotifications"
                  type="checkbox"
                  checked={settings.notification.enablePushNotifications}
                  onChange={() => handleCheckboxChange('notification', 'enablePushNotifications')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="enablePushNotifications" className="ml-2 block text-sm text-gray-700">
                  Enable Push Notifications
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="sendBookingReminders"
                  type="checkbox"
                  checked={settings.notification.sendBookingReminders}
                  onChange={() => handleCheckboxChange('notification', 'sendBookingReminders')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="sendBookingReminders" className="ml-2 block text-sm text-gray-700">
                  Send Booking Reminders
                </label>
              </div>
              
              <div className="sm:col-span-3 pt-4">
                <label htmlFor="reminderHoursBeforeBooking" className="block text-sm font-medium text-gray-700">
                  Reminder Hours Before Booking
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="reminderHoursBeforeBooking"
                    value={settings.notification.reminderHoursBeforeBooking}
                    onChange={(e) => handleSettingChange('notification', 'reminderHoursBeforeBooking', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="passwordResetIntervalDays" className="block text-sm font-medium text-gray-700">
                  Password Reset Interval (days)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="passwordResetIntervalDays"
                    value={settings.security.passwordResetIntervalDays}
                    onChange={(e) => handleSettingChange('security', 'passwordResetIntervalDays', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="sessionTimeoutMinutes" className="block text-sm font-medium text-gray-700">
                  Session Timeout (minutes)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="sessionTimeoutMinutes"
                    value={settings.security.sessionTimeoutMinutes}
                    onChange={(e) => handleSettingChange('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="maxLoginAttempts" className="block text-sm font-medium text-gray-700">
                  Max Login Attempts
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="maxLoginAttempts"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    id="twoFactorAuthenticationRequired"
                    type="checkbox"
                    checked={settings.security.twoFactorAuthenticationRequired}
                    onChange={() => handleCheckboxChange('security', 'twoFactorAuthenticationRequired')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="twoFactorAuthenticationRequired" className="ml-2 block text-sm text-gray-700">
                    Require Two-Factor Authentication
                  </label>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    id="requireStrongPasswords"
                    type="checkbox"
                    checked={settings.security.requireStrongPasswords}
                    onChange={() => handleCheckboxChange('security', 'requireStrongPasswords')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireStrongPasswords" className="ml-2 block text-sm text-gray-700">
                    Require Strong Passwords
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Save Button */}
        <div className="px-6 py-3 bg-gray-50 text-right sm:px-6">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
