import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Wallet, 
  Plus, 
  Minus, 
  CreditCard, 
  Smartphone, 
  History, 
  Shield, 
  Settings,
  TrendingUp,
  Gift,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../services/auth.service';
import { API_BASE_URL } from '../config';

const WalletProfile = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [topupProcessing, setTopupProcessing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Quick top-up amounts (industry standard)
  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken('customer');
      
      // Load wallet details and recent transactions
      const [walletResponse, transactionsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/customer/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/customer/wallet/transactions?limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setWalletData(walletData.data);
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setTopupProcessing(true);
    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: 'upi'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Top-up request created successfully!');
        setShowTopupModal(false);
        setTopupAmount('');
        setCustomAmount('');
        
        // Reload wallet data
        loadWalletData();
        
        // In a real app, you would redirect to Razorpay payment page
        // For now, we'll simulate successful payment
        setTimeout(() => {
          toast.success('Payment completed! Wallet updated.');
          loadWalletData();
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to create top-up request');
      }
    } catch (error) {
      console.error('Top-up error:', error);
      toast.error('Failed to process top-up request');
    } finally {
      setTopupProcessing(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
      case 'topup':
        return <ArrowDownLeft className="h-5 w-5 text-green-600" />;
      case 'debit':
        return <ArrowUpRight className="h-5 w-5 text-red-600" />;
      case 'refund':
        return <ArrowDownLeft className="h-5 w-5 text-blue-600" />;
      case 'bonus':
        return <Gift className="h-5 w-5 text-purple-600" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'credit':
      case 'topup':
      case 'refund':
      case 'bonus':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatAmount = (amount, type) => {
    const formattedAmount = `₹${parseFloat(amount).toLocaleString()}`;
    return type === 'debit' ? `-${formattedAmount}` : `+${formattedAmount}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className={`h-8 bg-gray-300 rounded mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <div className={`h-32 bg-gray-300 rounded mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <div className={`h-64 bg-gray-300 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
            >
              ←
            </button>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              My Wallet
            </h1>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
          >
            {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {/* Wallet Balance Card */}
        <div className={`rounded-2xl p-6 mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Wallet className="h-8 w-8" />
              <div>
                <h2 className="text-lg font-semibold">Wallet Balance</h2>
                <p className="text-blue-100 text-sm">Available for payments</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Money</span>
            </button>
          </div>
          
          <div className="text-3xl font-bold mb-2">
            {showBalance ? `₹${walletData?.wallet?.current_balance?.toLocaleString() || '0'}` : '••••••'}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-blue-100">
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>Total Added: ₹{walletData?.wallet?.total_added?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Minus className="h-4 w-4" />
              <span>Total Spent: ₹{walletData?.wallet?.total_spent?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setShowTopupModal(true)}
            className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} transition-colors text-center`}
          >
            <Plus className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Money</div>
          </button>
          
          <button
            onClick={() => setShowTransactionModal(true)}
            className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} transition-colors text-center`}
          >
            <History className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>History</div>
          </button>
          
          <button
            className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} transition-colors text-center`}
          >
            <Shield className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Security</div>
          </button>
          
          <button
            className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} transition-colors text-center`}
          >
            <Settings className="h-6 w-6 mx-auto mb-2 text-gray-600" />
            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</div>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Transactions
            </h3>
            <button
              onClick={() => setShowTransactionModal(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.description || transaction.transaction_type}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                    {formatAmount(transaction.amount, transaction.transaction_type)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No transactions yet
              </p>
            </div>
          )}
        </div>

        {/* Top-up Modal */}
        {showTopupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Money to Wallet
              </h3>
              
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Quick Amounts
                </label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(amount.toString())}
                      className={`p-3 rounded-lg border transition-colors ${
                        topupAmount === amount.toString()
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : darkMode
                          ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Custom Amount
                  </label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setTopupAmount('');
                    }}
                    placeholder="Enter amount"
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTopup(customAmount || topupAmount)}
                  disabled={topupProcessing || (!topupAmount && !customAmount)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {topupProcessing ? 'Processing...' : 'Add Money'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl p-6 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Transaction Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type:</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTransaction.transaction_type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount:</span>
                  <span className={`font-semibold ${getTransactionColor(selectedTransaction.transaction_type)}`}>
                    {formatAmount(selectedTransaction.amount, selectedTransaction.transaction_type)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date:</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedTransaction.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedTransaction.description && (
                  <div className="flex items-center justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Description:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTransaction.description}
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletProfile;
