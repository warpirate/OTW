import React, { useState } from 'react';

// Mock audit log data
const initialAuditLogs = [
  {
    id: 1,
    user: {
      name: 'Sneha Kumar',
      email: 'sneha@urbango.ca',
      role: 'Admin'
    },
    action: 'USER_APPROVE',
    description: 'Approved user registration for Ankit Sharma',
    ipAddress: '103.86.175.42',
    timestamp: '2023-07-14 10:23:15',
    resource: 'User #4528'
  },
  {
    id: 2,
    user: {
      name: 'Rahul Verma',
      email: 'rahul@urbango.ca',
      role: 'Admin'
    },
    action: 'CATEGORY_UPDATE',
    description: 'Updated pricing for Home Cleaning services',
    ipAddress: '103.86.175.36',
    timestamp: '2023-07-14 09:45:22',
    resource: 'Category #3'
  },
  {
    id: 3,
    user: {
      name: 'Priya Singh',
      email: 'priya@urbango.ca',
      role: 'Admin'
    },
    action: 'DISPUTE_RESOLVE',
    description: 'Resolved customer dispute for booking #BOOK1234',
    ipAddress: '103.86.175.39',
    timestamp: '2023-07-13 16:30:10',
    resource: 'Dispute #45'
  },
  {
    id: 4,
    user: {
      name: 'Vikram Malhotra',
      email: 'vikram@urbango.ca',
      role: 'Admin'
    },
    action: 'CATEGORY_CREATE',
    description: 'Added new service subcategory: AC Repair',
    ipAddress: '103.86.175.41',
    timestamp: '2023-07-13 14:15:33',
    resource: 'Category #8'
  },
  {
    id: 5,
    user: {
      name: 'Neha Patel',
      email: 'neha@urbango.ca',
      role: 'Admin'
    },
    action: 'USER_REJECT',
    description: 'Rejected worker application for Sanjay Gupta',
    ipAddress: '103.86.175.40',
    timestamp: '2023-07-13 11:20:45',
    resource: 'User #4532'
  },
  {
    id: 6,
    user: {
      name: 'Sameer Khan',
      email: 'sameer@urbango.ca',
      role: 'SuperAdmin'
    },
    action: 'ADMIN_CREATE',
    description: 'Created new admin account for Neha Patel',
    ipAddress: '103.86.175.38',
    timestamp: '2023-07-12 16:05:12',
    resource: 'Admin #5'
  },
  {
    id: 7,
    user: {
      name: 'Sameer Khan',
      email: 'sameer@urbango.ca',
      role: 'SuperAdmin'
    },
    action: 'SETTINGS_UPDATE',
    description: 'Updated system security settings',
    ipAddress: '103.86.175.38',
    timestamp: '2023-07-12 15:50:28',
    resource: 'System Settings'
  },
  {
    id: 8,
    user: {
      name: 'System',
      email: 'system@urbango.ca',
      role: 'System'
    },
    action: 'BACKUP_CREATED',
    description: 'Automated database backup created',
    ipAddress: 'localhost',
    timestamp: '2023-07-12 03:00:01',
    resource: 'Database'
  },
  {
    id: 9,
    user: {
      name: 'Sneha Kumar',
      email: 'sneha@urbango.ca',
      role: 'Admin'
    },
    action: 'LOGIN',
    description: 'User logged in successfully',
    ipAddress: '103.86.175.42',
    timestamp: '2023-07-14 09:05:22',
    resource: 'Auth System'
  },
  {
    id: 10,
    user: {
      name: 'Vikram Malhotra',
      email: 'vikram@urbango.ca',
      role: 'Admin'
    },
    action: 'PASSWORD_RESET',
    description: 'Reset password for own account',
    ipAddress: '103.86.175.41',
    timestamp: '2023-07-11 10:12:45',
    resource: 'Admin #4'
  },
  {
    id: 11,
    user: {
      name: 'System',
      email: 'system@urbango.ca',
      role: 'System'
    },
    action: 'PAYMENT_PROCESSED',
    description: 'Bulk payment processing for service providers completed',
    ipAddress: 'localhost',
    timestamp: '2023-07-11 01:15:00',
    resource: 'Payment System'
  }
];

// Action type color mapping
const actionColorMap = {
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGOUT: 'bg-blue-100 text-blue-800',
  USER_APPROVE: 'bg-green-100 text-green-800',
  USER_REJECT: 'bg-red-100 text-red-800',
  CATEGORY_CREATE: 'bg-purple-100 text-purple-800',
  CATEGORY_UPDATE: 'bg-purple-100 text-purple-800',
  DISPUTE_RESOLVE: 'bg-yellow-100 text-yellow-800',
  ADMIN_CREATE: 'bg-indigo-100 text-indigo-800',
  SETTINGS_UPDATE: 'bg-gray-100 text-gray-800',
  BACKUP_CREATED: 'bg-green-100 text-green-800',
  PASSWORD_RESET: 'bg-orange-100 text-orange-800',
  PAYMENT_PROCESSED: 'bg-green-100 text-green-800'
};

const AuditLogs = () => {
  const [logs, setLogs] = useState(initialAuditLogs);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userRole: 'All',
    actionType: 'All',
    search: ''
  });

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Apply filters
  const filteredLogs = logs.filter(log => {
    // Date From filter
    if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) {
      return false;
    }
    
    // Date To filter
    if (filters.dateTo && new Date(log.timestamp) > new Date(filters.dateTo)) {
      return false;
    }
    
    // User Role filter
    if (filters.userRole !== 'All' && log.user.role !== filters.userRole) {
      return false;
    }
    
    // Action Type filter
    if (filters.actionType !== 'All' && log.action !== filters.actionType) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.description.toLowerCase().includes(searchLower) ||
        log.user.name.toLowerCase().includes(searchLower) ||
        log.user.email.toLowerCase().includes(searchLower) ||
        log.resource.toLowerCase().includes(searchLower) ||
        log.ipAddress.includes(searchLower)
      );
    }
    
    return true;
  });

  // Get unique action types for filter dropdown
  const uniqueActionTypes = [...new Set(logs.map(log => log.action))];
  
  // Handle showing log details
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      
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
              placeholder="Search logs..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
            <select
              id="userRole"
              name="userRole"
              value={filters.userRole}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            >
              <option value="All">All Roles</option>
              <option value="SuperAdmin">SuperAdmin</option>
              <option value="Admin">Admin</option>
              <option value="System">System</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="actionType" className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              id="actionType"
              name="actionType"
              value={filters.actionType}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            >
              <option value="All">All Actions</option>
              {uniqueActionTypes.map(action => (
                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              name="dateFrom"
              id="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              name="dateTo"
              id="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              onClick={() => setFilters({
                dateFrom: '',
                dateTo: '',
                userRole: 'All',
                actionType: 'All',
                search: ''
              })}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Log Table */}
      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user.name}</div>
                        <div className="text-sm text-gray-500">{log.user.email}</div>
                        <div className="text-xs text-gray-500">{log.user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionColorMap[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">{log.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(log)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-500">No audit logs found matching the selected filters.</p>
          </div>
        )}
      </div>
      
      {/* Log Detail Modal */}
      {showDetailModal && selectedLog && (
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
                      Audit Log Details
                    </h3>
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Log ID</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.id}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.timestamp}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">User</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.user.name}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.user.email}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Role</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.user.role}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">IP Address</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Action</dt>
                          <dd className="mt-1 text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionColorMap[selectedLog.action] || 'bg-gray-100 text-gray-800'}`}>
                              {selectedLog.action.replace(/_/g, ' ')}
                            </span>
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Resource</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.resource}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedLog.description}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
