import React from 'react';

// Mock data for demonstration
const platformStats = {
  totalUsers: 8745,
  totalServices: 3218,
  totalTrips: 5927,
  dailyActiveUsers: 1246,
  totalRevenue: 632840.50,
  avgRating: 4.7,
  serviceCategories: 6,
  systemUptime: '99.98%'
};

const recentAdminActions = [
  { id: 1, admin: 'Sneha Kumar', action: 'Approved 12 new workers', timestamp: '2023-07-14 10:23' },
  { id: 2, admin: 'Rahul Verma', action: 'Updated pricing for Home Cleaning services', timestamp: '2023-07-14 09:45' },
  { id: 3, admin: 'Priya Singh', action: 'Resolved 8 customer disputes', timestamp: '2023-07-13 16:30' },
  { id: 4, admin: 'Vikram Malhotra', action: 'Added new service subcategory: AC Repair', timestamp: '2023-07-13 14:15' },
  { id: 5, admin: 'Neha Patel', action: 'Rejected 3 worker applications', timestamp: '2023-07-13 11:20' }
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
      
      {/* Platform Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <i className="fas fa-users text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-xl font-semibold">{platformStats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-green-600">+12% this month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <i className="fas fa-concierge-bell text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Services</p>
              <p className="text-xl font-semibold">{platformStats.totalServices.toLocaleString()}</p>
              <p className="text-xs text-green-600">+8% this month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <i className="fas fa-taxi text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Trips</p>
              <p className="text-xl font-semibold">{platformStats.totalTrips.toLocaleString()}</p>
              <p className="text-xs text-green-600">+15% this month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <i className="fas fa-rupee-sign text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-xl font-semibold">₹{platformStats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600">+10% this month</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-1">
          <h2 className="text-lg font-medium mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">API Server</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Payment Gateway</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Operational
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Notification Service</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></span>
                Degraded
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Maps Integration</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Operational
              </span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">System Uptime</span>
                <span className="text-sm font-medium text-green-600">{platformStats.systemUptime}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Admin Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium">Recent Admin Actions</h2>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAdminActions.map((action) => (
                  <tr key={action.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{action.admin}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{action.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{action.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <button className="text-sm text-purple-600 hover:text-purple-500 font-medium">View all actions</button>
          </div>
        </div>
      </div>

      {/* Statistics and Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium mb-4">User Activity</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">User activity chart would go here (using Chart.js)</p>
          </div>
        </div>
        
        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium mb-4">Revenue Breakdown</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Revenue breakdown chart would go here (using Chart.js)</p>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium mb-4">Key Metrics</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Daily Active Users</span>
                <span className="text-sm font-medium text-gray-900">{platformStats.dailyActiveUsers.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Average Rating</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-1">{platformStats.avgRating}</span>
                  <i className="fas fa-star text-yellow-400 text-xs"></i>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Worker Conversion Rate</span>
                <span className="text-sm font-medium text-gray-900">76%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '76%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Booking Completion Rate</span>
                <span className="text-sm font-medium text-gray-900">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mb-3">
              <i className="fas fa-download text-lg"></i>
            </div>
            <span className="text-sm font-medium text-gray-700">Generate Reports</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mb-3">
              <i className="fas fa-user-plus text-lg"></i>
            </div>
            <span className="text-sm font-medium text-gray-700">Add Admin</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mb-3">
              <i className="fas fa-cogs text-lg"></i>
            </div>
            <span className="text-sm font-medium text-gray-700">System Settings</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600 mb-3">
              <i className="fas fa-bell text-lg"></i>
            </div>
            <span className="text-sm font-medium text-gray-700">Send Notification</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
