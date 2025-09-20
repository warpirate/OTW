import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign
} from 'lucide-react';
import axios from 'axios';

/**
 * PricingManagement Component
 * Admin interface for managing vehicle types and pricing rules
 */
const PricingManagement = () => {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehicleResponse, rulesResponse] = await Promise.all([
        axios.get('/api/admin/pricing/vehicle-types'),
        axios.get('/api/admin/pricing/rules')
      ]);
      
      setVehicleTypes(vehicleResponse.data.vehicle_types || []);
      setPricingRules(rulesResponse.data.rules || []);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveVehicleType = async (vehicleData) => {
    try {
      setSaving(true);
      const isEdit = vehicleData.id;
      
      const response = await axios({
        method: isEdit ? 'PUT' : 'POST',
        url: isEdit ? `/api/admin/pricing/vehicle-types/${vehicleData.id}` : '/api/admin/pricing/vehicle-types',
        data: vehicleData
      });

      if (response.data.success) {
        await fetchData();
        setEditingVehicle(null);
        setShowAddVehicle(false);
      }
    } catch (error) {
      console.error('Error saving vehicle type:', error);
      alert('Failed to save vehicle type');
    } finally {
      setSaving(false);
    }
  };

  const savePricingRule = async (ruleData) => {
    try {
      setSaving(true);
      const response = await axios.put(`/api/admin/pricing/rules/${ruleData.id}`, {
        rule_value: ruleData.rule_value
      });

      if (response.data.success) {
        await fetchData();
        setEditingRule(null);
      }
    } catch (error) {
      console.error('Error saving pricing rule:', error);
      alert('Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicleType = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle type?')) return;

    try {
      const response = await axios.delete(`/api/admin/pricing/vehicle-types/${vehicleId}`);
      if (response.data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting vehicle type:', error);
      alert('Failed to delete vehicle type');
    }
  };

  const VehicleTypeCard = ({ vehicle }) => {
    const isEditing = editingVehicle?.id === vehicle.id;
    const [formData, setFormData] = useState(vehicle);

    const handleSave = () => {
      saveVehicleType(formData);
    };

    const handleCancel = () => {
      setFormData(vehicle);
      setEditingVehicle(null);
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Car className="w-6 h-6 text-blue-600 mr-3" />
            {isEditing ? (
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                className="text-lg font-semibold border-b border-gray-300 focus:border-blue-500 outline-none"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-800">{vehicle.display_name}</h3>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditingVehicle(vehicle)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteVehicleType(vehicle.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.base_fare}
                onChange={(e) => setFormData({...formData, base_fare: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">₹{vehicle.base_fare}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per KM</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.rate_per_km}
                onChange={(e) => setFormData({...formData, rate_per_km: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">₹{vehicle.rate_per_km}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per Min</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.rate_per_min}
                onChange={(e) => setFormData({...formData, rate_per_min: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">₹{vehicle.rate_per_min}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fare</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.minimum_fare}
                onChange={(e) => setFormData({...formData, minimum_fare: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">₹{vehicle.minimum_fare}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Multiplier</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.vehicle_multiplier}
                onChange={(e) => setFormData({...formData, vehicle_multiplier: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{vehicle.vehicle_multiplier}x</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Night Multiplier</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.night_multiplier}
                onChange={(e) => setFormData({...formData, night_multiplier: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{vehicle.night_multiplier}x</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Free KM</label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.free_km_threshold}
                onChange={(e) => setFormData({...formData, free_km_threshold: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{vehicle.free_km_threshold} km</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isEditing ? formData.surge_enabled : vehicle.surge_enabled}
              onChange={(e) => isEditing && setFormData({...formData, surge_enabled: e.target.checked})}
              disabled={!isEditing}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Surge Pricing Enabled</span>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isEditing ? formData.is_active : vehicle.is_active}
              onChange={(e) => isEditing && setFormData({...formData, is_active: e.target.checked})}
              disabled={!isEditing}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Active</span>
          </div>
        </div>
      </div>
    );
  };

  const PricingRuleCard = ({ rule }) => {
    const isEditing = editingRule?.id === rule.id;
    const [ruleValue, setRuleValue] = useState(rule.rule_value);

    const handleSave = () => {
      savePricingRule({ ...rule, rule_value: ruleValue });
    };

    const handleCancel = () => {
      setRuleValue(rule.rule_value);
      setEditingRule(null);
    };

    const getIcon = (category) => {
      switch (category) {
        case 'surge': return TrendingUp;
        case 'night_charges': return Clock;
        case 'commission': return DollarSign;
        default: return AlertTriangle;
      }
    };

    const IconComponent = getIcon(rule.category);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <IconComponent className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-gray-800">{rule.rule_key.replace(/_/g, ' ').toUpperCase()}</h4>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingRule(rule)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Value:</span>
          {isEditing ? (
            <input
              type={rule.rule_type === 'number' ? 'number' : 'text'}
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <span className="font-semibold text-gray-900">
              {rule.rule_type === 'percentage' ? `${rule.rule_value}%` : rule.rule_value}
              {rule.rule_type === 'number' && rule.category === 'commission' && '%'}
            </span>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Category: {rule.category} | Type: {rule.rule_type}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600">Manage vehicle types, pricing rules, and fare configuration</p>
        </div>
        <button
          onClick={() => setShowAddVehicle(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle Type
        </button>
      </div>

      {/* Vehicle Types Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Types</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vehicleTypes.map(vehicle => (
            <VehicleTypeCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </div>

      {/* Pricing Rules Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Pricing Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pricingRules.map(rule => (
            <PricingRuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingManagement;
