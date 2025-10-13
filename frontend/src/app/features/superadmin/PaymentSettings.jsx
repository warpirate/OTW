import React, { useState, useEffect } from 'react';
import PaymentSettingsService from '../../services/paymentSettings.service';

const PaymentSettings = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  // Form states
  const [formData, setFormData] = useState({
    key_name: '',
    key_value: '',
    key_type: 'razorpay',
    is_sensitive: true,
    description: ''
  });

  const [showPassword, setShowPassword] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await PaymentSettingsService.getAllKeys();
      setKeys(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment keys');
      console.error('Error loading keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (key) => {
    try {
      setSaveStatus('loading');
      const response = await PaymentSettingsService.getDecryptedKey(key.id);
      setEditingKey({
        ...key,
        key_value: response.data.key_value
      });
      setFormData({
        key_value: response.data.key_value,
        description: key.description || ''
      });
      setSaveStatus(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to decrypt key');
      setSaveStatus('error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!formData.key_value) {
      setError('Key value is required');
      return;
    }

    try {
      setSaveStatus('saving');
      await PaymentSettingsService.updateKey(editingKey.id, {
        key_value: formData.key_value,
        description: formData.description
      });
      
      setSaveStatus('success');
      setTimeout(() => {
        setEditingKey(null);
        setFormData({ key_name: '', key_value: '', key_type: 'razorpay', is_sensitive: true, description: '' });
        setSaveStatus(null);
        loadKeys();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update key');
      setSaveStatus('error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.key_name || !formData.key_value || !formData.key_type) {
      setError('All fields are required');
      return;
    }

    try {
      setSaveStatus('saving');
      await PaymentSettingsService.createKey(formData);
      
      setSaveStatus('success');
      setTimeout(() => {
        setShowCreateModal(false);
        setFormData({ key_name: '', key_value: '', key_type: 'razorpay', is_sensitive: true, description: '' });
        setSaveStatus(null);
        loadKeys();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create key');
      setSaveStatus('error');
    }
  };

  const handleDelete = async (keyId) => {
    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) {
      return;
    }

    try {
      await PaymentSettingsService.deleteKey(keyId);
      loadKeys();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete key');
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await PaymentSettingsService.getAuditLogs({ limit: 100 });
      setAuditLogs(response.data || []);
      setShowAuditLogs(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    }
  };

  const togglePasswordVisibility = (keyId) => {
    setShowPassword(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const getKeysByType = (type) => {
    if (type === 'all') return keys;
    return keys.filter(key => key.key_type === type);
  };

  const keyTypes = [
    { value: 'all', label: 'All Keys', icon: 'fa-list' },
    { value: 'razorpay', label: 'Razorpay', icon: 'fa-credit-card' },
    { value: 'google_maps', label: 'Google Maps', icon: 'fa-map-marked-alt' },
    { value: 'aws', label: 'AWS', icon: 'fa-cloud' },
    { value: 'jwt', label: 'JWT', icon: 'fa-key' },
    { value: 'email', label: 'Email', icon: 'fa-envelope' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Payment & API Settings</h1>
          <p className="text-gray-600 mt-1">Securely manage payment gateway credentials and API keys</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadAuditLogs}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-history mr-2"></i>
            Audit Logs
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <i className="fas fa-plus mr-2"></i>
            Add New Key
          </button>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <i className="fas fa-exclamation-triangle text-yellow-400 mt-1 mr-3"></i>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <p className="text-sm text-yellow-700 mt-1">
              All credentials are encrypted using AES-256-GCM. Never share these keys or expose them in client-side code.
              All changes are logged for security auditing.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <i className="fas fa-exclamation-circle text-red-400 mt-1 mr-3"></i>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {keyTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setActiveTab(type.value)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === type.value
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`fas ${type.icon} mr-2`}></i>
                {type.label}
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
                  {getKeysByType(type.value).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Keys List */}
        <div className="p-6">
          {getKeysByType(activeTab).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-key text-4xl mb-4"></i>
              <p>No keys found in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getKeysByType(activeTab).map(key => (
                <div
                  key={key.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-800">{key.key_name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          key.key_type === 'razorpay' ? 'bg-blue-100 text-blue-800' :
                          key.key_type === 'google_maps' ? 'bg-green-100 text-green-800' :
                          key.key_type === 'aws' ? 'bg-orange-100 text-orange-800' :
                          key.key_type === 'jwt' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {key.key_type}
                        </span>
                        {key.is_sensitive && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            <i className="fas fa-lock mr-1"></i>Sensitive
                          </span>
                        )}
                      </div>
                      {key.description && (
                        <p className="text-sm text-gray-600 mt-2">{key.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>
                          <i className="fas fa-clock mr-1"></i>
                          Updated: {new Date(key.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(key)}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Edit API Key</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={editingKey.key_name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Value *
                </label>
                <div className="relative">
                  <input
                    type={showPassword[editingKey.id] ? 'text' : 'password'}
                    value={formData.key_value}
                    onChange={(e) => setFormData({ ...formData, key_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(editingKey.id)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <i className={`fas ${showPassword[editingKey.id] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="3"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(null);
                    setFormData({ key_name: '', key_value: '', key_type: 'razorpay', is_sensitive: true, description: '' });
                    setSaveStatus(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Saving...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <i className="fas fa-check mr-2"></i>
                      Saved!
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add New API Key</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name *
                </label>
                <input
                  type="text"
                  value={formData.key_name}
                  onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., RAZORPAY_KEY_ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Type *
                </label>
                <select
                  value={formData.key_type}
                  onChange={(e) => setFormData({ ...formData, key_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="google_maps">Google Maps</option>
                  <option value="aws">AWS</option>
                  <option value="jwt">JWT</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Value *
                </label>
                <div className="relative">
                  <input
                    type={showPassword['new'] ? 'text' : 'password'}
                    value={formData.key_value}
                    onChange={(e) => setFormData({ ...formData, key_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <i className={`fas ${showPassword['new'] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="What is this key used for?"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_sensitive"
                  checked={formData.is_sensitive}
                  onChange={(e) => setFormData({ ...formData, is_sensitive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_sensitive" className="text-sm text-gray-700">
                  Mark as sensitive (will be masked in UI)
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ key_name: '', key_value: '', key_type: 'razorpay', is_sensitive: true, description: '' });
                    setSaveStatus(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <i className="fas fa-check mr-2"></i>
                      Created!
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus mr-2"></i>
                      Create Key
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Payment Key Audit Logs</h2>
              <button
                onClick={() => setShowAuditLogs(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.key_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.action === 'created' ? 'bg-green-100 text-green-800' :
                          log.action === 'updated' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'deleted' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.changed_by_name || log.changed_by_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettings;
