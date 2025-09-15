import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Star, CreditCard, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentService from '../services/payment.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const PaymentMethods = () => {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Listen for theme changes
  useEffect(() => {
    const removeListener = addThemeListener(() => {
      setDarkMode(isDarkMode());
    });
    return removeListener;
  }, []);

  // Load payment methods
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await PaymentService.upiMethods.getAll();
      setPaymentMethods(response.payment_methods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      await PaymentService.upiMethods.setDefault(methodId);
      toast.success('Default payment method updated');
      loadPaymentMethods(); // Reload to update UI
    } catch (error) {
      console.error('Error setting default method:', error);
      toast.error('Failed to update default payment method');
    }
  };

  const handleDeleteMethod = async (methodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await PaymentService.upiMethods.delete(methodId);
      toast.success('Payment method deleted');
      loadPaymentMethods(); // Reload to update UI
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  const getProviderIcon = (provider) => {
    const iconMap = {
      'Paytm': '💳',
      'Google Pay': '📱',
      'PhonePe': '📲',
      'Amazon Pay': '🛒',
      'BHIM': '🏦',
      'Yono SBI': '🏛️',
      'HDFC Bank': '🏦',
      'ICICI Bank': '🏦',
      'Axis Bank': '🏦',
      'Kotak Bank': '🏦',
      'Punjab National Bank': '🏦',
      'State Bank of India': '🏦',
      'Bank UPI': '🏦',
      'Other': '💳'
    };
    return iconMap[provider] || '💳';
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container-custom py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      <div className="container-custom py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Payment Methods
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your UPI payment methods
              </p>
            </div>
            
            <button
              onClick={() => navigate('/add-upi-method')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add UPI Method
            </button>
          </div>
        </div>

        {/* Payment Methods List */}
        <div className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <CreditCard className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Payment Methods
              </h3>
              <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Add your first UPI payment method to get started
              </p>
              <button
                onClick={() => navigate('/add-upi-method')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Add UPI Method
              </button>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">
                      {getProviderIcon(method.provider_name)}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {method.upi_id}
                        </h3>
                        {method.is_default && (
                          <div className="flex items-center text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-xs ml-1">Default</span>
                          </div>
                        )}
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {method.provider_name}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Added {PaymentService.utils.formatDate(method.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!method.is_default && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        Set as Default
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment History Link */}
        {paymentMethods.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => navigate('/payment-history')}
              className={`w-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4 text-left hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Payment History
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    View your transaction history
                  </p>
                </div>
                <div className="text-purple-600">
                  →
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentMethods;
