import React from 'react';

// Mock data for demonstration
const kpiData = {
  totalUsers: 1842,
  activeWorkers: 328,
  activeDrivers: 193,
  pendingApprovals: 42,
  todayBookings: 126,
  totalRevenue: 19428.75,
  disputesOpen: 18
};

const recentUsers = [
  { id: 1, name: 'Priya Sharma', type: 'Worker', service: 'Home Cleaning', status: 'Pending' },
  { id: 2, name: 'Rahul Patel', type: 'Driver', vehicle: 'Sedan', status: 'Approved' },
  { id: 3, name: 'Amit Singh', type: 'Customer', bookings: 7, status: 'Active' },
  { id: 4, name: 'Sneha Kumar', type: 'Worker', service: 'Plumbing', status: 'Approved' },
  { id: 5, name: 'Vikas Gupta', type: 'Driver', vehicle: 'Bike', status: 'Pending' },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <i className="fas fa-users text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-xl font-semibold">{kpiData.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <i className="fas fa-user-hard-hat text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Workers</p>
              <p className="text-xl font-semibold">{kpiData.activeWorkers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <i className="fas fa-taxi text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Drivers</p>
              <p className="text-xl font-semibold">{kpiData.activeDrivers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <i className="fas fa-clipboard-list text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
              <p className="text-xl font-semibold">{kpiData.pendingApprovals}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Bookings Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <h2 className="text-lg font-medium mb-4">Revenue & Bookings</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Chart visualization would go here (using Chart.js)</p>
          </div>
        </div>

        {/* User Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <h2 className="text-lg font-medium mb-4">User Distribution</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Pie chart visualization would go here (using Chart.js)</p>
          </div>
        </div>
      </div>

      {/* Recent Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium">Recent Users</h2>
          <p className="text-gray-500 text-sm">Showing the latest user registrations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.service && `Service: ${user.service}`}
                      {user.vehicle && `Vehicle: ${user.vehicle}`}
                      {user.bookings && `Bookings: ${user.bookings}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        user.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="btn-primary">View</button>
                    {user.status === 'Pending' && (
                      <button className="btn-secondary">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <button className="btn-primary">View all users</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <h3 className="text-lg font-medium mb-2">Today's Bookings</h3>
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">{kpiData.todayBookings}</span>
            <span className="ml-2 flex items-center text-sm font-medium text-green-600">
              <i className="fas fa-arrow-up mr-1"></i>12%
            </span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <h3 className="text-lg font-medium mb-2">Total Revenue</h3>
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">₹{kpiData.totalRevenue.toLocaleString()}</span>
            <span className="ml-2 flex items-center text-sm font-medium text-green-600">
              <i className="fas fa-arrow-up mr-1"></i>8.3%
            </span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card">
          <h3 className="text-lg font-medium mb-2">Open Disputes</h3>
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">{kpiData.disputesOpen}</span>
            {kpiData.disputesOpen > 10 ? (
              <span className="ml-2 flex items-center text-sm font-medium text-red-600">
                <i className="fas fa-exclamation-circle mr-1"></i>Action needed
              </span>
            ) : (
              <span className="ml-2 flex items-center text-sm font-medium text-gray-500">
                All in order
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
