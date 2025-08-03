import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Search, Car, User, Star, Heart, Shield, Share2, Phone, Calendar, Map, Navigation, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Plus, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import { DriverService } from '../services/driver.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import LocationMap from '../../components/LocationMap';
import DriverTracker from '../../components/DriverTracker';
import io from 'socket.io-client';

const DriverBooking = () => {
  const navigate = useNavigate();
  const [pickupTime, setPickupTime] = useState('');
  const [pickupLocation, setPickupLocation] = useState({ query: '', suggestions: [], selected: null });
  const [dropLocation, setDropLocation] = useState({ query: '', suggestions: [], selected: null });
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());
  
  // Enhanced booking states
  const [activeTab, setActiveTab] = useState('withCar');
  const [duration, setDuration] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState([]);
  const [isScheduledBooking, setIsScheduledBooking] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Real-time tracking states
  const [socket, setSocket] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [tripStatus, setTripStatus] = useState('searching');
  const [eta, setEta] = useState(null);
  
  // Safety and sharing states
  const [shareTrip, setShareTrip] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  
  // Driver preferences
  const [preferredDriver, setPreferredDriver] = useState(null);
  const [acPreference, setAcPreference] = useState('any');
  const [vehicleType, setVehicleType] = useState('any');
  
  // Booking notes and special requests
  const [bookingNotes, setBookingNotes] = useState('');
  const [specialRequests, setSpecialRequests] = useState([]);

  // Simple pricing constants
  const RATE_PER_HOUR = 500;
  const RATE_PER_DAY = 1500;

  // Listen for theme changes
  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    return cleanup;
  }, []);

  // Initialize socket connection for real-time features
  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    newSocket.on('driver_location_update', (data) => {
      setDriverLocation(data.location);
      setEta(data.eta);
    });

    newSocket.on('driver_assigned', (data) => {
      setDriverDetails(data.driver);
      setTripStatus('confirmed');
      toast.success(`Driver ${data.driver.name} assigned to your trip!`);
    });

    newSocket.on('trip_started', () => {
      setTripStatus('in_progress');
      toast.info('Your trip has started!');
    });

    newSocket.on('trip_completed', () => {
      setTripStatus('completed');
      toast.success('Trip completed successfully!');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token_customer');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Load favorite locations and emergency contacts
  useEffect(() => {
    const loadFavorites = () => {
      const saved = localStorage.getItem('favorite_locations');
      if (saved) {
        setFavoriteLocations(JSON.parse(saved));
      }
    };
    
    const loadEmergencyContacts = () => {
      const saved = localStorage.getItem('emergency_contacts');
      if (saved) {
        setEmergencyContacts(JSON.parse(saved));
      }
    };
    
    loadFavorites();
    loadEmergencyContacts();
  }, []);

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

  // Add to favorites
  const addToFavorites = (location, type) => {
    const newFavorite = {
      id: Date.now(),
      name: location.display_name,
      type: type,
      location: location,
      createdAt: new Date().toISOString()
    };
    
    const updatedFavorites = [...favoriteLocations, newFavorite];
    setFavoriteLocations(updatedFavorites);
    localStorage.setItem('favorite_locations', JSON.stringify(updatedFavorites));
    toast.success('Location added to favorites!');
  };

  // Remove from favorites
  const removeFromFavorites = (favoriteId) => {
    const updatedFavorites = favoriteLocations.filter(fav => fav.id !== favoriteId);
    setFavoriteLocations(updatedFavorites);
    localStorage.setItem('favorite_locations', JSON.stringify(updatedFavorites));
    toast.success('Location removed from favorites!');
  };

  // Use favorite location
  const useFavoriteLocation = (favorite) => {
    if (favorite.type === 'pickup') {
      setPickupLocation({ query: favorite.name, suggestions: [], selected: favorite.location });
    } else {
      setDropLocation({ query: favorite.name, suggestions: [], selected: favorite.location });
    }
    setShowFavorites(false);
  };

  // Share trip details
  const shareTripDetails = () => {
    const tripDetails = {
      pickup: pickupLocation.selected?.display_name,
      drop: dropLocation.selected?.display_name,
      time: isScheduledBooking ? `${scheduledDate} ${scheduledTime}` : pickupTime,
      status: tripStatus,
      driver: driverDetails?.name,
      eta: eta
    };

    if (navigator.share) {
      navigator.share({
        title: 'My Trip Details',
        text: `Trip from ${tripDetails.pickup} to ${tripDetails.drop}`,
        url: window.location.href
      });
    } else {
      const text = `Trip Details:\nFrom: ${tripDetails.pickup}\nTo: ${tripDetails.drop}\nTime: ${tripDetails.time}\nStatus: ${tripDetails.status}`;
      navigator.clipboard.writeText(text);
      toast.success('Trip details copied to clipboard!');
    }
  };

  // Add emergency contact
  const addEmergencyContact = () => {
    const contact = {
      id: Date.now(),
      name: prompt('Enter contact name:'),
      phone: prompt('Enter phone number:'),
      relationship: prompt('Enter relationship:')
    };
    
    if (contact.name && contact.phone) {
      const updatedContacts = [...emergencyContacts, contact];
      setEmergencyContacts(updatedContacts);
      localStorage.setItem('emergency_contacts', JSON.stringify(updatedContacts));
      toast.success('Emergency contact added!');
    }
  };

  // SOS function
  const handleSOS = () => {
    if (emergencyContacts.length > 0) {
      toast.error('SOS triggered! Emergency contacts will be notified.');
    } else {
      toast.error('No emergency contacts found. Please add contacts first.');
    }
  };

  // Call driver
  const handleCallDriver = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_blank');
    } else {
      toast.error('Driver phone number not available');
    }
  };

  const handleBooking = async () => {
    if (!pickupLocation.selected || !dropLocation.selected) {
      toast.error('Please select a valid pickup and drop location from the suggestions.');
      return;
    }
    
    const bookingTime = isScheduledBooking ? `${scheduledDate}T${scheduledTime}` : pickupTime;
    if (!bookingTime) {
      toast.error('Please select a pickup time.');
      return;
    }
    
    if (!duration || duration < 1) {
      toast.error(`Please enter a valid ${activeTab === 'withCar' ? 'hour' : 'day'} count.`);
      return;
    }

    const bookingType = activeTab === 'withCar' ? 'with_car' : 'without_car';
    const costType = activeTab === 'withCar' ? 'per_hour' : 'per_day';
    const rate = activeTab === 'withCar' ? RATE_PER_HOUR : RATE_PER_DAY;
    const estimated_cost = duration * rate;

    const bookingData = {
      pickup_address: pickupLocation.selected.display_name,
      pickup_lat: pickupLocation.selected.lat,
      pickup_lon: pickupLocation.selected.lon,
      drop_address: dropLocation.selected.display_name,
      drop_lat: dropLocation.selected.lat,
      drop_lon: dropLocation.selected.lon,
      pickup_time: bookingTime,
      booking_type: bookingType,
      cost_type: costType,
      duration,
      estimated_cost,
      is_scheduled: isScheduledBooking,
      ac_preference: acPreference,
      vehicle_type: vehicleType,
      booking_notes: bookingNotes,
      special_requests: specialRequests,
      preferred_driver: preferredDriver
    };

    setLoading(true);
    try {
      const response = await DriverService.booking.create(bookingData);
      toast.success(response.message || 'Booking created successfully');
      
      // Connect to real-time tracking
      if (socket) {
        socket.connect();
        socket.emit('join_trip', { bookingId: response.booking_id });
      }
      
      setTripStatus('searching');
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
      <Header />
      
      <main className="container-custom py-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)} 
            className={`flex items-center mb-6 transition-colors ${
              darkMode 
                ? 'text-gray-300 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>

          {/* Real-time Driver Tracker */}
          {tripStatus !== 'searching' && (
            <div className="mb-6">
              <DriverTracker
                driverDetails={driverDetails}
                tripStatus={tripStatus}
                eta={eta}
                driverLocation={driverLocation}
                darkMode={darkMode}
                onCallDriver={handleCallDriver}
                onSOS={handleSOS}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Booking Form */}
            <div className="lg:col-span-2">
              <div className={`rounded-xl shadow-lg p-8 ${
                darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className={`text-3xl font-bold mb-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Book a Driver
                  </h1>
                  <p className={`text-lg ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Choose your preferred booking type and provide the necessary details
                  </p>
                </div>

                {/* Interactive Map */}
                {showMap && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Interactive Map
                      </h3>
                      <button
                        onClick={() => setShowMap(false)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                    <LocationMap
                      pickupLocation={pickupLocation.selected}
                      dropLocation={dropLocation.selected}
                      onLocationSelect={(location) => {
                        if (!pickupLocation.selected) {
                          setPickupLocation({ query: location.display_name, suggestions: [], selected: location });
                        } else if (!dropLocation.selected) {
                          setDropLocation({ query: location.display_name, suggestions: [], selected: location });
                        }
                      }}
                      darkMode={darkMode}
                      height="400px"
                    />
                  </div>
                )}

                {/* Booking Type Tabs */}
                <div className="mb-8">
                  <div className={`flex border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <button
                      onClick={() => setActiveTab('withCar')}
                      className={`flex items-center px-6 py-3 font-medium transition-all duration-200 ${
                        activeTab === 'withCar' 
                          ? 'border-b-2 border-purple-600 text-purple-600' 
                          : darkMode 
                            ? 'text-gray-400 hover:text-gray-300' 
                            : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Car className="h-5 w-5 mr-2" />
                      With Car
                    </button>
                    <button
                      onClick={() => setActiveTab('withoutCar')}
                      className={`flex items-center px-6 py-3 font-medium transition-all duration-200 ${
                        activeTab === 'withoutCar' 
                          ? 'border-b-2 border-purple-600 text-purple-600' 
                          : darkMode 
                            ? 'text-gray-400 hover:text-gray-300' 
                            : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <User className="h-5 w-5 mr-2" />
                      Without Car
                    </button>
                  </div>
                </div>

                {/* Booking Type Selection */}
                <div className="mb-6">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setIsScheduledBooking(false)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        !isScheduledBooking
                          ? 'bg-purple-100 text-purple-700'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Book Now
                    </button>
                    <button
                      onClick={() => setIsScheduledBooking(true)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        isScheduledBooking
                          ? 'bg-purple-100 text-purple-700'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Later
                    </button>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Pickup Location */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Pickup Location
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowFavorites(true)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Heart className="h-4 w-4 text-red-500" />
                        </button>
                        <button
                          onClick={() => setShowMap(!showMap)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Map className="h-4 w-4 text-blue-500" />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <input
                        type="text"
                        value={pickupLocation.query}
                        onChange={(e) => handleLocationChange(e, 'pickup')}
                        className={`pl-10 w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Enter pickup location"
                        disabled={loading}
                      />
                    </div>
                    {pickupLocation.suggestions.length > 0 && (
                      <ul className={`absolute z-20 mt-1 w-full rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-white border border-gray-200'
                      }`}>
                        {pickupLocation.suggestions.map((item) => (
                          <li
                            key={item.place_id}
                            className={`p-3 cursor-pointer text-sm transition-colors ${
                              darkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span onClick={() => handleSelectSuggestion(item, 'pickup')}>
                                {item.display_name}
                              </span>
                              <button
                                onClick={() => addToFavorites(item, 'pickup')}
                                className="p-1 rounded hover:bg-gray-200"
                              >
                                <Heart className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Drop Location */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Drop Location
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowFavorites(true)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Heart className="h-4 w-4 text-red-500" />
                        </button>
                        <button
                          onClick={() => setShowMap(!showMap)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Map className="h-4 w-4 text-blue-500" />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <input
                        type="text"
                        value={dropLocation.query}
                        onChange={(e) => handleLocationChange(e, 'drop')}
                        className={`pl-10 w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Enter drop location"
                        disabled={loading}
                      />
                    </div>
                    {dropLocation.suggestions.length > 0 && (
                      <ul className={`absolute z-20 mt-1 w-full rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-white border border-gray-200'
                      }`}>
                        {dropLocation.suggestions.map((item) => (
                          <li
                            key={item.place_id}
                            className={`p-3 cursor-pointer text-sm transition-colors ${
                              darkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span onClick={() => handleSelectSuggestion(item, 'drop')}>
                                {item.display_name}
                              </span>
                              <button
                                onClick={() => addToFavorites(item, 'drop')}
                                className="p-1 rounded hover:bg-gray-200"
                              >
                                <Heart className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Date and Time Selection */}
                <div className="mb-6">
                  {isScheduledBooking ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Scheduled Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Scheduled Time
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Pickup Date and Time
                      </label>
                      <div className="relative">
                        <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="datetime-local"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className={`pl-10 w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration and Estimated Cost */}
                <div className="mb-8">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {activeTab === 'withCar' ? 'Number of Hours' : 'Number of Days'}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className={`w-32 p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      disabled={loading}
                    />
                    <div className={`text-lg font-semibold ${
                      darkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Estimated Cost: ₹{activeTab === 'withCar' ? duration * RATE_PER_HOUR : duration * RATE_PER_DAY}
                    </div>
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="mb-8">
                  <h3 className={`text-lg font-semibold mb-4 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Preferences
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        AC Preference
                      </label>
                      <select
                        value={acPreference}
                        onChange={(e) => setAcPreference(e.target.value)}
                        className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="any">Any</option>
                        <option value="ac">AC Only</option>
                        <option value="non-ac">Non-AC Only</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Vehicle Type
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="any">Any</option>
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Preferred Driver (Optional)
                      </label>
                      <input
                        type="text"
                        value={preferredDriver || ''}
                        onChange={(e) => setPreferredDriver(e.target.value)}
                        className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Driver name or ID"
                      />
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                <div className="mb-8">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Special Requests
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Any special requests or instructions for the driver..."
                    rows="3"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={shareTripDetails}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Trip
                    </button>
                    <button
                      onClick={handleSOS}
                      className="flex items-center px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      SOS
                    </button>
                  </div>
                  <button
                    onClick={handleBooking}
                    disabled={loading || !pickupLocation.selected || !dropLocation.selected || !pickupTime || duration < 1}
                    className="btn-brand flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
                    <Search size={20} className="ml-2" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Favorites Panel */}
              {showFavorites && (
                <div className={`rounded-xl shadow-lg p-6 ${
                  darkMode 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-white border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Favorite Locations
                    </h3>
                    <button
                      onClick={() => setShowFavorites(false)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {favoriteLocations.map((favorite) => (
                      <div
                        key={favorite.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          darkMode 
                            ? 'border-gray-600 hover:bg-gray-700' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1"
                            onClick={() => useFavoriteLocation(favorite)}
                          >
                            <div className={`text-sm font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {favorite.name}
                            </div>
                            <div className={`text-xs ${
                              darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {favorite.type} • {new Date(favorite.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromFavorites(favorite.id)}
                            className="p-1 rounded hover:bg-red-100"
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {favoriteLocations.length === 0 && (
                      <div className={`text-center py-4 text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        No favorite locations yet
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contacts */}
              <div className={`rounded-xl shadow-lg p-6 ${
                darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Emergency Contacts
                  </h3>
                  <button
                    onClick={addEmergencyContact}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {emergencyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-3 rounded-lg border ${
                        darkMode 
                          ? 'border-gray-600' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className={`text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {contact.name}
                      </div>
                      <div className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {contact.phone} • {contact.relationship}
                      </div>
                    </div>
                  ))}
                  {emergencyContacts.length === 0 && (
                    <div className={`text-center py-4 text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No emergency contacts added
                    </div>
                  )}
                </div>
              </div>

              {/* Trip Safety Tips */}
              <div className={`rounded-xl shadow-lg p-6 ${
                darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center mb-4">
                  <Shield className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Safety Tips
                  </h3>
                </div>
                <div className={`space-y-2 text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <span>Share your trip with family/friends</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <span>Verify driver details before boarding</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <span>Use SOS button in emergencies</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <span>Keep emergency contacts updated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DriverBooking;
