import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LandingPageService } from '../services/landing_page.service';
import { ArrowLeft, Star, ChevronRight, Wrench, Hammer, Wind, Droplets, Bug, Sparkles, ShoppingCart } from 'lucide-react';
import { getCategoryImageSrc, getServiceImageSrc } from '../utils/infographicMap';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import { useCart } from '../contexts/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import InfographicIcon from '../../components/InfographicIcon';

const CategoryServices = () => {
  const { categoryId, categoryName } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [addingToCart, setAddingToCart] = useState({});

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

  const IconComponent = getCategoryIcon(categoryName);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Use the Header component */}
      <Header />

      <div className="container-custom section-padding">
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
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {subcategories.map((service) => (
              <div 
                key={service.id}
                className={`card ${darkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'} transition transform hover:shadow-lg hover:-translate-y-0.5`}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Text block */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base sm:text-lg leading-snug ${darkMode ? 'text-white' : 'text-gray-900'} break-words`}>
                        {service.name}
                      </h3>
                      <div className="mt-1 flex items-center text-gray-600 dark:text-gray-300">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className={`ml-1 text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{(4 + Math.random()).toFixed(1)}</span>
                      </div>
                      <p className={`mt-2 text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} break-words`}> 
                        {service.description || `Professional ${service.name} services`}
                      </p>
                    </div>

                    {/* Icon on the right */}
                    <div className="shrink-0 ml-2">
                      <InfographicIcon src={getServiceImageSrc(service, undefined, categoryName)} alt={`${service.name} icon`} size="xl" tone="brand" />
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 flex items-center justify-between">
                    <span className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{`₹${service.base_price || Math.floor(Math.random() * 5000) + 1000}`}</span>
                    <button 
                      onClick={() => handleAddToCart(service)}
                      disabled={addingToCart[service.id]}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${darkMode ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-700' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span className="text-sm sm:text-base">{addingToCart[service.id] ? 'Adding...' : 'Add Request'}</span>
                    </button>
                  </div>
                </div>
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
    </div>
  );
};

export default CategoryServices; 