import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Clock, 
  Users, 
  Car,
  AlertTriangle,
  Settings,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

/**
 * SurgeMonitoring Component
 * Real-time monitoring and control of surge pricing
 */
const SurgeMonitoring = () => {
  const [surgeData, setSurgeData] = useState({
    current_surge: 1.0,
    demand_index: 0,
    active_rides: 0,
    pending_requests: 0,
    available_drivers: 0
  });
  const [surgeHistory, setSurgeHistory] = useState([]);
  const [surgeZones, setSurgeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    fetchSurgeData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSurgeData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchSurgeData = async () => {
    try {
      const [currentResponse, historyResponse, zonesResponse] = await Promise.all([
        axios.get('/api/admin/pricing/surge/current'),
        axios.get('/api/admin/pricing/surge/history'),
        axios.get('/api/admin/pricing/surge/zones')
      ]);

      setSurgeData(currentResponse.data);
      setSurgeHistory(historyResponse.data.history || []);
      setSurgeZones(zonesResponse.data.zones || []);
    } catch (error) {
      console.error('Error fetching surge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSurgeMultiplier = async (zoneId, multiplier) => {
    try {
      await axios.put(`/api/admin/pricing/surge/zones/${zoneId}`, {
        surge_multiplier: multiplier
      });
      fetchSurgeData();
    } catch (error) {
      console.error('Error updating surge multiplier:', error);
      alert('Failed to update surge multiplier');
    }
  };

  const getSurgeColor = (multiplier) => {
    if (multiplier >= 3.0) return 'text-red-600 bg-red-100';
    if (multiplier >= 2.0) return 'text-orange-600 bg-orange-100';
    if (multiplier >= 1.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getSurgeIcon = (multiplier) => {
    return multiplier > 1.0 ? TrendingUp : TrendingDown;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const MetricCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => (
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

  const SurgeZoneCard = ({ zone }) => {
    const [editing, setEditing] = useState(false);
    const [newMultiplier, setNewMultiplier] = useState(zone.current_surge_multiplier);
    
    const SurgeIcon = getSurgeIcon(zone.current_surge_multiplier);
    const surgeColorClass = getSurgeColor(zone.current_surge_multiplier);

    const handleSave = () => {
      updateSurgeMultiplier(zone.id, newMultiplier);
      setEditing(false);
    };

    const handleCancel = () => {
      setNewMultiplier(zone.current_surge_multiplier);
      setEditing(false);
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="font-semibold text-gray-800">{zone.zone_name}</h3>
          </div>
          
          <div className={`flex items-center px-3 py-1 rounded-full ${surgeColorClass}`}>
            <SurgeIcon className="w-4 h-4 mr-1" />
            <span className="font-semibold">{zone.current_surge_multiplier}x</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Demand Index</p>
            <p className="text-lg font-semibold">{zone.demand_index}/100</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Drivers</p>
            <p className="text-lg font-semibold">{zone.active_drivers_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="text-lg font-semibold">{zone.pending_requests_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-sm text-gray-500">{formatTime(zone.last_updated)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Manual Override:</span>
            
            {editing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(parseFloat(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={handleSave}
                  className="btn-primary text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="btn-primary text-sm flex items-center"
              >
                <Settings className="w-3 h-3 mr-1" />
                Adjust
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Surge Monitoring</h1>
          <p className="text-gray-600">Real-time surge pricing monitoring and control</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            disabled={!autoRefresh}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
          
          <button
            onClick={fetchSurgeData}
            className="btn-primary flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Current Surge"
          value={`${surgeData.current_surge}x`}
          icon={surgeData.current_surge > 1.0 ? TrendingUp : TrendingDown}
          color={surgeData.current_surge > 1.5 ? 'red' : surgeData.current_surge > 1.0 ? 'orange' : 'green'}
          subtitle={`Demand: ${surgeData.demand_index}/100`}
        />
        
        <MetricCard
          title="Active Rides"
          value={surgeData.active_rides}
          icon={Car}
          color="blue"
        />
        
        <MetricCard
          title="Pending Requests"
          value={surgeData.pending_requests}
          icon={Clock}
          color="orange"
        />
        
        <MetricCard
          title="Available Drivers"
          value={surgeData.available_drivers}
          icon={Users}
          color="green"
        />
      </div>

      {/* Surge Alert */}
      {surgeData.current_surge >= 2.0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-3" />
            <div>
              <h3 className="text-orange-800 font-semibold">High Surge Alert</h3>
              <p className="text-orange-700 text-sm">
                Current surge multiplier is {surgeData.current_surge}x. Consider monitoring driver availability and customer demand.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Surge History Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Surge History (Last 24 Hours)</h2>
        
        <div className="h-64 flex items-end space-x-2">
          {surgeHistory.slice(-24).map((point, index) => {
            const height = Math.max(10, (point.surge_multiplier / 4) * 100);
            const colorClass = getSurgeColor(point.surge_multiplier);
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t ${colorClass.split(' ')[1]} transition-all duration-300`}
                  style={{ height: `${height}%` }}
                  title={`${point.surge_multiplier}x at ${formatTime(point.timestamp)}`}
                />
                <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                  {formatTime(point.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
            <span>Normal (1.0-1.4x)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-100 rounded mr-2"></div>
            <span>Moderate (1.5-1.9x)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-100 rounded mr-2"></div>
            <span>High (2.0-2.9x)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-100 rounded mr-2"></div>
            <span>Critical (3.0x+)</span>
          </div>
        </div>
      </div>

      {/* Surge Zones */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Surge Zones</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surgeZones.map(zone => (
            <SurgeZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
        
        {surgeZones.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 card">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No surge zones configured</p>
            <button className="mt-4 btn-primary">
              Configure Zones
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurgeMonitoring;
