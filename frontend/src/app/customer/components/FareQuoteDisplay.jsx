import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Car, Zap, Moon, AlertTriangle } from 'lucide-react';
import RideQuoteService from '../../services/rideQuote.service';

/**
 * FareQuoteDisplay Component
 * Displays detailed fare breakdown for ride quotes
 */
const FareQuoteDisplay = ({ 
  quote, 
  loading = false, 
  onBookRide, 
  onRequestNewQuote,
  className = "" 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (!quote?.expires_at) return;

    const updateTimer = () => {
      const now = new Date();
      const expiryTime = new Date(quote.expires_at);
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        onRequestNewQuote?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [quote?.expires_at, onRequestNewQuote]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center card ${className}`}>
        <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Request a fare quote to see pricing details</p>
      </div>
    );
  }

  const { fare, surge_multiplier, night_hours, breakdown_details } = quote;
  const hasSurge = surge_multiplier > 1;
  const isExpiring = timeRemaining && timeRemaining < 60;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden card ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{quote.vehicle_type}</h3>
            <p className="text-blue-100 text-sm">
              {quote.distance_km} km • {quote.duration_min} min
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">₹{fare.total}</div>
            {hasSurge && (
              <div className="flex items-center text-yellow-200 text-sm">
                <Zap className="w-4 h-4 mr-1" />
                {surge_multiplier}x surge
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer */}
      {timeRemaining !== null && (
        <div className={`px-4 py-2 text-center text-sm font-medium ${
          isExpiring ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
        }`}>
          <Clock className="w-4 h-4 inline mr-1" />
          Quote expires in {formatTime(timeRemaining)}
          {isExpiring && (
            <AlertTriangle className="w-4 h-4 inline ml-2 text-red-500" />
          )}
        </div>
      )}

      {/* Fare Breakdown */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-800 mb-3">Fare Breakdown</h4>
        
        <div className="space-y-2 text-sm">
          {/* Base Fare */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              <Car className="w-4 h-4 inline mr-2" />
              {breakdown_details?.base_fare_description || 'Base fare'}
            </span>
            <span className="font-medium">₹{fare.base}</span>
          </div>

          {/* Distance */}
          {fare.distance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                <MapPin className="w-4 h-4 inline mr-2" />
                {breakdown_details?.distance_description || 'Distance charges'}
              </span>
              <span className="font-medium">₹{fare.distance}</span>
            </div>
          )}

          {/* Time */}
          {fare.time > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                <Clock className="w-4 h-4 inline mr-2" />
                {breakdown_details?.time_description || 'Time charges'}
              </span>
              <span className="font-medium">₹{fare.time}</span>
            </div>
          )}

          {/* Night Charges */}
          {night_hours && fare.night > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                <Moon className="w-4 h-4 inline mr-2" />
                {breakdown_details?.night_description || 'Night charges'}
              </span>
              <span className="font-medium">₹{fare.night}</span>
            </div>
          )}

          {/* Surge */}
          {hasSurge && fare.surge > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-orange-600">
                <Zap className="w-4 h-4 inline mr-2" />
                {breakdown_details?.surge_description || 'High demand charges'}
              </span>
              <span className="font-medium text-orange-600">₹{fare.surge}</span>
            </div>
          )}

          <hr className="my-3" />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Fare</span>
            <span>₹{fare.total}</span>
          </div>

          {/* Minimum Fare Note */}
          {quote.minimum_fare > fare.total && (
            <div className="text-xs text-gray-500 mt-2">
              * Minimum fare of ₹{quote.minimum_fare} applied
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 space-y-1">
            <div>• First {quote.free_km_threshold || 2} km included in base fare</div>
            <div>• Estimated pickup time: {quote.estimated_pickup_time ? new Date(quote.estimated_pickup_time).toLocaleTimeString() : 'Now'}</div>
            <div>• All prices include applicable taxes</div>
            {hasSurge && (
              <div className="text-orange-600 font-medium">
                • High demand pricing is currently active
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => onBookRide?.(quote)}
            disabled={isExpiring || timeRemaining === 0}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              isExpiring || timeRemaining === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {timeRemaining === 0 ? 'Quote Expired' : 'Book This Ride'}
          </button>
          
          <button
            onClick={onRequestNewQuote}
            className="w-full py-2 px-4 btn-secondary"
          >
            Get New Quote
          </button>
        </div>
      </div>
    </div>
  );
};

export default FareQuoteDisplay;
