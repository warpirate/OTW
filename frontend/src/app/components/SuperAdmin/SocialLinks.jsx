import React, { useState, useEffect } from 'react';
import { 
    Share2, Plus, Edit2, Trash2, Eye, EyeOff, 
    Search, Filter, ChevronUp, ChevronDown, 
    Loader2, Check, X, ExternalLink, Globe,
    Facebook, Twitter, Instagram, Linkedin, Youtube,
    Github, MessageCircle, Phone, Mail
} from 'lucide-react';
import siteManagementService from '../../services/siteManagement.service';
import { toast } from 'react-hot-toast';

const SocialLinks = () => {
    const [links, setLinks] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingLink, setEditingLink] = useState(null);
    const [filters, setFilters] = useState({
        platform: '',
        is_active: '',
        position: '',
        search: ''
    });
    const [formData, setFormData] = useState({
        platform: '',
        platform_name: '',
        platform_icon: '',
        platform_color: '#1877f2',
        url: '',
        display_order: 0,
        is_active: true,
        open_in_new_tab: true,
        show_in_footer: true,
        show_in_header: false,
        show_in_mobile: true
    });
    const [saving, setSaving] = useState(false);

    const positions = [
        { value: 'header', label: 'Header' },
        { value: 'footer', label: 'Footer' },
        { value: 'sidebar', label: 'Sidebar' },
        { value: 'contact', label: 'Contact Page' }
    ];

    const platformIcons = {
        facebook: Facebook,
        twitter: Twitter,
        instagram: Instagram,
        linkedin: Linkedin,
        youtube: Youtube,
        github: Github,
        whatsapp: MessageCircle,
        telegram: MessageCircle,
        phone: Phone,
        email: Mail,
        website: Globe
    };

    useEffect(() => {
        fetchLinks();
        fetchPlatforms();
    }, [filters]);

    const fetchLinks = async () => {
        try {
            setLoading(true);
            const response = await siteManagementService.getSocialLinks();
            if (response.success) {
                let filteredLinks = response.data;
                
                // Apply filters
                if (filters.platform) {
                    filteredLinks = filteredLinks.filter(link => 
                        link.platform.toLowerCase().includes(filters.platform.toLowerCase())
                    );
                }
                if (filters.is_active !== '') {
                    filteredLinks = filteredLinks.filter(link => 
                        link.is_active === (filters.is_active === 'true')
                    );
                }
                if (filters.position) {
                    filteredLinks = filteredLinks.filter(link => 
                        link.position === filters.position
                    );
                }
                if (filters.search) {
                    filteredLinks = filteredLinks.filter(link => 
                        link.display_text.toLowerCase().includes(filters.search.toLowerCase()) ||
                        link.url.toLowerCase().includes(filters.search.toLowerCase())
                    );
                }
                
                setLinks(filteredLinks);
            }
        } catch (error) {
            console.error('Error fetching social links:', error);
            toast.error('Failed to load social links');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlatforms = async () => {
        try {
            const response = await siteManagementService.getSocialPlatforms();
            if (response.success) {
                setPlatforms(response.data);
            }
        } catch (error) {
            console.error('Error fetching platforms:', error);
        }
    };

    const handleCreateLink = () => {
        setEditingLink(null);
        setFormData({
            platform: '',
            platform_name: '',
            platform_icon: '',
            platform_color: '#1877f2',
            url: '',
            display_order: 0,
            is_active: true,
            open_in_new_tab: true,
            show_in_footer: true,
            show_in_header: false,
            show_in_mobile: true
        });
        setShowEditor(true);
    };

    const handleEditLink = async (link) => {
        setEditingLink(link.id);
        setFormData({
            platform: link.platform,
            platform_name: link.platform_name,
            platform_icon: link.platform_icon,
            platform_color: link.platform_color,
            url: link.url,
            display_order: link.display_order,
            is_active: link.is_active,
            open_in_new_tab: link.open_in_new_tab,
            show_in_footer: link.show_in_footer,
            show_in_header: link.show_in_header,
            show_in_mobile: link.show_in_mobile
        });
        setShowEditor(true);
    };

    const handleSaveLink = async () => {
        try {
            setSaving(true);
            
            if (!formData.platform) {
                toast.error('Platform is required');
                return;
            }
            
            if (!formData.url) {
                toast.error('URL is required');
                return;
            }
            
            let response;
            if (editingLink) {
                response = await siteManagementService.updateSocialLink(editingLink, formData);
            } else {
                response = await siteManagementService.createSocialLink(formData);
            }
            
            if (response.success) {
                toast.success(editingLink ? 'Social link updated successfully' : 'Social link created successfully');
                setShowEditor(false);
                fetchLinks();
            }
        } catch (error) {
            console.error('Error saving social link:', error);
            toast.error('Failed to save social link');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLink = async (id) => {
        if (!window.confirm('Are you sure you want to delete this social link?')) {
            return;
        }
        
        try {
            const response = await siteManagementService.deleteSocialLink(id);
            if (response.success) {
                toast.success('Social link deleted successfully');
                fetchLinks();
            }
        } catch (error) {
            console.error('Error deleting social link:', error);
            toast.error('Failed to delete social link');
        }
    };

    const handleToggleLink = async (id) => {
        try {
            const response = await siteManagementService.toggleSocialLink(id);
            if (response.success) {
                toast.success('Social link status updated');
                fetchLinks();
            }
        } catch (error) {
            console.error('Error toggling social link:', error);
            toast.error('Failed to update social link status');
        }
    };

    const handlePlatformChange = (platform) => {
        const platformData = platforms.find(p => p.platform === platform);
        if (platformData) {
            setFormData(prev => ({
                ...prev,
                platform,
                platform_name: platformData.name,
                platform_icon: platformData.icon,
                platform_color: platformData.color
            }));
        }
    };

    const getPlatformIcon = (platform) => {
        const IconComponent = platformIcons[platform.toLowerCase()] || Globe;
        return IconComponent;
    };

    const getStatusBadge = (isActive) => {
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                isActive 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
            }`}>
                {isActive ? 'Active' : 'Inactive'}
            </span>
        );
    };

    if (loading && !showEditor) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (showEditor) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-gray-50 rounded-lg shadow-lg">
                    {/* Editor Header */}
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingLink ? 'Edit Social Link' : 'Create New Social Link'}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveLink}
                                    disabled={saving}
                                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    {saving ? 'Saving...' : 'Save Link'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Editor Content */}
                    <div className="p-6 space-y-6">
                        {/* Platform Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Platform *
                                </label>
                                <select
                                    value={formData.platform}
                                    onChange={(e) => handlePlatformChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    <option value="">Select Platform</option>
                                    {platforms.map(platform => (
                                        <option key={platform.platform} value={platform.platform}>
                                            {platform.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Platform Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.platform_name}
                                    onChange={(e) => setFormData({...formData, platform_name: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Platform display name"
                                />
                            </div>
                        </div>

                        {/* URL and Display Text */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    URL *
                                </label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="https://example.com"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Platform Icon
                                </label>
                                <input
                                    type="text"
                                    value={formData.platform_icon}
                                    onChange={(e) => setFormData({...formData, platform_icon: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Icon class (e.g., fab fa-facebook-f)"
                                />
                            </div>
                        </div>

                        {/* Colors and Order */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Icon Color
                                </label>
                                <input
                                    type="color"
                                    value={formData.platform_color}
                                    onChange={(e) => setFormData({...formData, platform_color: e.target.value})}
                                    className="w-full h-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Display Options */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-700">Display Options</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.show_in_footer}
                                        onChange={(e) => setFormData({...formData, show_in_footer: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Show in Footer
                                    </span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.show_in_header}
                                        onChange={(e) => setFormData({...formData, show_in_header: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Show in Header
                                    </span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.show_in_mobile}
                                        onChange={(e) => setFormData({...formData, show_in_mobile: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Show on Mobile
                                    </span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Active
                                    </span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.open_in_new_tab}
                                        onChange={(e) => setFormData({...formData, open_in_new_tab: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Open in New Tab
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Preview */}
                        {formData.platform && (
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                                <div className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div 
                                        className="w-8 h-8 rounded flex items-center justify-center"
                                        style={{ 
                                            backgroundColor: '#f3f4f6',
                                            color: formData.platform_color 
                                        }}
                                    >
                                        {React.createElement(getPlatformIcon(formData.platform), { size: 16 })}
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formData.platform_name || formData.platform}
                                    </span>
                                    {formData.open_in_new_tab && (
                                        <ExternalLink className="w-3 h-3 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
                                Social Links
                            </h2>
                            <p className="text-gray-600 mt-1">
                                Manage social media links and external connections
                            </p>
                        </div>
                        
                        <button
                            onClick={handleCreateLink}
                            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Social Link
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="border-b border-gray-200 p-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search links..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                />
                            </div>
                        </div>
                        
                        <select
                            value={filters.position}
                            onChange={(e) => setFilters({...filters, position: e.target.value})}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        >
                            <option value="">All Positions</option>
                            {positions.map(position => (
                                <option key={position.value} value={position.value}>
                                    {position.label}
                                </option>
                            ))}
                        </select>
                        
                        <select
                            value={filters.is_active}
                            onChange={(e) => setFilters({...filters, is_active: e.target.value})}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Links List */}
                <div className="divide-y divide-gray-200">
                    {links.map(link => {
                        const IconComponent = getPlatformIcon(link.platform);
                        return (
                            <div key={link.id} className="p-4 hover:bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ 
                                                backgroundColor: link.background_color,
                                                color: link.icon_color 
                                            }}
                                        >
                                            <IconComponent size={20} />
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {link.display_text}
                                                </h3>
                                                {getStatusBadge(link.is_active)}
                                                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                                                    {link.position}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center">
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    {link.url}
                                                </span>
                                                <span>Order: {link.display_order}</span>
                                                {link.open_in_new_tab && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        New Tab
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.open(link.url, '_blank')}
                                            className="p-2 text-gray-600 hover:text-blue-600"
                                            title="Visit Link"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggleLink(link.id)}
                                            className={`p-2 hover:text-blue-600 ${
                                                link.is_active 
                                                    ? 'text-green-600' 
                                                    : 'text-red-600'
                                            }`}
                                            title={link.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            {link.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleEditLink(link)}
                                            className="p-2 text-gray-600 hover:text-blue-600"
                                            title="Edit Link"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLink(link.id)}
                                            className="p-2 text-gray-600 hover:text-red-600"
                                            title="Delete Link"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {links.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No social links found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialLinks;
