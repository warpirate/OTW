import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentService from '../services/payment.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const AddUPIMethod = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    upi_id: '',
    is_default: false
  });
  const [detectedProvider, setDetectedProvider] = useState('');
  const [isValidUPI, setIsValidUPI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Listen for theme changes
  useEffect(() => {
    const removeListener = addThemeListener(() => {
      setDarkMode(isDarkMode());
    });
    return removeListener;
  }, []);

  // Validate UPI ID and detect provider when UPI ID changes
  useEffect(() => {
    if (formData.upi_id) {
      const isValid = PaymentService.utils.validateUPIId(formData.upi_id);
      setIsValidUPI(isValid);
      
      if (isValid) {
        const provider = PaymentService.utils.detectProvider(formData.upi_id);
        setDetectedProvider(provider);
      } else {
        setDetectedProvider('');
      }
    } else {
      setIsValidUPI(false);
      setDetectedProvider('');
    }
  }, [formData.upi_id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValidUPI) {
      toast.error('Please enter a valid UPI ID');
      return;
    }

    setIsSubmitting(true);

    try {
      const upiData = {
        upi_id: formData.upi_id,
        provider_name: detectedProvider,
        is_default: formData.is_default
      };

      await PaymentService.upiMethods.add(upiData);
      toast.success('UPI payment method added successfully');
      navigate('/payment-methods');
    } catch (error) {
      console.error('Error adding UPI method:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add UPI method';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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
          
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Add UPI Payment Method
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Add a new UPI ID to your payment methods
          </p>
        </div>

        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* UPI ID Input */}
            <div>
              <label htmlFor="upi_id" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                UPI ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="upi_id"
                  name="upi_id"
                  value={formData.upi_id}
                  onChange={handleInputChange}
                  placeholder="e.g., yourname@paytm"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                />
                
                {/* Validation Icon */}
                {formData.upi_id && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isValidUPI ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Validation Message */}
              {formData.upi_id && !isValidUPI && (
                <p className="mt-2 text-sm text-red-600">
                  Please enter a valid UPI ID (e.g., yourname@paytm)
                </p>
              )}
              
              {/* Provider Detection */}
              {isValidUPI && detectedProvider && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getProviderIcon(detectedProvider)}</span>
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Detected Provider: {detectedProvider}
                      </p>
                      <p className="text-xs text-green-600">
                        This UPI ID will be linked to {detectedProvider}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Set as Default */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                name="is_default"
                checked={formData.is_default}
                onChange={handleInputChange}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="is_default" className={`ml-2 block text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                Set as default payment method
              </label>
            </div>

            {/* UPI ID Examples */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border`}>
              <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                UPI ID Examples:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  • yourname@paytm (Paytm)
                </div>
                <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  • yourname@ybl (Google Pay)
                </div>
                <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  • yourname@phonepe (PhonePe)
                </div>
                <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  • yourname@amazon (Amazon Pay)
                </div>
                <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  • yourname@bhim (BHIM)
                </div>
                <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  • yourname@hdfc (HDFC Bank)
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={`flex-1 px-6 py-3 border rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={!isValidUPI || isSubmitting}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add UPI Method'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AddUPIMethod;
