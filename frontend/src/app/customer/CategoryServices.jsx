import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LandingPageService } from '../services/landing_page.service';
import { ArrowLeft, Star, ChevronRight, Wrench, Hammer, Wind, Droplets, Bug, Sparkles, ShoppingCart } from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import { useCart } from '../contexts/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

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
          {categoryName} Services
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
          <div className="grid grid-cols-1 gap-6">
            {subcategories.map((service) => (
              <div 
                key={service.id}
                className={`card ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-4">
                      <div className={`rounded-full p-3 ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
                        <IconComponent className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {service.name}
                        </h3>
                        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {service.description || `Professional ${service.name} services`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="ml-1 text-sm font-medium">{(4 + Math.random()).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="font-semibold text-purple-600">{`Starting ₹${service.base_price || Math.floor(Math.random() * 5000) + 1000}`}</span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAddToCart(service)}
                        disabled={addingToCart[service.id]}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>{addingToCart[service.id] ? 'Adding...' : 'Add to Cart'}</span>
                      </button>
                      <button className="btn-brand px-4 py-2 text-sm">
                        Book
                      </button>
                    </div>
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