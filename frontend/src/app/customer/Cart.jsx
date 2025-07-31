import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Calendar, Clock, MapPin } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';

const Cart = () => {

  const navigate = useNavigate();
  const { cart, loading, error, updateItemQuantity, removeItem, clearCart, checkout } = useCart();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'details', 'payment', 'confirmation'
  const [checkoutData, setCheckoutData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Listen for theme changes
  useEffect(() => {
    // Update dark mode state when theme changes
    const removeListener = addThemeListener(() => {
      setDarkMode(isDarkMode());
    });
    
    return () => {
      // Clean up listener on component unmount
      removeListener();
    };
  }, []);

  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        // Specifically check for customer role authentication
        if (AuthService.isLoggedIn('customer')) {
          const userData = AuthService.getCurrentUser('customer');
          if (userData) {
            setIsAuthenticated(true);
            setUser(userData);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else if (isAuthenticated) {
          // If no customer authentication but state says authenticated, reset state
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    
    // Run authentication check when component mounts
    checkAuthStatus();
    
    // Set up interval to check auth status every 5 seconds (less frequent)
    const authCheckInterval = setInterval(checkAuthStatus, 5000);
    
    return () => {
      clearInterval(authCheckInterval);
    };
  }, [isAuthenticated]); // Only depend on isAuthenticated to prevent unnecessary re-renders
  
  // Handle checkout data change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCheckoutData({
      ...checkoutData,
      [name]: value
    });
  };

  // Handle quantity change
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateItemQuantity(itemId, newQuantity);
  };

  // Handle remove item
  const handleRemoveItem = async (itemId) => {
    await removeItem(itemId);
  };

  // Handle clear cart
  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart();
    }
  };

  // Handle checkout process - redirect to booking flow
  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to continue with booking');
      navigate('/login');
      return;
    }

    if (cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Navigate to booking page with cart data
      navigate('/booking');
      
    } catch (err) {
      toast.error('Failed to proceed to booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty cart view
  if (!loading && cart.items.length === 0) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Header />
        <div className="container-custom py-12">
          <div className="text-center py-16">
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <ShoppingBag className={`h-12 w-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
            </div>
            <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Your cart is empty
            </h1>
            <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Looks like you haven't added any services to your cart yet.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="btn-brand px-8 py-3"
            >
              Browse Services
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Header />
        <div className="container-custom py-12">
          <div className="flex justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Header />
        <div className="container-custom py-12">
          <div className="text-center py-16">
            <p className={`text-xl font-bold mb-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              {error}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-brand px-8 py-3 mt-4"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Cart view (default)
  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header />
      
      <div className="container-custom py-12">
        {/* Breadcrumb */}
        <div className="flex items-center mb-8">
          <button 
            onClick={() => navigate('/')}
            className={`flex items-center ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-purple-600'}`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" /> Continue Shopping
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items Section */}
          <div className="lg:w-2/3">
            <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border overflow-hidden`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Your Cart ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})
                </h1>
              </div>
              
              {/* Cart Items */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.description}
                        </p>
                        <p className={`text-lg font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          ${item.price}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className={`p-2 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className={`w-12 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className={`p-2 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className={`p-2 rounded-full ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-500 hover:bg-gray-100'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Cart Actions */}
              <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleClearCart}
                    className={`text-sm ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'}`}
                  >
                    Clear Cart
                  </button>
                  <div className="text-right">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ${cart.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border overflow-hidden sticky top-24`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Order Summary
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {item.name} x {item.quantity}
                        </p>
                      </div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Total
                      </span>
                      <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${cart.total}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || cart.items.length === 0}
                  className="w-full btn-brand mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Proceed to Booking'}
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

export default Cart; 