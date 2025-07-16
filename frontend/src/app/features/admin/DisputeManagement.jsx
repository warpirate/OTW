import React, { useState } from 'react';

// Mock disputes data
const initialDisputes = [
  {
    id: 1,
    title: 'Booking Cancellation Refund',
    user: {
      id: 101,
      name: 'Amit Kumar',
      type: 'Customer',
      email: 'amit@example.com',
      phone: '9876543210'
    },
    bookingId: 'BOOK1234',
    createdAt: '2023-06-25 14:30',
    status: 'Open',
    priority: 'High',
    description: 'I cancelled my home cleaning booking but haven\'t received the refund yet. It has been 5 days now.',
    responses: [
      {
        id: 1,
        responder: 'System',
        message: 'Your ticket has been registered. Our team will look into it shortly.',
        timestamp: '2023-06-25 14:31'
      }
    ]
  },
  {
    id: 2,
    title: 'Worker did not complete job',
    user: {
      id: 102,
      name: 'Priya Sharma',
      type: 'Customer',
      email: 'priya@example.com',
      phone: '8765432109'
    },
    bookingId: 'BOOK2345',
    createdAt: '2023-06-26 10:15',
    status: 'In Progress',
    priority: 'Medium',
    description: 'The plumber only fixed one tap and left saying he will return, but it\'s been 2 days and he hasn\'t returned.',
    responses: [
      {
        id: 1,
        responder: 'System',
        message: 'Your ticket has been registered. Our team will look into it shortly.',
        timestamp: '2023-06-26 10:16'
      },
      {
        id: 2,
        responder: 'Admin User',
        message: 'We have contacted the plumber regarding this issue. He has reported that he needed a specific part which was not available. We are arranging for him to return tomorrow with the required part.',
        timestamp: '2023-06-27 11:30'
      }
    ]
  },
  {
    id: 3,
    title: 'Payment issue with app',
    user: {
      id: 103,
      name: 'Rajesh Patel',
      type: 'Customer',
      email: 'rajesh@example.com',
      phone: '7654321098'
    },
    bookingId: 'BOOK3456',
    createdAt: '2023-06-27 16:45',
    status: 'Open',
    priority: 'Low',
    description: 'I tried to make a payment for my salon booking but the app kept showing an error. I had to pay in cash, but the app is still showing payment due.',
    responses: [
      {
        id: 1,
        responder: 'System',
        message: 'Your ticket has been registered. Our team will look into it shortly.',
        timestamp: '2023-06-27 16:46'
      }
    ]
  },
  {
    id: 4,
    title: 'Wrong fare calculation',
    user: {
      id: 104,
      name: 'Vikram Mehta',
      type: 'Customer',
      email: 'vikram@example.com',
      phone: '6543210987'
    },
    bookingId: 'TRIP1234',
    createdAt: '2023-06-28 09:20',
    status: 'Resolved',
    priority: 'Medium',
    description: 'The fare for my trip from MG Road to Indiranagar was calculated incorrectly. The app charged me for 8km but the actual distance was only 6km.',
    responses: [
      {
        id: 1,
        responder: 'System',
        message: 'Your ticket has been registered. Our team will look into it shortly.',
        timestamp: '2023-06-28 09:21'
      },
      {
        id: 2,
        responder: 'Admin User',
        message: 'We have checked your trip details and confirmed that there was an error in distance calculation. We have processed a refund for the excess fare charged.',
        timestamp: '2023-06-29 14:15'
      },
      {
        id: 3,
        responder: 'System',
        message: 'Refund of ₹60 has been processed to your original payment method.',
        timestamp: '2023-06-29 14:16'
      }
    ]
  },
  {
    id: 5,
    title: 'Worker behavior complaint',
    user: {
      id: 105,
      name: 'Neha Singh',
      type: 'Customer',
      email: 'neha@example.com',
      phone: '5432109876'
    },
    bookingId: 'BOOK4567',
    createdAt: '2023-06-28 17:30',
    status: 'In Progress',
    priority: 'High',
    description: 'The electrician who came to fix my fan was very rude and unprofessional. He also overcharged me for the parts.',
    responses: [
      {
        id: 1,
        responder: 'System',
        message: 'Your ticket has been registered. Our team will look into it shortly.',
        timestamp: '2023-06-28 17:31'
      },
      {
        id: 2,
        responder: 'Admin User',
        message: 'We apologize for your experience. We are investigating this matter and have contacted the service provider for their explanation.',
        timestamp: '2023-06-29 10:45'
      }
    ]
  },
  {
    id: 6,
    title: 'Driver took longer route',
    user: {
      id: 106,
      name: 'Karthik Reddy',
      type: 'Customer',
      email: 'karthik@example.com',
      phone: '4321098765'
    },
    bookingId: 'TRIP2345',
    createdAt: '2023-06-29 12:10',
    status: 'Open',
    priority: 'Medium',
    description: 'The driver deliberately took a longer route for my trip from home to office, despite my suggestion for a shorter route.',
    responses: [
      {
        id: 1,
        responder: 'System',
        message: 'Your ticket has been registered. Our team will look into it shortly.',
        timestamp: '2023-06-29 12:11'
      }
    ]
  }
];

const DisputeManagement = () => {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    priority: 'All',
    search: '',
  });

  // Filter disputes based on selected filters
  const filteredDisputes = disputes.filter(dispute => {
    const matchesStatus = filters.status === 'All' || dispute.status === filters.status;
    const matchesPriority = filters.priority === 'All' || dispute.priority === filters.priority;
    const matchesSearch = filters.search === '' || 
      dispute.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      dispute.bookingId.toLowerCase().includes(filters.search.toLowerCase()) ||
      dispute.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      dispute.user.email.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // Handle selecting a dispute
  const handleSelectDispute = (dispute) => {
    setSelectedDispute(dispute);
    setResponseText('');
  };

  // Handle sending a response
  const handleSendResponse = () => {
    if (!responseText.trim()) return;
    
    const newResponse = {
      id: Math.max(...selectedDispute.responses.map(r => r.id)) + 1,
      responder: 'Admin User',
      message: responseText,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    
    const updatedDisputes = disputes.map(dispute => {
      if (dispute.id === selectedDispute.id) {
        return {
          ...dispute,
          responses: [...dispute.responses, newResponse]
        };
      }
      return dispute;
    });
    
    setDisputes(updatedDisputes);
    setSelectedDispute({
      ...selectedDispute,
      responses: [...selectedDispute.responses, newResponse]
    });
    setResponseText('');
  };

  // Handle updating dispute status
  const handleUpdateStatus = (status) => {
    const updatedDisputes = disputes.map(dispute => {
      if (dispute.id === selectedDispute.id) {
        return {
          ...dispute,
          status
        };
      }
      return dispute;
    });
    
    setDisputes(updatedDisputes);
    setSelectedDispute({
      ...selectedDispute,
      status
    });
    
    // Add system message about status change
    const statusMessage = {
      id: Math.max(...selectedDispute.responses.map(r => r.id)) + 1,
      responder: 'System',
      message: `Dispute status updated to ${status}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    
    const updatedWithMessage = updatedDisputes.map(dispute => {
      if (dispute.id === selectedDispute.id) {
        return {
          ...dispute,
          responses: [...dispute.responses, statusMessage]
        };
      }
      return dispute;
    });
    
    setDisputes(updatedWithMessage);
    setSelectedDispute({
      ...selectedDispute,
      status,
      responses: [...selectedDispute.responses, statusMessage]
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dispute Management</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              id="priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
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
              placeholder="Search by title, booking ID, customer..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Disputes List and Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Disputes List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium">Disputes</h2>
            <p className="text-sm text-gray-500">Total: {filteredDisputes.length} disputes</p>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {filteredDisputes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No disputes found</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredDisputes.map(dispute => (
                  <li 
                    key={dispute.id} 
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedDispute && selectedDispute.id === dispute.id ? 'bg-blue-50' : ''}`}
                    onClick={() => handleSelectDispute(dispute)}
                  >
                    <div className="flex justify-between">
                      <div className="w-full">
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 h-3 w-3 rounded-full ${
                            dispute.priority === 'High' ? 'bg-red-500' : 
                            dispute.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          } mt-1.5 mr-2`}></div>
                          <div className="w-full">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{dispute.title}</h3>
                            <p className="text-xs text-gray-500">{dispute.user.name} • {dispute.bookingId}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                dispute.status === 'Resolved' ? 'bg-green-100 text-green-800' : 
                                dispute.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {dispute.status}
                              </span>
                              <span className="text-xs text-gray-500">{dispute.createdAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Dispute Detail View */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {selectedDispute ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h2 className="text-lg font-medium mr-3">{selectedDispute.title}</h2>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedDispute.status === 'Resolved' ? 'bg-green-100 text-green-800' : 
                        selectedDispute.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedDispute.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedDispute.bookingId} • {selectedDispute.createdAt}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        selectedDispute.status !== 'In Progress' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={() => selectedDispute.status !== 'In Progress' && handleUpdateStatus('In Progress')}
                      disabled={selectedDispute.status === 'In Progress'}
                    >
                      Mark In Progress
                    </button>
                    <button 
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        selectedDispute.status !== 'Resolved' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={() => selectedDispute.status !== 'Resolved' && handleUpdateStatus('Resolved')}
                      disabled={selectedDispute.status === 'Resolved'}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Customer Info */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium">Customer: {selectedDispute.user.name}</p>
                    <div className="flex space-x-4">
                      <p className="text-xs text-gray-500">{selectedDispute.user.email}</p>
                      <p className="text-xs text-gray-500">{selectedDispute.user.phone}</p>
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View Customer
                  </button>
                </div>
              </div>
              
              {/* Description */}
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Description</p>
                <p className="mt-1 text-sm text-gray-600">{selectedDispute.description}</p>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '40vh' }}>
                {selectedDispute.responses.map(response => (
                  <div key={response.id} className="flex flex-col">
                    <div className="flex items-center mb-1">
                      <span className={`text-sm font-medium ${response.responder === 'System' ? 'text-gray-500' : 'text-blue-600'}`}>
                        {response.responder}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {response.timestamp}
                      </span>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      response.responder === 'System' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-gray-800'
                    }`}>
                      <p className="text-sm">{response.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Reply Form */}
              {selectedDispute.status !== 'Resolved' && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex">
                    <div className="flex-1">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Type your response..."
                        rows={2}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ></textarea>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <button
                        onClick={handleSendResponse}
                        disabled={!responseText.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <div className="p-4 rounded-full bg-gray-100 mb-4">
                <i className="fas fa-inbox text-gray-400 text-2xl"></i>
              </div>
              <p className="text-gray-500">Select a dispute to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisputeManagement;
