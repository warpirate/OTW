import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkerDocumentsService from '../../services/workerDocuments.service';
import WorkerHeader from '../../../components/WorkerHeader';

const WorkerDocuments = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('banking');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isDriver, setIsDriver] = useState(false);
  
  // Banking Details State
  const [bankingDetails, setBankingDetails] = useState([]);
  const [bankingForm, setBankingForm] = useState({
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    branch_name: '',
    account_type: 'savings',
    is_primary: false
  });
  const [editingBankId, setEditingBankId] = useState(null);
  
  // Documents State
  const [documents, setDocuments] = useState([]);
  const [documentForm, setDocumentForm] = useState({
    document_type: 'identity_proof',
    document: null
  });
  
  // Qualifications State
  const [qualifications, setQualifications] = useState([]);
  const [qualificationForm, setQualificationForm] = useState({
    qualification_name: '',
    issuing_institution: '',
    issue_date: '',
    certificate_number: '',
    certificate: null
  });
  
  // Driver Details State
  const [driverDetails, setDriverDetails] = useState(null);
  const [driverForm, setDriverForm] = useState({
    license_number: '',
    license_expiry_date: '',
    license_issuing_authority: '',
    vehicle_type: '',
    driving_experience_years: '',
    years_of_commercial_driving_exp: '',
    vehicle_registration_number: ''
  });
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchBankingDetails();
    fetchDocuments();
    fetchQualifications();
    checkDriverStatus();
  }, []);

  // Check if worker is registered as driver
  const checkDriverStatus = async () => {
    try {
      const response = await WorkerDocumentsService.checkDriverStatus();
      setIsDriver(response.isDriver);
      if (response.isDriver) {
        fetchDriverDetails();
      }
    } catch (error) {
      console.error('Error checking driver status:', error);
    }
  };

  // Fetch Banking Details
  const fetchBankingDetails = async () => {
    try {
      const response = await WorkerDocumentsService.getBankingDetails();
      setBankingDetails(response.bankingDetails);
    } catch (error) {
      console.error('Error fetching banking details:', error);
    }
  };

  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      const response = await WorkerDocumentsService.getDocuments();
      setDocuments(response.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Fetch Qualifications
  const fetchQualifications = async () => {
    try {
      const response = await WorkerDocumentsService.getQualifications();
      setQualifications(response.qualifications);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    }
  };

  // Fetch Driver Details
  const fetchDriverDetails = async () => {
    try {
      const response = await WorkerDocumentsService.getDriverDetails();
      if (response.driverDetails) {
        setDriverDetails(response.driverDetails);
        setDriverForm({
          license_number: response.driverDetails.license_number || '',
          license_expiry_date: response.driverDetails.license_expiry_date?.split('T')[0] || '',
          license_issuing_authority: response.driverDetails.license_issuing_authority || '',
          vehicle_type: response.driverDetails.vehicle_type || '',
          driving_experience_years: response.driverDetails.driving_experience_years || '',
          years_of_commercial_driving_exp: response.driverDetails.years_of_commercial_driving_exp || '',
          vehicle_registration_number: response.driverDetails.vehicle_registration_number || ''
        });
      }
    } catch (error) {
      console.error('Error fetching driver details:', error);
    }
  };

  // Handle Banking Form Submit
  const handleBankingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate all banking fields
    const nameError = validateName(bankingForm.account_holder_name);
    const accountError = validateAccountNumber(bankingForm.account_number);
    const ifscError = validateIFSC(bankingForm.ifsc_code);
    const bankNameError = validateName(bankingForm.bank_name);
    const branchError = validateBranchName(bankingForm.branch_name);

    const errors = {
      account_holder_name: nameError,
      account_number: accountError,
      ifsc_code: ifscError,
      bank_name: bankNameError,
      branch_name: branchError
    };

    setValidationErrors(errors);

    // Check if there are any validation errors
    if (Object.values(errors).some(error => error !== '')) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before submitting' });
      setLoading(false);
      return;
    }

    try {
      if (editingBankId) {
        await WorkerDocumentsService.updateBankingDetails(editingBankId, bankingForm);
        setMessage({ type: 'success', text: 'Banking details updated successfully!' });
      } else {
        await WorkerDocumentsService.createBankingDetails(bankingForm);
        setMessage({ type: 'success', text: 'Banking details added successfully!' });
      }
      fetchBankingDetails();
      resetBankingForm();
      setValidationErrors({});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save banking details' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate document file
    const fileError = validateFile(documentForm.document);
    
    if (fileError) {
      setValidationErrors({ document: fileError });
      setMessage({ type: 'error', text: fileError });
      setLoading(false);
      return;
    }

    try {
      await WorkerDocumentsService.uploadDocument(documentForm);
      setMessage({ type: 'success', text: 'Document uploaded successfully!' });
      fetchDocuments();
      setDocumentForm({ document_type: 'identity_proof', document: null });
      document.getElementById('document-file').value = '';
      setValidationErrors({});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload document' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Qualification Submit
  const handleQualificationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate qualification fields
    const qualNameError = validateName(qualificationForm.qualification_name);
    const institutionError = validateName(qualificationForm.issuing_institution);
    const certificateError = qualificationForm.certificate ? validateFile(qualificationForm.certificate) : '';

    const errors = {
      qualification_name: qualNameError,
      issuing_institution: institutionError,
      certificate: certificateError
    };

    setValidationErrors(errors);

    if (Object.values(errors).some(error => error !== '')) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before submitting' });
      setLoading(false);
      return;
    }

    try {
      await WorkerDocumentsService.createQualification(qualificationForm);
      setMessage({ type: 'success', text: 'Qualification added successfully!' });
      fetchQualifications();
      resetQualificationForm();
      // Clear file input
      const fileInput = document.getElementById('qualification-certificate');
      if (fileInput) fileInput.value = '';
      setValidationErrors({});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to add qualification' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Driver Details Submit
  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate driver fields
    const licenseError = validateLicenseNumber(driverForm.license_number);
    const vehicleRegError = driverForm.vehicle_registration_number ? 
      validateVehicleRegistration(driverForm.vehicle_registration_number) : '';

    const errors = {
      license_number: licenseError,
      vehicle_registration_number: vehicleRegError
    };

    setValidationErrors(errors);

    if (Object.values(errors).some(error => error !== '')) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before submitting' });
      setLoading(false);
      return;
    }

    try {
      await WorkerDocumentsService.saveDriverDetails(driverForm);
      setMessage({ type: 'success', text: 'Driver details saved successfully!' });
      fetchDriverDetails();
      setValidationErrors({});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save driver details' });
    } finally {
      setLoading(false);
    }
  };

  // Delete Banking Details
  const deleteBankingDetails = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banking detail?')) return;
    
    try {
      await WorkerDocumentsService.deleteBankingDetails(id);
      setMessage({ type: 'success', text: 'Banking details deleted successfully!' });
      fetchBankingDetails();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete banking details' });
    }
  };

  // Delete Document
  const deleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await WorkerDocumentsService.deleteDocument(id);
      setMessage({ type: 'success', text: 'Document deleted successfully!' });
      fetchDocuments();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete document' });
    }
  };

  // Download/View Document via presigned URL
  const downloadDocument = async (id) => {
    try {
      const resp = await WorkerDocumentsService.getDocumentPresignedUrl(id);
      const url = resp?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setMessage({ type: 'error', text: 'Unable to get document link' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to get document link' });
    }
  };

  // Delete Qualification
  const deleteQualification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this qualification?')) return;
    
    try {
      await WorkerDocumentsService.deleteQualification(id);
      setMessage({ type: 'success', text: 'Qualification deleted successfully!' });
      fetchQualifications();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete qualification' });
    }
  };

  // View Qualification Certificate
  const viewQualificationCertificate = async (id) => {
    try {
      const resp = await WorkerDocumentsService.getQualificationCertificatePresignedUrl(id);
      const url = resp?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setMessage({ type: 'error', text: 'Unable to get certificate link' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to get certificate link' });
    }
  };

  // Edit Banking Details
  const editBankingDetails = (bank) => {
    setBankingForm({
      account_holder_name: bank.account_holder_name,
      account_number: bank.account_number,
      ifsc_code: bank.ifsc_code,
      bank_name: bank.bank_name,
      branch_name: bank.branch_name || '',
      account_type: bank.account_type,
      is_primary: bank.is_primary === 1
    });
    setEditingBankId(bank.id);
    setActiveTab('banking');
  };

  // Reset Forms
  const resetBankingForm = () => {
    setBankingForm({
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      branch_name: '',
      account_type: 'savings',
      is_primary: false
    });
    setEditingBankId(null);
  };

  const resetQualificationForm = () => {
    setQualificationForm({
      qualification_name: '',
      issuing_institution: '',
      issue_date: '',
      certificate_number: '',
      certificate: null
    });
  };

  // Validation functions
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!name.trim()) return 'Name is required';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 50) return 'Name must be less than 50 characters';
    return '';
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone.trim()) return 'Phone number is required';
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const validateIFSC = (ifsc) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifsc.trim()) return 'IFSC code is required';
    if (!ifscRegex.test(ifsc.toUpperCase())) return 'IFSC code must be 11 characters (e.g., SBIN0001234)';
    return '';
  };

  const validateAccountNumber = (accountNumber) => {
    const accountRegex = /^[0-9]{9,18}$/;
    if (!accountNumber.trim()) return 'Account number is required';
    if (!/^[0-9]+$/.test(accountNumber.trim())) return 'Account number can only contain digits';
    if (!accountRegex.test(accountNumber.trim())) return 'Account number must be 9-18 digits';
    return '';
  };

  const validateBranchName = (branchName) => {
    if (!branchName.trim()) return 'Branch name is required';
    if (branchName.trim().length < 2) return 'Branch name must be at least 2 characters';
    if (branchName.trim().length > 100) return 'Branch name must be less than 100 characters';
    return '';
  };

  const validateFile = (file, maxSizeMB = 5) => {
    if (!file) return 'File is required';
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (!allowedTypes.includes(file.type)) {
      return 'File must be PDF, JPG, JPEG, or PNG format';
    }
    
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }
    
    return '';
  };

  const validateLicenseNumber = (licenseNumber) => {
    const licenseRegex = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;
    if (!licenseNumber.trim()) return 'License number is required';
    if (!licenseRegex.test(licenseNumber.toUpperCase().replace(/\s/g, ''))) {
      return 'Invalid license number format (e.g., MH1420110012345)';
    }
    return '';
  };

  const validateVehicleRegistration = (regNumber) => {
    const regRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    if (!regNumber.trim()) return 'Vehicle registration number is required';
    if (!regRegex.test(regNumber.toUpperCase().replace(/\s/g, ''))) {
      return 'Invalid registration format (e.g., MH12AB1234)';
    }
    return '';
  };

  // Real-time validation handler
  const handleValidation = (field, value, validationFunc) => {
    const error = validationFunc(value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
    return error === '';
  };

  const getDocumentTypeLabel = WorkerDocumentsService.getDocumentTypeLabel;
  const getStatusBadge = WorkerDocumentsService.getStatusBadge;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Documents & Banking Details</h1>
            <button
              onClick={() => navigate('/worker/profile')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Back to Profile
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('banking')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'banking'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Banking Details
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActiveTab('qualifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'qualifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Qualifications
              </button>
              {isDriver && (
                <button
                  onClick={() => setActiveTab('driver')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'driver'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Driver Details
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Banking Details Tab */}
            {activeTab === 'banking' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Banking Information</h2>
                
                {/* Banking Form */}
                <form onSubmit={handleBankingSubmit} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
                      <input
                        type="text"
                        value={bankingForm.account_holder_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBankingForm({...bankingForm, account_holder_name: value});
                          handleValidation('account_holder_name', value, validateName);
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                          validationErrors.account_holder_name 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        required
                      />
                      {validationErrors.account_holder_name && (
                        <p className="mt-1 text-xs text-red-600">{validationErrors.account_holder_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Number</label>
                      <input
                        type="text"
                        value={bankingForm.account_number}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBankingForm({...bankingForm, account_number: value});
                          handleValidation('account_number', value, validateAccountNumber);
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                          validationErrors.account_number 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="9-18 digits"
                        maxLength="18"
                        required
                      />
                      {validationErrors.account_number && (
                        <p className="mt-1 text-xs text-red-600">{validationErrors.account_number}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                      <input
                        type="text"
                        value={bankingForm.ifsc_code}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setBankingForm({...bankingForm, ifsc_code: value});
                          handleValidation('ifsc_code', value, validateIFSC);
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                          validationErrors.ifsc_code 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="e.g., SBIN0001234"
                        maxLength="11"
                        style={{ textTransform: 'uppercase' }}
                        required
                      />
                      {validationErrors.ifsc_code && (
                        <p className="mt-1 text-xs text-red-600">{validationErrors.ifsc_code}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                      <input
                        type="text"
                        value={bankingForm.bank_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBankingForm({...bankingForm, bank_name: value});
                          handleValidation('bank_name', value, validateName);
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                          validationErrors.bank_name 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="e.g., State Bank of India"
                        required
                      />
                      {validationErrors.bank_name && (
                        <p className="mt-1 text-xs text-red-600">{validationErrors.bank_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                      <input
                        type="text"
                        value={bankingForm.branch_name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setBankingForm({...bankingForm, branch_name: value});
                          handleValidation('branch_name', value, validateBranchName);
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                          validationErrors.branch_name 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="e.g., Main Branch, Hyderabad"
                        required
                      />
                      {validationErrors.branch_name && (
                        <p className="mt-1 text-xs text-red-600">{validationErrors.branch_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Type</label>
                      <select
                        value={bankingForm.account_type}
                        onChange={(e) => setBankingForm({...bankingForm, account_type: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={bankingForm.is_primary}
                      onChange={(e) => setBankingForm({...bankingForm, is_primary: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-900">
                      Set as Primary Account
                    </label>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : (editingBankId ? 'Update' : 'Add')} Banking Details
                    </button>
                    {editingBankId && (
                      <button
                        type="button"
                        onClick={resetBankingForm}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Banking Details List */}
                <div className="space-y-4">
                  {bankingDetails.map((bank) => (
                    <div key={bank.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{bank.account_holder_name}</h3>
                          <p className="text-sm text-gray-600">
                            {bank.bank_name} - {bank.branch_name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Account: ****{bank.account_number.slice(-4)} | IFSC: {bank.ifsc_code}
                          </p>
                          <p className="text-sm text-gray-600">
                            Type: {bank.account_type === 'savings' ? 'Savings' : 'Current'}
                          </p>
                          <div className="mt-2 flex space-x-2">
                            {bank.is_primary === 1 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Primary
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(bank.status)}`}>
                              {bank.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => editBankingDetails(bank)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteBankingDetails(bank.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {bankingDetails.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No banking details added yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
                
                {/* Document Upload Form */}
                <form onSubmit={handleDocumentUpload} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Document Type</label>
                      <select
                        value={documentForm.document_type}
                        onChange={(e) => setDocumentForm({...documentForm, document_type: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="identity_proof">Identity Proof (Aadhar/PAN)</option>
                        <option value="address_proof">Address Proof</option>
                        {isDriver && (
                          <>
                            <option value="drivers_license">Driver's License</option>
                            <option value="vehicle_registration">Vehicle Registration</option>
                          </>
                        )}
                        <option value="trade_certificate">Trade Certificate</option>
                        <option value="background_check">Background Check</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select File</label>
                      <input
                        type="file"
                        id="document-file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocumentForm({...documentForm, document: e.target.files[0]})}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">PDF, JPG, JPEG, PNG (Max 5MB)</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </form>

                {/* Documents List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm">{getDocumentTypeLabel(doc.document_type)}</h3>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => downloadDocument(doc.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Download
                          </button>
                          {!(doc.status && (doc.status.toLowerCase() === 'approved' || doc.status.toLowerCase() === 'verified')) && (
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                      {doc.remarks && (
                        <p className="text-xs text-gray-600 mt-1">Remarks: {doc.remarks}</p>
                      )}
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-gray-500 text-center py-4 col-span-3">No documents uploaded yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Qualifications Tab */}
            {activeTab === 'qualifications' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Professional Qualifications</h2>
                
                {/* Qualification Form */}
                <form onSubmit={handleQualificationSubmit} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Qualification Name</label>
                      <input
                        type="text"
                        value={qualificationForm.qualification_name}
                        onChange={(e) => setQualificationForm({...qualificationForm, qualification_name: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Issuing Institution</label>
                      <input
                        type="text"
                        value={qualificationForm.issuing_institution}
                        onChange={(e) => setQualificationForm({...qualificationForm, issuing_institution: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                      <input
                        type="date"
                        value={qualificationForm.issue_date}
                        onChange={(e) => setQualificationForm({...qualificationForm, issue_date: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Certificate Number</label>
                      <input
                        type="text"
                        value={qualificationForm.certificate_number}
                        onChange={(e) => setQualificationForm({...qualificationForm, certificate_number: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Certificate Document</label>
                      <input
                        type="file"
                        id="qualification-certificate"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setQualificationForm({...qualificationForm, certificate: e.target.files[0]})}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="mt-1 text-xs text-gray-500">Upload certificate document (PDF, JPG, JPEG, PNG - Max 5MB)</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Qualification'}
                  </button>
                </form>

                {/* Qualifications List */}
                <div className="space-y-4">
                  {qualifications.map((qual) => (
                    <div key={qual.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{qual.qualification_name}</h3>
                          <p className="text-sm text-gray-600">{qual.issuing_institution}</p>
                          {qual.issue_date && (
                            <p className="text-sm text-gray-600">
                              Issued: {new Date(qual.issue_date).toLocaleDateString()}
                            </p>
                          )}
                          {qual.certificate_number && (
                            <p className="text-sm text-gray-600">Certificate: {qual.certificate_number}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(qual.status || 'pending_review')}`}>
                              {(qual.status || 'pending_review').replace('_', ' ')}
                            </span>
                            {qual.certificate_url && (
                              <button
                                onClick={() => viewQualificationCertificate(qual.id)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                View Certificate
                              </button>
                            )}
                          </div>
                          {qual.remarks && (
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Admin Remarks:</span> {qual.remarks}
                            </p>
                          )}
                          {qual.created_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Added: {new Date(qual.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!(qual.status && (qual.status.toLowerCase() === 'approved')) && (
                            <button
                              onClick={() => deleteQualification(qual.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {qualifications.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No qualifications added yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Driver Details Tab */}
            {activeTab === 'driver' && isDriver && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Driver Information</h2>
                
                {/* Driver Details Form */}
                <form onSubmit={handleDriverSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <input
                        type="text"
                        value={driverForm.license_number}
                        onChange={(e) => setDriverForm({...driverForm, license_number: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Expiry Date</label>
                      <input
                        type="date"
                        value={driverForm.license_expiry_date}
                        onChange={(e) => setDriverForm({...driverForm, license_expiry_date: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Issuing Authority</label>
                      <input
                        type="text"
                        value={driverForm.license_issuing_authority}
                        onChange={(e) => setDriverForm({...driverForm, license_issuing_authority: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                      <select
                        value={driverForm.vehicle_type}
                        onChange={(e) => setDriverForm({...driverForm, vehicle_type: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Vehicle Type</option>
                        <option value="two_wheeler">Two Wheeler</option>
                        <option value="four_wheeler">Four Wheeler</option>
                        <option value="heavy_vehicle">Heavy Vehicle</option>
                        <option value="commercial">Commercial Vehicle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Driving Experience (Years)</label>
                      <input
                        type="number"
                        value={driverForm.driving_experience_years}
                        onChange={(e) => setDriverForm({...driverForm, driving_experience_years: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Commercial Driving Experience (Years)</label>
                      <input
                        type="number"
                        value={driverForm.years_of_commercial_driving_exp}
                        onChange={(e) => setDriverForm({...driverForm, years_of_commercial_driving_exp: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Vehicle Registration Number</label>
                      <input
                        type="text"
                        value={driverForm.vehicle_registration_number}
                        onChange={(e) => setDriverForm({...driverForm, vehicle_registration_number: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (driverDetails ? 'Update' : 'Save')} Driver Details
                  </button>
                </form>

                {driverDetails && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Current Driver Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <p><span className="font-medium">License:</span> {driverDetails.license_number}</p>
                      <p><span className="font-medium">Expiry:</span> {new Date(driverDetails.license_expiry_date).toLocaleDateString()}</p>
                      <p><span className="font-medium">Vehicle Type:</span> {driverDetails.vehicle_type}</p>
                      <p><span className="font-medium">Experience:</span> {driverDetails.driving_experience_years} years</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDocuments;
