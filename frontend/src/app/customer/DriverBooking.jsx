import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Search, Car, User, Star, Shield, Share2, Phone, Calendar, Map, Navigation, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Plus, Settings, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { DriverService } from '../services/driver.service';
import RideQuoteService from '../services/rideQuote.service';
import PaymentService from '../services/payment.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
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
      const url = `http://localhost:5001/api/customer/driver/location-search?query=${encodeURIComponent(query)}&country=in`;
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
      setCurrentQuote(quote);
      setFareBreakdown(quote.fare);
      
    } catch (error) {
      console.error('Error generating quote:', error);
      setQuoteError(error.response?.data?.message || 'Failed to calculate fare');
      toast.error('Failed to calculate fare estimate');
    } finally {
      setQuoteLoading(false);
    }
  }, [pickupLocation.selected, dropLocation.selected, selectedVehicleType, isScheduledBooking, scheduledDate, scheduledTime]);

  // Debounced quote generation
  const debouncedGenerateQuote = useCallback(debounce(generateQuote, 1000), [generateQuote]);

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

  // Start trip
  const startTrip = () => {
    setTripStatus('trip_started');
    setTripProgress(0);
    toast.success('Trip started! Enjoy your ride.');
    
    // Simulate trip progress
    const progressInterval = setInterval(() => {
      setTripProgress(prev => {
        const newProgress = prev + Math.random() * 5;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          completeTrip();
          return 100;
        }
        return newProgress;
      });
    }, 2000);
    
    // Update ETA during trip
    const etaInterval = setInterval(() => {
      setEta(prev => {
        const newEta = Math.max(0, prev - 1);
        if (newEta <= 0) {
          clearInterval(etaInterval);
        }
        return newEta;
      });
    }, 60000); // Update every minute
  };

  // Complete trip
  const completeTrip = async () => {
    setTripStatus('trip_completed');
    
    try {
      // Calculate final fare (simulate backend calculation)
      const actualDistance = currentQuote?.distance_km * (0.9 + Math.random() * 0.2); // ±10% variance
      const actualDuration = currentQuote?.duration_min * (0.8 + Math.random() * 0.4); // ±20% variance
      
      const finalFareData = {
        base_fare: currentQuote?.fare.base || 0,
        distance_fare: actualDistance * selectedVehicleType?.pricing.rate_per_km || 0,
        time_fare: actualDuration * selectedVehicleType?.pricing.rate_per_min || 0,
        surge_fare: currentQuote?.fare.surge || 0,
        night_fare: currentQuote?.fare.night || 0,
        total: 0,
        actual_distance: actualDistance,
        actual_duration: actualDuration,
        estimated_total: currentQuote?.fare.total || 0
      };
      
      finalFareData.total = finalFareData.base_fare + finalFareData.distance_fare + 
                           finalFareData.time_fare + finalFareData.surge_fare + finalFareData.night_fare;
      
      setFinalFare(finalFareData);
      
      // Generate receipt
      setTripReceipt({
        trip_id: `OTW${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        pickup: pickupLocation.selected?.display_name,
        drop: dropLocation.selected?.display_name,
        driver: driverDetails?.name,
        vehicle: `${driverDetails?.vehicleModel} (${driverDetails?.vehicleNumber})`,
        distance: actualDistance.toFixed(1),
        duration: Math.round(actualDuration),
        fare: finalFareData
      });
      
      toast.success('Trip completed successfully!');
      
      // Process payment if payment method is selected
      if (selectedPaymentMethod) {
        await processPayment(finalFareData.total);
      } else {
        setPaymentStatus('cash');
      }
      
      // Show rating modal after payment processing
      setTimeout(() => {
        setShowRating(true);
      }, 2000);
      
    } catch (error) {
      console.error('Error completing trip:', error);
      toast.error('Error processing trip completion');
    }
  };

  // Process payment
  const processPayment = async (amount) => {
    if (!selectedPaymentMethod) {
      setPaymentStatus('cash');
      return;
    }

    setPaymentProcessing(true);
    setPaymentError(null);
    
    try {
      const paymentData = {
        amount: amount,
        upi_id: selectedPaymentMethod.upi_id,
        description: `OTW Ride Payment - ${tripReceipt?.trip_id || 'Trip'}`,
        booking_id: currentBooking?.id
      };
      
      const paymentResponse = await PaymentService.upi.initiate(paymentData);
      setCurrentPayment(paymentResponse);
      
      if (paymentResponse.success) {
        // Start payment verification polling
        pollPaymentStatus(paymentResponse.payment_id);
        toast.success('Payment initiated successfully!');
      } else {
        throw new Error(paymentResponse.message || 'Payment initiation failed');
      }
      
    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentError(error.response?.data?.message || error.message || 'Payment failed');
      setPaymentStatus('failed');
      toast.error('Payment failed. You can retry or pay with cash.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Poll payment status
  const pollPaymentStatus = async (paymentId, attempts = 0) => {
    const maxAttempts = 30; // 30 attempts = 5 minutes
    const pollInterval = 10000; // 10 seconds
    
    if (attempts >= maxAttempts) {
      setPaymentStatus('timeout');
      setPaymentError('Payment verification timed out');
      toast.error('Payment verification timed out. Please check your payment app.');
      return;
    }
    
    try {
      const statusResponse = await PaymentService.upi.verify(paymentId);
      
      if (statusResponse.success && statusResponse.status === 'completed') {
        setPaymentStatus('completed');
        toast.success('Payment completed successfully!');
        return;
      } else if (statusResponse.status === 'failed') {
        setPaymentStatus('failed');
        setPaymentError('Payment failed');
        toast.error('Payment failed. Please try again.');
        return;
      }
      
      // Continue polling if payment is still pending
      setTimeout(() => {
        pollPaymentStatus(paymentId, attempts + 1);
      }, pollInterval);
      
    } catch (error) {
      console.error('Error verifying payment:', error);
      setTimeout(() => {
        pollPaymentStatus(paymentId, attempts + 1);
      }, pollInterval);
    }
  };

  // Retry payment
  const retryPayment = async () => {
    if (paymentRetryCount >= 3) {
      toast.error('Maximum retry attempts reached. Please try a different payment method.');
      return;
    }
    
    setPaymentRetryCount(prev => prev + 1);
    await processPayment(finalFare?.total);
  };

  // Add new UPI payment method
  const addPaymentMethod = async () => {
    if (!PaymentService.utils.validateUPIId(newUpiId)) {
      toast.error('Please enter a valid UPI ID');
      return;
    }
    
    try {
      const providerName = PaymentService.utils.detectProvider(newUpiId);
      const response = await PaymentService.upiMethods.add({
        upi_id: newUpiId,
        provider_name: providerName,
        is_default: paymentMethods.length === 0
      });
      
      if (response.success) {
        const newMethod = response.payment_method;
        setPaymentMethods(prev => [...prev, newMethod]);
        
        if (paymentMethods.length === 0) {
          setSelectedPaymentMethod(newMethod);
        }
        
        setNewUpiId('');
        setShowAddPaymentMethod(false);
        toast.success('Payment method added successfully!');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error(error.response?.data?.message || 'Failed to add payment method');
    }
  };

  // Cancel trip
  const cancelTrip = async (reason) => {
    try {
      // Here you would call the backend API to cancel the trip
      // await RideService.cancelTrip(currentBooking.id, { reason });
      
      // Process refund if payment was made
      if (currentPayment && paymentStatus === 'completed') {
        await processRefund(reason);
      }
      
      toast.success('Trip cancelled successfully');
      setTripStatus('cancelled');
      
      // Reset after showing cancellation confirmation
      setTimeout(() => {
        setTripStatus('searching');
        setCurrentBooking(null);
        setDriverDetails(null);
        setShowCancellation(false);
        setCurrentPayment(null);
        setPaymentStatus('pending');
      }, 3000);
      
    } catch (error) {
      console.error('Error cancelling trip:', error);
      toast.error('Failed to cancel trip');
    }
  };

  // Process refund
  const processRefund = async (reason) => {
    try {
      const refundData = {
        reason: reason,
        amount: finalFare?.total || currentQuote?.fare.total
      };
      
      const refundResponse = await PaymentService.upi.refund(currentPayment.payment_id, refundData);
      
      if (refundResponse.success) {
        toast.success('Refund initiated successfully. It will be processed within 5-7 business days.');
      } else {
        toast.error('Refund initiation failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Refund processing failed. Please contact support.');
    }
  };

  // Trigger quote generation when locations or vehicle type change
  useEffect(() => {
    debouncedGenerateQuote();
  }, [debouncedGenerateQuote]);

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
    // Clear previous quote when location changes
    setCurrentQuote(null);
    setFareBreakdown(null);
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

  const handleBooking = async () => {
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
        <div className={tripStatus !== 'searching' ? '' : 'max-w-6xl mx-auto container px-4 py-8'}>
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

          {/* Enhanced Ride Lifecycle View */}
          {tripStatus !== 'searching' ? (
            <div className="h-full relative" style={{ minHeight: 'calc(100vh - 160px)' }}>
              {/* Map Background */}
              <div className="absolute inset-0 bg-gray-200">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
                  <div className="text-center">
                    <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Map View</p>
                    <p className="text-gray-500 text-sm mt-2">Real-time tracking will appear here</p>
                  </div>
                </div>
              </div>

              {/* Top Status Bar */}
              <div className="absolute top-0 left-0 right-0 bg-white shadow-md z-10">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setTripStatus('searching')}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="text-center flex-1">
                      <h2 className="font-semibold text-lg">
                        {tripStatus === 'searching_driver' && 'Searching for drivers...'}
                        {tripStatus === 'driver_assigned' && 'Driver assigned'}
                        {tripStatus === 'driver_coming' && 'Driver on the way'}
                        {tripStatus === 'driver_arrived' && 'Driver has arrived'}
                        {tripStatus === 'trip_started' && 'On trip'}
                        {tripStatus === 'trip_completed' && 'Trip completed'}
                        {tripStatus === 'cancelled' && 'Trip cancelled'}
                        {tripStatus === 'no_drivers' && 'No drivers available'}
                      </h2>
                      {eta !== null && tripStatus !== 'trip_completed' && (
                        <p className="text-sm text-gray-600">
                          {tripStatus === 'driver_coming' && `Arrives in ${eta} mins`}
                          {tripStatus === 'trip_started' && `${eta} mins to destination`}
                          {tripStatus === 'driver_assigned' && `ETA: ${eta} mins`}
                        </p>
                      )}
                      {tripStatus === 'trip_started' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${tripProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{Math.round(tripProgress)}% complete</p>
                        </div>
                      )}
                    </div>
                    <button
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      onClick={() => setShareTrip(!shareTrip)}
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Ride Details Panel */}
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20">
                <div className="p-6">
                  {/* Pull Handle */}
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                  
                  {/* Driver & Vehicle Info */}
                  {driverDetails && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{driverDetails.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span>{driverDetails.rating || '4.8'}</span>
                              <span>•</span>
                              <span>{vehicleType === 'any' ? 'Standard' : vehicleType}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-lg">
                            {driverDetails.vehicleNumber || 'KA 01 AB 1234'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {driverDetails.vehicleModel || 'Toyota Etios'}
                          </div>
                        </div>
                      </div>

                      {/* Contact Driver */}
                      <div className="flex space-x-3">
                        <button className="flex-1 bg-gray-100 py-3 px-4 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <Phone className="h-5 w-5 mr-2" />
                          <span className="font-medium">Call Driver</span>
                        </button>
                        <button className="flex-1 bg-gray-100 py-3 px-4 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <MessageSquare className="h-5 w-5 mr-2" />
                          <span className="font-medium">Message</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Trip Details */}
                  <div className="border-t pt-4 mb-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pickup</p>
                          <p className="font-medium">{pickupLocation.text || 'Loading...'}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Drop-off</p>
                          <p className="font-medium">{dropLocation.text || 'Loading...'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* State-specific Content */}
                  {tripStatus === 'searching_driver' && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                      <h3 className="text-lg font-semibold mb-2">Finding your driver...</h3>
                      <p className="text-gray-600 mb-4">We're searching for the best driver near you</p>
                      {nearbyDrivers.length > 0 && (
                        <p className="text-sm text-green-600">{nearbyDrivers.length} drivers found nearby</p>
                      )}
                    </div>
                  )}

                  {/* Fare Details */}
                  {(finalFare || currentQuote) && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            {tripStatus === 'trip_completed' ? 'Final Fare' : 'Estimated Fare'}
                          </p>
                          <p className="text-2xl font-bold">
                            ₹{finalFare?.total || currentQuote?.fare.total || '0'}
                          </p>
                          {finalFare && finalFare.total !== finalFare.estimated_total && (
                            <p className="text-xs text-gray-500">
                              Est: ₹{finalFare.estimated_total}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Payment</p>
                          <p className="font-medium">
                            {paymentStatus === 'completed' ? 'Paid' : 'Cash'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {tripStatus === 'searching_driver' && (
                      <button 
                        onClick={() => setShowCancellation(true)}
                        className="w-full py-3 px-4 border-2 border-red-500 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancel Search
                      </button>
                    )}
                    
                    {(tripStatus === 'driver_assigned' || tripStatus === 'driver_coming') && (
                      <>
                        <button 
                          onClick={() => handleCallDriver(driverDetails?.phone)}
                          className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Call Driver
                        </button>
                        <button 
                          onClick={() => setShowCancellation(true)}
                          className="w-full py-3 px-4 border-2 border-red-500 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors"
                        >
                          Cancel Ride
                        </button>
                      </>
                    )}
                    
                    {tripStatus === 'driver_arrived' && (
                      <>
                        <button 
                          onClick={startTrip}
                          className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Start Trip
                        </button>
                        <button 
                          onClick={() => handleCallDriver(driverDetails?.phone)}
                          className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Call Driver
                        </button>
                      </>
                    )}
                    
                    {tripStatus === 'trip_started' && (
                      <div className="text-center py-4">
                        <div className="flex items-center justify-center space-x-4 mb-4">
                          <Car className="h-6 w-6 text-purple-600" />
                          <span className="text-lg font-medium">Trip in progress...</span>
                        </div>
                        <button 
                          onClick={() => handleCallDriver(driverDetails?.phone)}
                          className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Call Driver
                        </button>
                      </div>
                    )}
                    
                    {tripStatus === 'trip_completed' && (
                      <>
                        <button 
                          onClick={() => setShowRating(true)}
                          className="w-full py-3 px-4 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center"
                        >
                          <Star className="h-5 w-5 mr-2" />
                          Rate Your Trip
                        </button>
                        <button 
                          onClick={() => {
                            setTripStatus('searching');
                            setCurrentBooking(null);
                            setDriverDetails(null);
                            setFinalFare(null);
                            toast.success('Thanks for riding with us!');
                          }}
                          className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                        >
                          Book Another Ride
                        </button>
                      </>
                    )}
                    
                    {tripStatus === 'no_drivers' && (
                      <>
                        <button 
                          onClick={searchNearbyDrivers}
                          className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
                        >
                          <Search className="h-5 w-5 mr-2" />
                          Search Again
                        </button>
                        <button 
                          onClick={() => {
                            setTripStatus('searching');
                            setCurrentBooking(null);
                          }}
                          className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                          Back to Booking
                        </button>
                      </>
                    )}
                  </div>

                  {/* Safety Options */}
                  <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      Safety Center
                    </button>
                    <span className="text-gray-400">•</span>
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      Share Trip Status
                    </button>
                    <span className="text-gray-400">•</span>
                    <button className="text-red-600 hover:text-red-700 font-medium">
                      Emergency
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Main Booking Form */}
              <div className={`rounded-xl shadow-lg p-8 ${
                darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className={`text-2xl font-bold mb-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Book a Ride
                  </h1>
                </div>


                {/* Vehicle Type Selection - Simplified */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {vehicleTypes.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        onClick={() => {
                          setSelectedVehicleType(vehicle);
                          setCurrentQuote(null); // Clear quote to trigger recalculation
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          selectedVehicleType?.id === vehicle.id
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : darkMode
                              ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{RideQuoteService.utils.getVehicleTypeIcon(vehicle.name)}</span>
                            <div>
                              <h4 className={`font-semibold ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {vehicle.display_name}
                              </h4>
                              <p className={`text-sm ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                Starting at ₹{vehicle.pricing.base_fare}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Surge and Night Hours Info */}
                  {pricingInfo && (
                    <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          {pricingInfo.surge_info.current_surge > 1 && (
                            <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span>{pricingInfo.surge_info.message}</span>
                            </div>
                          )}
                          {pricingInfo.night_hours.is_active && (
                            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                              <Clock className="h-4 w-4" />
                              <span>Night charges apply ({pricingInfo.night_hours.start} - {pricingInfo.night_hours.end})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Booking Type Selection */}
                <div className="mb-6">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setIsScheduledBooking(false);
                        setCurrentQuote(null); // Clear quote to trigger recalculation
                      }}
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
                      onClick={() => {
                        setIsScheduledBooking(true);
                        setCurrentQuote(null); // Clear quote to trigger recalculation
                      }}
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
                          {/* <Heart className="h-4 w-4 text-red-500" /> */}
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
                                {/* <Heart className="h-4 w-4 text-red-400" /> */}
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
                        {/* <button
                          onClick={() => setShowFavorites(true)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Heart className="h-4 w-4 text-red-500" />
                        </button> */}
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
                              {/* <button
                                onClick={() => addToFavorites(item, 'drop')}
                                className="p-1 rounded hover:bg-gray-200"
                              >
                                <Heart className="h-4 w-4 text-red-400" />
                              </button> */}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Interactive Map - Below Location Selection */}
                {showMap && (
                  <div className="mb-6">
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
                      height="300px"
                    />
                  </div>
                )}

                {/* Simplified Fare Display */}
                {currentQuote && fareBreakdown && !quoteLoading && !quoteError && (
                  <div className="mb-6">
                    <div className={`p-4 rounded-lg border-2 ${
                      darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Navigation className="h-4 w-4" />
                            <span>{RideQuoteService.utils.formatDistance(currentQuote.distance_km)}</span>
                            <span>•</span>
                            <Clock className="h-4 w-4" />
                            <span>{RideQuoteService.utils.formatDuration(currentQuote.duration_min)}</span>
                          </div>
                          <p className={`text-lg font-semibold mt-1 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {currentQuote.vehicle_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-purple-600">
                            ₹{fareBreakdown.total}
                          </p>
                          {currentQuote.surge_multiplier > 1 && (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                              {currentQuote.surge_multiplier}x surge
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduling removed for simplified UI */}
                {false && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Schedule Booking
                      </h3>
                      <button
                        onClick={() => setIsScheduledBooking(false)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Book Now Instead
                      </button>
                    </div>

                    <div className="mb-4">
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Select a future date and time for your booking
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Enhanced Date Picker */}
                      <div className="relative">
                        <label className={`block text-sm font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Select Date
                        </label>
                        <div className="relative">
                          <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                              showDatePicker
                                ? 'border-purple-500 ring-2 ring-purple-200'
                                : darkMode
                                  ? 'border-gray-600 hover:border-gray-500 bg-gray-700'
                                  : 'border-gray-300 hover:border-gray-400 bg-white'
                            }`}
                          >
                            <div className="flex items-center">
                              <Calendar className={`h-5 w-5 mr-3 ${
                                darkMode ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              <span className={`${
                                scheduledDate
                                  ? darkMode ? 'text-white' : 'text-gray-900'
                                  : darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) : 'Choose a date'}
                              </span>
                            </div>
                            <ChevronRight className={`h-5 w-5 transition-transform ${
                              showDatePicker ? 'rotate-90' : ''
                            } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>

                          {/* Custom Calendar */}
                          {showDatePicker && (
                            <div className={`absolute top-full left-0 mt-2 w-full z-30 rounded-xl shadow-2xl border ${
                              darkMode
                                ? 'bg-gray-800 border-gray-600'
                                : 'bg-white border-gray-200'
                            }`}>
                              <div className="p-4">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <button
                                    onClick={() => {
                                      if (currentMonth === 0) {
                                        setCurrentMonth(11);
                                        setCurrentYear(currentYear - 1);
                                      } else {
                                        setCurrentMonth(currentMonth - 1);
                                      }
                                    }}
                                    className={`p-2 rounded-lg hover:bg-gray-100 ${
                                      darkMode ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-600'
                                    }`}
                                  >
                                    <ChevronLeft className="h-5 w-5" />
                                  </button>
                                  <h4 className={`text-lg font-semibold ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </h4>
                                  <button
                                    onClick={() => {
                                      if (currentMonth === 11) {
                                        setCurrentMonth(0);
                                        setCurrentYear(currentYear + 1);
                                      } else {
                                        setCurrentMonth(currentMonth + 1);
                                      }
                                    }}
                                    className={`p-2 rounded-lg hover:bg-gray-100 ${
                                      darkMode ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-600'
                                    }`}
                                  >
                                    <ChevronRight className="h-5 w-5" />
                                  </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className={`p-2 text-center text-sm font-medium ${
                                      darkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      {day}
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {(() => {
                                    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                                    const today = new Date();
                                    const days = [];

                                    // Empty cells for days before month starts
                                    for (let i = 0; i < firstDay; i++) {
                                      days.push(<div key={`empty-${i}`} className="p-2"></div>);
                                    }

                                    // Days of the month
                                    for (let day = 1; day <= daysInMonth; day++) {
                                      const date = new Date(currentYear, currentMonth, day);
                                      const dateString = date.toISOString().split('T')[0];
                                      const isToday = date.toDateString() === today.toDateString();
                                      const isSelected = scheduledDate === dateString;
                                      const isPast = date < today.setHours(0, 0, 0, 0);

                                      days.push(
                                        <button
                                          key={day}
                                          onClick={() => {
                                            if (!isPast) {
                                              setScheduledDate(dateString);
                                              setShowDatePicker(false);
                                            }
                                          }}
                                          disabled={isPast}
                                          className={`p-2 text-sm rounded-lg transition-colors ${
                                            isPast
                                              ? darkMode
                                                ? 'text-gray-600 cursor-not-allowed'
                                                : 'text-gray-400 cursor-not-allowed'
                                              : isSelected
                                                ? 'bg-purple-600 text-white'
                                                : isToday
                                                  ? darkMode
                                                    ? 'bg-purple-900 text-purple-300 hover:bg-purple-800'
                                                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                                  : darkMode
                                                    ? 'text-gray-300 hover:bg-gray-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                          }`}
                                        >
                                          {day}
                                        </button>
                                      );
                                    }

                                    return days;
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enhanced Time Picker */}
                      <div className="relative">
                        <label className={`block text-sm font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Select Time
                        </label>
                        <div className="relative">
                          <button
                            onClick={() => setShowTimePicker(!showTimePicker)}
                            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                              showTimePicker
                                ? 'border-purple-500 ring-2 ring-purple-200'
                                : darkMode
                                  ? 'border-gray-600 hover:border-gray-500 bg-gray-700'
                                  : 'border-gray-300 hover:border-gray-400 bg-white'
                            }`}
                          >
                            <div className="flex items-center">
                              <Clock className={`h-5 w-5 mr-3 ${
                                darkMode ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              <span className={`${
                                scheduledTime
                                  ? darkMode ? 'text-white' : 'text-gray-900'
                                  : darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {scheduledTime ? new Date(`2000-01-01T${scheduledTime}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'Choose a time'}
                              </span>
                            </div>
                            <ChevronRight className={`h-5 w-5 transition-transform ${
                              showTimePicker ? 'rotate-90' : ''
                            } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          </button>

                          {/* Clock Interface */}
                          {showTimePicker && (
                            <div className={`absolute top-full left-0 mt-2 w-full z-30 rounded-xl shadow-2xl border ${
                              darkMode
                                ? 'bg-gray-800 border-gray-600'
                                : 'bg-white border-gray-200'
                            }`}>
                              <div className="p-6">
                                {/* Clock Display */}
                                <div className="flex flex-col items-center mb-6">
                                  <div className={`relative w-48 h-48 rounded-full border-4 ${
                                    darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                                  }`}>
                                    {/* Clock Numbers */}
                                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num, index) => {
                                      const angle = (index * 30) - 90; // Start from 12 o'clock
                                      const radian = (angle * Math.PI) / 180;
                                      const x = Math.cos(radian) * 75 + 96; // 96 is center (192/2)
                                      const y = Math.sin(radian) * 75 + 96;
                                      
                                      return (
                                        <div
                                          key={num}
                                          className={`absolute w-8 h-8 flex items-center justify-center text-sm font-medium ${
                                            darkMode ? 'text-gray-300' : 'text-gray-700'
                                          }`}
                                          style={{
                                            left: `${x - 16}px`,
                                            top: `${y - 16}px`
                                          }}
                                        >
                                          {num}
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Clock Hands */}
                                    {(() => {
                                      const [hours, minutes] = scheduledTime ? scheduledTime.split(':').map(Number) : [12, 0];
                                      const hourAngle = ((hours % 12) * 30 + minutes * 0.5) - 90;
                                      const minuteAngle = (minutes * 6) - 90;
                                      
                                      return (
                                        <>
                                          {/* Hour Hand */}
                                          <div
                                            className="absolute w-1 bg-purple-600 rounded-full origin-bottom"
                                            style={{
                                              height: '50px',
                                              left: '50%',
                                              top: '50%',
                                              transform: `translateX(-50%) translateY(-100%) rotate(${hourAngle}deg)`,
                                              transformOrigin: 'bottom center'
                                            }}
                                          />
                                          {/* Minute Hand */}
                                          <div
                                            className="absolute w-0.5 bg-purple-500 rounded-full origin-bottom"
                                            style={{
                                              height: '70px',
                                              left: '50%',
                                              top: '50%',
                                              transform: `translateX(-50%) translateY(-100%) rotate(${minuteAngle}deg)`,
                                              transformOrigin: 'bottom center'
                                            }}
                                          />
                                          {/* Center Dot */}
                                          <div className="absolute w-3 h-3 bg-purple-600 rounded-full" style={{
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)'
                                          }} />
                                        </>
                                      );
                                    })()}
                                  </div>
                                  
                                  {/* Digital Time Display */}
                                  <div className={`text-2xl font-mono font-bold mt-4 ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {scheduledTime ? new Date(`2000-01-01T${scheduledTime}`).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    }) : '12:00 PM'}
                                  </div>
                                </div>
                                
                                {/* Time Input Controls */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className={`block text-sm font-medium mb-2 ${
                                      darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      Hour
                                    </label>
                                    <select
                                      value={scheduledTime ? scheduledTime.split(':')[0] : '12'}
                                      onChange={(e) => {
                                        const hour = e.target.value;
                                        const minute = scheduledTime ? scheduledTime.split(':')[1] : '00';
                                        setScheduledTime(`${hour}:${minute}`);
                                      }}
                                      className={`w-full p-2 rounded-lg border transition-colors ${
                                        darkMode
                                          ? 'bg-gray-700 border-gray-600 text-white'
                                          : 'bg-white border-gray-300 text-gray-900'
                                      }`}
                                    >
                                      {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i.toString().padStart(2, '0')}>
                                          {i.toString().padStart(2, '0')}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-2 ${
                                      darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      Minute
                                    </label>
                                    <select
                                      value={scheduledTime ? scheduledTime.split(':')[1] : '00'}
                                      onChange={(e) => {
                                        const hour = scheduledTime ? scheduledTime.split(':')[0] : '12';
                                        const minute = e.target.value;
                                        setScheduledTime(`${hour}:${minute}`);
                                      }}
                                      className={`w-full p-2 rounded-lg border transition-colors ${
                                        darkMode
                                          ? 'bg-gray-700 border-gray-600 text-white'
                                          : 'bg-white border-gray-300 text-gray-900'
                                      }`}
                                    >
                                      {Array.from({ length: 60 }, (_, i) => (
                                        <option key={i} value={i.toString().padStart(2, '0')}>
                                          {i.toString().padStart(2, '0')}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                
                                {/* Quick Time Buttons */}
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                  {['09:00', '12:00', '15:00', '18:00'].map(time => (
                                    <button
                                      key={time}
                                      onClick={() => {
                                        setScheduledTime(time);
                                      }}
                                      className={`p-2 text-sm rounded-lg transition-colors ${
                                        scheduledTime === time
                                          ? 'bg-purple-600 text-white'
                                          : darkMode
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Confirm Button */}
                                <button
                                  onClick={() => setShowTimePicker(false)}
                                  className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                >
                                  Confirm Time
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}





                {/* Simplified Payment Method */}
                <div className="mb-6">
                  
                  {/* Simplified Payment Method */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">💰</span>
                      </div>
                      <span className={`font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {selectedPaymentMethod ? selectedPaymentMethod.provider_name : 'Cash Payment'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPaymentMethods(true)}
                      className="text-purple-600 hover:text-purple-700 text-sm"
                    >
                      Change
                    </button>
                  </div>
                  
                  {/* Payment Status Display */}
                  {paymentProcessing && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Processing payment...
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {paymentError && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Payment Failed
                          </span>
                        </div>
                        <button
                          onClick={retryPayment}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{paymentError}</p>
                    </div>
                  )}
                  
                  {paymentStatus === 'completed' && (
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Payment Completed Successfully
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simplified Action Button */}
                <div className="mt-6">
                  <button
                    onClick={handleBooking}
                    disabled={
                      loading || 
                      !pickupLocation.selected || 
                      !dropLocation.selected || 
                      !selectedVehicleType || 
                      !currentQuote || 
                      quoteLoading ||
                      RideQuoteService.utils.isQuoteExpired(currentQuote?.expires_at)
                    }
                    className="w-full py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Booking...
                      </>
                    ) : quoteLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Calculating...
                      </>
                    ) : !currentQuote ? (
                      'Select locations first'
                    ) : RideQuoteService.utils.isQuoteExpired(currentQuote?.expires_at) ? (
                      'Quote expired'
                    ) : (
                      <>
                        Book Ride - ₹{currentQuote.fare.total}
                        <Car size={24} className="ml-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar - Removed for full width */}
          {/* Favorites Panel - Commented out
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
              {/* <div className={`rounded-xl shadow-lg p-6 ${
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
              </div> */}

              {/* Trip Safety Tips */}
              {/* <div className={`rounded-xl shadow-lg p-6 ${
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
              </div> */}
        </div>
      </main>

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Trip Completed!
              </h3>
              <p className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                How was your ride with {driverDetails?.name}?
              </p>
            </div>

            {/* Trip Receipt Summary */}
            {tripReceipt && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Trip ID</span>
                  <span className="font-mono text-sm">{tripReceipt.trip_id}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Distance</span>
                  <span className="text-sm">{tripReceipt.distance} km</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                  <span className="text-sm">{tripReceipt.duration} min</span>
                </div>
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Fare</span>
                  <span>₹{finalFare?.total}</span>
                </div>
              </div>
            )}

            {/* Rating Stars */}
            <div className="mb-6">
              <p className={`text-sm font-medium mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Rate your experience
              </p>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="mb-6">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your feedback (optional)"
                className={`w-full p-3 rounded-lg border resize-none ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows="3"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRating(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={submitRating}
                className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancellation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Cancel Trip?
              </h3>
              <p className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {tripStatus === 'searching_driver' 
                  ? 'Are you sure you want to cancel the driver search?'
                  : 'Cancellation fees may apply. Are you sure you want to cancel?'
                }
              </p>
            </div>

            {/* Cancellation Reasons */}
            <div className="mb-6">
              <p className={`text-sm font-medium mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Reason for cancellation
              </p>
              <div className="space-y-2">
                {[
                  'Change of plans',
                  'Driver taking too long',
                  'Found alternative transport',
                  'Emergency',
                  'Other'
                ].map((reason) => (
                  <label key={reason} className="flex items-center">
                    <input
                      type="radio"
                      name="cancellation_reason"
                      value={reason}
                      checked={cancellationReason === reason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="mr-3"
                    />
                    <span className={`text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {reason}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancellation(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Trip
              </button>
              <button
                onClick={() => {
                  if (cancellationReason) {
                    cancelTrip(cancellationReason);
                  } else {
                    toast.error('Please select a reason for cancellation');
                  }
                }}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Cancel Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Modal */}
      {showPaymentMethods && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Payment Methods
              </h3>
              <button
                onClick={() => setShowPaymentMethods(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Cash Payment Option */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setSelectedPaymentMethod(null);
                  setShowPaymentMethods(false);
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                  !selectedPaymentMethod
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : darkMode
                      ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold">💰</span>
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Cash Payment
                    </p>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Pay with cash to driver
                    </p>
                  </div>
                </div>
                {!selectedPaymentMethod && (
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                )}
              </button>
            </div>

            {/* UPI Payment Methods */}
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedPaymentMethod(method);
                    setShowPaymentMethods(false);
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                    selectedPaymentMethod?.id === method.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : darkMode
                        ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">
                        {method.provider_name.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {method.provider_name}
                      </p>
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {method.upi_id}
                      </p>
                      {method.is_default && (
                        <span className="text-xs text-purple-600 font-medium">Default</span>
                      )}
                    </div>
                  </div>
                  {selectedPaymentMethod?.id === method.id && (
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Add New Payment Method */}
            <button
              onClick={() => {
                setShowPaymentMethods(false);
                setShowAddPaymentMethod(true);
              }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add New UPI Method</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddPaymentMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Add UPI Payment Method
              </h3>
              <button
                onClick={() => {
                  setShowAddPaymentMethod(false);
                  setNewUpiId('');
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                UPI ID
              </label>
              <input
                type="text"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="example@paytm"
                className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <p className={`text-xs mt-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Enter your UPI ID (e.g., yourname@paytm, yourname@gpay)
              </p>
            </div>

            {/* Provider Detection */}
            {newUpiId && PaymentService.utils.validateUPIId(newUpiId) && (
              <div className="mb-6 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Detected: {PaymentService.utils.detectProvider(newUpiId)}
                  </span>
                </div>
              </div>
            )}

            {/* Validation Error */}
            {newUpiId && !PaymentService.utils.validateUPIId(newUpiId) && (
              <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    Invalid UPI ID format
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddPaymentMethod(false);
                  setNewUpiId('');
                }}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addPaymentMethod}
                disabled={!newUpiId || !PaymentService.utils.validateUPIId(newUpiId)}
                className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Method
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default DriverBooking;
