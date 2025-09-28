import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Banknote,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Check,
  X
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import CashPaymentService from '../../services/cashPayment.service';
import { toast } from 'react-toastify';
import WorkerHeader from '../../../components/WorkerHeader';
const WorkerPayments = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ pending: 0, received: 0, disputed: 0 });
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const removeListener = addThemeListener(() => setDarkMode(isDarkMode()));
    loadPayments();
    loadStats();
    return () => removeListener();
  }, [activeFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const filters = {
        status: activeFilter === 'all' ? null : activeFilter,
        limit: 20
      };
      const response = await CashPaymentService.getCashPayments(filters);
      setPayments(response.payments || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await CashPaymentService.getPaymentStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleMarkReceived = async (bookingId, paymentMethod = 'cash', notes = '') => {
    setProcessingPayment(true);
    try {
      await CashPaymentService.markPaymentReceived(bookingId, {
        payment_method: paymentMethod,
        notes: notes
      });
      toast.success('Payment marked as received successfully!');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      loadPayments();
      loadStats();
    } catch (error) {
      console.error('Error marking payment as received:', error);
      toast.error(error.response?.data?.message || 'Failed to mark payment as received');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDisputePayment = async (bookingId, reason) => {
    try {
      await CashPaymentService.disputePayment(bookingId, reason);
      toast.success('Payment dispute raised successfully!');
      loadPayments();
      loadStats();
    } catch (error) {
      console.error('Error disputing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to raise dispute');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'received': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disputed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'disputed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR' 
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.first_name?.toLowerCase().includes(query) ||
      payment.last_name?.toLowerCase().includes(query) ||
      payment.service_name?.toLowerCase().includes(query) ||
      payment.booking_id?.toString().includes(query)
    );
  });

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/worker/dashboard')}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Cash Payments
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage payments for "Pay After Service" bookings
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Pending Payments
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Received Payments
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.received}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Disputed Payments
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.disputed}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className={`p-6 rounded-lg border mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, service, or booking ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              {['all', 'pending', 'received', 'disputed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? 'bg-purple-600 text-white'
                      : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Cash Payments Found
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeFilter === 'all' 
                  ? 'You don\'t have any "Pay After Service" bookings yet.'
                  : `No ${activeFilter} payments found.`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {payment.first_name} {payment.last_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          <span className="ml-1 capitalize">{payment.status}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Service: {payment.service_name}
                          </p>
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Booking ID: #{payment.booking_id}
                          </p>
                        </div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Amount: {formatAmount(payment.amount)}
                          </p>
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Scheduled: {formatDateTime(payment.scheduled_time)}
                          </p>
                        </div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Customer: {payment.customer_phone}
                          </p>
                          {payment.received_at && (
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Received: {formatDateTime(payment.received_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentModal(true);
                            }}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            <span>Mark Received</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for dispute:');
                              if (reason) {
                                handleDisputePayment(payment.booking_id, reason);
                              }
                            }}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            <span>Dispute</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Payment Details
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Customer: {selectedPayment.first_name} {selectedPayment.last_name}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Service: {selectedPayment.service_name}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Amount: {formatAmount(selectedPayment.amount)}
                </p>
              </div>
            </div>

            {selectedPayment.status === 'pending' && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Payment Method
                  </label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    defaultValue="cash"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="Any additional notes about the payment..."
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className={`flex-1 px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} transition-colors`}
              >
                Close
              </button>
              {selectedPayment.status === 'pending' && (
                <button
                  onClick={() => handleMarkReceived(selectedPayment.booking_id)}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {processingPayment ? 'Processing...' : 'Mark as Received'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerPayments;
