import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryService } from '../../services/api.service';

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, edit, add
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryTypes, setCategoryTypes] = useState(['maintenance', 'maid', 'driver']);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryMode, setSubcategoryMode] = useState('view');
  const [filters, setFilters] = useState({search: '', status: 'all',});
  
  // Image upload states
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState(null);
  const [subcategoryImageFile, setSubcategoryImageFile] = useState(null);
  const [subcategoryImagePreview, setSubcategoryImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Presigned URL states for viewing S3 images
  const [categoryPresignedUrl, setCategoryPresignedUrl] = useState(null);
  const [subcategoryPresignedUrl, setSubcategoryPresignedUrl] = useState(null);
  const [loadingPresignedUrls, setLoadingPresignedUrls] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Fetch categories from API
  useEffect(() => {
    fetchCategories();
  }, [pagination.page, pagination.limit]);

  // Fetch all categories with their subcategories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Get categories with pagination
      const response = await CategoryService.getAllCategories(pagination.page, pagination.limit);
      // Update pagination metadata
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }));

      // Fetch subcategories for each category
      const categoriesWithSubcategories = await Promise.all(
        response.category_data.map(async (category) => {
          try {
            const subcategories = await CategoryService.getAllSubCategories(category.id);
            return {
              ...category,
              subcategories: subcategories || []
            };
          } catch (error) {
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
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination changes
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({
      ...prev,
      page: 1, // Reset to first page when changing limit
      limit: newLimit
    }));
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle status filter changes
  const handleStatusFilterChange = (e) => {
    const { value } = e.target;
    setFilters(prev => ({
      ...prev,
      status: value
    }));
  };

  // Filter categories (client-side filtering on current page)
  const filteredCategories = categories.filter(category => {
    // Filter by search text
    const matchesSearch = !filters.search || 
      category.name.toLowerCase().includes(filters.search.toLowerCase());
    
    // Filter by status
    const matchesStatus = 
      filters.status === 'all' || 
      (filters.status === 'active' && category.is_active) || 
      (filters.status === 'inactive' && !category.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Handle view category - Navigate to details page
  const handleViewCategory = (category) => {
    navigate(`/admin/category/${category.id}`);
  };

  // Handle edit category
  const handleEditCategory = async (category) => {
    setLoading(true);
    try {
      const subCategoryDetails = await CategoryService.getAllSubCategories(category.id);
      setSelectedCategory({
        ...category,
        subcategories: subCategoryDetails
      });
      
      // Fetch presigned URL if category has an image
      if (category.image_url) {
        setLoadingPresignedUrls(true);
        try {
          const presignedUrl = await CategoryService.getCategoryImageUrl(category.id);
          setCategoryPresignedUrl(presignedUrl);
        } catch (err) {
          console.error('Failed to fetch category image presigned URL:', err);
          setCategoryPresignedUrl(null);
        } finally {
          setLoadingPresignedUrls(false);
        }
      } else {
        setCategoryPresignedUrl(null);
      }
      
      setModalMode('edit');
      setShowModal(true);
      setError(null);
    } catch (err) {
      setError('Failed to load category details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle add category
  const handleAddCategory = () => {
    setSelectedCategory({
      name: '',
      is_active: true, // Default to active for new categories
      subcategories: [],
      category_type: 'maintenance' // Default type
    });
    setCategoryImageFile(null);
    setCategoryImagePreview(null);
    setCategoryPresignedUrl(null);
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

  // Handle category image selection
  const handleCategoryImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP).');
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError('File size too large. Maximum size is 5MB.');
        return;
      }

      setCategoryImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCategoryImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle subcategory image selection
  const handleSubcategoryImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP).');
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError('File size too large. Maximum size is 5MB.');
        return;
      }

      setSubcategoryImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubcategoryImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save category
  const handleSaveCategory = async () => {
    try {
      setLoading(true);
      setUploadingImage(false);
      let imageUrl = selectedCategory.image_url;

      if (modalMode === 'add') {
        // Create category first
        const newCategory = await CategoryService.createCategory(selectedCategory);
        
        // Upload image if provided
        if (categoryImageFile && newCategory.id) {
          try {
            setUploadingImage(true);
            imageUrl = await CategoryService.uploadCategoryImage(newCategory.id, categoryImageFile);
            // Update category with image URL
            await CategoryService.updateCategory(newCategory.id, { ...selectedCategory, image_url: imageUrl });
            setUploadingImage(false);
          } catch (uploadErr) {
            console.error('Image upload failed:', uploadErr);
            setError('Category created but image upload failed. You can add the image later.');
          }
        }
        
      } else if (modalMode === 'edit') {
        // Upload new image if provided
        if (categoryImageFile && selectedCategory.id) {
          try {
            setUploadingImage(true);
            imageUrl = await CategoryService.uploadCategoryImage(selectedCategory.id, categoryImageFile);
            setUploadingImage(false);
          } catch (uploadErr) {
            console.error('Image upload failed:', uploadErr);
            setError('Image upload failed. Please try again.');
            setLoading(false);
            return;
          }
        }
        
        // Update category with new data and image URL
        await CategoryService.updateCategory(selectedCategory.id, {
          ...selectedCategory,
          image_url: imageUrl
        });
      }

      await fetchCategories(); // Re-fetch all categories to update the list
      setShowModal(false);
      setCategoryImageFile(null);
      setCategoryImagePreview(null);
      setError(null);
    } catch (err) {
      setError('Failed to save category. Please try again.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  // Handle view subcategory
  const handleViewSubcategory = async (subcategory) => {
    setSelectedSubcategory(subcategory);
    setSubcategoryMode('view');
    setShowSubcategoryModal(true);
  };

  // Handle edit subcategory
  const handleEditSubcategory = async (subcategory) => {
    const subcategoryToEdit = {
      ...subcategory,
      category_id: selectedCategory.id
    };

    setSelectedSubcategory(subcategoryToEdit);
    setSubcategoryImageFile(null);
    setSubcategoryImagePreview(null);
    
    // Fetch presigned URL if subcategory has an image
    if (subcategory.image_url) {
      setLoadingPresignedUrls(true);
      try {
        const presignedUrl = await CategoryService.getSubcategoryImageUrl(subcategory.id);
        setSubcategoryPresignedUrl(presignedUrl);
      } catch (err) {
        console.error('Failed to fetch subcategory image presigned URL:', err);
        setSubcategoryPresignedUrl(null);
      } finally {
        setLoadingPresignedUrls(false);
      }
    } else {
      setSubcategoryPresignedUrl(null);
    }
    
    setSubcategoryMode('edit');
    setShowSubcategoryModal(true);
  };

  // Handle add subcategory
  const handleAddSubcategory = (categoryId) => {
    setSelectedSubcategory({
      name: '',
      base_price: 0,
      category_id: categoryId, 
      is_active: true,
      night_charge: 0,
      night_start_time: '17:00:00',
      night_end_time: '06:00:00'
    });
    setSelectedCategory({
      ...selectedCategory, // Keep existing selectedCategory details
      id: categoryId // Ensure ID is set for the modal context
    })
    setSubcategoryImageFile(null);
    setSubcategoryImagePreview(null);
    setSubcategoryPresignedUrl(null);
    setSubcategoryMode('add');
    setShowSubcategoryModal(true);
  };

  // Handle subcategory change
  const handleSubcategoryChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSelectedSubcategory(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? checked
        : (name === 'base_price' || name === 'night_charge'
            ? (value === '' ? '' : Number(value))
            : value)
    }));
  };

  const handleSaveSubcategory = async () => {
    if (!selectedCategory || !selectedCategory.id) {
      setError('No category selected.');
      return;
    }

    const categoryId = selectedCategory.id;

    try {
      setLoading(true);
      setUploadingImage(false);
      let imageUrl = selectedSubcategory.image_url;

      let result;
      if (subcategoryMode === 'add') {
        // Create subcategory first
        result = await CategoryService.createSubcategory(
          categoryId,
          selectedSubcategory
        );
        
        // Upload image if provided
        if (subcategoryImageFile && result.id) {
          try {
            setUploadingImage(true);
            imageUrl = await CategoryService.uploadSubcategoryImage(result.id, subcategoryImageFile);
            // Update subcategory with image URL
            await CategoryService.updateSubcategory(categoryId, result.id, { 
              ...selectedSubcategory, 
              image_url: imageUrl 
            });
            setUploadingImage(false);
          } catch (uploadErr) {
            console.error('Image upload failed:', uploadErr);
            setError('Subcategory created but image upload failed. You can add the image later.');
          }
        }
        
      } else if (subcategoryMode === 'edit') {
        if (!selectedSubcategory.id) {
          throw new Error('Subcategory ID is missing');
        }
        
        // Upload new image if provided
        if (subcategoryImageFile) {
          try {
            setUploadingImage(true);
            imageUrl = await CategoryService.uploadSubcategoryImage(selectedSubcategory.id, subcategoryImageFile);
            setUploadingImage(false);
          } catch (uploadErr) {
            console.error('Image upload failed:', uploadErr);
            setError('Image upload failed. Please try again.');
            setLoading(false);
            return;
          }
        }

        // Update subcategory with new data and image URL
        result = await CategoryService.updateSubcategory(
          categoryId,
          selectedSubcategory.id,
          {
            ...selectedSubcategory,
            image_url: imageUrl
          }
        );
      }

      const updatedSubCategories = await CategoryService.getAllSubCategories(categoryId);

      // Update selectedCategory's subcategories immediately for the modal view
      setSelectedCategory(prev => {
        return {
          ...prev,
          subcategories: updatedSubCategories
        };
      });

      // Update the main categories state to reflect changes in the table
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
      setSubcategoryImageFile(null);
      setSubcategoryImagePreview(null);
      setError(null);
    } catch (err) {
      const errorMessage = err.response ?
        `Failed to save subcategory: ${err.response.data?.message || err.response.statusText}` :
        'Failed to save subcategory. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (e, categoryId) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm('Are you sure you want to delete this category? This will also delete all associated subcategories.')) {
      return;
    }

    try {
      setLoading(true);
      await CategoryService.deleteCategory(categoryId);
      await fetchCategories(); // Re-fetch all categories to update the list
      setError(null);

      if (showModal) {
        setShowModal(false);
      }
    } catch (err) {
      setError('Failed to delete category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete subcategory
  const handleDeleteSubcategory = async (e, categoryId, subcategoryId) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm('Are you sure you want to delete this subcategory?')) {
      return;
    }

    try {
      setLoading(true);
      await CategoryService.deleteSubcategory(categoryId, subcategoryId);

      // Update the selected category's subcategories in the modal view
      const updatedSubCategories = await CategoryService.getAllSubCategories(categoryId);

      if (selectedCategory && selectedCategory.id === categoryId) {
        setSelectedCategory(prev => ({
          ...prev,
          subcategories: updatedSubCategories
        }));
      }

      // Update the main categories state to reflect changes in the table
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
      setError(null);
    } catch (err) {
      setError('Failed to delete subcategory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Category Management</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
            <select
              name="limit"
              id="limit"
              value={pagination.limit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span className="mr-2">Status</span>
                    <select 
                      name="status" 
                      value={filters.status} 
                      onChange={handleStatusFilterChange}
                      className="text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-7"
                      style={{ minWidth: '90px' }}
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </th>
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={() => handleViewCategory(category)}
                      >
                        <i className="fas fa-eye mr-1"></i>
                        View Sub Categories
                      </button>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit Category
                      </button>
                    </div>
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

        {/* Enhanced Pagination */}
        {!loading && categories.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              {/* Results info */}
              <div className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-medium">
                  {((pagination.page - 1) * pagination.limit) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                results
              </div>

              {/* Pagination controls */}
              <div className="flex items-center space-x-2">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    pagination.page === 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                    disabled={page === '...'}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      page === pagination.page
                        ? 'bg-brand text-white'
                        : page === '...'
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    pagination.page === pagination.totalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
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
                      <p className={`mt-1 text-sm font-semibold ${selectedCategory.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                        {selectedCategory.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Category Type</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedCategory.category_type ? selectedCategory.category_type.charAt(0).toUpperCase() + selectedCategory.category_type.slice(1) : 'N/A'}</p>
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
                      <div className="mt-2 border border-gray-200 rounded-md">
                        <div className="max-h-60 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Night Charge</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Night Window</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{subcategory.night_charge ?? 0}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {subcategory.night_start_time && subcategory.night_end_time
                                      ? `${subcategory.night_start_time} - ${subcategory.night_end_time}`
                                      : '—'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${subcategory.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                      {subcategory.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
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
                                      {/* <button
                                        type="button"
                                        onClick={(e) => handleDeleteSubcategory(e, selectedCategory.id, subcategory.id)}
                                        className="text-red-600 hover:text-red-900 px-2 py-1"
                                        disabled={loading}
                                      >
                                        {loading ? 'Deleting...' : 'Delete'}
                                      </button> */}
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

                      <div>
                        <label htmlFor="category_type" className="block text-sm font-medium text-gray-700">Category Type</label>
                        <select
                          name="category_type"
                          id="category_type"
                          value={selectedCategory.category_type || 'maintenance'}
                          onChange={handleCategoryChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {categoryTypes.map((type) => (
                            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="category_image" className="block text-sm font-medium text-gray-700">Category Image</label>
                        <input
                          type="file"
                          id="category_image"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleCategoryImageChange}
                          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {(categoryImagePreview || categoryPresignedUrl) && (
                          <div className="mt-2">
                            <img 
                              src={categoryImagePreview || categoryPresignedUrl} 
                              alt="Category preview" 
                              className="h-32 w-32 object-cover rounded-md border border-gray-300"
                              onError={(e) => {
                                console.error('Failed to load category image');
                                e.target.style.display = 'none';
                              }}
                            />
                            {loadingPresignedUrls && (
                              <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center rounded-md">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Upload an image (JPG, PNG, GIF, or WebP - max 5MB)</p>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={selectedCategory.is_active || false}
                            onChange={(e) => setSelectedCategory({
                              ...selectedCategory,
                              is_active: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-lg w-full mx-auto shadow-xl max-h-[80vh] overflow-y-auto">
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
                    <div>
                      <p className="text-sm font-medium text-gray-500">Night Charge</p>
                      <p className="mt-1 text-sm text-gray-900">₹{selectedSubcategory.night_charge ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Night Window</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedSubcategory.night_start_time && selectedSubcategory.night_end_time
                          ? `${selectedSubcategory.night_start_time} - ${selectedSubcategory.night_end_time}`
                          : '—'}
                      </p>
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
                      <label htmlFor="nightCharge" className="block text-sm font-medium text-gray-700">Night Charge</label>
                      <input
                        type="number"
                        name="night_charge"
                        id="nightCharge"
                        value={selectedSubcategory.night_charge ?? 0}
                        onChange={handleSubcategoryChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nightStartTime" className="block text-sm font-medium text-gray-700">Night Start Time</label>
                        <input
                          type="text"
                          name="night_start_time"
                          id="nightStartTime"
                          placeholder="17:00:00"
                          value={selectedSubcategory.night_start_time || ''}
                          onChange={handleSubcategoryChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="nightEndTime" className="block text-sm font-medium text-gray-700">Night End Time</label>
                        <input
                          type="text"
                          name="night_end_time"
                          id="nightEndTime"
                          placeholder="06:00:00"
                          value={selectedSubcategory.night_end_time || ''}
                          onChange={handleSubcategoryChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="subcatDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                      <textarea
                        name="description"
                        id="subcatDescription"
                        value={selectedSubcategory.description || ''}
                        onChange={handleSubcategoryChange}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700">Base Price</label>
                      <input
                        type="number"
                        name="base_price"
                        id="basePrice"
                        value={selectedSubcategory.base_price || 0}
                        onChange={handleSubcategoryChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="subcategory_image" className="block text-sm font-medium text-gray-700">Subcategory Image</label>
                      <input
                        type="file"
                        id="subcategory_image"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleSubcategoryImageChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {(subcategoryImagePreview || subcategoryPresignedUrl) && (
                        <div className="mt-2">
                          <img 
                            src={subcategoryImagePreview || subcategoryPresignedUrl} 
                            alt="Subcategory preview" 
                            className="h-32 w-32 object-cover rounded-md border border-gray-300"
                            onError={(e) => {
                              console.error('Failed to load subcategory image');
                              e.target.style.display = 'none';
                            }}
                          />
                          {loadingPresignedUrls && (
                            <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center rounded-md">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Upload an image (JPG, PNG, GIF, or WebP - max 5MB)</p>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={selectedSubcategory.is_active || false}
                          onChange={handleSubcategoryChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
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
                {subcategoryMode === 'add' && (
                  <button
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
                    onClick={handleSaveSubcategory}
                  >
                    Save
                  </button>
                )}
                {subcategoryMode === 'edit' && (
                  <button
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
                    onClick={handleSaveSubcategory}
                  >
                    Update
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