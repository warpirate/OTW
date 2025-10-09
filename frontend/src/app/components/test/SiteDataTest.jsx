import React from 'react';
import { useSiteData } from '../../hooks/useSiteData';

/**
 * Test component to verify site data integration
 * This can be temporarily added to any page to test the API integration
 */
const SiteDataTest = () => {
    const { data, loading, error, refresh } = useSiteData({
        fetchSettings: true,
        fetchPages: true,
        fetchSocialLinks: true,
        position: 'footer'
    });

    if (loading) {
        return (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700">Loading site data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">Error: {error}</p>
                <button 
                    onClick={refresh}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">Site Data Test - Success!</h3>
                <button 
                    onClick={refresh}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                    Refresh
                </button>
            </div>
            
            {/* Site Settings */}
            <div>
                <h4 className="font-medium text-green-700">Site Settings:</h4>
                <div className="text-sm text-green-600 ml-4">
                    <p>Site Name: {data.settings?.site_name || 'Not set'}</p>
                    <p>Description: {data.settings?.site_description || 'Not set'}</p>
                    <p>Support Email: {data.settings?.support_email || 'Not set'}</p>
                    <p>Support Phone: {data.settings?.support_phone || 'Not set'}</p>
                </div>
            </div>

            {/* Content Pages */}
            <div>
                <h4 className="font-medium text-green-700">Footer Pages ({data.pages?.length || 0}):</h4>
                <div className="text-sm text-green-600 ml-4">
                    {data.pages?.length > 0 ? (
                        data.pages.map((page, index) => (
                            <p key={index}>• {page.page_title} ({page.page_key})</p>
                        ))
                    ) : (
                        <p>No footer pages found</p>
                    )}
                </div>
            </div>

            {/* Social Links */}
            <div>
                <h4 className="font-medium text-green-700">Social Links ({data.socialLinks?.length || 0}):</h4>
                <div className="text-sm text-green-600 ml-4">
                    {data.socialLinks?.length > 0 ? (
                        data.socialLinks.map((link, index) => (
                            <p key={index}>• {link.platform_name} - {link.url}</p>
                        ))
                    ) : (
                        <p>No social links found</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SiteDataTest;
