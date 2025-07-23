import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Calendar, Clock, MapPin } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { isDarkMode } from '../utils/themeUtils';
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
    
    try {
      setIsProcessing(true);
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        toast.error('Please login to continue with booking');
        navigate('/login');
        return;
      }
      
      // Check if cart has items
      if (!cart.items || cart.items.length === 0) {
        toast.error('Your cart is empty');
        return;
      }
      
      // Redirect to booking flow
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
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
              <div className="p-6 border-b border-gray-200">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Your Cart ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})
                </h1>
              </div>
              
              {/* Cart Items */}
              <div className="divide-y divide-gray-200">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center">
                    {/* Service Icon/Image */}
                    <div className={`rounded-lg p-4 mb-4 sm:mb-0 sm:mr-6 ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
                      <div className="h-12 w-12 text-purple-600">
                        {item.icon ? (
                          <img src={item.icon} alt={item.name} className="h-full w-full object-contain" />
                        ) : (
                          <ShoppingBag className="h-full w-full" />
                        )}
                      </div>
                    </div>
                    
                    {/* Service Details */}
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.name}
                      </h3>
                      <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.description || 'Professional service'}
                      </p>
                      
                      {/* Service Price */}
                      <div className="flex flex-wrap items-center justify-between mt-2">
                        <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                          <div className="flex items-center border rounded-lg">
                            <button 
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className={`p-2 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className={`px-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className={`p-2 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className={`p-2 rounded-full ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-500 hover:bg-gray-100'}`}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="font-semibold text-purple-600">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Cart Actions */}
              <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                <button 
                  onClick={handleClearCart}
                  className={`px-4 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
          
          {/* Order Summary Section */}
          <div className="lg:w-1/3">
            <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border overflow-hidden sticky top-24`}>
              <div className="p-6 border-b border-gray-200">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Order Summary
                </h2>
              </div>
              
              <div className="p-6">
                {/* Summary Items */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{cart.total.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Service Fee</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{(cart.total * 0.05).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tax</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{(cart.total * 0.18).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 flex justify-between">
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                    <span className="font-bold text-purple-600">
                      ₹{(cart.total + (cart.total * 0.05) + (cart.total * 0.18)).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Checkout Button */}
                <button 
                  onClick={handleCheckout}
                  className="w-full btn-brand py-3"
                  disabled={isProcessing || cart.items.length === 0}
                >
                  {isProcessing ? 'Processing...' : 'Book Now'}
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