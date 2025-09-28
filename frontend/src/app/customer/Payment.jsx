import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentService from '../services/payment.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Get payment data from navigation state
  const { amount, bookingId, description, onPaymentSuccess } = location.state || {};

  // Listen for theme changes
  useEffect(() => {
    const removeListener = addThemeListener(() => {
      setDarkMode(isDarkMode());
    });
    return removeListener;
  }, []);

  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    setProcessing(true);

    try {
      // Load Razorpay script if not already loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Payment gateway could not be loaded. Please try again.');
        setProcessing(false);
        return;
      }

      // Create Razorpay order
      const orderResponse = await PaymentService.razorpay.createOrder({
        amount,
        description: description || 'Service Payment',
        booking_id: bookingId,
        user_details: {
          name: 'Customer', // You can get this from auth context
          email: 'customer@example.com', // You can get this from auth context
          contact: '9999999999' // You can get this from auth context
        }
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      const { order } = orderResponse;

      // Razorpay checkout options
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.id,
        prefill: order.prefill,
        theme: order.theme,
        method: order.method,
        config: order.config,
        handler: async (response) => {
          try {
            console.log('Razorpay payment success:', response);
            
            // Handle payment success
            const successResponse = await PaymentService.razorpay.handleSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            if (successResponse.success) {
              toast.success(`Payment of ${PaymentService.utils.formatAmount(amount)} completed successfully!`);
              
              // Call success callback if provided
              if (onPaymentSuccess) {
                onPaymentSuccess(successResponse.payment_id);
              }
              
              // Navigate back or to success screen
              navigate(-1);
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay checkout modal closed');
            setProcessing(false);
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', (response) => {
        console.error('Razorpay payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });

      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error?.response?.data?.message || 'Payment could not be processed. Please try again.');
      setProcessing(false);
    }
  };


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

          {/* Payment Options Info */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 mb-6`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Payment Options
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-800' : 'text-gray-700'}`}>UPI</span>
                <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>PhonePe, GPay, etc.</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">💳</div>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-800' : 'text-gray-700'}`}>Cards</span>
                <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>Credit/Debit</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">🏦</div>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-800' : 'text-gray-700'}`}>Netbanking</span>
                <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>All Banks</span>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl mb-2">👛</div>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-800' : 'text-gray-700'}`}>Wallets</span>
                <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>Paytm, etc.</span>
              </div>
            </div>
            
            <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose your preferred payment method in the next step
            </p>
          </div>

          {/* Payment Button */}
          <div className="space-y-4">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Opening Payment Gateway...
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
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Payment;
