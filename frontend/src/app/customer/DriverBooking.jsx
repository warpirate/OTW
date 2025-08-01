import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { DriverService } from '../services/driver.service';

const DriverBooking = () => {
  const navigate = useNavigate();
  const [pickupTime, setPickupTime] = useState('');
  const [pickupLocation, setPickupLocation] = useState({ query: '', suggestions: [], selected: null });
  const [dropLocation, setDropLocation] = useState({ query: '', suggestions: [], selected: null });
  const [loading, setLoading] = useState(false);
  // Booking type state
  const [activeTab, setActiveTab] = useState('withCar'); // 'withCar' | 'withoutCar'
  // Duration: hours when booking with car, days when booking driver only
  const [duration, setDuration] = useState(1);

  // Simple pricing constants – ideally fetched from an API/config
  const RATE_PER_HOUR = 500;   // ₹ per hour for with-car bookings
  const RATE_PER_DAY  = 1500;  // ₹ per day for driver-only bookings

  useEffect(() => {
    const token = localStorage.getItem('jwt_token_customer');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  };

  const fetchSuggestions = async (query, locationType) => {
    if (query.length < 3) {
      if (locationType === 'pickup') setPickupLocation(prev => ({ ...prev, suggestions: [] }));
      if (locationType === 'drop') setDropLocation(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.length > 0) {
        if (locationType === 'pickup') {
          setPickupLocation(prev => ({ ...prev, suggestions: data }));
        } else {
          setDropLocation(prev => ({ ...prev, suggestions: data }));
        }
      } else {
        if (locationType === 'pickup') setPickupLocation(prev => ({ ...prev, suggestions: [] }));
        if (locationType === 'drop') setDropLocation(prev => ({ ...prev, suggestions: [] }));
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      toast.error('Could not fetch location suggestions.');
    }
  };

  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 500), []);

  const handleLocationChange = (e, locationType) => {
    const query = e.target.value;
    if (locationType === 'pickup') {
      setPickupLocation(prev => ({ ...prev, query, selected: null }));
    } else {
      setDropLocation(prev => ({ ...prev, query, selected: null }));
    }
    debouncedFetchSuggestions(query, locationType);
  };

  const handleSelectSuggestion = (suggestion, locationType) => {
    if (locationType === 'pickup') {
      setPickupLocation({ query: suggestion.display_name, suggestions: [], selected: suggestion });
    } else {
      setDropLocation({ query: suggestion.display_name, suggestions: [], selected: suggestion });
    }
  };

  const handleBooking = async () => {
    if (!pickupLocation.selected || !dropLocation.selected) {
      toast.error('Please select a valid pickup and drop location from the suggestions.');
      return;
    }
    if (!pickupTime) {
      toast.error('Please select a pickup time.');
      return;
    }
    if (!duration || duration < 1) {
      toast.error(`Please enter a valid ${activeTab === 'withCar' ? 'hour' : 'day'} count.`);
      return;
    }

    const bookingType = activeTab === 'withCar' ? 'with_car' : 'without_car';
    const costType    = activeTab === 'withCar' ? 'per_hour'  : 'per_day';
    const rate        = activeTab === 'withCar' ? RATE_PER_HOUR : RATE_PER_DAY;
    const estimated_cost = duration * rate;

    const bookingData = {
      pickup_address: pickupLocation.selected.display_name,
      pickup_lat: pickupLocation.selected.lat,
      pickup_lon: pickupLocation.selected.lon,
      drop_address: dropLocation.selected.display_name,
      drop_lat: dropLocation.selected.lat,
      drop_lon: dropLocation.selected.lon,
      pickup_time: pickupTime,
      booking_type: bookingType,
      cost_type: costType,
      duration,
      estimated_cost,
      
    };

    setLoading(true);
    try {
      const response = await DriverService.booking.create(bookingData);
      toast.success(response.message || 'Booking created successfully');
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Book a Driver</h1>

            {/* Booking type tabs */}
            <div className="mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('withCar')}
                  className={`px-4 py-2 -mb-px font-medium focus:outline-none ${activeTab==='withCar' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                >
                  With Car
                </button>
                <button
                  onClick={() => setActiveTab('withoutCar')}
                  className={`px-4 py-2 -mb-px ml-4 font-medium focus:outline-none ${activeTab==='withoutCar' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                >
                  Without Car
                </button>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={pickupLocation.query}
                  onChange={(e) => handleLocationChange(e, 'pickup')}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter pickup location"
                  disabled={loading}
                />
              </div>
              {pickupLocation.suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-y-auto">
                  {pickupLocation.suggestions.map((item) => (
                    <li
                      key={item.place_id}
                      onClick={() => handleSelectSuggestion(item, 'pickup')}
                      className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Drop Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={dropLocation.query}
                  onChange={(e) => handleLocationChange(e, 'drop')}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter drop location"
                  disabled={loading}
                />
              </div>
              {dropLocation.suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-y-auto">
                  {dropLocation.suggestions.map((item) => (
                    <li
                      key={item.place_id}
                      onClick={() => handleSelectSuggestion(item, 'drop')}
                      className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date and Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Duration and estimated cost */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'withCar' ? 'Number of Hours' : 'Number of Days'}
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Estimated Cost: ₹{activeTab === 'withCar' ? duration * RATE_PER_HOUR : duration * RATE_PER_DAY}
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleBooking}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-300"
              disabled={loading || !pickupLocation.selected || !dropLocation.selected || !pickupTime || duration < 1}
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
              <Search size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverBooking;
