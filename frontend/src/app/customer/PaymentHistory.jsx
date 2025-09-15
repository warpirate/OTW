import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentService from '../services/payment.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    hasMore: false
  });

  // Listen for theme changes
  useEffect(() => {
    const removeListener = addThemeListener(() => {
      setDarkMode(isDarkMode());
    });
    return removeListener;
  }, []);

  // Load payment history
  useEffect(() => {
    loadPaymentHistory();
  }, [pagination.page]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      };
      
      const response = await PaymentService.history.get(params);
      setPayments(response.payments || []);
      setPagination(prev => ({
        ...prev,
        hasMore: response.payments?.length === pagination.limit
      }));
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPagination(prev => ({
      ...prev,
      page: prev.page + 1
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'refunded':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading && payments.length === 0) {
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
          
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Payment History
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            View your transaction history
          </p>
        </div>

        {/* Payment History List */}
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <CreditCard className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Payment History
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your payment transactions will appear here
              </p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(payment.status)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {payment.description || 'Service Payment'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(payment.status)}`}>
                          {PaymentService.utils.formatStatus(payment.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {payment.upi_id}
                        </p>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {PaymentService.utils.formatDate(payment.created_at)}
                        </p>
                        {payment.transaction_id && (
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Txn: {payment.transaction_id.slice(-8)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {PaymentService.utils.formatAmount(payment.amount)}
                    </p>
                    {payment.status === 'completed' && (
                      <p className="text-xs text-green-600">
                        Payment successful
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Additional Details */}
                {payment.booking_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Booking ID: {payment.booking_id}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {pagination.hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentHistory;
