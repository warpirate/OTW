import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Search, Car, User, Star, Shield, Share2, Phone, Calendar, Map, Navigation as NavigationIcon, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Plus, Settings, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { DriverService } from '../services/driver.service';
import RideQuoteService from '../services/rideQuote.service';
import PaymentService from '../services/payment.service';
import Header from '../../components/Header';
// import Footer from '../../components/Footer';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import LocationMap from '../../components/LocationMap';
import DriverTracker from '../../components/DriverTracker';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config';

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
  const [showMap, setShowMap] = useState(true);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState([]);
  const [isScheduledBooking, setIsScheduledBooking] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Dynamic fare estimation states
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [fareBreakdown, setFareBreakdown] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pricingInfo, setPricingInfo] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  // Real-time tracking states
  const [socket, setSocket] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [tripStatus, setTripStatus] = useState('searching');
  const [eta, setEta] = useState(null);
  
  // Enhanced ride lifecycle states
  const [currentBooking, setCurrentBooking] = useState(null);
  const [searchingDrivers, setSearchingDrivers] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [tripProgress, setTripProgress] = useState(0);
  const [finalFare, setFinalFare] = useState(null);
  const [tripReceipt, setTripReceipt] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [cancellationReason, setCancellationReason] = useState('');
  const [showCancellation, setShowCancellation] = useState(false);
  
  // Payment gateway states
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [paymentRetryCount, setPaymentRetryCount] = useState(0);
  
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

  // Simple pricing constants (fallback)
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
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    newSocket.on('driver_assigned', (data) => {
      setDriverDetails(data.driver);
      setTripStatus('driver_assigned');
      toast.success(`Driver ${data.driver.name} assigned to your trip!`);
    });

    newSocket.on('driver_location_update', (data) => {
      setDriverLocation(data.location);
      setEta(data.eta);
    });

    newSocket.on('driver_arrived', () => {
      setTripStatus('driver_arrived');
      toast.info('Your driver has arrived!');
    });

    newSocket.on('trip_started', () => {
      setTripStatus('trip_started');
      toast.info('Your trip has started!');
    });

    newSocket.on('trip_progress', (data) => {
      setTripProgress(data.progress);
      setEta(data.eta);
    });

    newSocket.on('trip_completed', (data) => {
      setTripStatus('trip_completed');
      setFinalFare(data.final_fare);
      toast.success('Trip completed successfully!');
    });

    newSocket.on('trip_cancelled', (data) => {
      setTripStatus('cancelled');
      toast.info(`Trip cancelled: ${data.reason}`);
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

  // Load vehicle types and pricing info on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load vehicle types
        const vehicleTypesResponse = await RideQuoteService.getVehicleTypes();
        setVehicleTypes(vehicleTypesResponse.vehicle_types || []);
        
        // Set default vehicle type (first one)
        if (vehicleTypesResponse.vehicle_types?.length > 0) {
          setSelectedVehicleType(vehicleTypesResponse.vehicle_types[0]);
        }
        
        // Load general pricing info
        const pricingResponse = await RideQuoteService.getPricingInfo();
        setPricingInfo(pricingResponse);
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Failed to load pricing information');
      }
    };
    
    loadInitialData();
  }, []);

  // Load payment methods on component mount
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await PaymentService.upiMethods.getAll();
        setPaymentMethods(response.payment_methods || []);
        
        // Set default payment method
        const defaultMethod = response.payment_methods?.find(method => method.is_default);
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod);
        } else if (response.payment_methods?.length > 0) {
          setSelectedPaymentMethod(response.payment_methods[0]);
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
        // Don't show error toast here as user might not have any payment methods yet
      }
    };
    
    loadPaymentMethods();
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
      // Use our backend endpoint instead of direct OpenStreetMap API
      const url = `https://api.omwhub.com/api/customer/driver/location-search?query=${encodeURIComponent(query)}&country=in`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.suggestions && data.suggestions.length > 0) {
        // Transform the data to match the expected format
        const transformedSuggestions = data.suggestions.map(suggestion => ({
          place_id: suggestion.place_id,
          display_name: suggestion.formatted_address || suggestion.name,
          lat: suggestion.geometry?.location?.lat || '0',
          lon: suggestion.geometry?.location?.lng || '0',
          name: suggestion.name || suggestion.formatted_address,
          formatted_address: suggestion.formatted_address
        }));
        
        if (locationType === 'pickup') {
          setPickupLocation(prev => ({ ...prev, suggestions: transformedSuggestions }));
        } else {
          setDropLocation(prev => ({ ...prev, suggestions: transformedSuggestions }));
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

  // Generate fare quote when locations and vehicle type are selected
  const generateQuote = useCallback(async () => {
    if (!pickupLocation.selected || !dropLocation.selected || !selectedVehicleType) {
      setCurrentQuote(null);
      setFareBreakdown(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    
    try {
      const pickupDateTime = isScheduledBooking 
        ? new Date(`${scheduledDate} ${scheduledTime}:00`)
        : new Date(Date.now() + 5 * 60 * 1000); // Add 5 minutes buffer for "Book Now"
      
      const quoteData = {
        pickup: {
          lat: parseFloat(pickupLocation.selected.lat),
          lng: parseFloat(pickupLocation.selected.lon),
          address: pickupLocation.selected.display_name
        },
        drop: {
          lat: parseFloat(dropLocation.selected.lat),
          lng: parseFloat(dropLocation.selected.lon),
          address: dropLocation.selected.display_name
        },
        vehicle_type_id: selectedVehicleType.id,
        pickup_time: pickupDateTime.toISOString(),
        passenger_count: 1
      };
      
      // Validate quote data
      const validation = RideQuoteService.utils.validateQuoteRequest(quoteData);
      if (!validation.isValid) {
        setQuoteError(Object.values(validation.errors).join(', '));
        return;
      }
      
      const quote = await RideQuoteService.getQuote(quoteData);
      // Normalize fields to a single shape we use in UI
      const normalized = {
        ...quote,
        distance_km: quote.distance_km ?? quote.distance ?? quote.fare?.distance_km ?? 0,
        duration_min: quote.duration_min ?? quote.duration ?? quote.fare?.duration_min ?? 0,
        fare: quote.fare || {
          base: quote.base_fare ?? 0,
          distance: quote.distance_fare ?? 0,
          time: quote.time_fare ?? 0,
          surge: quote.surge_fare ?? 0,
          night: quote.night_fare ?? 0,
          total: quote.total_fare ?? quote.total ?? 0
        }
      };
      setCurrentQuote(normalized);
      setFareBreakdown(normalized.fare);
      
    } catch (error) {
      console.error('Error generating quote:', error);
      setQuoteError(error.response?.data?.message || 'Failed to calculate fare');
      toast.error('Failed to calculate fare estimate');
    } finally {
      setQuoteLoading(false);
    }
  }, [pickupLocation.selected, dropLocation.selected, selectedVehicleType, isScheduledBooking, scheduledDate, scheduledTime]);

  // Debounced quote generation
  const debouncedGenerateQuote = useCallback(debounce(generateQuote, 600), [generateQuote]);

  // Search for nearby drivers
  const searchNearbyDrivers = useCallback(async () => {
    if (!pickupLocation.selected) return;
    
    try {
      setSearchingDrivers(true);
      const response = await DriverService.searchNearbyDrivers({
        pickup: {
          lat: pickupLocation.selected.lat,
          lng: pickupLocation.selected.lon
        }
      });
      
      setNearbyDrivers(response.drivers || []);
      
      if (response.drivers?.length > 0) {
        toast.success(`Found ${response.drivers.length} nearby drivers`);
        // Simulate driver assignment after 3-8 seconds
        setTimeout(() => {
          assignDriver(response.drivers[0]);
        }, Math.random() * 5000 + 3000);
      } else {
        toast.error('No drivers available in your area');
        setTripStatus('no_drivers');
      }
    } catch (error) {
      console.error('Error searching drivers:', error);
      toast.error('Failed to find nearby drivers');
      setTripStatus('search_failed');
    } finally {
      setSearchingDrivers(false);
    }
  }, [pickupLocation.selected]);

  // Simulate driver assignment
  const assignDriver = (driver) => {
    setDriverDetails({
      id: driver.provider_id,
      name: driver.provider_name,
      rating: (4.2 + Math.random() * 0.8).toFixed(1),
      vehicleNumber: `KA ${Math.floor(Math.random() * 99) + 1} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 9999) + 1000}`,
      vehicleModel: ['Toyota Etios', 'Maruti Swift', 'Hyundai Xcent', 'Honda City'][Math.floor(Math.random() * 4)],
      phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      photo: null,
      location: { lat: driver.lat, lng: driver.lng },
      distance: driver.distance_km
    });
    
    setTripStatus('driver_assigned');
    setEta(driver.eta_minutes);
    toast.success(`Driver ${driver.provider_name} assigned to your trip!`);
    
    // Simulate driver coming to pickup
    setTimeout(() => {
      setTripStatus('driver_coming');
      setEta(Math.max(1, driver.eta_minutes - 2));
    }, 2000);
    
    // Simulate driver arrival
    setTimeout(() => {
      setTripStatus('driver_arrived');
      setEta(0);
      toast.info('Your driver has arrived!');
    }, (driver.eta_minutes * 60 * 1000) * 0.3); // 30% of actual time for demo
  };

  // Trigger quote generation when locations or vehicle type change
  useEffect(() => {
    debouncedGenerateQuote();
  }, [pickupLocation.selected, dropLocation.selected, selectedVehicleType, isScheduledBooking, scheduledDate, scheduledTime, debouncedGenerateQuote]);

  const handleLocationChange = (e, locationType) => {
    const query = e.target.value;
    if (locationType === 'pickup') {
      setPickupLocation(prev => ({ ...prev, query, selected: null }));
    } else {
      setDropLocation(prev => ({ ...prev, query, selected: null }));
    }
    debouncedFetchSuggestions(query, locationType);
  };

  const selectLocation = (suggestion, locationType) => {
    if (locationType === 'pickup') {
      setPickupLocation({ query: suggestion.display_name, suggestions: [], selected: suggestion });
    } else {
      setDropLocation({ query: suggestion.display_name, suggestions: [], selected: suggestion });
    }
    // Clear previous quote when location changes
    setCurrentQuote(null);
    setFareBreakdown(null);
  };

  // Call driver
  const handleCallDriver = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_blank');
    } else {
      toast.error('Driver phone number not available');
    }
  };

  // Quickly set pickup to user's current geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // Try Google Geocoder if available for a nice address; otherwise fallback
        const setLocation = (display) => {
          const location = { display_name: display || 'Current location', lat, lon, place_id: `${lat},${lon}` };
          setPickupLocation({ query: location.display_name, suggestions: [], selected: location });
          setCurrentQuote(null);
          setFareBreakdown(null);
          toast.success('Pickup set to current location');
        };
        try {
          // eslint-disable-next-line no-undef
          const gm = window.google && window.google.maps;
          if (gm) {
            const geocoder = new gm.Geocoder();
            geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setLocation(results[0].formatted_address);
              } else {
                setLocation('Current location');
              }
            });
          } else {
            setLocation('Current location');
          }
        } catch {
          setLocation('Current location');
        }
      },
      (error) => {
        // Show user-friendly error messages based on error code
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error(
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Location Access Denied</div>
                  <div className="text-sm">Please allow location access in your browser settings to use this feature.</div>
                </div>
              </div>,
              { autoClose: 8000 }
            );
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable. Please check your device settings.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out. Please try again.');
            break;
          default:
            toast.error('Unable to get your location. Please try again or enter your location manually.');
            break;
        }
      }
    );
  };

  // SOS function
  const handleSOS = () => {
    if (emergencyContacts.length > 0) {
      toast.error('SOS triggered! Emergency contacts will be notified.');
    } else {
      toast.error('No emergency contacts found. Please add contacts first.');
    }
  };

  // Format Date to MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
  const formatDateToMySQL = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${y}-${m}-${d} ${h}:${mi}:${s}`;
  };

  const handleBookRide = async () => {
    if (!pickupLocation.selected || !dropLocation.selected) {
      toast.error('Please select a valid pickup and drop location from the suggestions.');
      return;
    }
    
    if (!selectedVehicleType) {
      toast.error('Please select a vehicle type.');
      return;
    }
    
    if (!currentQuote) {
      toast.error('Please wait for fare calculation to complete.');
      return;
    }
    
    // Validate quote hasn't expired
    if (RideQuoteService.utils.isQuoteExpired(currentQuote.expires_at)) {
      toast.error('Quote has expired. Please wait for a new quote.');
      generateQuote(); // Generate new quote
      return;
    }
    
    const bookingTime = isScheduledBooking 
      ? `${scheduledDate} ${scheduledTime}:00` 
      : formatDateToMySQL(new Date());
    
    if (isScheduledBooking && (!scheduledDate || !scheduledTime)) {
      toast.error('Please select a date and time for your scheduled booking.');
      return;
    }

    setLoading(true);
    try {
      // Validate quote before booking
      await RideQuoteService.validateQuote(currentQuote.quote_id);
      
      const bookingData = {
        pickup_address: pickupLocation.selected.display_name,
        pickup_lat: pickupLocation.selected.lat,
        pickup_lon: pickupLocation.selected.lon,
        drop_address: dropLocation.selected.display_name,
        drop_lat: dropLocation.selected.lat,
        drop_lon: dropLocation.selected.lon,
        pickup_time: bookingTime,
        quote_id: currentQuote.quote_id,
        vehicle_type_id: selectedVehicleType.id,
        booking_type: 'ride', // New booking type for ride bookings
        estimated_cost: currentQuote.fare.total,
        is_scheduled: isScheduledBooking,
        booking_notes: bookingNotes,
        special_requests: specialRequests,
        preferred_driver: preferredDriver
      };

      const response = await DriverService.booking.create(bookingData);
      toast.success(response.message || 'Ride booked successfully!');
      
      // Connect to real-time tracking
      if (socket) {
        socket.connect();
        socket.emit('join_trip', { bookingId: response.booking_id });
      }
      
      // Start the ride lifecycle
      setCurrentBooking(response.booking);
      setTripStatus('searching_driver');
      setSearchingDrivers(true);
      
      // Start searching for nearby drivers
      searchNearbyDrivers();
      
      // Don't navigate away, stay on this page for ride tracking
      toast.info('Searching for nearby drivers...');
    } catch (error) {
      console.error('Error creating booking:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('quote')) {
        toast.error('Quote has expired. Generating new quote...');
        generateQuote();
      } else {
        toast.error(error.response?.data?.message || 'Failed to create booking.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
      <Header />
      
      <main className="flex-1">
        {/* Modern Uber/Ola-like Layout */}
        <div className="flex flex-col lg:flex-row relative" style={{ height: 'calc(100vh - 64px)' }}>
          {/* Left Side - Map (60% on large screens, full width on mobile) */}
          <div className="w-full lg:w-3/5 relative h-1/2 lg:h-full">
            <LocationMap
              pickupLocation={pickupLocation.selected}
              dropLocation={dropLocation.selected}
              nearbyDrivers={nearbyDrivers}
              onLocationSelect={(location, target = null) => {
                // If target specified, honor it
                if (target === 'pickup') {
                  setPickupLocation({ query: location.display_name, suggestions: [], selected: location });
                  setCurrentQuote(null);
                  setFareBreakdown(null);
                  return;
                }
                
                if (target === 'drop') {
                  setDropLocation({ query: location.display_name, suggestions: [], selected: location });
                  setCurrentQuote(null);
                  setFareBreakdown(null);
                  return;
                }

                // Default behavior: first click sets pickup, second sets drop
                if (!pickupLocation.selected) {
                  setPickupLocation({ query: location.display_name, suggestions: [], selected: location });
                  setCurrentQuote(null);
                  setFareBreakdown(null);
                } else if (!dropLocation.selected) {
                  setDropLocation({ query: location.display_name, suggestions: [], selected: location });
                  setCurrentQuote(null);
                  setFareBreakdown(null);
                } else {
                  // If both are set, replace drop location
                  setDropLocation({ query: location.display_name, suggestions: [], selected: location });
                  setCurrentQuote(null);
                  setFareBreakdown(null);
                }
              }}
              darkMode={darkMode}
              height="100%"
            />
            
            {/* Back Button Overlay */}
            <button 
              onClick={() => navigate(-1)} 
              className={`absolute top-4 left-4 z-20 flex items-center px-3 py-2 rounded-lg shadow-lg transition-all ${
                darkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <ArrowLeft size={18} className="mr-1 lg:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {/* Vehicle Selector Overlay (large screens) */}
            {vehicleTypes?.length > 0 && (
              <div className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <div className={`flex items-center space-x-3 px-3 py-2 rounded-2xl shadow-xl border ${
                  darkMode ? 'bg-gray-900/90 border-gray-700' : 'bg-white/90 border-gray-200'
                } backdrop-blur supports-[backdrop-filter]:backdrop-blur-md`}>
                  {vehicleTypes.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicleType(vehicle);
                        setCurrentQuote(null);
                        setFareBreakdown(null);
                        setTimeout(() => {
                          try { debouncedGenerateQuote(); } catch (_) {}
                        }, 0);
                      }}
                      className={`whitespace-nowrap px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        selectedVehicleType?.id === vehicle.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow'
                          : darkMode
                            ? 'bg-gray-800 text-gray-200 border-gray-700 hover:border-purple-400'
                            : 'bg-white text-gray-800 border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      {vehicle.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Booking Controls (40% on large screens, full width on mobile) */}
          <div className={`w-full lg:w-2/5 ${darkMode ? 'bg-gray-900' : 'bg-white'} overflow-y-auto shadow-xl h-1/2 lg:h-full`}>
            <div className="p-6 h-full">
              
              {/* Page Title */}
              <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <h1 className={`text-2xl lg:text-3xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Book a Ride
                </h1>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Choose your destination and get a ride
                </p>
                {/* Status Indicator */}
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Service Available
                  </span>
                </div>
              </div>

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

              {/* Booking Form - Always show in right panel */}
              {tripStatus === 'searching' && (
                <>
                  {/* Location Selection */}
                  <div className="mb-6 space-y-4">
                  {/* Pickup Location */}
                  <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Pickup Location
                      </label>
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
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-gray-200 hover:border-purple-400' : 'bg-white border-gray-300 text-gray-700 hover:border-purple-300'
                        }`}
                      >
                        Use current
                      </button>
                    </div>
                      {/* Suggestions for pickup */}
                    {pickupLocation.suggestions.length > 0 && (
                        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto ${
                          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                        }`}>
                          {pickupLocation.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => selectLocation(suggestion, 'pickup')}
                              className={`w-full text-left p-3 hover:bg-purple-50 hover:text-purple-700 transition-colors border-b last:border-b-0 ${
                              darkMode 
                                  ? 'text-gray-300 hover:bg-purple-900/20 hover:text-purple-300 border-gray-700' 
                                  : 'text-gray-900 border-gray-100'
                              }`}
                            >
                              <div className="flex items-start">
                                <MapPin className="h-4 w-4 mt-1 mr-2 flex-shrink-0" />
                                <div>
                                  <div className="font-medium">{suggestion.display_name}</div>
                            </div>
                              </div>
                            </button>
                        ))}
                        </div>
                    )}
                  </div>

                  {/* Drop Location */}
                  <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Drop Location
                      </label>
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
                      />
                    </div>
                      {/* Suggestions for drop */}
                    {dropLocation.suggestions.length > 0 && (
                        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto ${
                          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                        }`}>
                          {dropLocation.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => selectLocation(suggestion, 'drop')}
                              className={`w-full text-left p-3 hover:bg-purple-50 hover:text-purple-700 transition-colors border-b last:border-b-0 ${
                              darkMode 
                                  ? 'text-gray-300 hover:bg-purple-900/20 hover:text-purple-300 border-gray-700' 
                                  : 'text-gray-900 border-gray-100'
                              }`}
                            >
                              <div className="flex items-start">
                                <MapPin className="h-4 w-4 mt-1 mr-2 flex-shrink-0" />
                        <div>
                                  <div className="font-medium">{suggestion.display_name}</div>
                          </div>
                        </div>
                      </button>
                          ))}
                            </div>
                          )}
                        </div>
                      </div>

                  {/* Vehicle Selection (hidden on large screens because overlay on map) */}
                  <div className="mb-6 lg:hidden">
                    <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Car className="h-5 w-5 mr-2 text-purple-600" />
                      Choose Vehicle
                    </h3>
                    <div className="space-y-3">
                      {vehicleTypes.map((vehicle, index) => (
                        <div
                          key={vehicle.id}
                          onClick={() => {
                            setSelectedVehicleType(vehicle);
                            setCurrentQuote(null); // Clear quote to trigger recalculation
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedVehicleType?.id === vehicle.id
                              ? 'border-purple-600 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 shadow-lg transform scale-[1.02]'
                              : darkMode
                                ? 'border-gray-600 bg-gray-700 hover:border-purple-400 hover:bg-gray-650'
                                : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${
                                selectedVehicleType?.id === vehicle.id
                                  ? 'bg-purple-200 dark:bg-purple-800/50'
                                  : 'bg-purple-100 dark:bg-purple-900/30'
                              }`}>
                                <Car className={`h-6 w-6 ${
                                  selectedVehicleType?.id === vehicle.id
                                    ? 'text-purple-700 dark:text-purple-300'
                                    : 'text-purple-600 dark:text-purple-400'
                                }`} />
                                {selectedVehicleType?.id === vehicle.id && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className={`font-semibold ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {vehicle.name}
                                </h4>
                                <p className={`text-sm ${
                                  darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {vehicle.description || `Capacity: ${vehicle.capacity} people`}
                                </p>
                                <div className="flex items-center mt-1">
                                  <Star className="h-3 w-3 text-yellow-400 mr-1" />
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                    4.{Math.floor(Math.random() * 5) + 5} • 2 min away
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-lg ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                ₹{vehicle.base_fare}
                              </p>
                              <p className={`text-xs ${
                                darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                Base fare
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fare Estimation */}
                  {currentQuote && (
                    <div className={`mb-6 p-5 rounded-xl border ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-white border-gray-200'
                    } shadow-sm`}>
                      <div className="flex items-center mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                          darkMode ? 'bg-purple-900/40' : 'bg-purple-100'
                        }`}>
                          <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Fare Estimate
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <NavigationIcon className="h-4 w-4 text-purple-500 mr-2" />
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Distance:</span>
                          </div>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {currentQuote.distance_km} km
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-purple-500 mr-2" />
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Duration:</span>
                          </div>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {currentQuote.duration_min} min
                          </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Total:
                            </span>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-purple-600">
                                ₹{currentQuote.fare?.total}
                              </span>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Including all charges
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <button
                    onClick={() => {
                      if (!pickupLocation.selected || !dropLocation.selected) {
                        toast.info('Please enter pickup and drop locations first.');
                        return;
                      }
                      if (!selectedVehicleType) {
                        toast.info('Please choose a vehicle type.');
                        return;
                      }
                      handleBookRide();
                    }}
                    disabled={loading}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100 ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Booking...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <Car className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-center">
                          <div>
                            {!pickupLocation.selected || !dropLocation.selected
                              ? 'Enter locations'
                              : !selectedVehicleType
                                ? 'Choose vehicle'
                                : 'Book Ride'}
                          </div>
                          <div className="text-sm font-medium opacity-90">
                            {!pickupLocation.selected || !dropLocation.selected
                              ? 'Pickup and drop needed'
                              : !selectedVehicleType
                                ? 'Select a vehicle type'
                                : currentQuote
                                  ? `₹${currentQuote.fare?.total}`
                                  : 'Calculating...'}
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </div>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Trip Status Display for non-searching states */}
              {tripStatus !== 'searching' && (
                <div className="text-center py-8">
                  <div className={`text-lg font-semibold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                    Trip Status: {tripStatus}
            </div>
                  <p className={`${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                    Your ride details will appear here
                  </p>
              </div>
            )}
                </div>
              </div>
            </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default DriverBooking;