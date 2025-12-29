import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CategoryService } from '../../services/api.service';

const CategoryDetailsPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryMode, setSubcategoryMode] = useState('view');
  
  // Image upload states
  const [subcategoryImageFile, setSubcategoryImageFile] = useState(null);
  const [subcategoryImagePreview, setSubcategoryImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Presigned URL states for viewing S3 images
  const [subcategoryPresignedUrl, setSubcategoryPresignedUrl] = useState(null);
  const [loadingPresignedUrls, setLoadingPresignedUrls] = useState(false);

  useEffect(() => {
    fetchCategoryDetails();
  }, [categoryId]);

  const fetchCategoryDetails = async () => {
    try {
      setLoading(true);
      const subcategories = await CategoryService.getAllSubCategories(categoryId);
      
      // We need to get category basic info - try to get it from the list
      const allCategories = await CategoryService.getAllCategories(1, 100);
      const categoryInfo = allCategories.category_data.find(c => c.id === parseInt(categoryId));
      
      if (!categoryInfo) {
        throw new Error('Category not found');
      }

      setCategory({
        ...categoryInfo,
        subcategories: subcategories || []
      });
      setError(null);
    } catch (err) {
      setError('Failed to load category details. Please try again.');
      console.error('Error fetching category details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubcategory = async (subcategory) => {
    setSelectedSubcategory(subcategory);
    
    // Fetch presigned URL if subcategory has an image for view mode
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
    
    setSubcategoryMode('view');
    setShowSubcategoryModal(true);
  };

  const handleEditSubcategory = async (subcategory) => {
    const subcategoryToEdit = {
      ...subcategory,
      category_id: category.id
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

  const handleAddSubcategory = () => {
    setSelectedSubcategory({
      name: '',
      base_price: 0,
      category_id: category.id,
      is_active: true,
      night_charge: 0,
      night_start_time: '17:00:00',
      night_end_time: '06:00:00'
    });
    setSubcategoryImageFile(null);
    setSubcategoryImagePreview(null);
    setSubcategoryPresignedUrl(null);
    setSubcategoryMode('add');
    setShowSubcategoryModal(true);
  };

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

  const handleSaveSubcategory = async () => {
    if (!category || !category.id) {
      setError('No category selected.');
      return;
    }

    const categoryId = category.id;

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

      // Refresh subcategories
      await fetchCategoryDetails();

      setShowSubcategoryModal(false);
      setSubcategoryImageFile(null);
      setSubcategoryImagePreview(null);
      setSubcategoryPresignedUrl(null);
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

  const handleDeleteSubcategory = async (e, categoryId, subcategoryId) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm('Are you sure you want to delete this subcategory?')) {
      return;
    }

    try {
      setLoading(true);
      await CategoryService.deleteSubcategory(categoryId, subcategoryId);
      await fetchCategoryDetails();
      setError(null);
    } catch (err) {
      setError('Failed to delete subcategory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !category) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error && !category) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Category Details</h1>
          <button
            onClick={() => navigate('/admin/categories')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back to Categories
          </button>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/categories')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
          <h1 className="text-2xl font-bold">Category Details</h1>
        </div>
        <button
          onClick={() => navigate(`/admin/categories`)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          <i className="fas fa-edit mr-2"></i>Edit Category
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Category Information Card */}
      {category && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Category Name</p>
              <p className="mt-1 text-sm text-gray-900 font-semibold">{category.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="mt-1">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Category Type</p>
              <p className="mt-1 text-sm text-gray-900">
                {category.category_type ? category.category_type.charAt(0).toUpperCase() + category.category_type.slice(1) : 'N/A'}
              </p>
            </div>
            {category.description && (
              <div className="md:col-span-3">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-900">{category.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subcategories Section */}
      {category && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Subcategories</h2>
              <button
                onClick={handleAddSubcategory}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand hover:bg-brand/90"
              >
                <i className="fas fa-plus mr-2"></i>Add Subcategory
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                {category.subcategories && category.subcategories.length > 0 ? (
                  category.subcategories.map((subcategory) => (
                    <tr key={subcategory.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subcategory.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewSubcategory(subcategory)}
                            className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View
                          </button>
                          <button
                            onClick={() => handleEditSubcategory(subcategory)}
                            className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                      <i className="fas fa-inbox text-gray-300 text-4xl mb-2"></i>
                      <p>No subcategories found</p>
                      <p className="text-xs mt-1">Click "Add Subcategory" to create one</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {showSubcategoryModal && selectedSubcategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowSubcategoryModal(false)}></div>
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
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className="mt-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedSubcategory.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {selectedSubcategory.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    {selectedSubcategory.description && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">Description</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedSubcategory.description}</p>
                      </div>
                    )}
                    {(subcategoryPresignedUrl || selectedSubcategory.image_url) && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">Image</p>
                        <div className="mt-2 relative">
                          <img 
                            src={subcategoryPresignedUrl || selectedSubcategory.image_url} 
                            alt="Subcategory image" 
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
                        <div className="mt-2 relative">
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
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                )}
                {subcategoryMode === 'edit' && (
                  <button
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
                    onClick={handleSaveSubcategory}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update'}
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

export default CategoryDetailsPage;
