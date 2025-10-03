import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LandingPageService } from '../services/landing_page.service';
import { ArrowLeft, Star, ChevronRight, Wrench, Hammer, Wind, Droplets, Bug, Sparkles, ShoppingCart, Eye } from 'lucide-react';
import { getCategoryImageSrc, getServiceImageSrc } from '../utils/infographicMap';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import { useCart } from '../contexts/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import InfographicIcon from '../../components/InfographicIcon';
import S3Image from '../components/S3Image';
import ServiceDetailsModal from '../components/ServiceDetailsModal';

const CategoryServices = () => {
  const { categoryId, categoryName } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [addingToCart, setAddingToCart] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get the appropriate icon based on category name
  const getCategoryIcon = (categoryName) => {
    const name = categoryName ? categoryName.toLowerCase() : '';
    
    if (name.includes('carpenter')) return Hammer;
    if (name.includes('ac') || name.includes('air')) return Wind;
    if (name.includes('plumb')) return Droplets;
    if (name.includes('pest') || name.includes('bug')) return Bug;
    if (name.includes('clean') || name.includes('maid')) return Sparkles;
    
    // Default icon
    return Wrench;
  };

  // Listen for theme changes
  useEffect(() => {
    setDarkMode(isDarkMode());
    
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    
    return cleanup;
  }, []);

  // Fetch subcategories for the selected category
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        setLoading(true);
        const data = await LandingPageService.getAllSubCategories(categoryId);
        setSubcategories(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching subcategories:', err);
        setError('Failed to load services. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchSubcategories();
    }
  }, [categoryId]);

  const handleBackClick = () => {
    navigate('/');
  };

  const handleAddToCart = async (service) => {
    try {
      setAddingToCart(prev => ({ ...prev, [service.id]: true }));
      
      // Create a cart item from the service
      const cartItem = {
        id: service.id,
        name: service.name,
        description: service.description || `Professional ${service.name} service`,
        price: service.base_price || Math.floor(Math.random() * 5000) + 1000, // Use base_price or generate a random price
        quantity: 1,
        category_id: categoryId,
        category_name: categoryName
      };
      
      await addItem(cartItem);
      
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(prev => ({ ...prev, [service.id]: false }));
    }
  };

  const handleViewDetails = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  const handleModalAddToCart = async (service) => {
    await handleAddToCart(service);
    // Optionally close modal after adding to cart
    // handleCloseModal();
  };

  const IconComponent = getCategoryIcon(categoryName);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Use the Header component */}
      <Header />

      <div className="container-custom pt-4 pb-8 sm:pt-8 sm:pb-16 md:pt-12 md:pb-24">
        {/* Back Button */}
        <button 
          onClick={handleBackClick}
          className={`flex items-center mb-6 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-purple-600'}`}
        >
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Categories
        </button>

        {/* Category Title */}
        <h1 className={`heading-secondary mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {categoryName}
        </h1>

        {/* Services List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className={`${darkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md"
            >
              Retry
            </button>
          </div>
        ) : subcategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {subcategories.map((service) => (
              <div 
                key={service.id}
                onClick={() => handleViewDetails(service)}
                className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 w-full`}
              >
                {/* Image Section - Top */}
                <div className={`relative h-40 sm:h-48 ${darkMode ? 'bg-black' : 'bg-white'} flex items-center justify-center overflow-hidden`}>
                  {/* Gradient overlay for better image visibility */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
                  
                  <S3Image
                    type="subcategory"
                    id={service.id}
                    fallbackSrc={getServiceImageSrc(service, undefined, categoryName)}
                    alt={`${service.name} icon`}
                    size="4xl"
                    tone="brand"
                    className="relative z-10 w-32 h-32 sm:w-44 sm:h-44 md:w-48 md:h-48 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                  
                  {/* Rating badge - Top right */}
                  {/* <div className={`absolute top-3 right-3 flex items-center px-2 py-1 rounded-full ${darkMode ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-sm`}>
                    <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {(4 + Math.random()).toFixed(1)}
                    </span>
                  </div> */}
                </div>

                {/* Content Section - Bottom */}
                <div className="p-4 sm:p-6">
                  {/* Service Name */}
                  <h3 className={`font-bold text-base sm:text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-900'} group-hover:text-purple-600 transition-colors line-clamp-2`}>
                    {service.name}
                  </h3>
                  
                  {/* Description */}
                  <p className={`text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {service.description || `Professional ${service.name} services`}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <div className={`font-bold text-lg sm:text-xl ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      ₹{service.base_price || Math.floor(Math.random() * 5000) + 1000}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(service);
                      }}
                      className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-1 ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600' 
                          : 'bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 shadow-sm'
                      } transform hover:scale-105 active:scale-95`}
                    >
                      <Eye className="h-3 w-3" />
                      <span>View Details</span>
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(service);
                      }}
                      disabled={addingToCart[service.id]}
                      className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-1 ${
                        addingToCart[service.id] 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : darkMode 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
                      } transform hover:scale-105 active:scale-95`}
                    >
                      <ShoppingCart className="h-3 w-3" />
                      <span>
                        {addingToCart[service.id] ? 'Adding...' : 'Add Request'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              No services available for this category.
            </p>
          </div>
        )}
      </div>

      {/* Add Footer component */}
      <Footer />

      {/* Service Details Modal */}
      <ServiceDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        service={selectedService}
        categoryName={categoryName}
        onAddToCart={handleModalAddToCart}
        isAddingToCart={selectedService ? addingToCart[selectedService.id] : false}
        darkMode={darkMode}
      />
    </div>
  );
};

export default CategoryServices; 