import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { isDarkMode } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const orderNumber = `OMW-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      <div className="container-custom py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>
          
          <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Order Placed Successfully!
          </h1>
          
          <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Thank you for your order. Your service booking has been confirmed.
          </p>
          
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-8`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Order Details
            </h2>
            
            <div className="flex justify-between mb-2">
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Order Number:</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{orderNumber}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date:</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {new Date().toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
              <span className="font-medium text-green-500">Confirmed</span>
            </div>
          </div>
          
          <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            We've sent a confirmation email with all the details of your order.
            Our service provider will contact you shortly to confirm the appointment.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="btn-brand flex items-center justify-center space-x-2 px-8 py-3"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default CheckoutSuccess; 