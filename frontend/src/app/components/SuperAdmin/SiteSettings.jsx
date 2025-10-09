import React, { useState, useEffect } from 'react';
import { 
    Settings, Globe, Mail, Phone, MapPin, Clock, 
    DollarSign, Bell, Shield, Image, Save, Upload,
    AlertCircle, Check, X, Loader2, Building2,
    MessageSquare, Facebook, Twitter, Instagram
} from 'lucide-react';
import siteManagementService from '../../services/siteManagement.service';
import { toast } from 'react-hot-toast';

const SiteSettings = () => {
    const [settings, setSettings] = useState({});
    const [originalSettings, setOriginalSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [files, setFiles] = useState({
        site_logo: null,
        site_favicon: null,
        site_logo_dark: null
    });
    const [previewUrls, setPreviewUrls] = useState({
        site_logo: null,
        site_favicon: null,
        site_logo_dark: null
    });

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'company', label: 'Company Info', icon: Building2 },
        { id: 'contact', label: 'Contact', icon: Phone }
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await siteManagementService.getSiteSettings();
            if (response.success) {
                setSettings(response.data);
                setOriginalSettings(response.data);
                
                // Set preview URLs for existing images
                if (response.data.site_logo_url) {
                    setPreviewUrls(prev => ({ ...prev, site_logo: response.data.site_logo_url }));
                }
                if (response.data.site_favicon_url) {
                    setPreviewUrls(prev => ({ ...prev, site_favicon: response.data.site_favicon_url }));
                }
                if (response.data.site_logo_dark_url) {
                    setPreviewUrls(prev => ({ ...prev, site_logo_dark: response.data.site_logo_dark_url }));
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load site settings');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFileChange = (field, file) => {
        if (file) {
            setFiles(prev => ({
                ...prev,
                [field]: file
            }));
            
            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrls(prev => ({
                ...prev,
                [field]: url
            }));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Only send changed fields
            const changedSettings = {};
            Object.keys(settings).forEach(key => {
                if (settings[key] !== originalSettings[key]) {
                    changedSettings[key] = settings[key];
                }
            });
            
            const response = await siteManagementService.updateSiteSettings(changedSettings, files);
            
            if (response.success) {
                toast.success('Site settings updated successfully');
                setOriginalSettings(settings);
                setFiles({
                    site_logo: null,
                    site_favicon: null,
                    site_logo_dark: null
                });
                fetchSettings(); // Refresh to get new presigned URLs
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save site settings');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = () => {
        return JSON.stringify(settings) !== JSON.stringify(originalSettings) || 
               Object.values(files).some(file => file !== null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="bg-gray-50 rounded-lg shadow-lg">
                {/* Header */}
                <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Site Settings
                            </h2>
                            <p className="text-gray-600 mt-1">
                                Manage your website's global configuration and settings
                            </p>
                        </div>
                        
                        {hasChanges() && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Site Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.site_name || ''}
                                        onChange={(e) => handleInputChange('site_name', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="Enter site name"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Site Tagline
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.site_tagline || ''}
                                        onChange={(e) => handleInputChange('site_tagline', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="Enter site tagline"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Site Description
                                </label>
                                <textarea
                                    value={settings.site_description || ''}
                                    onChange={(e) => handleInputChange('site_description', e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Enter site description"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Copyright Text
                                </label>
                                <input
                                    type="text"
                                    value={settings.copyright_text || ''}
                                    onChange={(e) => handleInputChange('copyright_text', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="© 2025 Your Company. All rights reserved."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.company_name || ''}
                                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="Enter company name"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Company Registration Number
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.company_registration || ''}
                                        onChange={(e) => handleInputChange('company_registration', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="Enter registration number"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Company Address
                                </label>
                                <textarea
                                    value={settings.company_address || ''}
                                    onChange={(e) => handleInputChange('company_address', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Enter company address"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.gst_number || ''}
                                        onChange={(e) => handleInputChange('gst_number', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="Enter GST number"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        PAN Number
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.pan_number || ''}
                                        onChange={(e) => handleInputChange('pan_number', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="Enter PAN number"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contact' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Support Email
                                    </label>
                                    <input
                                        type="email"
                                        value={settings.support_email || ''}
                                        onChange={(e) => handleInputChange('support_email', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="support@example.com"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Support Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={settings.support_phone || ''}
                                        onChange={(e) => handleInputChange('support_phone', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        placeholder="+91-9876543210"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    value={settings.whatsapp_number || ''}
                                    onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="+91-9876543210"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SiteSettings;
