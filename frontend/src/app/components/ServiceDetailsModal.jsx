import React, { useEffect } from 'react';
import { X, ShoppingCart, Star, Clock, Shield, CheckCircle } from 'lucide-react';
import { isDarkMode } from '../utils/themeUtils';
import S3Image from './S3Image';
import { getServiceImageSrc } from '../utils/infographicMap';

const ServiceDetailsModal = ({ 
  isOpen, 
  onClose, 
  service, 
  categoryName, 
  onAddToCart, 
  isAddingToCart = false,
  darkMode = isDarkMode()
}) => {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !service) return null;

  const features = [
    { icon: Shield, text: 'Verified Professionals' },
    { icon: Clock, text: 'On-time Service' },
    { icon: CheckCircle, text: 'Quality Guaranteed' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl transform transition-all duration-300 animate-slideUp ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
          }`}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Content */}
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
          {/* Image Section */}
          <div className={`flex-shrink-0 lg:w-1/2 h-64 lg:h-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} relative overflow-hidden`}>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
            
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <S3Image
                type="subcategory"
                id={service.id}
                fallbackSrc={getServiceImageSrc(service, undefined, categoryName)}
                alt={`${service.name} service`}
                size="4xl"
                tone="brand"
                className="w-full h-full max-w-80 max-h-80 object-contain"
              />
            </div>

            {/* Rating Badge */}
            <div className={`absolute top-4 left-4 flex items-center px-3 py-1.5 rounded-full ${
              darkMode ? 'bg-gray-800/90' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {(4 + Math.random()).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              {/* Service Title */}
              <h2 className={`text-2xl lg:text-3xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {service.name}
              </h2>

              {/* Category Badge */}
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  darkMode 
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-700' 
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}>
                  {categoryName}
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                {/* <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Starting from</span> */}
                <div className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  ₹{service.base_price || Math.floor(Math.random() * 5000) + 1000}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Service Description
                </h3>
                <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {service.description || `Professional ${service.name} services delivered by experienced and verified professionals. We ensure high-quality work with attention to detail and customer satisfaction. Our team uses modern tools and techniques to provide efficient and reliable service.`}
                </p>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Why Choose Us
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {features.map((feature, index) => (
                    <div 
                      key={index}
                      className={`flex items-center p-3 rounded-lg ${
                        darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                      }`}
                    >
                      <feature.icon className={`h-5 w-5 mr-3 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-blue-50'} mb-6`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-800'}`}>
                  <strong>Note:</strong> Final pricing may vary based on specific requirements and location. 
                  Our team will provide a detailed quote after assessing your needs.
                </p>
              </div>
            </div>

            {/* Action Buttons - Compact Footer */}
            <div className={`border-t p-3 sm:p-4 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600' 
                      : 'bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300'
                  }`}
                >
                  Close
                </button>
                <button
                  onClick={() => onAddToCart(service)}
                  disabled={isAddingToCart}
                  className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isAddingToCart 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 active:scale-95'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>
                    {isAddingToCart ? 'Adding...' : 'Add Request'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ServiceDetailsModal;
