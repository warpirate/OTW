import React, { useState, useEffect } from 'react';
import { Phone, Navigation, Clock, User, Car, Shield, AlertTriangle, Star } from 'lucide-react';

const DriverTracker = ({ 
  driverDetails, 
  tripStatus, 
  eta, 
  driverLocation, 
  darkMode = false,
  onCallDriver,
  onSOS 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'searching':
        return 'text-yellow-600 bg-yellow-100';
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'searching':
        return <Clock className="h-5 w-5" />;
      case 'confirmed':
        return <User className="h-5 w-5" />;
      case 'in_progress':
        return <Navigation className="h-5 w-5" />;
      case 'completed':
        return <Shield className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  if (!driverDetails && tripStatus === 'searching') {
    return (
      <div className={`rounded-lg p-4 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Searching for driver...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border transition-all duration-200 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } ${isExpanded ? 'p-6' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${getStatusColor(tripStatus)}`}>
            {getStatusIcon(tripStatus)}
          </div>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {tripStatus === 'searching' && 'Searching for Driver'}
              {tripStatus === 'confirmed' && 'Driver Assigned'}
              {tripStatus === 'in_progress' && 'Trip in Progress'}
              {tripStatus === 'completed' && 'Trip Completed'}
            </h3>
            {eta && (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ETA: {eta} minutes
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-2 rounded-lg transition-colors ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Driver Details (when expanded) */}
      {isExpanded && driverDetails && (
        <div className="space-y-4">
          {/* Driver Info */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {driverDetails.name}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {driverDetails.vehicle_number} • {driverDetails.vehicle_model}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < (driverDetails.rating || 0) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({driverDetails.total_trips || 0} trips)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3">
              <Car className="h-5 w-5 text-blue-500" />
              <div>
                <h5 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Vehicle Details
                </h5>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {driverDetails.vehicle_model} • {driverDetails.vehicle_color}
                </p>
                {driverDetails.ac_available && (
                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    AC Available
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => onCallDriver && onCallDriver(driverDetails.phone)}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>Call Driver</span>
            </button>
            <button
              onClick={() => onSOS && onSOS()}
              className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </div>

          {/* Trip Progress */}
          {tripStatus === 'in_progress' && (
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <h5 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Trip Progress
              </h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Distance covered
                  </span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    12.5 km / 25 km
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Time remaining
                  </span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {eta} minutes
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions (when collapsed) */}
      {!isExpanded && driverDetails && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onCallDriver && onCallDriver(driverDetails.phone)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm">Call</span>
            </button>
            <button
              onClick={() => onSOS && onSOS()}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">SOS</span>
            </button>
          </div>
          <div className={`text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-sm font-medium">{driverDetails.name}</div>
            <div className="text-xs">{driverDetails.vehicle_number}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTracker; 