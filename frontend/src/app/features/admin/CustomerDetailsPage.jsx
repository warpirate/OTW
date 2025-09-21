import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import AdminService from '../../services/admin.service';

const CustomerDetailsPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [types, setTypes] = useState([]);
  const [savingType, setSavingType] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState({});
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (customerId) fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadTypes = async () => {
    try {
      const resp = await AdminService.getCustomerTypes();
      setTypes(resp.data || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const resp = await AdminService.getCustomer(customerId);
      if (resp.success) {
        setCustomer(resp.data.customer);
        setSelectedType(resp.data.customer.customer_type_id || '');
        setDocuments(resp.data.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateType = async () => {
    try {
      setSavingType(true);
      await AdminService.updateCustomerType(customerId, Number(selectedType));
      await fetchCustomer();
    } catch (e) {
      console.error(e);
      alert('Failed to update customer type');
    } finally {
      setSavingType(false);
    }
  };

  const openDocument = async (documentId) => {
    try {
      const resp = await AdminService.getCustomerDocPresignedUrl(documentId);
      const url = resp?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      alert('Unable to open document');
    }
  };

  const verifyDocument = async (documentId, status) => {
    try {
      setVerificationLoading(prev => ({ ...prev, [documentId]: true }));
      await AdminService.verifyCustomerDocument(documentId, status);
      await fetchCustomer();
    } catch (e) {
      console.error(e);
      alert('Failed to update document status');
    } finally {
      setVerificationLoading(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const badgeClass = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'verified') return 'bg-green-100 text-green-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/admin/customers')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back to Customers
        </button>
        <div className="mt-6 text-gray-700">Customer not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin/customers')}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-gray-600">Customer ID: {customer.id}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Type: {customer.customer_type_name || 'Normal'}</span>
          <span className="px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Discount: {customer.discount_percentage ?? 0}%</span>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Basic Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="text-gray-900">{customer.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Phone</div>
            <div className="text-gray-900">{customer.phone_number}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Created</div>
            <div className="text-gray-900">{new Date(customer.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Customer Type */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Type & Discount</h2>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Select Type</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.discount_percentage}%)</option>
            ))}
          </select>
          <button
            onClick={updateType}
            disabled={!selectedType || savingType}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {savingType ? 'Saving...' : 'Save Type'}
          </button>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Verification Documents</h2>
        {documents.length === 0 ? (
          <div className="text-gray-600">No documents uploaded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 capitalize">{doc.document_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badgeClass(doc.verification_status)}`}>
                        {doc.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(doc.uploaded_at).toLocaleString()}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => openDocument(doc.id)} className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                        <EyeIcon className="h-4 w-4 mr-1" /> View
                      </button>
                      {doc.verification_status !== 'verified' && (
                        <>
                          <button
                            onClick={() => verifyDocument(doc.id, 'verified')}
                            disabled={!!verificationLoading[doc.id]}
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" /> {verificationLoading[doc.id] ? 'Verifying...' : 'Verify'}
                          </button>
                          <button
                            onClick={() => verifyDocument(doc.id, 'rejected')}
                            disabled={!!verificationLoading[doc.id]}
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
