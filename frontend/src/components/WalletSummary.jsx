import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft,
  Eye,
  EyeOff,
  CreditCard
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../app/services/auth.service';
import { API_BASE_URL } from '../app/config';

const WalletSummary = ({ showFullView = false }) => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [walletData, setWalletData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken('customer');
      
      const [walletResponse, transactionsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/customer/wallet/balance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/customer/wallet/transactions?limit=3`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setWalletData(walletData.data);
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
      case 'topup':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'refund':
        return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatAmount = (amount, type) => {
    const formattedAmount = `₹${parseFloat(amount).toLocaleString()}`;
    return type === 'debit' ? `-${formattedAmount}` : `+${formattedAmount}`;
  };

  if (loading) {
    return (
      <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
        <div className="animate-pulse">
          <div className={`h-6 bg-gray-300 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <div className={`h-8 bg-gray-300 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <div className={`h-4 bg-gray-300 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  if (!walletData?.wallet_exists) {
    return (
      <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
        <div className="text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No Wallet Found
          </h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Create your wallet to make seamless payments
          </p>
          <button
            onClick={() => navigate('/wallet')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700 overflow-hidden`}>
      {/* Wallet Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Wallet className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-semibold">Wallet Balance</h3>
              <p className="text-blue-100 text-sm">Available for payments</p>
            </div>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
          >
            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        <div className="text-2xl font-bold mb-2">
          {showBalance ? `₹${walletData?.current_balance?.toLocaleString() || '0'}` : '••••••'}
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-blue-100">
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4" />
            <span>Added: ₹{walletData?.total_added?.toLocaleString() || '0'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ArrowUpRight className="h-4 w-4" />
            <span>Spent: ₹{walletData?.total_spent?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/wallet')}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Money</span>
          </button>
          <button
            onClick={() => navigate('/wallet')}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Wallet className="h-4 w-4" />
            <span>View Wallet</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      {showFullView && recentTransactions.length > 0 && (
        <div className="p-4">
          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Transactions
          </h4>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {transaction.description || transaction.transaction_type}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${
                  transaction.transaction_type === 'debit' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatAmount(transaction.amount, transaction.transaction_type)}
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => navigate('/wallet')}
            className="w-full mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All Transactions
          </button>
        </div>
      )}

      {/* Compact View - No Transactions */}
      {!showFullView && (
        <div className="p-4">
          <div className="text-center">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-3`}>
              Quick access to your wallet
            </p>
            <button
              onClick={() => navigate('/wallet')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Manage Wallet →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSummary;
