import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentService from '../services/payment.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Get payment data from navigation state
  const { amount, bookingId, description, selectedPaymentMethod: preSelectedMethod, onPaymentSuccess } = location.state || {};

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
      const methods = response.payment_methods || [];
      setPaymentMethods(methods);
      
      // Auto-select method (prioritize pre-selected, then default, then first)
      if (preSelectedMethod) {
        // Find the pre-selected method in the loaded methods
        const foundMethod = methods.find(method => method.id === preSelectedMethod.id);
        if (foundMethod) {
          setSelectedMethod(foundMethod);
        } else {
          // Fallback to default or first method
          const defaultMethod = methods.find(method => method.is_default);
          setSelectedMethod(defaultMethod || methods[0]);
        }
      } else {
        // Auto-select default method
        const defaultMethod = methods.find(method => method.is_default);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod);
        } else if (methods.length > 0) {
          setSelectedMethod(methods[0]);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (!amount || amount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    setProcessing(true);

    try {
      // Initiate UPI payment
      const paymentResult = await PaymentService.upi.initiate({
        amount,
        upi_id: selectedMethod.upi_id,
        description: description || 'Service Payment',
        booking_id: bookingId
      });

      if (paymentResult.success && paymentResult.status === 'completed') {
        toast.success(`Payment of ${PaymentService.utils.formatAmount(amount)} completed successfully!`);
        
        // Call success callback if provided
        if (onPaymentSuccess) {
          onPaymentSuccess(paymentResult.payment_id);
        }
        
        // Navigate back or to success screen
        navigate(-1);
      } else if (paymentResult.success && paymentResult.status === 'processing') {
        toast.info('Payment initiated. Please complete the payment in your UPI app.');
        
        // Navigate back - the webhook will handle the final status
        navigate(-1);
      } else {
        throw new Error(paymentResult.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error?.response?.data?.message || 'Payment could not be processed. Please try again.');
    } finally {
      setProcessing(false);
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
        <div className="max-w-2xl mx-auto">
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
              Complete Payment
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose your payment method and complete the transaction
            </p>
          </div>

          {/* Payment Summary */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 mb-6`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Payment Summary
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {PaymentService.utils.formatAmount(amount)}
                </span>
              </div>
              
              {description && (
                <div className="flex justify-between">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Description</span>
                  <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{description}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Total
                  </span>
                  <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {PaymentService.utils.formatAmount(amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 mb-6`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Select Payment Method
            </h2>
            
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  No Payment Methods
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Add a UPI payment method to continue
                </p>
                <button
                  onClick={() => navigate('/add-upi-method')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Add UPI Method
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMethod?.id === method.id
                        ? 'border-purple-500 bg-purple-50'
                        : darkMode
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getProviderIcon(method.provider_name)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {method.upi_id}
                          </h3>
                          {method.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {method.provider_name}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedMethod?.id === method.id
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedMethod?.id === method.id && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Button */}
          {paymentMethods.length > 0 && selectedMethod && (
            <div className="space-y-4">
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay {PaymentService.utils.formatAmount(amount)}
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>Secure payment powered by Razorpay</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Payment;
