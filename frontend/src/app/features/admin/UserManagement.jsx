import React, { useState } from 'react';

// Mock user data
const initialUsers = [
  { id: 1, name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', type: 'Worker', service: 'Home Cleaning', joinDate: '2023-04-15', status: 'Pending', documents: ['ID Proof', 'Address Proof'] },
  { id: 2, name: 'Rahul Patel', email: 'rahul@example.com', phone: '8765432109', type: 'Driver', vehicle: 'Sedan', joinDate: '2023-05-22', status: 'Approved', documents: ['License', 'Vehicle RC', 'Insurance'] },
  { id: 3, name: 'Amit Singh', email: 'amit@example.com', phone: '7654321098', type: 'Customer', joinDate: '2023-03-10', status: 'Active', bookings: 7 },
  { id: 4, name: 'Sneha Kumar', email: 'sneha@example.com', phone: '6543210987', type: 'Worker', service: 'Plumbing', joinDate: '2023-06-05', status: 'Approved', documents: ['ID Proof', 'Skill Certificate'] },
  { id: 5, name: 'Vikas Gupta', email: 'vikas@example.com', phone: '5432109876', type: 'Driver', vehicle: 'Bike', joinDate: '2023-06-18', status: 'Pending', documents: ['License', 'Vehicle RC'] },
  { id: 6, name: 'Neha Verma', email: 'neha@example.com', phone: '4321098765', type: 'Worker', service: 'Salon', joinDate: '2023-05-30', status: 'Approved', documents: ['ID Proof', 'Certification'] },
  { id: 7, name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '3210987654', type: 'Driver', vehicle: 'SUV', joinDate: '2023-06-02', status: 'Rejected', documents: ['License'] },
  { id: 8, name: 'Preeti Joshi', email: 'preeti@example.com', phone: '2109876543', type: 'Customer', joinDate: '2023-04-25', status: 'Active', bookings: 3 },
];

const UserManagement = () => {
  const [users, setUsers] = useState(initialUsers);
  const [filters, setFilters] = useState({
    type: 'All',
    status: 'All',
    search: '',
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesType = filters.type === 'All' || user.type === filters.type;
    const matchesStatus = filters.status === 'All' || user.status === filters.status;
    const matchesSearch = filters.search === '' || 
      user.name.toLowerCase().includes(filters.search.toLowerCase()) || 
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.phone.includes(filters.search);
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleStatusChange = (userId, newStatus) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
            <select
              id="type"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="All">All Types</option>
              <option value="Worker">Workers</option>
              <option value="Driver">Drivers</option>
              <option value="Customer">Customers</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              id="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, email, phone..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.service && `Service: ${user.service}`}
                      {user.vehicle && `Vehicle: ${user.vehicle}`}
                      {user.bookings !== undefined && `Bookings: ${user.bookings}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.joinDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.status === 'Approved' || user.status === 'Active' ? 'bg-green-100 text-green-800' : 
                        user.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => handleViewUser(user)}
                    >
                      View
                    </button>
                    {user.status === 'Pending' && (
                      <>
                        <button 
                          className="text-green-600 hover:text-green-900 mr-3"
                          onClick={() => handleStatusChange(user.id, 'Approved')}
                        >
                          Approve
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleStatusChange(user.id, 'Rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm">No users found matching your filters</p>
          </div>
        )}
        
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> users
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
      </div>

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button 
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setShowModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Join Date</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.joinDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className={`mt-1 text-sm font-semibold 
                      ${selectedUser.status === 'Approved' || selectedUser.status === 'Active' ? 'text-green-600' : 
                        selectedUser.status === 'Pending' ? 'text-yellow-600' : 
                        'text-red-600'}`}>
                      {selectedUser.status}
                    </p>
                  </div>
                  
                  {selectedUser.service && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Service</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.service}</p>
                    </div>
                  )}
                  
                  {selectedUser.vehicle && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vehicle</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.vehicle}</p>
                    </div>
                  )}
                  
                  {selectedUser.bookings !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Bookings</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.bookings}</p>
                    </div>
                  )}
                </div>
                
                {selectedUser.documents && selectedUser.documents.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500">Documents</h4>
                    <ul className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
                      {selectedUser.documents.map((doc, index) => (
                        <li key={index} className="py-3 flex justify-between items-center">
                          <div className="flex items-center">
                            <i className="fas fa-file-alt text-gray-400 mr-2"></i>
                            <span className="text-sm text-gray-900">{doc}</span>
                          </div>
                          <button className="text-blue-600 hover:text-blue-500 text-sm">
                            View
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {selectedUser.status === 'Pending' && (
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button 
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => {
                      handleStatusChange(selectedUser.id, 'Rejected');
                      setShowModal(false);
                    }}
                  >
                    Reject
                  </button>
                  <button 
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={() => {
                      handleStatusChange(selectedUser.id, 'Approved');
                      setShowModal(false);
                    }}
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
