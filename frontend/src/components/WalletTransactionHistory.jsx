import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Gift, 
  Filter,
  Search,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AuthService from '../services/auth.service';
import { API_BASE_URL } from '../config';

const WalletTransactionHistory = () => {
  const { darkMode } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const transactionTypes = [
    { value: 'all', label: 'All Transactions' },
    { value: 'credit', label: 'Credits' },
    { value: 'debit', label: 'Debits' },
    { value: 'topup', label: 'Top-ups' },
    { value: 'refund', label: 'Refunds' },
    { value: 'bonus', label: 'Bonuses' }
  ];

  const dateFilters = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  useEffect(() => {
    loadTransactions();
  }, [currentPage, filterType, filterDate]);

  const loadTransactions = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setCurrentPage(1);
        setTransactions([]);
      } else {
        setLoading(true);
      }

      const token = AuthService.getToken('customer');
      const offset = (currentPage - 1) * 20;
      
      let url = `${API_BASE_URL}/api/customer/wallet/transactions?limit=20&offset=${offset}`;
      
      if (filterType !== 'all') {
        url += `&type=${filterType}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (refresh || currentPage === 1) {
          setTransactions(data.data);
        } else {
          setTransactions(prev => [...prev, ...data.data]);
        }
        
        setHasMore(data.data.length === 20);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTransactions(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.transaction_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Transaction History
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors appearance-none ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {transactionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors appearance-none ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {dateFilters.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700 overflow-hidden`}>
          {loading && transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <div className={`h-4 bg-gray-300 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className={`h-4 bg-gray-300 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className={`h-4 bg-gray-300 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {transaction.description || transaction.transaction_type}
                          </div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(transaction.created_at)}
                          </div>
                          {transaction.booking_id && (
                            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Booking #{transaction.booking_id}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                          {formatAmount(transaction.amount, transaction.transaction_type)}
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Balance: ₹{transaction.balance_after?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Transactions Found
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchTerm || filterType !== 'all' || filterDate !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your transaction history will appear here'
                }
              </p>
            </div>
          )}
        </div>

        {/* Export Button */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 text-center">
            <button
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Download className="h-4 w-4" />
              <span>Export Transactions</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletTransactionHistory;
