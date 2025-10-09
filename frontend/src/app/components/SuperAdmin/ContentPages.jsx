import React, { useState, useEffect } from 'react';
import { 
    FileText, Plus, Edit2, Trash2, Eye, Copy, 
    Search, Filter, ChevronRight, Globe, Lock,
    Calendar, User, MoreVertical, Loader2, Check, X
} from 'lucide-react';
import siteManagementService from '../../services/siteManagement.service';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ContentPages = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [filters, setFilters] = useState({
        page_type: '',
        page_status: '',
        search: ''
    });
    const [formData, setFormData] = useState({
        page_key: '',
        page_title: '',
        page_subtitle: '',
        page_content: '',
        page_type: 'static',
        page_status: 'draft',
        page_order: 0,
        show_in_footer: true,
        show_in_header: false,
        show_in_sitemap: true,
        requires_auth: false,
        meta_title: '',
        meta_description: '',
        meta_keywords: '',
        og_title: '',
        og_description: '',
        custom_css: '',
        custom_js: ''
    });
    const [ogImage, setOgImage] = useState(null);
    const [saving, setSaving] = useState(false);

    const pageTypes = [
        { value: 'static', label: 'Static Page' },
        { value: 'legal', label: 'Legal Document' },
        { value: 'help', label: 'Help Article' },
        { value: 'blog', label: 'Blog Post' },
        { value: 'custom', label: 'Custom Page' }
    ];

    const pageStatuses = [
        { value: 'draft', label: 'Draft', color: 'yellow' },
        { value: 'published', label: 'Published', color: 'green' },
        { value: 'archived', label: 'Archived', color: 'gray' }
    ];

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
        ]
    };

    useEffect(() => {
        fetchPages();
    }, [filters]);

    const fetchPages = async () => {
        try {
            setLoading(true);
            const response = await siteManagementService.getContentPages(filters);
            if (response.success) {
                setPages(response.data);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
            toast.error('Failed to load content pages');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePage = () => {
        setEditingPage(null);
        setFormData({
            page_key: '',
            page_title: '',
            page_subtitle: '',
            page_content: '',
            page_type: 'static',
            page_status: 'draft',
            page_order: 0,
            show_in_footer: true,
            show_in_header: false,
            show_in_sitemap: true,
            requires_auth: false,
            meta_title: '',
            meta_description: '',
            meta_keywords: '',
            og_title: '',
            og_description: '',
            custom_css: '',
            custom_js: ''
        });
        setOgImage(null);
        setShowEditor(true);
    };

    const handleEditPage = async (page) => {
        try {
            const response = await siteManagementService.getContentPage(page.id);
            if (response.success) {
                setEditingPage(page.id);
                setFormData(response.data);
                setShowEditor(true);
            }
        } catch (error) {
            console.error('Error fetching page details:', error);
            toast.error('Failed to load page details');
        }
    };

    const handleSavePage = async () => {
        try {
            setSaving(true);
            
            if (!formData.page_title) {
                toast.error('Page title is required');
                return;
            }
            
            if (!formData.page_content) {
                toast.error('Page content is required');
                return;
            }
            
            let response;
            if (editingPage) {
                response = await siteManagementService.updateContentPage(editingPage, formData, ogImage);
            } else {
                response = await siteManagementService.createContentPage(formData, ogImage);
            }
            
            if (response.success) {
                toast.success(editingPage ? 'Page updated successfully' : 'Page created successfully');
                setShowEditor(false);
                fetchPages();
            }
        } catch (error) {
            console.error('Error saving page:', error);
            toast.error('Failed to save page');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePage = async (id) => {
        if (!window.confirm('Are you sure you want to delete this page?')) {
            return;
        }
        
        try {
            const response = await siteManagementService.deleteContentPage(id);
            if (response.success) {
                toast.success('Page deleted successfully');
                fetchPages();
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            toast.error('Failed to delete page');
        }
    };

    const handleDuplicatePage = async (id) => {
        try {
            const response = await siteManagementService.duplicateContentPage(id);
            if (response.success) {
                toast.success('Page duplicated successfully');
                fetchPages();
            }
        } catch (error) {
            console.error('Error duplicating page:', error);
            toast.error('Failed to duplicate page');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = pageStatuses.find(s => s.value === status);
        const colors = {
            green: 'bg-green-100 text-green-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            gray: 'bg-gray-100 text-gray-800'
        };
        
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[statusConfig?.color || 'gray']}`}>
                {statusConfig?.label || status}
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
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-gray-50 rounded-lg shadow-lg">
                    {/* Editor Header */}
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingPage ? 'Edit Page' : 'Create New Page'}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePage}
                                    disabled={saving}
                                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    {saving ? 'Saving...' : 'Save Page'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Editor Content */}
                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Page Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.page_title}
                                    onChange={(e) => setFormData({...formData, page_title: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Enter page title"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Page Key (URL Slug)
                                </label>
                                <input
                                    type="text"
                                    value={formData.page_key}
                                    onChange={(e) => setFormData({...formData, page_key: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="about-us (auto-generated if empty)"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Page Subtitle
                            </label>
                            <input
                                type="text"
                                value={formData.page_subtitle}
                                onChange={(e) => setFormData({...formData, page_subtitle: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                placeholder="Optional subtitle"
                            />
                        </div>

                        {/* Page Content */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Page Content *
                            </label>
                            <div className="border border-gray-300 rounded-lg">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.page_content}
                                    onChange={(value) => setFormData({...formData, page_content: value})}
                                    modules={quillModules}
                                    className="bg-white"
                                    style={{ minHeight: '300px' }}
                                />
                            </div>
                        </div>

                        {/* Page Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Page Type
                                </label>
                                <select
                                    value={formData.page_type}
                                    onChange={(e) => setFormData({...formData, page_type: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    {pageTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.page_status}
                                    onChange={(e) => setFormData({...formData, page_status: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    {pageStatuses.map(status => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    value={formData.page_order}
                                    onChange={(e) => setFormData({...formData, page_order: parseInt(e.target.value) || 0})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Display Options */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-700">Display Options</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { field: 'show_in_footer', label: 'Show in Footer' },
                                    { field: 'show_in_header', label: 'Show in Header' },
                                    { field: 'show_in_sitemap', label: 'Include in Sitemap' },
                                    { field: 'requires_auth', label: 'Requires Authentication' }
                                ].map(option => (
                                    <label key={option.field} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData[option.field]}
                                            onChange={(e) => setFormData({...formData, [option.field]: e.target.checked})}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            {option.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* SEO Settings */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-700">SEO Settings</h3>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Meta Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.meta_title}
                                    onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="SEO optimized title"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Meta Description
                                </label>
                                <textarea
                                    value={formData.meta_description}
                                    onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="SEO optimized description"
                                />
                            </div>
                        </div>
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
                                Content Pages
                            </h2>
                            <p className="text-gray-600 mt-1">
                                Manage static pages, legal documents, and help articles
                            </p>
                        </div>
                        
                        <button
                            onClick={handleCreatePage}
                            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Page
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
                                    placeholder="Search pages..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                />
                            </div>
                        </div>
                        
                        <select
                            value={filters.page_type}
                            onChange={(e) => setFilters({...filters, page_type: e.target.value})}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        >
                            <option value="">All Types</option>
                            {pageTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        
                        <select
                            value={filters.page_status}
                            onChange={(e) => setFilters({...filters, page_status: e.target.value})}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        >
                            <option value="">All Status</option>
                            {pageStatuses.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Pages List */}
                <div className="divide-y divide-gray-200">
                    {pages.map(page => (
                        <div key={page.id} className="p-4 hover:bg-white">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {page.page_title}
                                        </h3>
                                        {getStatusBadge(page.page_status)}
                                        <span className="text-xs text-gray-500">
                                            {page.page_type}
                                        </span>
                                    </div>
                                    
                                    {page.page_subtitle && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            {page.page_subtitle}
                                        </p>
                                    )}
                                    
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center">
                                            <FileText className="w-3 h-3 mr-1" />
                                            /{page.page_key}
                                        </span>
                                        {page.view_count > 0 && (
                                            <span className="flex items-center">
                                                <Eye className="w-3 h-3 mr-1" />
                                                {page.view_count} views
                                            </span>
                                        )}
                                        <span className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {new Date(page.updated_at).toLocaleDateString()}
                                        </span>
                                        {page.updated_by_name && (
                                            <span className="flex items-center">
                                                <User className="w-3 h-3 mr-1" />
                                                {page.updated_by_name}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-2">
                                        {page.show_in_footer && (
                                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                Footer
                                            </span>
                                        )}
                                        {page.show_in_header && (
                                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                                Header
                                            </span>
                                        )}
                                        {page.requires_auth && (
                                            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded flex items-center">
                                                <Lock className="w-3 h-3 mr-1" />
                                                Protected
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.open(`/pages/${page.page_key}`, '_blank')}
                                        className="p-2 text-gray-600 hover:text-blue-600"
                                        title="View Page"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEditPage(page)}
                                        className="p-2 text-gray-600 hover:text-blue-600"
                                        title="Edit Page"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDuplicatePage(page.id)}
                                        className="p-2 text-gray-600 hover:text-green-600"
                                        title="Duplicate Page"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePage(page.id)}
                                        className="p-2 text-gray-600 hover:text-red-600"
                                        title="Delete Page"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {pages.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No content pages found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentPages;
