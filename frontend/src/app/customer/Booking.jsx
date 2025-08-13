import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Plus, Edit2, Trash2, 
  CheckCircle, Home, Briefcase, Star, User, Phone, Mail,
  CreditCard, Building
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import BookingService from '../services/booking.service';
import { useCart } from '../contexts/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart, loading: cartLoading } = useCart();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  
  // Booking flow steps
  const [currentStep, setCurrentStep] = useState('datetime'); // 'datetime', 'address', 'payment', 'confirmation'
  
  // DateTime selection
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
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
      const dates = BookingService.utils.getAvailableDates(14, false);
      setAvailableDates(dates);
    }

    // Load customer addresses
    loadAddresses();
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
  
  // Load time slots for selected date
  const loadTimeSlots = async (date) => {
    setLoadingSlots(true);
    try {
      // Get first subcategory for slot availability check
      const firstItem = cart.items[0];
      const subcategoryId = firstItem?.subcategory_id || firstItem?.id;
      
      const data = await BookingService.timeSlots.getAvailable(date, subcategoryId);
      setTimeSlots(data.slots || []);
    } catch (error) {
      console.error('Error loading time slots:', error);
      toast.error('Failed to load time slots');
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };
  
  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    loadTimeSlots(date);
  };
  
  // Handle time slot selection
  const handleTimeSlotSelect = (slot) => {
    if (slot.available) {
      setSelectedTimeSlot(slot);
    }
  };
  
  // Handle address form input
  const handleAddressInput = (field, value) => {
    setNewAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Geocode address to get latitude and longitude
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
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('Geocoding API error:', response.statusText);
          continue;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          latitude = parseFloat(data[0].lat);
          longitude = parseFloat(data[0].lon);
          break;
        }
      }
      
      if (!latitude || !longitude) {
        console.warn('Could not determine precise location from address, using default coordinates');
        // Return default coordinates (center of India) if geocoding fails
        return { 
          location_lat: 0.0000, 
          location_lng: 0.0000 
        };
      }
      
      return { 
        location_lat: latitude, 
        location_lng: longitude 
      };
    } catch (error) {
      console.error('Error in geocoding:', error);
      // Return default coordinates (center of India) in case of error
      return { 
        location_lat: 0.0000, 
        location_lng: 0.0000 
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
    if (currentStep === 'datetime') {
      if (!selectedDate || !selectedTimeSlot) {
        toast.error('Please select date and time');
        return;
      }
      setCurrentStep('address');
    } else if (currentStep === 'address') {
      if (!selectedAddress) {
        toast.error('Please select an address');
        return;
      }
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      handleCreateBooking();
    }
  };
  
  // Go back to previous step
  const goToPreviousStep = () => {
    if (currentStep === 'address') {
      setCurrentStep('datetime');
    } else if (currentStep === 'payment') {
      setCurrentStep('address');
    } else {
      navigate('/cart');
    }
  };
  
  // Create booking
// Create booking
const handleCreateBooking = async () => {
  setIsProcessing(true);

  try {
    // Convert local date & time to UTC string
    const localDate = new Date(`${selectedDate}T${selectedTimeSlot.time}:00`);
    const scheduledUTC = localDate
      .toISOString() // Gives UTC automatically
      .slice(0, 19)  // Keep YYYY-MM-DD HH:mm:ss format
      .replace('T', ' ');

    // Prepare booking data
    const bookingData = {
      cart_items: cart.items.map(item => ({
        subcategory_id: item.subcategory_id || item.id,
        quantity: item.quantity,
        price: item.price
      })),
      scheduled_time: scheduledUTC,  // UTC datetime
      address_id: selectedAddress.address_id,
      notes: bookingNotes,
      payment_method: 'online'
    };

    // Send to backend
    const result = await BookingService.bookings.create(bookingData);

    // Clear cart
    await clearCart();

    // Show success and redirect
    toast.success('Booking created successfully!');
    navigate('/booking-success', { 
      state: { 
        bookingIds: result.booking_ids,
        totalAmount: result.total_amount 
      } 
    });

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
  
  // Calculate total amount
  const calculateTotal = () => {
    const subtotal = cart.total;
    const serviceFee = subtotal * 0.05;
    const tax = subtotal * 0.18;
    return {
      subtotal,
      serviceFee,
      tax,
      total: subtotal + serviceFee + tax
    };
  };
  const totals = calculateTotal();

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
            <div className={`flex items-center ${currentStep === 'datetime' ? 'text-purple-600' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Calendar className="h-5 w-5 mr-2" />
              <span className="font-medium">Date & Time</span>
            </div>
            <div className={`w-8 h-px ${currentStep === 'address' || currentStep === 'payment' ? 'bg-purple-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep === 'address' ? 'text-purple-600' : (currentStep === 'payment' ? 'text-green-600' : darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
              <MapPin className="h-5 w-5 mr-2" />
              <span className="font-medium">Address</span>
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
              {/* Date & Time Selection */}
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
                                {BookingService.utils.formatTime(slot.time)}
                              </div>
                              {!slot.available && (
                                <div className="text-xs mt-1">Booked</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                          {selectedTimeSlot && BookingService.utils.formatTime(selectedTimeSlot.time)}
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
                  
                  {/* Payment Method */}
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Payment Method
                    </h3>
                    <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 text-purple-600 mr-3" />
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Pay Online (Secure Payment)
                        </span>
                      </div>
                      <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Payment will be collected after service completion
                      </p>
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
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Service Fee</span>
                    <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{totals.serviceFee.toFixed(2)}
                    </span>
                  </div>
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
      
      <Footer />
    </div>
  );
};

export default Booking; 