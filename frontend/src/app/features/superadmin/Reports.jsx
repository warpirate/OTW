import React, { useState } from 'react';

// Mock report templates
const reportTemplates = [
  {
    id: 1,
    name: 'Revenue Summary Report',
    description: 'Overview of revenue by service category, time period, and region',
    category: 'Finance',
    lastGenerated: '2023-07-12',
    formats: ['PDF', 'Excel', 'CSV']
  },
  {
    id: 2,
    name: 'User Growth Report',
    description: 'Analysis of user registrations, activations and churn rates',
    category: 'Users',
    lastGenerated: '2023-07-13',
    formats: ['PDF', 'Excel', 'CSV']
  },
  {
    id: 3,
    name: 'Service Provider Performance',
    description: 'Rankings and metrics for service providers by category',
    category: 'Operations',
    lastGenerated: '2023-07-10',
    formats: ['PDF', 'Excel']
  },
  {
    id: 4,
    name: 'Booking Trends Analysis',
    description: 'Patterns and trends in service bookings and ride requests',
    category: 'Operations',
    lastGenerated: '2023-07-11',
    formats: ['PDF', 'Excel', 'CSV']
  },
  {
    id: 5,
    name: 'Customer Feedback Summary',
    description: 'Analysis of ratings, reviews and customer satisfaction metrics',
    category: 'Customers',
    lastGenerated: '2023-07-09',
    formats: ['PDF', 'Excel']
  },
  {
    id: 6,
    name: 'Financial Statement',
    description: 'Detailed financial statements including P&L and balance sheets',
    category: 'Finance',
    lastGenerated: '2023-06-30',
    formats: ['PDF', 'Excel']
  },
  {
    id: 7,
    name: 'Dispute Resolution Report',
    description: 'Summary of customer disputes, resolution times and outcomes',
    category: 'Operations',
    lastGenerated: '2023-07-08',
    formats: ['PDF', 'Excel', 'CSV']
  },
  {
    id: 8,
    name: 'Category Performance Report',
    description: 'Performance metrics for each service category and subcategory',
    category: 'Operations',
    lastGenerated: '2023-07-07',
    formats: ['PDF', 'Excel']
  }
];

// Mock recent reports
const recentReports = [
  {
    id: 101,
    name: 'Revenue Summary Report - July 2023',
    generatedBy: 'Sameer Khan',
    timestamp: '2023-07-12 14:30',
    format: 'PDF',
    size: '1.2 MB',
    status: 'Completed'
  },
  {
    id: 102,
    name: 'User Growth Report - Q2 2023',
    generatedBy: 'System Scheduler',
    timestamp: '2023-07-13 03:00',
    format: 'Excel',
    size: '3.4 MB',
    status: 'Completed'
  },
  {
    id: 103,
    name: 'Service Provider Performance - June 2023',
    generatedBy: 'Sameer Khan',
    timestamp: '2023-07-10 11:15',
    format: 'PDF',
    size: '2.8 MB',
    status: 'Completed'
  },
  {
    id: 104,
    name: 'Financial Statement - June 2023',
    generatedBy: 'System Scheduler',
    timestamp: '2023-06-30 23:59',
    format: 'Excel',
    size: '4.1 MB',
    status: 'Completed'
  },
  {
    id: 105,
    name: 'Customer Feedback Summary - Last 30 Days',
    generatedBy: 'Sameer Khan',
    timestamp: '2023-07-09 16:45',
    format: 'PDF',
    size: '1.7 MB',
    status: 'Completed'
  }
];

const Reports = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportParameters, setReportParameters] = useState({
    dateFrom: '',
    dateTo: '',
    format: 'PDF',
    includeCharts: true,
    includeTables: true,
    categories: [],
    regions: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  
  // Category options for report filters
  const categoryOptions = ['Home Cleaning', 'Appliance Repair', 'Salon & Spa', 'Plumbing', 'Electrical Work', 'Rides'];
  
  // Region options for report filters
  const regionOptions = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Noida', 'Gurgaon', 'Mumbai', 'Bangalore'];

  // Handle opening report generation modal
  const handleOpenReportModal = (template) => {
    setSelectedTemplate(template);
    setReportParameters({
      dateFrom: '',
      dateTo: '',
      format: 'PDF',
      includeCharts: true,
      includeTables: true,
      categories: [],
      regions: []
    });
    setShowReportModal(true);
  };

  // Handle parameter change
  const handleParameterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setReportParameters({
        ...reportParameters,
        [name]: checked
      });
    } else {
      setReportParameters({
        ...reportParameters,
        [name]: value
      });
    }
  };

  // Handle category selection change
  const handleCategoryChange = (category) => {
    if (reportParameters.categories.includes(category)) {
      setReportParameters({
        ...reportParameters,
        categories: reportParameters.categories.filter(c => c !== category)
      });
    } else {
      setReportParameters({
        ...reportParameters,
        categories: [...reportParameters.categories, category]
      });
    }
  };

  // Handle region selection change
  const handleRegionChange = (region) => {
    if (reportParameters.regions.includes(region)) {
      setReportParameters({
        ...reportParameters,
        regions: reportParameters.regions.filter(r => r !== region)
      });
    } else {
      setReportParameters({
        ...reportParameters,
        regions: [...reportParameters.regions, region]
      });
    }
  };

  // Handle report generation
  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setGenerationSuccess(false);
        setShowReportModal(false);
      }, 3000);
    }, 2000);
  };
  
  // Download a report (simulated)
  const handleDownloadReport = (report) => {
    // In a real app, this would initiate a file download
    alert(`Download started for ${report.name}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            className={`
              border-b-2 py-4 px-1 text-sm font-medium
              ${activeTab === 'templates'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
            onClick={() => setActiveTab('templates')}
          >
            Report Templates
          </button>
          <button
            className={`
              border-b-2 py-4 px-1 text-sm font-medium
              ${activeTab === 'recent'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
            onClick={() => setActiveTab('recent')}
          >
            Recent Reports
          </button>
        </nav>
      </div>
      
      {/* Report Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {template.category}
                    </span>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">{template.name}</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500">{template.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Last generated: {template.lastGenerated}
                  </div>
                  <div className="text-sm text-gray-500">
                    Formats: {template.formats.join(', ')}
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => handleOpenReportModal(template)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Generate Report
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Recent Reports Tab */}
      {activeTab === 'recent' && (
        <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          <i className={`fas ${
                            report.format === 'PDF' ? 'fa-file-pdf text-red-500' :
                            report.format === 'Excel' ? 'fa-file-excel text-green-600' :
                            'fa-file-csv text-blue-500'
                          } text-lg`}></i>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.generatedBy}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{report.timestamp}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{report.format}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleDownloadReport(report)} 
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Report Generation Modal */}
      {showReportModal && selectedTemplate && (
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
                      Generate {selectedTemplate.name}
                    </h3>
                    
                    {generationSuccess ? (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <i className="fas fa-check-circle text-green-400"></i>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                              Report generated successfully!
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">Date From</label>
                            <input
                              type="date"
                              name="dateFrom"
                              id="dateFrom"
                              value={reportParameters.dateFrom}
                              onChange={handleParameterChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">Date To</label>
                            <input
                              type="date"
                              name="dateTo"
                              id="dateTo"
                              value={reportParameters.dateTo}
                              onChange={handleParameterChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="format" className="block text-sm font-medium text-gray-700">Format</label>
                          <select
                            id="format"
                            name="format"
                            value={reportParameters.format}
                            onChange={handleParameterChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                          >
                            {selectedTemplate.formats.map(format => (
                              <option key={format} value={format}>{format}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <fieldset>
                            <legend className="text-sm font-medium text-gray-700">Include in Report</legend>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center">
                                <input
                                  id="includeCharts"
                                  name="includeCharts"
                                  type="checkbox"
                                  checked={reportParameters.includeCharts}
                                  onChange={handleParameterChange}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label htmlFor="includeCharts" className="ml-2 block text-sm text-gray-700">
                                  Charts and Visualizations
                                </label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  id="includeTables"
                                  name="includeTables"
                                  type="checkbox"
                                  checked={reportParameters.includeTables}
                                  onChange={handleParameterChange}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label htmlFor="includeTables" className="ml-2 block text-sm text-gray-700">
                                  Data Tables
                                </label>
                              </div>
                            </div>
                          </fieldset>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categories
                          </label>
                          <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                            {categoryOptions.map(category => (
                              <div key={category} className="flex items-center">
                                <input
                                  id={`category-${category}`}
                                  type="checkbox"
                                  checked={reportParameters.categories.includes(category)}
                                  onChange={() => handleCategoryChange(category)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`category-${category}`} className="ml-2 block text-sm text-gray-700">
                                  {category}
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Leave empty to include all categories</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Regions
                          </label>
                          <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                            {regionOptions.map(region => (
                              <div key={region} className="flex items-center">
                                <input
                                  id={`region-${region}`}
                                  type="checkbox"
                                  checked={reportParameters.regions.includes(region)}
                                  onChange={() => handleRegionChange(region)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`region-${region}`} className="ml-2 block text-sm text-gray-700">
                                  {region}
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Leave empty to include all regions</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!generationSuccess && (
                  <>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateReport}
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        'Generate Report'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
