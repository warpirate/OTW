import React, { useState, useEffect } from 'react';
import { CategoryService } from '../../services/api.service';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, edit, add
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryMode, setSubcategoryMode] = useState('view');
  const [filters, setFilters] = useState({
    search: '',
  });

  // Fetch categories from API
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch all categories with their subcategories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Get all categories first
      const categoriesData = await CategoryService.getAllCategories();
      
      // Fetch subcategories for each category
      const categoriesWithSubcategories = await Promise.all(
        categoriesData.map(async (category) => {
          try {
            const subcategories = await CategoryService.getAllSubCategories(category.id);
            return {
              ...category,
              subcategories: subcategories || []
            };
          } catch (error) {
            console.error(`Error fetching subcategories for category ${category.id}:`, error);
            // Return the category without subcategories if there's an error
            return {
              ...category,
              subcategories: []
            };
          }
        })
      );
      
      setCategories(categoriesWithSubcategories);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesSearch = filters.search === '' || 
      category.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(filters.search.toLowerCase()));
    return matchesSearch;
  });

  // Handle view category
  const handleViewCategory = async (category) => { // Made async
    console.log("category det: ",category);
    setLoading(true); // Set loading state while fetching subcategories
    try {
      // Fetch the complete category details, including subcategories
      const subCategoryDetails = await CategoryService.getAllSubCategories(category.id);
      console.log("FULL CATE DET", subCategoryDetails);
      setSelectedCategory({
        ...category,
        subcategories: subCategoryDetails
      });
      setModalMode('view');
      setShowModal(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching category details for view:', err);
      setError('Failed to load category details. Please try again.');
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Handle edit category
  const handleEditCategory = async (category) => {
    setLoading(true); // Set loading state while fetching subcategories
    try {
      // Fetch the complete category details, including subcategories for edit mode
      const subCategoryDetails = await CategoryService.getAllSubCategories(category.id);
      setSelectedCategory({
        ...category,
        subcategories: subCategoryDetails
      });
      setModalMode('edit');
      setShowModal(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching category details for edit:', err);
      setError('Failed to load category details. Please try again.');
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Handle add category
  const handleAddCategory = () => {
    setSelectedCategory({
      name: '',
      subcategories : []
    });
    setModalMode('add');
    setShowModal(true);
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setSelectedCategory({
      ...selectedCategory,
      [name]: value
    });
  };

  // Handle save category
  const handleSaveCategory = async () => {
    try {
      setLoading(true);

      if (modalMode === 'add') {
        // Create new category via API
        const newCategory = await CategoryService.createCategory(selectedCategory);
        console.log("New Category dET" , newCategory);
        
        // Ensure we get the complete category with proper ID
        const completeCategory = await CategoryService.getCategoryById(newCategory.id);
        
        // Refresh the categories list immediately
        await fetchCategories();
        
      } else if (modalMode === 'edit') {
        // Update existing category via API
        const updatedCategory = await CategoryService.updateCategory(selectedCategory.id, selectedCategory);
        
        // Refresh the categories list immediately
        await fetchCategories();
      }
      
      setShowModal(false);
      setError(null);
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle view subcategory
  const handleViewSubcategory = async (subcategory) => {
    // fetching subcategories details
    // const subCategories = await CategoryService.getAllSubcategories(selectedCategory.id);
    // console.log("sub category for this thing", )
   
    setSelectedSubcategory(subcategory);
    setSubcategoryMode('view');
    setShowSubcategoryModal(true);
  };

  // Handle edit subcategory
  const handleEditSubcategory = (subcategory) => {
    // Make sure we have the complete subcategory data with category_id
    const subcategoryToEdit = {
      ...subcategory,
      category_id: selectedCategory.id // Ensure category_id is set
    };
    
    setSelectedSubcategory(subcategoryToEdit);
    setSubcategoryMode('edit');
    setShowSubcategoryModal(true);
  };

  // Handle add subcategory
  const handleAddSubcategory = (categoryId) => {
    setSelectedSubcategory({
      name: '',
     
      base_price: 0,
      
      category_id: categoryId
    });
    setSelectedCategory({
      id: categoryId
    })
    setSubcategoryMode('add');
    setShowSubcategoryModal(true);
  };

  // Handle subcategory change
  const handleSubcategoryChange = (e) => {
    const { name, value } = e.target;
    setSelectedSubcategory({
      ...selectedSubcategory,
      [name]: value
    });
  };

  const handleSaveSubcategory = async () => {
    if (!selectedCategory || !selectedCategory.id) {
      setError('No category selected.');
      return;
    }

    const categoryId = selectedCategory.id;
    
    try {
      setLoading(true);

      // Prepare subcategory data with proper category_id
      const subcategoryData = {
        ...selectedSubcategory,
        category_id: categoryId
      };

      // Log the data for debugging
      console.log('Category ID:', categoryId);
      console.log('Subcategory data:', subcategoryData);

      let result;
      if (subcategoryMode === 'add') {
        // Add subcategory via API
        result = await CategoryService.createSubcategory(
          categoryId,
          subcategoryData
        );
        console.log('Created subcategory result:', result);
      } else if (subcategoryMode === 'edit') {
        if (!selectedSubcategory.id) {
          throw new Error('Subcategory ID is missing');
        }
        
        console.log('Updating subcategory ID:', selectedSubcategory.id);
        // Update subcategory via API
        result = await CategoryService.updateSubcategory(
          categoryId,
          selectedSubcategory.id,
          subcategoryData
        );
        console.log('Updated subcategory result:', result);
      }

      // Immediately fetch updated subcategories
      const updatedSubCategories = await CategoryService.getAllSubCategories(categoryId);
      console.log('Updated subcategories list:', updatedSubCategories);
      
      // Update the selected category with new subcategories
      setSelectedCategory(prev => {
        // Keep all original category properties and only update subcategories
        return {
          ...prev,
          subcategories: updatedSubCategories
        };
      });
      
      // Update local categories state without making API calls
      setCategories(prevCategories => {
        return prevCategories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              subcategories: updatedSubCategories
            };
          }
          return cat;
        });
      });

      setShowSubcategoryModal(false);
      setError(null);
    } catch (err) {
      console.error('Error saving subcategory:', err);
      const errorMessage = err.response ? 
        `Failed to save subcategory: ${err.response.data?.message || err.response.statusText}` : 
        'Failed to save subcategory. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (e, categoryId) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent any default behavior
    
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      setLoading(true);
      await CategoryService.deleteCategory(categoryId);
      
      // Refresh the categories list immediately
      await fetchCategories();
      setError(null);
      
      // Close the modal if it's open
      if (showModal) {
        setShowModal(false);
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete subcategory
  const handleDeleteSubcategory = async (e, categoryId, subcategoryId) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent any default behavior
    
    if (!window.confirm('Are you sure you want to delete this subcategory?')) {
      return;
    }

    try {
      setLoading(true);
      await CategoryService.deleteSubcategory(categoryId, subcategoryId);

      // Immediately fetch updated subcategories
      const updatedSubCategories = await CategoryService.getAllSubCategories(categoryId);
      
      // Update the selected category if it's the same one being edited
      if (selectedCategory && selectedCategory.id === categoryId) {
        setSelectedCategory(prev => ({
          ...prev,
          subcategories: updatedSubCategories
        }));
      }
      
      // Also refresh the full categories list to ensure everything is in sync
      await fetchCategories();
      
      setError(null);
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      setError('Failed to delete subcategory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Category Management</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              id="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name or description"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddCategory}
              className="bg-brand text-white py-2 px-4 rounded hover:bg-brand/90 transition flex items-center"
            >
              <i className="fas fa-plus mr-2"></i>Add Category
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategories</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!loading && filteredCategories.map((category) => (
                <tr key={category.id || category._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {Array.isArray(category.subcategories) && category.subcategories.length > 0 
                        ? `${category.subcategories.length} items` 
                        : '0 items'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleViewCategory(category)}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCategory(e, category.id || category._id)}
                      className="text-red-600 hover:text-red-900 px-2 py-1"
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
            <p className="mt-2 text-gray-500">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm">No categories found matching your search</p>
          </div>
        )}
        
        {!loading && filteredCategories.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{filteredCategories.length}</span> of <span className="font-medium">{categories.length}</span> categories
            </div>
            <div className="flex justify-end">
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showModal && selectedCategory && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-3xl w-full mx-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h1 className="text-lg font-medium text-brand">
                  {modalMode === 'add' ? 'Add New Category' :
                   modalMode === 'edit' ? 'Edit Category' : 'Category Details'}
                </h1>
                <button
                  className="text-gray-400 hover:text-brand"
                  onClick={() => setShowModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="py-4">
                {modalMode === 'view' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Category Name</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className={`mt-1 text-sm font-semibold ${selectedCategory.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                        {selectedCategory.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    {selectedCategory.description && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory.description}</p>
                    </div>)}
                     
                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-500">Subcategories</p>
                        <button
                          onClick={() => handleAddSubcategory(selectedCategory.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-white bg-brand hover:bg-brand/90"
                        >
                          <i className="fas fa-plus mr-1"></i> Add Subcategory
                        </button>
                      </div>
                      <div className="mt-2 overflow-hidden border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedCategory.subcategories && selectedCategory.subcategories.length > 0 ? (
                              selectedCategory.subcategories.map((subcategory) => (
                                <tr key={subcategory.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subcategory.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {subcategory.description || <span className="text-gray-400 italic">No description</span>}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{subcategory.base_price}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleViewSubcategory(subcategory)}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleEditSubcategory(subcategory)}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteSubcategory(e, selectedCategory.id, subcategory.id)}
                                        className="text-red-600 hover:text-red-900 px-2 py-1"
                                        disabled={loading}
                                      >
                                        {loading ? 'Deleting...' : 'Delete'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                  No subcategories found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Category Name</label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={selectedCategory.name || ''}
                          onChange={handleCategoryChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      {/* Description removed for Main Category as requested */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isActive"
                            checked={selectedCategory.isActive || false}
                            onChange={(e) => setSelectedCategory({
                              ...selectedCategory,
                              isActive: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                      </div>
                      
                      {/* Add subcategories section for edit mode */}
                      {/* {modalMode === 'edit' && selectedCategory.id && (
                        <div className="mt-6">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-gray-700">Subcategories</p>
                            <button
                              type="button"
                              onClick={() => handleAddSubcategory(selectedCategory.id)}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-white bg-brand hover:bg-brand/90"
                            >
                              <i className="fas fa-plus mr-1"></i> Add Subcategory
                            </button>
                          </div>
                          <div className="mt-2 overflow-hidden border border-gray-200 rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedCategory.subcategories && selectedCategory.subcategories.length > 0 ? (
                                  selectedCategory.subcategories.map((subcategory) => (
                                    <tr key={subcategory.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subcategory.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {subcategory.description || <span className="text-gray-400 italic">No description</span>}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{subcategory.base_price}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleViewSubcategory(subcategory)}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            View
                                          </button>
                                          <button
                                            onClick={() => handleEditSubcategory(subcategory)}
                                            className="text-green-600 hover:text-green-900"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubcategory(selectedCategory.id, subcategory.id)}
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                      No subcategories found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )} */}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 flex justify-end space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={() => setShowModal(false)}
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleSaveCategory}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
          {showSubcategoryModal && selectedSubcategory && (
            <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black opacity-50"></div>
              <div className="relative bg-white rounded-lg max-w-lg w-full mx-auto shadow-xl">
                <div className="p-6">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {subcategoryMode === 'view' ? 'Subcategory Details' :
                      subcategoryMode === 'edit' ? 'Edit Subcategory' : 'Add Subcategory'}
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setShowSubcategoryModal(false)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <div className="py-4">
                    {subcategoryMode === 'view' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Subcategory Name</p>
                          <p className="mt-1 text-sm text-gray-900">{selectedSubcategory.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Base Price</p>
                          <p className="mt-1 text-sm text-gray-900">₹{selectedSubcategory.base_price}</p>
                        </div>
                        {selectedSubcategory.description && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-gray-500">Description</p>
                            <p className="mt-1 text-sm text-gray-900">{selectedSubcategory.description}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="subcatName" className="block text-sm font-medium text-gray-700">Subcategory Name</label>
                          <input
                            type="text"
                            name="name"
                            id="subcatName"
                            value={selectedSubcategory.name || ''}
                            onChange={handleSubcategoryChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            name="description"
                            id="description"
                            rows={2}
                            value={selectedSubcategory.description || ''}
                            onChange={handleSubcategoryChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="base_price" className="block text-sm font-medium text-gray-700">Base Price</label>
                          <input
                            type="number"
                            name="base_price"
                            id="base_price"
                            value={selectedSubcategory.base_price !== undefined && selectedSubcategory.base_price !== null ? selectedSubcategory.base_price : ''}
                            onChange={handleSubcategoryChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 flex justify-end space-x-3">
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      onClick={() => setShowSubcategoryModal(false)}
                    >
                      {subcategoryMode === 'view' ? 'Close' : 'Cancel'}
                    </button>
                    {subcategoryMode !== 'view' && (
                      <button
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        onClick={handleSaveSubcategory}
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    export default CategoryManagement;