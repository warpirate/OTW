import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  FileText
} from 'lucide-react';
import axios from 'axios';

/**
 * PayoutManagement Component
 * Admin interface for managing provider payouts and earnings
 */
const PayoutManagement = () => {
  const [payoutBatches, setPayoutBatches] = useState([]);
  const [providerEarnings, setProviderEarnings] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [stats, setStats] = useState({
    total_pending: 0,
    total_providers: 0,
    this_month_payouts: 0,
    avg_payout: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState('this_month');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchPayoutData();
  }, [selectedDateRange, filterStatus]);

  const fetchPayoutData = async () => {
    try {
      setLoading(true);
      const [batchesResponse, earningsResponse, pendingResponse, statsResponse] = await Promise.all([
        axios.get('/api/admin/payouts/batches', { 
          params: { date_range: selectedDateRange, status: filterStatus } 
        }),
        axios.get('/api/admin/payouts/provider-earnings', { 
          params: { date_range: selectedDateRange } 
        }),
        axios.get('/api/admin/payouts/pending'),
        axios.get('/api/admin/payouts/stats')
      ]);

      setPayoutBatches(batchesResponse.data.batches || []);
      setProviderEarnings(earningsResponse.data.earnings || []);
      setPendingPayouts(pendingResponse.data.pending || []);
      setStats(statsResponse.data.stats || {});
    } catch (error) {
      console.error('Error fetching payout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPayoutBatch = async (selectedProviders) => {
    try {
      const response = await axios.post('/api/admin/payouts/batches', {
        provider_ids: selectedProviders,
        date_range: selectedDateRange
      });

      if (response.data.success) {
        fetchPayoutData();
        alert('Payout batch created successfully');
      }
    } catch (error) {
      console.error('Error creating payout batch:', error);
      alert('Failed to create payout batch');
    }
  };

  const processPayout = async (batchId) => {
    if (!confirm('Are you sure you want to process this payout batch?')) return;

    try {
      const response = await axios.post(`/api/admin/payouts/batches/${batchId}/process`);
      
      if (response.data.success) {
        fetchPayoutData();
        alert('Payout batch processed successfully');
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      alert('Failed to process payout batch');
    }
  };

  const downloadPayoutReport = async (batchId) => {
    try {
      const response = await axios.get(`/api/admin/payouts/batches/${batchId}/report`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payout-report-${batchId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': return Clock;
      case 'failed': return AlertCircle;
      default: return Clock;
    }
  };

  const filteredEarnings = providerEarnings.filter(earning =>
    earning.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    earning.provider_id.toString().includes(searchTerm)
  );

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`w-8 h-8 text-${color}-600`} />
      </div>
    </div>
  );

  const PayoutBatchCard = ({ batch }) => {
    const StatusIcon = getStatusIcon(batch.status);
    const statusColorClass = getStatusColor(batch.status);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Batch #{batch.batch_reference}</h3>
            <p className="text-sm text-gray-600">
              Created: {new Date(batch.created_at).toLocaleDateString()}
            </p>
          </div>
          
          <div className={`flex items-center px-3 py-1 rounded-full ${statusColorClass}`}>
            <StatusIcon className="w-4 h-4 mr-1" />
            <span className="font-medium capitalize">{batch.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-semibold">₹{batch.total_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Providers</p>
            <p className="text-lg font-semibold">{batch.total_providers}</p>
          </div>
        </div>

        {batch.notes && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Notes:</p>
            <p className="text-sm text-gray-800">{batch.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            Method: {batch.payout_method.replace('_', ' ').toUpperCase()}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => downloadPayoutReport(batch.id)}
              className="btn-secondary text-sm flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Report
            </button>
            
            {batch.status === 'created' && (
              <button
                onClick={() => processPayout(batch.id)}
                className="btn-primary text-sm flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Process
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ProviderEarningsRow = ({ earning, onSelect, isSelected }) => (
    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(earning.provider_id)}
          className="rounded"
        />
      </td>
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">{earning.provider_name}</p>
          <p className="text-sm text-gray-600">ID: {earning.provider_id}</p>
        </div>
      </td>
      <td className="px-6 py-4 text-center">{earning.total_rides}</td>
      <td className="px-6 py-4 text-right font-medium">₹{earning.total_net_earnings.toLocaleString()}</td>
      <td className="px-6 py-4 text-right">₹{earning.pending_payout.toLocaleString()}</td>
      <td className="px-6 py-4 text-right">₹{earning.avg_earnings_per_ride.toFixed(2)}</td>
      <td className="px-6 py-4 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          earning.pending_payout > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}>
          {earning.pending_payout > 0 ? 'Pending' : 'Paid'}
        </span>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
          <p className="text-gray-600">Manage provider earnings and process payouts</p>
        </div>
        <button
          onClick={() => createPayoutBatch([])}
          className="btn-primary flex items-center"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Create Batch
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Pending Payouts"
          value={`₹${stats.total_pending?.toLocaleString() || 0}`}
          icon={Clock}
          color="orange"
          subtitle={`${stats.total_providers || 0} providers`}
        />
        
        <StatCard
          title="This Month"
          value={`₹${stats.this_month_payouts?.toLocaleString() || 0}`}
          icon={TrendingUp}
          color="green"
        />
        
        <StatCard
          title="Average Payout"
          value={`₹${stats.avg_payout?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="blue"
        />
        
        <StatCard
          title="Active Providers"
          value={stats.total_providers || 0}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-600 mr-2" />
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-gray-600 mr-2" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Recent Payout Batches */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Payout Batches</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payoutBatches.map(batch => (
            <PayoutBatchCard key={batch.id} batch={batch} />
          ))}
        </div>
        
        {payoutBatches.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 card">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payout batches found</p>
          </div>
        )}
      </div>

      {/* Provider Earnings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Provider Earnings</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Rides
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Payout
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg per Ride
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredEarnings.map(earning => (
                <ProviderEarningsRow
                  key={earning.provider_id}
                  earning={earning}
                  onSelect={() => {}}
                  isSelected={false}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEarnings.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No provider earnings found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutManagement;
