import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, MapPin, Plus, Edit2, Trash2,
  CheckCircle, Home, Briefcase, Star, User, Phone, Mail,
  CreditCard, Building, ChevronRight, XCircle, AlertTriangle
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import BookingService from '../services/booking.service';
import { useCart } from '../contexts/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import PaymentService from '../services/payment.service';
import CustomerVerificationsService from '../services/customerVerifications.service';
import ProfileService from '../services/profile.service';
// Simple debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart, loading: cartLoading } = useCart();
  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Booking flow steps
  const [currentStep, setCurrentStep] = useState('address'); // 'address', 'datetime', 'payment', 'confirmation'

  // DateTime selection
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Worker preference
  const [workerPreference, setWorkerPreference] = useState('any'); // 'any', 'male', 'female'
  const [workerAvailability, setWorkerAvailability] = useState({
    male: false,
    female: false,
    any: false
  });
  const [loadingWorkerAvailability, setLoadingWorkerAvailability] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressValidationResult, setAddressValidationResult] = useState(null);
  const [newAddress, setNewAddress] = useState({
    address: '',
    pin_code: '',
    city: '',
    state: '',
    country: 'India',
    address_type: 'home',
    address_label: '',
    is_default: false
  });
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [currentLocationCoords, setCurrentLocationCoords] = useState(null);

  // Booking confirmation
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [paymentType, setPaymentType] = useState('upi'); // 'upi' or 'pay_after_service'

  // Enhanced payment states
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [paymentRetryCount, setPaymentRetryCount] = useState(0);
  const [serviceBookingId, setServiceBookingId] = useState(null);
  const [backendCalculatedTotal, setBackendCalculatedTotal] = useState(null);

  // Per-service availability for the selected time slot (keyed by subcategory_id)
  const [serviceAvailability, setServiceAvailability] = useState({});
  // Night pricing info from backend check-worker-availability (keyed by subcategory_id)
  const [nightPricing, setNightPricing] = useState({});

  // Discount state
  const [discountInfo, setDiscountInfo] = useState({
    has_discount: false,
    discount_percentage: 0,
    customer_type: 'Normal'
  });
  const [loadingDiscount, setLoadingDiscount] = useState(false);

  const generateAvailableDates = (daysCount = 14) => {
    const dates = [];
    const today = new Date();

    const formatLocalDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    for (let i = 0; i < daysCount; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateString = formatLocalDate(date);

      dates.push({
        date: dateString,
        displayDate: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        shortDate: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }

    return dates;
  };

  const getEffectiveDateForTime = (baseDateStr, _timeStr) => {
    return baseDateStr;
  };

  // Sync dark mode with global theme changes
  useEffect(() => {
    const remove = addThemeListener(() => setDarkMode(isDarkMode()));
    return () => remove();
  }, []);

  // Authentication & cart availability check
  useEffect(() => {
    // Wait until cart has finished loading
    if (cartLoading) return;

    // Check authentication
    if (!AuthService.isLoggedIn('customer')) {
      toast.error('Please login to continue booking');
      navigate('/login');
      return;
    }

    // Ensure cart has items
    if (!cart || !cart.items || cart.items.length === 0) {
      toast.error('Your cart is empty. Please add services first.');
      navigate('/');
      return;
    }

    // Initialize available dates (only once)
    if (availableDates.length === 0) {
      const dates = generateAvailableDates(14);
      setAvailableDates(dates);
    }

    // Load customer addresses
    loadAddresses();

    // Load payment methods
    loadPaymentMethods();

    // Load discount information
    loadDiscountInfo();

    // Set default payment method if available
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = paymentMethods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    }
  }, [cartLoading, cart, navigate]);

  // Load customer addresses
  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data = await BookingService.addresses.getAll();
      setAddresses(data.addresses || []);

      // Auto-select default address if available
      const defaultAddress = data.addresses?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Load payment methods
  const loadPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const response = await PaymentService.upiMethods.getAll();
      const methods = response.payment_methods || [];
      setPaymentMethods(methods);

      // Auto-select default payment method
      const defaultMethod = methods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Don't show error toast as user might not have payment methods yet
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Load discount information
  const loadDiscountInfo = async () => {
    try {
      setLoadingDiscount(true);
      const info = await CustomerVerificationsService.getDiscountInfo();
      setDiscountInfo(info || { has_discount: false, discount_percentage: 0, customer_type: 'Normal' });
    } catch (e) {
      console.warn('Failed to load discount info', e);
      setDiscountInfo({ has_discount: false, discount_percentage: 0, customer_type: 'Normal' });
    } finally {
      setLoadingDiscount(false);
    }
  };

  const computeNightFeeForItem = (item, time24) => {

    const qty = item.quantity || 1;
    const id = item.subcategory_id || item.id;
    const backendNight = nightPricing[id];

    // Prefer backend-calculated night_charge and is_night when available
    if (backendNight) {
      const perUnitNightFromBackend = parseInt(backendNight.night_charge ?? 0, 10) || 0;

      // If backend says there is no night_charge configured, skip
      if (!perUnitNightFromBackend) {
        return 0;
      }

      // If backend explicitly tells us whether this time is night, trust it
      if (typeof backendNight.is_night === 'boolean') {
        if (!backendNight.is_night) return 0;
        return perUnitNightFromBackend * qty;
      }

      // Otherwise, fall through to local time-window logic using backend window
      item = {
        ...item,
        night_charge: perUnitNightFromBackend,
        night_start_time: backendNight.night_start_time || item.night_start_time,
        night_end_time: backendNight.night_end_time || item.night_end_time
      };
    }

    if (!time24) return 0;

    const rawNight = item.night_charge != null ? item.night_charge : 0;
    const perUnitNight = parseInt(rawNight, 10) || 0;
    if (!perUnitNight) return 0;

    const toMinutes = (t) => {
      const parts = String(t).split(':');
      if (parts.length < 2) return NaN;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return NaN;
      return h * 60 + m;
    };

    const nightStart = item?.night_start_time || '17:00:00';
    const nightEnd = item?.night_end_time || '06:00:00';

    const slotMinutes = toMinutes(`${time24}:00`);
    const startMinutes = toMinutes(nightStart);
    const endMinutes = toMinutes(nightEnd);
    if (isNaN(slotMinutes) || isNaN(startMinutes) || isNaN(endMinutes) || startMinutes === endMinutes) {
      return 0;
    }

    let isNight = false;
    if (startMinutes < endMinutes) {
      isNight = slotMinutes >= startMinutes && slotMinutes < endMinutes;
    } else {
      isNight = slotMinutes >= startMinutes || slotMinutes < endMinutes;
    }

    if (!isNight) return 0;
    return perUnitNight * qty;
  };

  const calculateTotals = () => {
    if (!cart || !cart.items) return { subtotal: 0, discount: 0, tax: 0, total: 0, nightChargeTotal: 0 };

    let subtotal = 0;
    let nightChargeTotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;

    const slotTime = selectedTimeSlot?.time || null; // "HH:MM"

    cart.items.forEach((item) => {
      const qty = item.quantity || 1;
      const base = (item.price || 0) * qty;
      const nightFee = computeNightFeeForItem(item, slotTime);

      const itemPriceBeforeDiscount = base + nightFee;
      subtotal += itemPriceBeforeDiscount;
      nightChargeTotal += nightFee;

      const discountPercentage = (discountInfo && discountInfo.has_discount)
        ? discountInfo.discount_percentage
        : 0;

      const discountAmount = discountPercentage > 0 && itemPriceBeforeDiscount > 0
        ? Number(((itemPriceBeforeDiscount * discountPercentage) / 100).toFixed(2))
        : 0;

      discountTotal += discountAmount;

      const discountedPrice = Math.max(itemPriceBeforeDiscount - discountAmount, 0);

      // 18% GST with 2-decimal precision per item (kept in sync with backend logic)
      const gst = Number((discountedPrice * 0.18).toFixed(2));
      gstTotal += gst;
    });

    const total = Number((subtotal - discountTotal + gstTotal).toFixed(2));

    return {
      subtotal,
      discount: discountTotal,
      tax: gstTotal,
      total,
    };
  };

  const generateTimeSlots = (date) => {
    const slots = [];
    const now = new Date();
    const baseDate = new Date(`${date}T00:00:00`);

    const addSlot = (hour) => {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;

      const effectiveDate = getEffectiveDateForTime(date, timeString);
      const slotDateTime = new Date(`${effectiveDate}T${timeString}:00`);

      let isPast;

      // Add small buffer (30 min) when deciding past/future
      isPast = slotDateTime <= new Date(now.getTime() + 30 * 60000);

      slots.push({
        time: timeString,
        available: !isPast,
        isPast
      });
    };

    // Slots: 00:00 - 23:00
    for (let hour = 0; hour <= 23; hour++) {
      addSlot(hour);
    }

    return slots;
  };

  const loadTimeSlots = (date) => {
    setLoadingSlots(true);

    // Simulate brief loading for better UX
    setTimeout(() => {
      const slots = generateTimeSlots(date);
      setTimeSlots(slots);
      setLoadingSlots(false);
    }, 300);
  };

  const checkWorkerAvailability = async (date, timeSlot) => {
    if (!selectedAddress || !date || !timeSlot) {
      return;
    }

    const effectiveDate = getEffectiveDateForTime(date);

    setLoadingWorkerAvailability(true);
    try {
      // Call backend API to check worker availability
      const availabilityData = await BookingService.checkWorkerAvailability({
        date: effectiveDate,
        time: timeSlot,
        address_id: selectedAddress.address_id,
        services: cart.items.map(item => ({
          subcategory_id: item.subcategory_id || item.id,
          quantity: item.quantity
        }))
      });

      // If slot is not available due to capacity or past time, mark it unavailable and notify
      if (availabilityData && availabilityData.slot_available === false) {
        setTimeSlots(prev => prev.map(s => s.time === timeSlot ? { ...s, available: false } : s));
        setSelectedTimeSlot(null);
        setWorkerAvailability({ male: false, female: false, any: false });
        setServiceAvailability({});
        setNightPricing({});
        toast.warn(availabilityData.reason || 'Selected time slot is not available. Please pick another slot.');
        return;
      }

      setWorkerAvailability({
        male: availabilityData.male_available || false,
        female: availabilityData.female_available || false,
        any: !!availabilityData.any_available
      });

      // Map per-subcategory availability for UI
      const perService = {};
      if (Array.isArray(availabilityData.subcategories)) {
        availabilityData.subcategories.forEach(sc => {
          if (!sc || sc.subcategory_id == null) return;
          const id = sc.subcategory_id;
          const available = sc.available === true || (sc.total_count || 0) > 0;
          perService[id] = {
            available,
            male_count: sc.male_count || 0,
            female_count: sc.female_count || 0,
            total_count: sc.total_count || 0
          };
        });
      }
      setServiceAvailability(perService);

      // Map night_pricing from backend (per subcategory) for use in night charge calculation
      const nightMap = {};
      if (Array.isArray(availabilityData.night_pricing)) {
        availabilityData.night_pricing.forEach(np => {
          if (!np || np.subcategory_id == null) return;
          nightMap[np.subcategory_id] = {
            night_charge: np.night_charge ?? 0,
            night_start_time: np.night_start_time,
            night_end_time: np.night_end_time,
            is_night: !!np.is_night
          };
        });
      }
      setNightPricing(nightMap);

      if (!availabilityData.any_available) {
        toast.error('No workers are available in your area.');
      }

      // Reset preference if current preference is not available
      if (workerPreference === 'male' && !availabilityData.male_available) {
        setWorkerPreference('any');
      } else if (workerPreference === 'female' && !availabilityData.female_available) {
        setWorkerPreference('any');
      }

    } catch (error) {
      console.error('Error checking worker availability:', error);
      toast.error('Failed to check worker availability');
      // Be conservative on error: disable proceeding
      setWorkerAvailability({
        male: false,
        female: false,
        any: false
      });
      setServiceAvailability({});
      setNightPricing({});
    } finally {
      setLoadingWorkerAvailability(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);

    setWorkerPreference('any');
    setWorkerAvailability({
      male: false,
      female: false,
      any: false
    });
    setServiceAvailability({});
    setNightPricing({});
    loadTimeSlots(date);
  };

  const handleTimeSlotSelect = (slot) => {
    if (slot.available) {
      setSelectedTimeSlot(slot);
      // Check worker availability for this time slot
      checkWorkerAvailability(selectedDate, slot.time);
    }
  };

  const debouncedPincodeValidation = useCallback(
    debounce(async (pincode) => {
      if (!pincode || pincode.length !== 6) return;

      setValidatingAddress(true);
      try {
        const validation = await BookingService.utils.validatePincode(pincode);
        if (validation.isValid && validation.data) {
          // Auto-fill city and state
          setNewAddress(prev => ({
            ...prev,
            city: validation.data.city,
            state: validation.data.state
          }));
          toast.success(`Pincode validated! Auto-filled: ${validation.data.city}, ${validation.data.state}`);
        } else if (validation.error) {
          toast.error(validation.error);
        }
      } catch (error) {
        console.warn('Pincode validation error:', error);
      } finally {
        setValidatingAddress(false);
      }
    }, 500),
    []
  );

  // Handle pincode validation on blur
  const handlePincodeValidation = (pincode) => {
    debouncedPincodeValidation(pincode);
  };

  // Get current location using browser geolocation API
  const getCurrentLocation = async () => {
    setGettingCurrentLocation(true);

    try {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return null;
      }

      const getPosition = (options) => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const getBestAccuratePosition = ({
        sampleTimeoutMs = 25000,
        desiredAccuracyMeters = 50,
        minSamples = 2,
        maxSamples = 5
      } = {}) => new Promise((resolve, reject) => {
        let best = null;
        let samples = 0;
        let done = false;

        const finish = (result, isError) => {
          if (done) return;
          done = true;
          if (watchId != null) navigator.geolocation.clearWatch(watchId);
          clearTimeout(timer);
          if (isError) reject(result);
          else resolve(result);
        };

        const onSuccess = (pos) => {
          samples += 1;
          const acc = pos?.coords?.accuracy;
          if (typeof acc === 'number' && !Number.isNaN(acc)) {
            if (!best || acc < best.coords.accuracy) best = pos;
          } else if (!best) {
            best = pos;
          }

          const goodEnough = best?.coords?.accuracy != null && best.coords.accuracy <= desiredAccuracyMeters;
          const haveEnoughSamples = samples >= minSamples;
          if ((goodEnough && haveEnoughSamples) || samples >= maxSamples) {
            finish(best, false);
          }
        };

        const onError = (err) => {
          finish(err, true);
        };

        let watchId = null;
        try {
          watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
            enableHighAccuracy: true,
            timeout: sampleTimeoutMs,
            maximumAge: 0
          });
        } catch (e) {
          finish(e, true);
          return;
        }

        const timer = setTimeout(() => {
          if (best) finish(best, false);
          else finish({ code: 3, message: 'Timeout expired' }, true);
        }, sampleTimeoutMs);
      });

      let position;
      try {
        position = await getBestAccuratePosition();
      } catch (err) {
        position = await getPosition({
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 60000
        });
      }

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setCurrentLocationCoords(coords);
      console.log('✓ Current location obtained with accuracy:', coords.accuracy, 'meters');

      // Reverse geocode to get address
      const addressData = await reverseGeocode(coords.latitude, coords.longitude);

      if (addressData) {
        setNewAddress(prev => ({
          ...prev,
          address: addressData.address || prev.address,
          city: addressData.city || prev.city,
          state: addressData.state || prev.state,
          pin_code: addressData.pin_code || prev.pin_code,
          country: addressData.country || prev.country
        }));

        toast.success('Current location detected! Please verify the address details.');
      }

      return coords;
    } catch (error) {
      console.error('Error getting current location:', error);
      if (error.code === 1) {
        toast.error('Location access denied. Please enable location permissions.');
      } else if (error.code === 2) {
        toast.error('Location unavailable. Please try again.');
      } else if (error.code === 3) {
        toast.error('Location request timed out. Please check GPS/network and try again.');
      } else {
        toast.error('Failed to get current location');
      }
      return null;
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  const handleAddressInput = (field, value) => {
    setNewAddress(prev => {
      if (field === 'pin_code') {
        const cleaned = String(value || '').replace(/\D/g, '').slice(0, 6);
        return { ...prev, [field]: cleaned };
      }
      return { ...prev, [field]: value };
    });
  };

  // Reverse geocode coordinates to address using Google Maps API
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_REACT_APP_GOOGLE_MAPS_API_KEY;

      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
          const osmResp = await fetch(osmUrl, {
            headers: {
              'Accept': 'application/json'
            }
          });
          if (!osmResp.ok) {
            console.warn('OSM reverse geocoding failed:', osmResp.statusText);
            return null;
          }
          const osmData = await osmResp.json();
          const addr = osmData?.address || {};
          const address = osmData?.display_name || '';
          const city = addr.city || addr.town || addr.village || addr.suburb || '';
          const state = addr.state || '';
          const pin_code = addr.postcode || '';
          const country = addr.country || 'India';
          return { address, city, state, pin_code, country };
        } catch (e) {
          console.warn('OSM reverse geocoding error:', e);
          return null;
        }
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('Reverse geocoding API error:', response.statusText);
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
          const osmResp = await fetch(osmUrl, {
            headers: {
              'Accept': 'application/json'
            }
          });
          if (!osmResp.ok) return null;
          const osmData = await osmResp.json();
          const addr = osmData?.address || {};
          const address = osmData?.display_name || '';
          const city = addr.city || addr.town || addr.village || addr.suburb || '';
          const state = addr.state || '';
          const pin_code = addr.postcode || '';
          const country = addr.country || 'India';
          return { address, city, state, pin_code, country };
        } catch (_) {
          return null;
        }
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components;

        let address = '';
        let city = '';
        let state = '';
        let pin_code = '';
        let country = 'India';

        for (const component of addressComponents) {
          const types = component.types;

          if (types.includes('postal_code')) {
            pin_code = component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          }
        }

        address = result.formatted_address;

        console.log('✓ Reverse geocoding successful:', { address, city, state, pin_code });
        return { address, city, state, pin_code, country };
      }

      return null;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  };

  // Geocode address using Google Maps API to get precise latitude and longitude
  const geocodeAddress = async (addressData, currentCoords = null) => {
    try {
      const { address, city, state, country, pin_code } = addressData;

      // If we already have current location coordinates, use them
      if (currentCoords) {
        console.log('Using current location coordinates:', currentCoords);
        return {
          location_lat: currentCoords.latitude,
          location_lng: currentCoords.longitude,
          status: 'CURRENT_LOCATION'
        };
      }

      // Progressive fallback - try most specific first, stop after 2-3 attempts to reduce API calls
      const addressCombinations = [
        pin_code ? `${address}, ${city}, ${state}, ${pin_code}, ${country}` : null,
        `${address}, ${city}, ${state}, ${country}`,
        pin_code ? `${city}, ${state}, ${pin_code}, ${country}` : null
      ].filter(Boolean).slice(0, 3); // Limit to 3 attempts maximum

      let latitude = null;
      let longitude = null;
      let bestAccuracy = 0; // Initialize with 0 instead of null
      let geocodingStatus = 'FAILED';

      // Get Google Maps API key from environment
      const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_REACT_APP_GOOGLE_MAPS_API_KEY;

      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('Google Maps API key not configured');
        return {
          location_lat: null,
          location_lng: null,
          status: 'NO_API_KEY',
          error: 'Google Maps API key not configured'
        };
      }

      for (const addr of addressCombinations) {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${GOOGLE_MAPS_API_KEY}`;
          const response = await fetch(url);

          if (!response.ok) {
            console.error('Geocoding API error:', response.statusText);
            continue;
          }

          const data = await response.json();

          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            const location = result.geometry.location;
            const locationType = result.geometry.location_type;

            // Determine accuracy based on location_type
            // ROOFTOP is most accurate, then RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
            const accuracyScore = {
              'ROOFTOP': 4,
              'RANGE_INTERPOLATED': 3,
              'GEOMETRIC_CENTER': 2,
              'APPROXIMATE': 1
            }[locationType] || 0;

            // Use the most accurate result
            if (accuracyScore > bestAccuracy) {
              latitude = location.lat;
              longitude = location.lng;
              bestAccuracy = accuracyScore;
              geocodingStatus = locationType;

              console.log('✓ Geocoding result:', {
                address: addr,
                coordinates: { lat: latitude, lng: longitude },
                location_type: locationType,
                accuracy_score: accuracyScore
              });

              // If we got ROOFTOP accuracy, no need to try other combinations
              if (locationType === 'ROOFTOP') {
                console.log('✓ Achieved ROOFTOP precision - using this result');
                break;
              }
            }
          } else if (data.status !== 'OK') {
            console.warn('Geocoding failed for address:', addr, 'Status:', data.status);
            if (data.status === 'OVER_QUERY_LIMIT') {
              geocodingStatus = 'QUOTA_EXCEEDED';
              break; // Stop trying if quota exceeded
            }
          }
        } catch (fetchError) {
          console.warn('Error fetching geocoding data for address:', addr, fetchError);
          continue;
        }
      }

      if (!latitude || !longitude) {
        console.warn('Could not determine precise location from address');
        return {
          location_lat: null,
          location_lng: null,
          status: geocodingStatus,
          error: 'Could not determine precise location from address'
        };
      }

      console.log('✓ Final geocoding result:', {
        latitude,
        longitude,
        accuracy: bestAccuracy === 4 ? 'ROOFTOP (Highest)' :
          bestAccuracy === 3 ? 'RANGE_INTERPOLATED (High)' :
            bestAccuracy === 2 ? 'GEOMETRIC_CENTER (Medium)' : 'APPROXIMATE (Low)'
      });

      return {
        location_lat: latitude,
        location_lng: longitude,
        status: geocodingStatus,
        accuracy: bestAccuracy
      };
    } catch (error) {
      console.error('Error in Google Maps geocoding:', error);
      return {
        location_lat: null,
        location_lng: null,
        status: 'ERROR',
        error: error.message
      };
    }
  };

  // Add new address
  const handleAddAddress = async () => {
    try {
      const validation = await BookingService.utils.validateAddress(newAddress);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        toast.error(errorMessages);
        return;
      }

      if (validation.suggestions) {
        toast.info(`Address validated. Suggested: ${validation.suggestions.city}, ${validation.suggestions.state}`);
      }

      // Get coordinates before saving
      const geocodingResult = await geocodeAddress(newAddress, currentLocationCoords);
      
      // Handle geocoding results
      if (geocodingResult.status === 'NO_API_KEY') {
        toast.warning('Geocoding unavailable. Address updated with approximate location.');
      } else if (geocodingResult.status === 'QUOTA_EXCEEDED') {
        toast.error('Geocoding quota exceeded. Please try again later.');
        return;
      } else if (geocodingResult.status === 'ERROR' || (!geocodingResult.location_lat && !geocodingResult.location_lng)) {
        toast.warning('Could not determine precise location. Please verify the address or use current location.');
        // Use a fallback - let user decide
        if (!window.confirm(`Could not determine precise location for this address. Do you want to update it anyway? If you choose to update, the address will be saved with approximate location.`)) {
          return;
        }
      } else if (geocodingResult.status === 'CURRENT_LOCATION') {
        toast.success('Using your current location for this address.');
      } else if (geocodingResult.accuracy >= 3) {
        toast.success('Address location determined with high precision.');
      } else if (geocodingResult.accuracy >= 2) {
        toast.info('Address location determined with medium precision.');
      } else {
        toast.warning('Address location determined with low precision. Consider using current location for better accuracy.');
      }

      // Create address object with coordinates (only include if valid)
      const addressWithCoords = { ...newAddress };
      
      // Only include coordinates if they're valid (not null)
      if (geocodingResult.location_lat && geocodingResult.location_lng) {
        addressWithCoords.location_lat = geocodingResult.location_lat;
        addressWithCoords.location_lng = geocodingResult.location_lng;
      }
      // If coordinates are null, don't include them - backend will handle appropriately

      const result = await BookingService.addresses.create(addressWithCoords);
      toast.success('Address added successfully');

      // Refresh addresses
      await loadAddresses();

      // Reset form
      setNewAddress({
        address: '',
        pin_code: '',
        city: '',
        state: '',
        country: 'India',
        address_type: 'home',
        address_label: '',
        is_default: false
      });
      setShowAddressForm(false);
      setCurrentLocationCoords(null); // Reset current location after use

      // Select the new address
      if (result.address) {
        setSelectedAddress(result.address);
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
  };

  // Edit address
  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setNewAddress({
      address: address.address || '',
      pin_code: address.pin_code || '',
      city: address.city || '',
      state: address.state || '',
      country: address.country || 'India',
      address_type: address.address_type || 'home',
      address_label: address.address_label || '',
      is_default: address.is_default || false
    });
    setShowAddressForm(true);
    setAddressValidationResult(null);
  };

  // Update address
  const handleUpdateAddress = async () => {
    try {
      const validation = await BookingService.utils.validateAddress(newAddress);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        toast.error(errorMessages);
        return;
      }

      if (validation.suggestions) {
        toast.info(`Address validated. Suggested: ${validation.suggestions.city}, ${validation.suggestions.state}`);
      }

      // Get coordinates before saving
      const geocodingResult = await geocodeAddress(newAddress, currentLocationCoords);
      
      // Handle geocoding results
      if (geocodingResult.status === 'NO_API_KEY') {
        toast.warning('Geocoding unavailable. Address updated with approximate location.');
      } else if (geocodingResult.status === 'QUOTA_EXCEEDED') {
        toast.error('Geocoding quota exceeded. Please try again later.');
        return;
      } else if (geocodingResult.status === 'ERROR' || (!geocodingResult.location_lat && !geocodingResult.location_lng)) {
        toast.warning('Could not determine precise location. Please verify the address or use current location.');
        // Use a fallback - let user decide
        if (!window.confirm('Could not determine precise location for this address. Do you want to update it anyway?')) {
          return;
        }
      } else if (geocodingResult.status === 'CURRENT_LOCATION') {
        toast.success('Using your current location for this address.');
      }

      // Create address object with coordinates (only include if valid)
      const addressWithCoords = { ...newAddress };
      
      // Only include coordinates if they're valid (not null)
      if (geocodingResult.location_lat && geocodingResult.location_lng) {
        addressWithCoords.location_lat = geocodingResult.location_lat;
        addressWithCoords.location_lng = geocodingResult.location_lng;
      }
      // If coordinates are null, don't include them - backend will keep existing coordinates

      const result = await BookingService.addresses.update(editingAddress.address_id, addressWithCoords);
      toast.success('Address updated successfully');
      // Refresh addresses
      await loadAddresses();

      // Reset form
      resetAddressForm();

      // Update selected address if it was the one being edited
      if (selectedAddress?.address_id === editingAddress.address_id && result.address) {
        setSelectedAddress(result.address);
      }
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  // Reset address form
  const resetAddressForm = () => {
    setNewAddress({
      address: '',
      pin_code: '',
      city: '',
      state: '',
      country: 'India',
      address_type: 'home',
      address_label: '',
      is_default: false
    });
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressValidationResult(null);
    setCurrentLocationCoords(null); // Reset current location after use
  };

  // Delete address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      console.log('Deleting address with ID:', addressId);
      const result = await BookingService.addresses.delete(addressId);
      console.log('Delete result:', result);
      toast.success('Address deleted successfully');

      // Reload addresses to reflect the change
      await loadAddresses();

      // Clear selection if deleted address was selected
      if (selectedAddress?.address_id === addressId) {
        setSelectedAddress(null);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      console.error('Full error details:', error.response?.data || error);
      toast.error(`Failed to delete address: ${error.response?.data?.message || error.message}`);
    }
  };

  // Proceed to next step
  const proceedToNextStep = () => {
    if (currentStep === 'address') {
      if (!selectedAddress) {
        toast.error('Please select an address');
        return;
      }
      setCurrentStep('datetime');
      return;
    }

    if (currentStep === 'datetime') {
      if (!selectedDate || !selectedTimeSlot) {
        toast.error('Please select date and time');
        return;
      }
      if (!selectedTimeSlot.available) {
        toast.error('Selected time slot is not available. Please choose a different slot.');
        return;
      }
      if (!workerPreference) {
        toast.error('Please select a worker preference');
        return;
      }
      // Require at least one worker available overall for this slot
      const anyAvailableOverall = !!(workerAvailability.any || workerAvailability.male || workerAvailability.female);
      if (!anyAvailableOverall) {
        toast.error('No workers are available in your area.');
        return;
      }
      // Ensure preferred worker gender is available for this slot
      const avail = workerAvailability;
      const ok = workerPreference === 'any' ? !!avail.any : workerPreference === 'male' ? !!avail.male : !!avail.female;
      if (!ok) {
        toast.error('Selected worker preference is not available for this time slot. Please adjust preference or pick another time.');
        return;
      }
      // Ensure all selected services have at least one available provider for this slot
      const unavailableServices = cart.items.filter((item) => {
        const id = item.subcategory_id || item.id;
        const info = serviceAvailability[id];
        return info && !info.available;
      });
      if (unavailableServices.length > 0) {
        toast.error(`Selected time slot is not available for: ${unavailableServices.map((s) => s.name).join(', ')}. Please update your service requests.`);
        return;
      }
      setCurrentStep('payment');
      return;
    }

    if (currentStep === 'payment') {
      handleCreateBooking();
    }
  };

  // Go back to previous step
  const goToPreviousStep = () => {
    if (currentStep === 'datetime') {
      setCurrentStep('address');
    } else if (currentStep === 'payment') {
      setCurrentStep('datetime');
    } else {
      navigate('/cart');
    }
  };

  // Format time slot for display (24-hour to 12-hour format)
  const formatTimeSlot = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Convert local date+time to UTC MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
  const buildUTCMySQLDateTime = (date, time) => {
    const localDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(localDateTime.getTime())) {
      throw new Error('Invalid date or time format');
    }
    return localDateTime.toISOString().slice(0, 19).replace('T', ' ');
  };

  // Build local (customer) MySQL DATETIME string without timezone conversion.
  // This is stored in bookings.scheduled_time_local so backend night-charge
  // checks use the user's actual local time instead of UTC.
  const buildLocalMySQLDateTime = (date, time) => {
    return `${date} ${time}:00`;
  };

  // Validate selected time is not in the past (respecting effective date for late-night slots)
  const validateSelectedTime = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select date and time');
      return false;
    }

    const effectiveDate = getEffectiveDateForTime(selectedDate, selectedTimeSlot.time);

    const now = new Date();
    const selectedDateTime = new Date(`${effectiveDate}T${selectedTimeSlot.time}:00`);

    // Check if the constructed date is valid
    if (isNaN(selectedDateTime.getTime())) {
      console.error('Invalid selected date/time:', effectiveDate, selectedTimeSlot.time);
      toast.error('Invalid date or time selected. Please try again.');
      return false;
    }

    if (selectedDateTime <= now) {
      toast.error('Selected time is in the past. Please choose a future time slot.');
      return false;
    }

    return true;
  };

  // Process payment for service booking with Razorpay checkout
  const processServicePayment = async (amount, bookingIds, pendingBookingData = null) => {
    if (!selectedPaymentMethod) {
      setPaymentStatus('cash');
      return true;
    }

    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      const paymentData = {
        amount: amount,
        upi_id: selectedPaymentMethod.upi_id,
        description: `Service Payment - ${cart.items.map(item => item.name).join(', ')}`,
        booking_id: bookingIds[0] // Use first booking ID
      };

      console.log('Initiating payment with data:', paymentData);
      const paymentResponse = await PaymentService.upi.initiate(paymentData);
      console.log('Payment response:', paymentResponse);
      setCurrentPayment(paymentResponse);

      if (paymentResponse.success) {
        // Open Razorpay checkout modal
        // Prefer backend-provided key from the initiation response
        const razorpayKey = (paymentResponse && (paymentResponse.key || paymentResponse.order_key))
          || import.meta.env.VITE_RAZORPAY_KEY_ID
          || import.meta.env.VITE_REACT_APP_RAZORPAY_KEY_ID;

        // Get real user info from AuthService and ProfileService
        const currentUser = AuthService.getCurrentUser('customer');

        // Fetch fresh user profile data for accurate contact info
        let userProfile = null;
        try {
          userProfile = await ProfileService.profile.get();
        } catch (profileError) {
          console.warn('Could not fetch user profile:', profileError);
        }

        // Use profile data first, then fallback to auth data
        const userContact = userProfile?.phone_number || currentUser?.phone || currentUser?.mobile || '';
        const userName = userProfile?.name ||
          (currentUser?.firstName && currentUser?.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser?.name || currentUser?.firstName || '');
        const userEmail = userProfile?.email || currentUser?.email || '';

        // Debug: Log the configuration
        console.log('Razorpay configuration:', {
          key: razorpayKey,
          amount: amount * 100,
          order_id: paymentResponse.razorpay_order_id,
          currency: 'INR',
          upi_enabled: true
        });

        // Debug: Check if UPI is available for this account/amount
        console.log('Payment method configuration:', {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true
        });

        const razorpayOptions = {
          key: razorpayKey,
          currency: 'INR',
          name: 'OMW - On My Way',
          description: paymentData.description,
          order_id: paymentResponse.razorpay_order_id,
          amount: amount * 100, // Convert to paise (required for UPI)
          prefill: {
            name: userName || '', // Let user fill if empty
            email: userEmail || '', // Let user fill if empty
            contact: userContact || '', // Let user fill if empty
            'vpa': selectedPaymentMethod.upi_id // Pre-fill selected UPI ID
          },
          // Try the most basic UPI configuration possible
          method: {
            upi: true
          },
          // Try without any custom config - let Razorpay handle it
          readonly: {
            email: true,
            contact: true
          },
          theme: {
            color: '#8B5CF6'
          },
          handler: async (response) => {
            // Payment successful callback
            console.log('Razorpay payment successful:', response);
            try {
              const verify = await PaymentService.razorpay.handleSuccess({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verify?.success) {
                setPaymentStatus('completed');
                toast.success('Payment completed successfully!');
              } else if (verify?.already_processed) {
                setPaymentStatus('completed');
                toast.success('Payment already processed successfully!');
              } else {
                setPaymentStatus('failed');
                toast.error('Payment verification failed. Please contact support.');
              }
            } catch (err) {
              console.error('Payment verification error:', err);
              setPaymentStatus('failed');
              toast.error('Payment verification failed. Please contact support.');
            }
          },

          modal: {
            confirm_close: true, // Ask for confirmation before closing
            escape: false, // Disable escape key to close
            animation: true, // Enable animation
            backdropclose: false, // Prevent clicking outside to close
            handleback: true,
            ondismiss: () => {
              setPaymentProcessing(false);
              setPaymentStatus('cancelled');
              toast.info('Payment cancelled');
            }
          }
        };

        // Ensure Razorpay script is loaded
        if (!window.Razorpay) {
          console.error('Razorpay SDK not loaded');
          toast.error('Payment gateway not available. Please refresh the page and try again.');
          setPaymentStatus('failed');
          setPaymentError('Payment gateway not available');
          return false;
        }

        // Return a promise that resolves when payment is completed
        return new Promise(async (resolve) => {
          // Override handlers to resolve promise
          razorpayOptions.handler = async (response) => {
            console.log('Razorpay payment successful:', response);
            try {
              const verify = await PaymentService.razorpay.handleSuccess({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verify?.success || verify?.already_processed) {
                setPaymentStatus('completed');
                toast.success('Payment completed successfully! Finalizing booking...');

                // If we have pending booking data, complete the booking flow
                if (pendingBookingData) {
                  try {
                    // Clear cart after successful payment
                    await clearCart();

                    // Navigate to booking success
                    navigate('/booking-success', {
                      state: {
                        bookingIds: pendingBookingData.booking_ids,
                        totalAmount: pendingBookingData.total_amount,
                        scheduledDate: pendingBookingData.scheduled_date,
                        paymentId: paymentResponse?.payment_id,
                        paymentMethod: 'upi'
                      }
                    });

                    toast.success('Booking confirmed successfully!');
                  } catch (error) {
                    console.error('Error completing booking after payment:', error);
                    toast.error('Payment successful but booking completion failed. Please contact support.');
                  }
                }

                resolve(true);
              } else {
                setPaymentStatus('failed');
                toast.error('Payment verification failed. Please contact support.');
                resolve(false);
              }
            } catch (err) {
              console.error('Payment verification error:', err);
              setPaymentStatus('failed');
              toast.error('Payment verification failed. Please contact support.');
              resolve(false);
            }
          };

          razorpayOptions.modal.ondismiss = () => {
            setPaymentProcessing(false);
            setPaymentStatus('cancelled');
            toast.info('Payment cancelled. Booking is on hold until payment is completed.');
            resolve(false);
          };

          try {
            console.log('Final Razorpay options:', razorpayOptions);
            const razorpay = new window.Razorpay(razorpayOptions);
            console.log('Razorpay instance created, opening modal...');
            razorpay.open();
          } catch (modalError) {
            console.error('Error opening Razorpay modal:', modalError);
            setPaymentStatus('failed');
            setPaymentError('Failed to open payment gateway');
            toast.error('Failed to open payment gateway. Please try again.');
            resolve(false);
          }
        });
      } else {
        throw new Error(paymentResponse.message || 'Payment initiation failed');
      }

    } catch (error) {
      console.error('Error processing service payment:', error);
      setPaymentError(error.response?.data?.message || error.message || 'Payment failed');
      setPaymentStatus('failed');
      toast.error('Payment failed. Please try again or choose pay after service.');
      return false;
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Poll service payment status
  const pollServicePaymentStatus = async (paymentId, attempts = 0) => {
    const maxAttempts = 30; // 30 attempts = 5 minutes
    const pollInterval = 10000; // 10 seconds

    if (attempts >= maxAttempts) {
      setPaymentStatus('timeout');
      setPaymentError('Payment verification timed out');
      toast.error('Payment verification timed out. Please check your payment app.');
      return false;
    }

    try {
      const statusResponse = await PaymentService.upi.verify(paymentId);

      if (statusResponse.success && statusResponse.status === 'completed') {
        setPaymentStatus('completed');
        toast.success('Payment completed successfully!');
        return true;
      } else if (statusResponse.status === 'failed') {
        setPaymentStatus('failed');
        setPaymentError('Payment failed');
        toast.error('Payment failed. Please try again.');
        return false;
      }

      // Continue polling if payment is still pending
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await pollServicePaymentStatus(paymentId, attempts + 1);
          resolve(result);
        }, pollInterval);
      });

    } catch (error) {
      console.error('Error verifying service payment:', error);
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await pollServicePaymentStatus(paymentId, attempts + 1);
          resolve(result);
        }, pollInterval);
      });
    }
  };

  // Retry service payment
  const retryServicePayment = async () => {
    if (paymentRetryCount >= 3) {
      toast.error('Maximum retry attempts reached. Please try a different payment method.');
      return;
    }

    setPaymentRetryCount(prev => prev + 1);
    if (serviceBookingId && backendCalculatedTotal) {
      // Use backend-calculated total for consistency
      await processServicePayment(backendCalculatedTotal, [serviceBookingId]);
    }
  };

  // Add new UPI payment method
  const addServicePaymentMethod = async () => {
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
      console.error('Error adding service payment method:', error);
      toast.error(error.response?.data?.message || 'Failed to add payment method');
    }
  };

  // Create booking with enhanced payment processing
  const handleCreateBooking = async () => {
    setIsProcessing(true);

    try {
      // Validate time is not in the past
      if (!validateSelectedTime()) {
        setIsProcessing(false);
        return;
      }

      // Validate payment method selection
      if (paymentType === 'upi' && !selectedPaymentMethod) {
        toast.error('Please select a UPI payment method or choose "Pay After Service".');
        setIsProcessing(false);
        return;
      }

      const effectiveDate = getEffectiveDateForTime(selectedDate, selectedTimeSlot.time);
      const scheduledAt = buildUTCMySQLDateTime(effectiveDate, selectedTimeSlot.time);
      const scheduledLocal = buildLocalMySQLDateTime(effectiveDate, selectedTimeSlot.time);
      const timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone) || null;

      const totals = calculateTotals();

      // Prepare booking data
      const bookingData = {
        cart_items: cart.items.map(item => ({
          subcategory_id: item.subcategory_id || item.id,
          quantity: item.quantity,
          price: item.price
        })),
        // scheduled_time is stored in UTC (string without timezone), while
        // scheduled_time_local + timezone preserve the customer's local
        // booking time so that night charges can be computed correctly.
        scheduled_time: scheduledAt,
        scheduled_time_local: scheduledLocal,
        timezone: timeZone,
        address_id: selectedAddress.address_id,
        notes: bookingNotes,
        payment_method: paymentType === 'pay_after_service' ? 'pay_after_service' : 'upi',
        worker_preference: workerPreference
      };

      // Send to backend
      const result = await BookingService.bookings.create(bookingData);
      setServiceBookingId(result.booking_ids?.[0]);
      setBackendCalculatedTotal(result.total_amount);

      // Handle different payment types
      if (paymentType === 'pay_after_service') {
        // For pay after service, go directly to booking success
        toast.success('Booking created successfully! Payment will be collected after service completion.');

        // Clear cart
        await clearCart();

        const scheduledLocalDate = new Date(`${effectiveDate}T${selectedTimeSlot.time}:00`);
        navigate('/booking-success', {
          state: {
            bookingIds: result.booking_ids,
            totalAmount: result.total_amount,
            scheduledDate: scheduledLocalDate.toISOString(),
            paymentMethod: 'pay_after_service'
          }
        });
      } else {
        // For UPI payments, process payment FIRST, then complete booking after payment success
        toast.info('Processing payment...');

        // Store booking data for completion after payment
        const pendingBookingData = {
          booking_ids: result.booking_ids,
          total_amount: result.total_amount,
          scheduled_date: new Date(`${effectiveDate}T${selectedTimeSlot.time}:00`).toISOString()
        };

        // Use backend-calculated total to ensure consistency with discount
        const paymentSuccess = await processServicePayment(result.total_amount, result.booking_ids, pendingBookingData);

        if (!paymentSuccess) {
          // Payment failed or cancelled - booking remains in pending state
          toast.error('Payment was cancelled or failed. Booking is on hold until payment is completed.');
        }
        // Note: Success handling is now done in processServicePayment after payment completion
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get address type icon
  const getAddressTypeIcon = (type) => {
    switch (type) {
      case 'home': return <Home className="h-5 w-5" />;
      case 'work': return <Briefcase className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  // Get provider icon
  const getProviderIcon = (provider) => {
    const iconMap = {
      'Paytm': '💳',
      'Google Pay': '📱',
      'PhonePe': '📲',
      'Amazon Pay': '🛒',
      'BHIM': '🏦',
      'Yono SBI': '🏛️',
      'HDFC Bank': '🏦',
      'ICICI Bank': '🏦',
      'Axis Bank': '🏦',
      'Kotak Bank': '🏦',
      'Punjab National Bank': '🏦',
      'State Bank of India': '🏦',
      'Bank UPI': '🏦',
      'Other': '💳'
    };
    return iconMap[provider] || '💳';
  };
  const totals = calculateTotals();

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header />

      <div className="container-custom py-8">
        {/* Header with steps */}
        <div className="mb-8">
          <button
            onClick={goToPreviousStep}
            className={`flex items-center mb-4 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-purple-600'}`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>

          {/* Step indicator */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={`flex items-center ${currentStep === 'address' ? 'text-purple-600' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <MapPin className="h-5 w-5 mr-2" />
              <span className="font-medium">Address</span>
            </div>
            <div className={`w-8 h-px ${currentStep === 'datetime' || currentStep === 'payment' ? 'bg-purple-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep === 'datetime' ? 'text-purple-600' : (currentStep === 'payment' ? 'text-green-600' : darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
              <Calendar className="h-5 w-5 mr-2" />
              <span className="font-medium">Date & Time</span>
            </div>
            <div className={`w-8 h-px ${currentStep === 'payment' ? 'bg-purple-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep === 'payment' ? 'text-purple-600' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <CreditCard className="h-5 w-5 mr-2" />
              <span className="font-medium">Payment</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="lg:w-2/3">
            <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border overflow-hidden`}>
              {/* Address Selection */}
              {currentStep === 'address' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Select Address
                    </h2>
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </button>
                  </div>

                  {/* Address List */}
                  {loadingAddresses ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No addresses found. Please add an address to continue.
                          </p>
                        </div>
                      ) : (
                        addresses.map((address) => (
                          <div
                            key={address.address_id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedAddress?.address_id === address.address_id
                                ? 'border-purple-600 bg-[var(--bg-hover)]'
                                : darkMode
                                  ? 'border-gray-600 bg-gray-700 hover:border-purple-500'
                                  : 'border-gray-200 bg-white hover:border-purple-300'
                              }`}
                            onClick={() => setSelectedAddress(address)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  {getAddressTypeIcon(address.address_type)}
                                  <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {address.address_label || address.address_type}
                                  </span>
                                  {address.is_default && (
                                    <span className={`${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'} ml-2 px-2 py-1 text-xs rounded-full`}>
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                                  {address.address}
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {address.city}, {address.state} - {address.pin_code}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAddress(address);
                                  }}
                                  className={`p-2 rounded-full ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAddress(address.address_id);
                                  }}
                                  className={`p-2 rounded-full ${darkMode ? 'text-red-400 hover:text-red-300 hover:bg-gray-600' : 'text-red-500 hover:text-red-700 hover:bg-gray-100'}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Add Address Form */}
                  {showAddressForm && (
                    <div className={`mt-6 p-4 border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h3>
                        <button
                          onClick={getCurrentLocation}
                          disabled={gettingCurrentLocation}
                          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${gettingCurrentLocation
                              ? 'bg-gray-400 cursor-not-allowed text-white'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                        >
                          {gettingCurrentLocation ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Getting...
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 mr-2" />
                              Use Current Location
                            </>
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Full Address *
                          </label>
                          <textarea
                            value={newAddress.address}
                            onChange={(e) => handleAddressInput('address', e.target.value)}
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                            placeholder="Enter full address"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Pin Code *
                          </label>
                          <input
                            type="text"
                            value={newAddress.pin_code}
                            onChange={(e) => handleAddressInput('pin_code', e.target.value)}
                            onBlur={(e) => handlePincodeValidation(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                            placeholder="123456"
                          />
                          {validatingAddress && (
                            <div className="mt-2 flex items-center text-sm text-blue-600">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                              Validating pincode...
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            City *
                          </label>
                          <input
                            type="text"
                            value={newAddress.city}
                            onChange={(e) => handleAddressInput('city', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                            placeholder="City name"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            State *
                          </label>
                          <input
                            type="text"
                            value={newAddress.state}
                            onChange={(e) => handleAddressInput('state', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                            placeholder="State name"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Address Type
                          </label>
                          <select
                            value={newAddress.address_type}
                            onChange={(e) => handleAddressInput('address_type', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                          >
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Address Label
                          </label>
                          <input
                            type="text"
                            value={newAddress.address_label}
                            onChange={(e) => handleAddressInput('address_label', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                            placeholder="e.g., Home, Office"
                          />
                        </div>
                      </div>
                      <div className="flex items-center mt-4">
                        <input
                          type="checkbox"
                          id="is_default"
                          checked={newAddress.is_default}
                          onChange={(e) => handleAddressInput('is_default', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="is_default" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Set as default address
                        </label>
                      </div>
                      <div className="flex space-x-4 mt-6">
                        <button
                          onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          {editingAddress ? 'Update Address' : 'Add Address'}
                        </button>
                        <button
                          onClick={resetAddressForm}
                          className={`px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-600' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Selection with Preferences */}
              {currentStep === 'datetime' && (
                <div className="p-6">
                  <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Select Date & Time
                  </h2>

                  {/* Date Selection */}
                  <div className="mb-8">
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Choose Date
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {availableDates.map((dateOption, index) => (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(dateOption.date)}
                          className={`p-3 rounded-lg border text-center transition-colors ${selectedDate === dateOption.date
                              ? 'border-purple-600 bg-purple-100 text-purple-700'
                              : darkMode
                                ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-purple-500'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                            }`}
                        >
                          <div className="font-medium">{dateOption.shortDate}</div>
                          <div className="text-sm opacity-75">
                            {dateOption.isToday ? 'Today' : dateOption.isTomorrow ? 'Tomorrow' : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  {selectedDate && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Choose Time Slot
                      </h3>
                      {loadingSlots ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {timeSlots.map((slot, index) => (
                              <button
                                key={index}
                                onClick={() => handleTimeSlotSelect(slot)}
                                disabled={!slot.available}
                                className={`p-3 rounded-lg border text-center transition-colors ${selectedTimeSlot?.time === slot.time
                                    ? 'border-purple-600 bg-purple-100 text-purple-700'
                                    : slot.available
                                      ? darkMode
                                        ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-purple-500'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                                      : darkMode
                                        ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                              >
                                <div className="font-medium">
                                  {formatTimeSlot(slot.time)}
                                </div>
                                {!slot.available && (
                                  <div className="text-xs mt-1">
                                    {slot.isPast ? 'Past' : 'Booked'}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>

                          {selectedTimeSlot && !loadingWorkerAvailability && (
                            <div className="mt-4">
                              {(() => {
                                const unavailable = cart.items.filter((item) => {
                                  const id = item.subcategory_id || item.id;
                                  const info = serviceAvailability[id];
                                  return info && !info.available;
                                });

                                const allKnown = cart.items.every((item) => {
                                  const id = item.subcategory_id || item.id;
                                  return !!serviceAvailability[id];
                                });

                                if (!allKnown) {
                                  return (
                                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                                      Checking worker availability for selected services...
                                    </p>
                                  );
                                }

                                if (unavailable.length > 0) {
                                  return (
                                    <p className={`${darkMode ? 'text-red-400' : 'text-red-600'} text-sm`}>
                                     Not available for: {unavailable.map((u) => u.name).join(', ')}. Please choose a different time slot.
                                    </p>
                                  );
                                }

                                return (
                                  <p className={`${darkMode ? 'text-green-400' : 'text-green-600'} text-sm`}>
                                    All selected services are available for this time slot.
                                  </p>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {/* Worker Preference Selection */}
                  {selectedTimeSlot && (
                    <div className="mt-8">
                      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Worker Preference
                      </h3>

                      {loadingWorkerAvailability ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                          <span className={`ml-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Checking worker availability...
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setWorkerPreference('any')}
                            disabled={!workerAvailability.any}
                            className={`p-4 rounded-lg border text-center transition-colors ${workerPreference === 'any'
                                ? 'border-purple-600 bg-purple-100 text-purple-700'
                                : workerAvailability.any
                                  ? darkMode
                                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-purple-500'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                                  : darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            <div className="font-medium">Any</div>
                            <div className="text-sm opacity-75">
                              {workerAvailability.any ? 'No preference' : 'Not available'}
                            </div>
                          </button>
                          <button
                            onClick={() => setWorkerPreference('male')}
                            disabled={!workerAvailability.male}
                            className={`p-4 rounded-lg border text-center transition-colors ${workerPreference === 'male'
                                ? 'border-purple-600 bg-purple-100 text-purple-700'
                                : workerAvailability.male
                                  ? darkMode
                                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-purple-500'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                                  : darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            <div className="font-medium">Male</div>
                            <div className="text-sm opacity-75">
                              {workerAvailability.male ? 'Male worker' : 'Not available'}
                            </div>
                          </button>
                          <button
                            onClick={() => setWorkerPreference('female')}
                            disabled={!workerAvailability.female}
                            className={`p-4 rounded-lg border text-center transition-colors ${workerPreference === 'female'
                                ? 'border-purple-600 bg-purple-100 text-purple-700'
                                : workerAvailability.female
                                  ? darkMode
                                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-purple-500'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                                  : darkMode
                                    ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            <div className="font-medium">Female</div>
                            <div className="text-sm opacity-75">
                              {workerAvailability.female ? 'Female worker' : 'Not available'}
                            </div>
                          </button>
                        </div>
                      )}

                      {!loadingWorkerAvailability && !workerAvailability.male && !workerAvailability.female && !workerAvailability.any && (
                        <div className={`text-center py-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                          <p>No workers are available in your area.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment & Confirmation */}
              {currentStep === 'payment' && (
                <div className="p-6">
                  <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Review & Confirm
                  </h2>

                  {/* Booking Summary */}
                  <div className={`border rounded-lg p-4 mb-6 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Booking Details
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-purple-600 mr-3" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {availableDates.find(d => d.date === selectedDate)?.displayDate}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-purple-600 mr-3" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {selectedTimeSlot && formatTimeSlot(selectedTimeSlot.time)}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-purple-600 mr-3 mt-1" />
                        <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className="font-medium">{selectedAddress?.address_label || selectedAddress?.address_type}</div>
                          <div>{selectedAddress?.address}</div>
                          <div>{selectedAddress?.city}, {selectedAddress?.state} - {selectedAddress?.pin_code}</div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <User className="h-5 w-5 text-purple-600 mr-3" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Worker Preference: {workerPreference === 'any' ? 'Any' : workerPreference === 'male' ? 'Male' : 'Female'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Special Instructions (Optional)
                    </label>
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      placeholder="Any special instructions for the service provider..."
                    />
                  </div>

                  {/* Enhanced Payment Method Selection */}
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      Payment Method
                    </h3>

                    {/* Selected Payment Method Display */}
                    <div className="mb-4">
                      <button
                        onClick={() => setShowPaymentMethods(true)}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${darkMode
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          {paymentType === 'pay_after_service' ? (
                            <>
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-semibold">💰</span>
                              </div>
                              <div className="text-left">
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                  Pay After Service
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  Pay cash or card after completion
                                </p>
                              </div>
                            </>
                          ) : selectedPaymentMethod ? (
                            <>
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold">
                                  {selectedPaymentMethod.provider_name.charAt(0)}
                                </span>
                              </div>
                              <div className="text-left">
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                  {selectedPaymentMethod.provider_name}
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  {selectedPaymentMethod.upi_id}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-semibold">💳</span>
                              </div>
                              <div className="text-left">
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                  Select Payment Method
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  Choose how to pay
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        <ChevronRight className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                      </button>
                    </div>

                    {/* Payment Status Display */}
                    {paymentProcessing && (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Processing payment...
                          </span>
                        </div>
                      </div>
                    )}

                    {paymentError && (
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              Payment Failed
                            </span>
                          </div>
                          <button
                            onClick={retryServicePayment}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{paymentError}</p>
                      </div>
                    )}

                    {paymentStatus === 'completed' && (
                      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Payment Completed Successfully
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Service Total Display */}
                  <div className={`p-4 rounded-xl border mb-6 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                        Total Amount
                      </span>
                      <span className="text-2xl font-bold text-purple-600">
                        ₹{calculateTotals().total.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Subtotal
                        </span>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          ₹{calculateTotals().subtotal.toFixed(2)}
                        </span>
                      </div>
                      {calculateTotals().nightChargeTotal > 0 && (
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Night Charges
                          </span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            ₹{calculateTotals().nightChargeTotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {discountInfo.has_discount && (
                        <div className="flex justify-between text-green-600">
                          <span>{discountInfo.customer_type} Discount ({discountInfo.discount_percentage}%)</span>
                          <span>-₹{(calculateTotals().discount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Tax (18%)
                        </span>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          ₹{calculateTotals().tax.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:w-1/3">
            <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border overflow-hidden sticky top-24`}>
              <div className="p-6 border-b border-gray-200">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Order Summary
                </h2>
              </div>

              <div className="p-6">
                {/* Services */}
                <div className="space-y-4 mb-6">
                  {cart.items.map((item, index) => {
                    const slotTime = selectedTimeSlot?.time || null;
                    const nightFee = computeNightFeeForItem(item, slotTime);

                    return (
                      <div key={index} className="flex justify-between">
                        <div>
                          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.name}
                          </h4>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Qty: {item.quantity}
                          </p>
                          {slotTime && nightFee > 0 && (
                            <p className={`text-xs mt-1 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                              Night charge: ₹{nightFee.toFixed(2)} (included)
                            </p>
                          )}
                        </div>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</span>
                    <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{totals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {totals.nightChargeTotal > 0 && (
                    <div className="flex justify-between">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Night Charges
                      </span>
                      <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₹{totals.nightChargeTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {discountInfo.has_discount && (
                    <div className="flex justify-between text-green-600">
                      <span>{discountInfo.customer_type} Discount ({discountInfo.discount_percentage}%)</span>
                      <span>-₹{(totals.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tax (18%)</span>
                    <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{totals.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                    <span className="font-bold text-purple-600">
                      ₹{totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={proceedToNextStep}
                  disabled={
                    isProcessing || (
                      currentStep === 'datetime' && (
                        !selectedDate ||
                        !selectedTimeSlot ||
                        !selectedTimeSlot.available ||
                        loadingWorkerAvailability ||
                        // require at least 1 worker available overall AND matching preference
                        !(workerAvailability.any || workerAvailability.male || workerAvailability.female) ||
                        (workerPreference === 'any'
                          ? !workerAvailability.any
                          : workerPreference === 'male'
                            ? !workerAvailability.male
                            : !workerAvailability.female)
                      )
                    )
                  }
                  className="w-full btn-brand py-3"
                >
                  {isProcessing ? 'Processing...' :
                    currentStep === 'datetime' ? 'Continue' :
                      currentStep === 'address' ? 'Continue' :
                        'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Modal */}
      {showPaymentMethods && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'
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

            {/* Pay After Service Option */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setPaymentType('pay_after_service');
                  setSelectedPaymentMethod(null);
                  setShowPaymentMethods(false);
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${paymentType === 'pay_after_service'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                    : darkMode
                      ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">💰</span>
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      Pay After Service
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      Pay cash or card after completion
                    </p>
                  </div>
                </div>
                {paymentType === 'pay_after_service' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </button>
            </div>

            {/* UPI Payment Methods */}
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setPaymentType('upi');
                    setSelectedPaymentMethod(method);
                    setShowPaymentMethods(false);
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${paymentType === 'upi' && selectedPaymentMethod?.id === method.id
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
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                        {method.provider_name}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {method.upi_id}
                      </p>
                      {method.is_default && (
                        <span className="text-xs text-purple-600 font-medium">Default</span>
                      )}
                    </div>
                  </div>
                  {paymentType === 'upi' && selectedPaymentMethod?.id === method.id && (
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
          <div className={`rounded-2xl p-6 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'
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
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                UPI ID
              </label>
              <input
                type="text"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="example@paytm"
                className={`w-full p-3 rounded-lg border transition-colors focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
              />
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'
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
                onClick={addServicePaymentMethod}
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

export default Booking; 