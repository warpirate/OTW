import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Wrench, Sparkles, MapPin, Star, ArrowLeft } from 'lucide-react';
import { LandingPageService } from '../services/landing_page.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ categories: [], subcategories: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Listen for theme changes
  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    return cleanup;
  }, []);

  // Get search query from URL params
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await LandingPageService.searchServices(query.trim());
      setSearchResults(results || { categories: [], subcategories: [] });
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
      setSearchResults({ categories: [], subcategories: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/category/${category.id}/${category.name}`);
  };

  const handleSubcategoryClick = (subcategory) => {
    navigate(`/category/${subcategory.category_id}/${subcategory.category_name}`);
  };

  const totalResults = searchResults.categories.length + searchResults.subcategories.length;
  const currentQuery = searchParams.get('q') || '';

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode 
        ? 'bg-gray-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="container-custom py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">Search Results</h1>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleNewSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-3 rounded-lg text-sm w-full border focus:outline-none focus:ring-2 focus:ring-brand ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
            </div>
            <button
              type="submit"
              className="btn-accent py-3 px-6 rounded-xl"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Results Content */}
      <div className="container-custom py-6">
        {currentQuery && (
          <div className="mb-6">
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isLoading ? (
                'Searching...'
              ) : (
                <>
                  {totalResults > 0 ? (
                    <>
                      Found <span className="font-semibold text-brand">{totalResults}</span> results for 
                      <span className="font-semibold ml-1">"{currentQuery}"</span>
                    </>
                  ) : (
                    <>
                      No results found for <span className="font-semibold">"{currentQuery}"</span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`text-center py-12 ${
            darkMode ? 'text-red-400' : 'text-red-600'
          }`}>
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && totalResults > 0 && (
          <div className="space-y-6">
            {/* Categories */}
            {searchResults.categories.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-brand" />
                  Categories ({searchResults.categories.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.categories.map((category) => (
                    <div
                      key={`category-${category.id}`}
                      onClick={() => handleCategoryClick(category)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-brand' 
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-brand/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-brand/10 dark:bg-brand/30 rounded-lg">
                          <Wrench className="h-5 w-5 text-brand" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                          {category.description && (
                            <p className={`text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {category.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand dark:bg-brand/30 dark:text-brand-light">
                              Category
                            </span>
                            {category.subcategory_count && (
                              <span className={`text-xs ${
                                darkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {category.subcategory_count} services
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subcategories */}
            {searchResults.subcategories.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Services ({searchResults.subcategories.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.subcategories.map((subcategory) => (
                    <div
                      key={`subcategory-${subcategory.id}`}
                      onClick={() => handleSubcategoryClick(subcategory)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-accent' 
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-accent/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent/10 dark:bg-accent/30 rounded-lg">
                          <Sparkles className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{subcategory.name}</h3>
                          <p className={`text-sm mb-2 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {subcategory.category_name}
                          </p>
                          {subcategory.description && (
                            <p className={`text-sm mb-2 ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {subcategory.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent dark:bg-accent/30 dark:text-accent-light">
                              Service
                            </span>
                            {subcategory.base_price && (
                              <span className="text-xs font-medium text-accent">
                                Starting ₹{subcategory.base_price}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && totalResults === 0 && currentQuery && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-brand/50" />
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              We couldn't find any services matching "{currentQuery}". Try different keywords or browse our categories.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-accent py-3 px-6 rounded-xl"
            >
              Browse All Services
            </button>
          </div>
        )}

        {/* Empty State (no search query) */}
        {!currentQuery && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-brand/50" />
            <h3 className="text-xl font-semibold mb-2">Search for Services</h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter a search term to find the services you need.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
