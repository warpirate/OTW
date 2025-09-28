import React, { useState, useEffect } from 'react';
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
    any: true
  });
  const [loadingWorkerAvailability, setLoadingWorkerAvailability] = useState(false);
  
  // Address management
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
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
  
  // Discount state
  const [discountInfo, setDiscountInfo] = useState({
    has_discount: false,
    discount_percentage: 0,
    customer_type: 'Normal'
  });
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  
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
  
  // Calculate totals with discount (matching backend logic)
  const calculateTotals = () => {
    if (!cart || !cart.items) return { subtotal: 0, discount: 0, tax: 0, total: 0 };
    
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Ensure discountInfo is properly loaded before calculating discount
    const discount = (discountInfo && discountInfo.has_discount) ? subtotal * (discountInfo.discount_percentage / 100) : 0;
    const discountedSubtotal = subtotal - discount;
    const tax = discountedSubtotal * 0.18; // 18% GST on discounted amount (matching backend)
    const total = discountedSubtotal + tax;
    
    return { subtotal, discount, tax, total };
  };
  
  // Generate available dates for booking
  const generateAvailableDates = (daysCount = 14) => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Format date as YYYY-MM-DD for consistent usage
      const dateString = date.toISOString().split('T')[0];
      
      dates.push({
        date: dateString,
        displayDate: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        shortDate: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }
    
    return dates;
  };

  // Generate time slots with frontend calculations
  const generateTimeSlots = (date) => {
    const slots = [];
    const now = new Date();
    const selectedDateObj = new Date(`${date}T00:00:00`);
    const isToday = selectedDateObj.toDateString() === now.toDateString();
    
    // Generate slots from 9 AM to 6 PM (every 30 minutes)
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip 6:30 PM slot
        if (hour === 18 && minute === 30) break;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDateTime = new Date(`${date}T${timeString}:00`);
        
        // Check if slot is in the past (for today only) - add 30 minute buffer
        const isPast = isToday && slotDateTime <= new Date(now.getTime() + 30 * 60000);
        
        slots.push({
          time: timeString,
          available: !isPast,
          isPast: isPast
        });
      }
    }
    
    return slots;
  };

  // Load time slots for selected date (frontend calculation)
  const loadTimeSlots = (date) => {
    setLoadingSlots(true);
    
    // Simulate brief loading for better UX
    setTimeout(() => {
      const slots = generateTimeSlots(date);
      setTimeSlots(slots);
      setLoadingSlots(false);
    }, 300);
  };

  // Check worker availability for selected time slot
  const checkWorkerAvailability = async (date, timeSlot) => {
    if (!selectedAddress || !date || !timeSlot) {
      return;
    }

    setLoadingWorkerAvailability(true);
    try {
      // Call backend API to check worker availability
      const availabilityData = await BookingService.checkWorkerAvailability({
        date: date,
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
        toast.warn(availabilityData.reason || 'Selected time slot is not available. Please pick another slot.');
        return;
      }

      setWorkerAvailability({
        male: availabilityData.male_available || false,
        female: availabilityData.female_available || false,
        any: availabilityData.any_available || true
      });

      // Reset preference if current preference is not available
      if (workerPreference === 'male' && !availabilityData.male_available) {
        setWorkerPreference('any');
      } else if (workerPreference === 'female' && !availabilityData.female_available) {
        setWorkerPreference('any');
      }

    } catch (error) {
      console.error('Error checking worker availability:', error);
      toast.error('Failed to check worker availability');
      // Set default availability
      setWorkerAvailability({
        male: true,
        female: true,
        any: true
      });
    } finally {
      setLoadingWorkerAvailability(false);
    }
  };
  
  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setWorkerPreference('any');
    setWorkerAvailability({
      male: false,
      female: false,
      any: true
    });
    loadTimeSlots(date);
  };
  
  // Handle time slot selection
  const handleTimeSlotSelect = (slot) => {
    if (slot.available) {
      setSelectedTimeSlot(slot);
      // Check worker availability for this time slot
      checkWorkerAvailability(selectedDate, slot.time);
    }
  };
  
  // Handle address form input
  const handleAddressInput = (field, value) => {
    setNewAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Geocode address using Google Maps API to get latitude and longitude
  const geocodeAddress = async (addressData) => {
    try {
      const { address, city, state, country } = addressData;
      
      // Try different address combinations in order of specificity
      const addressCombinations = [
        `${address}, ${city}, ${state}, ${country}`,
        `${city}, ${state}, ${country}`,
        `${state}, ${country}`
      ];
      
      let latitude = null;
      let longitude = null;
      
      for (const addr of addressCombinations) {
        // Get Google Maps API key from environment
        const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
        
        if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
          console.warn('Google Maps API key not configured');
          continue;
        }
        
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('Geocoding API error:', response.statusText);
          continue;
        }
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          latitude = location.lat;
          longitude = location.lng;
          console.log('Google Maps geocoding successful:', {
            address: addr,
            coordinates: { lat: latitude, lng: longitude },
            formatted_address: data.results[0].formatted_address
          });
          break;
        } else if (data.status !== 'OK') {
          console.warn('Google Maps geocoding failed for address:', addr, 'Status:', data.status, data.error_message);
        }
      }
      
      if (!latitude || !longitude) {
        console.warn('Could not determine precise location from address, using default coordinates for India');
        // Return default coordinates (center of India) if geocoding fails
        return { 
          location_lat: 20.5937, 
          location_lng: 78.9629 
        };
      }
      
      return { 
        location_lat: latitude, 
        location_lng: longitude 
      };
    } catch (error) {
      console.error('Error in Google Maps geocoding:', error);
      // Return default coordinates (center of India) in case of error
      return { 
        location_lat: 20.5937, 
        location_lng: 78.9629 
      };
    }
  };

  // Add new address
  const handleAddAddress = async () => {
    try {
      const validation = BookingService.utils.validateAddress(newAddress);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        toast.error(errorMessages);
        return;
      }
      
      // Get coordinates before saving
      const coordinates = await geocodeAddress(newAddress);
      
      // Create address object with coordinates
      const addressWithCoords = {
        ...newAddress,
        ...coordinates
      };
      
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
      
      // Select the new address
      if (result.address) {
        setSelectedAddress(result.address);
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
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
    } else if (currentStep === 'datetime') {
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
      // Ensure preferred worker gender is available for this slot
      const avail = workerAvailability;
      const ok = workerPreference === 'any'
        ? !!avail.any
        : workerPreference === 'male'
          ? !!avail.male
          : !!avail.female;
      if (!ok) {
        toast.error('Selected worker preference is not available for this time slot. Please adjust preference or pick another time.');
        return;
      }
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
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

  // Validate selected time is not in the past
  const validateSelectedTime = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select date and time');
      return false;
    }
    
    const now = new Date();
    const selectedDateTime = new Date(`${selectedDate}T${selectedTimeSlot.time}:00`);
    
    // Check if the constructed date is valid
    if (isNaN(selectedDateTime.getTime())) {
      console.error('Invalid selected date/time:', selectedDate, selectedTimeSlot.time);
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
         const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_1234567890';
         
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
           handler: (response) => {
             // Payment successful callback
             console.log('Razorpay payment successful:', response);
             setPaymentStatus('completed');
             toast.success('Payment completed successfully!');
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

      const scheduledAt = buildUTCMySQLDateTime(selectedDate, selectedTimeSlot.time);
      const totals = calculateTotals();

      // Prepare booking data
      const bookingData = {
        cart_items: cart.items.map(item => ({
          subcategory_id: item.subcategory_id || item.id,
          quantity: item.quantity,
          price: item.price
        })),
        scheduled_time: scheduledAt,
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
        
        const scheduledLocalDate = new Date(`${selectedDate}T${selectedTimeSlot.time}:00`);
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
          scheduled_date: new Date(`${selectedDate}T${selectedTimeSlot.time}:00`).toISOString()
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
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              selectedAddress?.address_id === address.address_id
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
                                    // Edit functionality can be added here
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
                      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Add New Address
                      </h3>
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
                            className={`w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${darkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                            placeholder="123456"
                          />
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
                          onClick={handleAddAddress}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Add Address
                        </button>
                        <button
                          onClick={() => setShowAddressForm(false)}
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
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            selectedDate === dateOption.date
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
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {timeSlots.map((slot, index) => (
                            <button
                              key={index}
                              onClick={() => handleTimeSlotSelect(slot)}
                              disabled={!slot.available}
                              className={`p-3 rounded-lg border text-center transition-colors ${
                                selectedTimeSlot?.time === slot.time
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
                            className={`p-4 rounded-lg border text-center transition-colors ${
                              workerPreference === 'any'
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
                            className={`p-4 rounded-lg border text-center transition-colors ${
                              workerPreference === 'male'
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
                            className={`p-4 rounded-lg border text-center transition-colors ${
                              workerPreference === 'female'
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
                          <p>No workers available for this time slot. Please select a different time.</p>
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
                    <h3 className={`text-lg font-semibold mb-4 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Payment Method
                    </h3>
                    
                    {/* Selected Payment Method Display */}
                    <div className="mb-4">
                      <button
                        onClick={() => setShowPaymentMethods(true)}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                          darkMode
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
                                <p className={`font-medium ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  Pay After Service
                                </p>
                                <p className={`text-sm ${
                                  darkMode ? 'text-gray-400' : 'text-gray-600'
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
                                <p className={`font-medium ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {selectedPaymentMethod.provider_name}
                                </p>
                                <p className={`text-sm ${
                                  darkMode ? 'text-gray-400' : 'text-gray-600'
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
                                <p className={`font-medium ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  Select Payment Method
                                </p>
                                <p className={`text-sm ${
                                  darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Choose how to pay
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        <ChevronRight className={`h-5 w-5 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
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
                  <div className={`p-4 rounded-xl border mb-6 ${
                    darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-lg font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
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
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Price Breakdown */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</span>
                    <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{totals.subtotal.toFixed(2)}
                    </span>
                  </div>
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
                  disabled={isProcessing}
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

            {/* Pay After Service Option */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setPaymentType('pay_after_service');
                  setSelectedPaymentMethod(null);
                  setShowPaymentMethods(false);
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                  paymentType === 'pay_after_service'
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
                    <p className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Pay After Service
                    </p>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
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
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                    paymentType === 'upi' && selectedPaymentMethod?.id === method.id
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