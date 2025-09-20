import React, { useState, useEffect } from 'react';
import { Car, Bike, Truck, Users, Clock, MapPin } from 'lucide-react';
import RideQuoteService from '../../services/rideQuote.service';

/**
 * VehicleTypeSelector Component
 * Allows users to select vehicle type and see pricing information
 */
const VehicleTypeSelector = ({ 
  selectedVehicleType, 
  onVehicleTypeChange, 
  onGetQuote,
  pickup,
  drop,
  className = "" 
}) => {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      setLoading(true);
      const response = await RideQuoteService.getVehicleTypes();
      setVehicleTypes(response.vehicle_types || []);
      
      // Auto-select first vehicle type if none selected
      if (!selectedVehicleType && response.vehicle_types?.length > 0) {
        onVehicleTypeChange?.(response.vehicle_types[0]);
      }
    } catch (err) {
      console.error('Error fetching vehicle types:', err);
      setError('Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (vehicleName) => {
    const name = vehicleName.toLowerCase();
    if (name.includes('bike')) return Bike;
    if (name.includes('suv') || name.includes('van')) return Truck;
    if (name.includes('sedan') || name.includes('hatchback')) return Car;
    return Car;
  };

  const getCapacityInfo = (vehicleName) => {
    const name = vehicleName.toLowerCase();
    if (name.includes('bike')) return '1 rider';
    if (name.includes('hatchback')) return '4 passengers';
    if (name.includes('sedan')) return '4 passengers';
    if (name.includes('suv')) return '6-7 passengers';
    if (name.includes('van')) return '8+ passengers';
    return '4 passengers';
  };

  const canGetQuote = pickup && drop && selectedVehicleType;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 card ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center card ${className}`}>
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchVehicleTypes}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 card ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Choose Vehicle Type</h3>
        {canGetQuote && (
          <button
            onClick={() => onGetQuote?.(selectedVehicleType)}
            className="btn-primary flex items-center"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Get Quote
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicleTypes.map((vehicle) => {
          const IconComponent = getVehicleIcon(vehicle.name);
          const isSelected = selectedVehicleType?.id === vehicle.id;
          
          return (
            <div
              key={vehicle.id}
              onClick={() => onVehicleTypeChange?.(vehicle)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <IconComponent className={`w-6 h-6 mr-3 ${
                    isSelected ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                  <div>
                    <h4 className={`font-semibold ${
                      isSelected ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                      {vehicle.display_name}
                    </h4>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {getCapacityInfo(vehicle.name)}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base fare:</span>
                  <span className="font-medium">₹{vehicle.pricing?.base_fare || vehicle.base_fare}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Per km:</span>
                  <span className="font-medium">₹{vehicle.pricing?.rate_per_km || vehicle.rate_per_km}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Per minute:</span>
                  <span className="font-medium">₹{vehicle.pricing?.rate_per_min || vehicle.rate_per_min}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Minimum fare:</span>
                  <span className="font-medium">₹{vehicle.pricing?.minimum_fare || vehicle.minimum_fare}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {vehicle.description || `Comfortable ${vehicle.display_name} for your journey`}
                </p>
                {(vehicle.pricing?.free_km_threshold || vehicle.free_km_threshold) > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    First {vehicle.pricing?.free_km_threshold || vehicle.free_km_threshold} km included
                  </p>
                )}
              </div>

              {/* Surge indicator */}
              {vehicle.surge_enabled && (
                <div className="mt-2 flex items-center text-xs">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  <span className="text-orange-600">Surge pricing may apply</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!canGetQuote && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">
            {!pickup || !drop 
              ? 'Please select pickup and drop locations to get fare quote'
              : 'Select a vehicle type to continue'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default VehicleTypeSelector;
