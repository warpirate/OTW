import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminService from '../../services/superadmin.service';


const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'All',
    search: ''
  });
  
  // New admin form state
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin',
    status: 'Active'
  });

  // Load admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);

  // Fetch all admins
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getAdmins();
      if (response.success) {
        setAdmins(response.data);
      } else {
        toast.error('Failed to fetch admins');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Error fetching admins');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter admins based on selected filters
  const filteredAdmins = admins.filter(admin => {
    const matchesStatus = filters.status === 'All' || admin.status === filters.status;
    const matchesSearch = filters.search === '' || 
      admin.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      admin.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      admin.phone.includes(filters.search);
    
    return matchesStatus && matchesSearch;
  });

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // Handle opening the add admin modal
  const handleOpenAddModal = () => {
    setNewAdmin({
      name: '',
      email: '',
      phone: '',
      role: 'admin',
      status: 'Active'
    });
    setIsAddModalOpen(true);
  };

  // Handle change in the new admin form
  const handleNewAdminChange = (e) => {
    const { name, value } = e.target;
    setNewAdmin({
      ...newAdmin,
      [name]: value
    });
  };

  // Handle adding a new admin
  const handleAddAdmin = async () => {
    try {
      setLoading(true);
      const response = await AdminService.createAdmin(newAdmin);
      if (response.success) {
        toast.success(response.message);
        setIsAddModalOpen(false);
        fetchAdmins(); // Refresh the list
      } else {
        toast.error(response.message || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Error creating admin');
    } finally {
      setLoading(false);
    }
  };

  // Handle editing an admin
  const handleEditAdmin = async () => {
    try {
      setLoading(true);
      const response = await AdminService.updateAdmin(selectedAdmin.id, selectedAdmin);
      if (response.success) {
        toast.success(response.message);
        setIsEditModalOpen(false);
        fetchAdmins(); // Refresh the list
      } else {
        toast.error(response.message || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Error updating admin');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an admin
  const handleDeleteAdmin = async () => {
    try {
      setLoading(true);
      const response = await AdminService.deleteAdmin(selectedAdmin.id);
      if (response.success) {
        toast.success(response.message);
        setIsDeleteModalOpen(false);
        fetchAdmins(); // Refresh the list
      } else {
        toast.error(response.message || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Error deleting admin');
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting an admin to edit
  const handleSelectForEdit = (admin) => {
    setSelectedAdmin(admin);
    setIsEditModalOpen(true);
  };

  // Handle selecting an admin to delete
  const handleSelectForDelete = (admin) => {
    setSelectedAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  // Handle change in the edit admin form
  const handleEditAdminChange = (e) => {
    const { name, value } = e.target;
    setSelectedAdmin({
      ...selectedAdmin,
      [name]: value
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Management</h1>
      
      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="w-full sm:w-48">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          
          <div className="w-full sm:w-64">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              id="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, email, or phone"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <i className="fas fa-plus mr-2"></i> Add Admin
          </button>
        </div>
      </div>
      
      {/* Admin List */}
      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAdmins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium">{admin.name.charAt(0)}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                      <div className="text-sm text-gray-500">Added on {new Date(admin.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{admin.email}</div>
                  <div className="text-sm text-gray-500">{admin.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    admin.role === 'super admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {admin.role === 'super admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    admin.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {admin.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleSelectForEdit(admin)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleSelectForDelete(admin)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Add Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Add New Admin
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={newAdmin.name}
                          onChange={handleNewAdminChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={newAdmin.email}
                          onChange={handleNewAdminChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={newAdmin.phone}
                          onChange={handleNewAdminChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Account Type</label>
                        <select
                          id="role"
                          name="role"
                          value={newAdmin.role}
                          onChange={handleNewAdminChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        >
                          <option value="admin">Admin</option>
                          <option value="super admin">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          id="status"
                          name="status"
                          value={newAdmin.status}
                          onChange={handleNewAdminChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddAdmin}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Admin
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Admin Modal */}
      {isEditModalOpen && selectedAdmin && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Edit Admin
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          id="edit-name"
                          value={selectedAdmin.name}
                          onChange={handleEditAdminChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          name="email"
                          id="edit-email"
                          value={selectedAdmin.email}
                          onChange={handleEditAdminChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="text"
                          name="phone"
                          id="edit-phone"
                          value={selectedAdmin.phone}
                          onChange={handleEditAdminChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">Account Type</label>
                        <select
                          id="edit-role"
                          name="role"
                          value={selectedAdmin.role}
                          onChange={handleEditAdminChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        >
                          <option value="admin">Admin</option>
                          <option value="super admin">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          id="edit-status"
                          name="status"
                          value={selectedAdmin.status}
                          onChange={handleEditAdminChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleEditAdmin}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedAdmin && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Delete Admin
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete admin {selectedAdmin.name}? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteAdmin}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
