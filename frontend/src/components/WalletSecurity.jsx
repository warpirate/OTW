import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Smartphone,
  CreditCard,
  Settings
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-toastify';

const WalletSecurity = () => {
  const { darkMode } = useTheme();
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pin');

  const securityFeatures = [
    {
      id: 'pin',
      title: 'Wallet PIN',
      description: 'Secure your wallet with a 4-digit PIN',
      icon: Lock,
      status: 'enabled'
    },
    {
      id: 'biometric',
      title: 'Biometric Authentication',
      description: 'Use fingerprint or face recognition',
      icon: Smartphone,
      status: 'available'
    },
    {
      id: 'notifications',
      title: 'Transaction Notifications',
      description: 'Get notified for all wallet transactions',
      icon: AlertCircle,
      status: 'enabled'
    },
    {
      id: 'limits',
      title: 'Spending Limits',
      description: 'Set daily and monthly spending limits',
      icon: CreditCard,
      status: 'disabled'
    }
  ];

  const handlePinChange = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('New PIN and confirm PIN do not match');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setProcessing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Wallet PIN updated successfully');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      toast.error('Failed to update PIN');
    } finally {
      setProcessing(false);
    }
  };

  const toggleFeature = (featureId) => {
    toast.success(`Feature ${featureId} toggled`);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Wallet Security
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
          {[
            { id: 'pin', label: 'PIN Settings' },
            { id: 'features', label: 'Security Features' },
            { id: 'activity', label: 'Security Activity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* PIN Settings Tab */}
        {activeTab === 'pin' && (
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center space-x-3 mb-6">
              <Lock className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Change Wallet PIN
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Your PIN is used to authorize wallet transactions
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-md">
              {/* Current PIN */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Current PIN
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPin ? 'text' : 'password'}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Enter current PIN"
                    maxLength="4"
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showCurrentPin ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* New PIN */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  New PIN
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter new PIN"
                    maxLength="4"
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showNewPin ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* Confirm PIN */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Confirm New PIN
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm new PIN"
                    maxLength="4"
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPin ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handlePinChange}
                disabled={processing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Updating PIN...' : 'Update PIN'}
              </button>
            </div>

            {/* Security Tips */}
            <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border border-blue-200 dark:border-blue-800`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                Security Tips
              </h3>
              <ul className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-blue-800'}`}>
                <li>• Use a unique PIN that's different from your phone PIN</li>
                <li>• Don't share your wallet PIN with anyone</li>
                <li>• Change your PIN regularly for better security</li>
                <li>• Enable biometric authentication for added security</li>
              </ul>
            </div>
          </div>
        )}

        {/* Security Features Tab */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            {securityFeatures.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${
                        feature.status === 'enabled' ? 'bg-green-100 text-green-600' :
                        feature.status === 'available' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {feature.title}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-medium ${
                        feature.status === 'enabled' ? 'text-green-600' :
                        feature.status === 'available' ? 'text-blue-600' :
                        'text-gray-500'
                      }`}>
                        {feature.status === 'enabled' ? 'Enabled' :
                         feature.status === 'available' ? 'Available' :
                         'Disabled'}
                      </span>
                      <button
                        onClick={() => toggleFeature(feature.id)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          feature.status === 'enabled' ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          feature.status === 'enabled' ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security Activity Tab */}
        {activeTab === 'activity' && (
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Security Activity
            </h2>
            
            <div className="space-y-4">
              {[
                { action: 'PIN Changed', time: '2 hours ago', status: 'success' },
                { action: 'Login from new device', time: '1 day ago', status: 'warning' },
                { action: 'Wallet PIN enabled', time: '3 days ago', status: 'success' },
                { action: 'Biometric authentication enabled', time: '1 week ago', status: 'success' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    {activity.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.action}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {activity.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletSecurity;
