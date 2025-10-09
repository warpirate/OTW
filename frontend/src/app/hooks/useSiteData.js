import { useState, useEffect } from 'react';
import SiteManagementService from '../services/siteManagement.service';

/**
 * Custom hook for fetching site management data
 * @param {Object} options - Configuration options
 * @param {boolean} options.fetchSettings - Whether to fetch site settings
 * @param {boolean} options.fetchPages - Whether to fetch content pages
 * @param {boolean} options.fetchSocialLinks - Whether to fetch social links
 * @param {string} options.position - Position filter for pages/links ('footer', 'header', or null)
 * @param {boolean} options.autoRefresh - Whether to auto-refresh data
 * @param {number} options.refreshInterval - Refresh interval in milliseconds (default: 5 minutes)
 */
export const useSiteData = (options = {}) => {
    const {
        fetchSettings = true,
        fetchPages = true,
        fetchSocialLinks = true,
        position = null,
        autoRefresh = false,
        refreshInterval = 5 * 60 * 1000 // 5 minutes
    } = options;

    const [data, setData] = useState({
        settings: null,
        pages: [],
        socialLinks: []
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setError(null);
            const promises = [];
            const results = {};

            // Fetch site settings
            if (fetchSettings) {
                promises.push(
                    SiteManagementService.getPublicSiteSettings()
                        .then(response => {
                            results.settings = response.data;
                        })
                        .catch(err => {
                            console.warn('Failed to fetch site settings:', err);
                            results.settings = null;
                        })
                );
            }

            // Fetch content pages
            if (fetchPages) {
                promises.push(
                    SiteManagementService.getPublicContentPages(position)
                        .then(response => {
                            results.pages = response.data || [];
                        })
                        .catch(err => {
                            console.warn('Failed to fetch content pages:', err);
                            results.pages = [];
                        })
                );
            }

            // Fetch social links
            if (fetchSocialLinks) {
                promises.push(
                    SiteManagementService.getPublicSocialLinks(position)
                        .then(response => {
                            results.socialLinks = response.data || [];
                        })
                        .catch(err => {
                            console.warn('Failed to fetch social links:', err);
                            results.socialLinks = [];
                        })
                );
            }

            // Wait for all requests to complete
            await Promise.all(promises);

            // Update state with fetched data
            setData(prevData => ({
                settings: fetchSettings ? results.settings : prevData.settings,
                pages: fetchPages ? results.pages : prevData.pages,
                socialLinks: fetchSocialLinks ? results.socialLinks : prevData.socialLinks
            }));

        } catch (err) {
            console.error('Error fetching site data:', err);
            setError(err.message || 'Failed to fetch site data');
        } finally {
            setLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchSettings, fetchPages, fetchSocialLinks, position]);

    // Auto-refresh setup
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    // Manual refresh function
    const refresh = () => {
        setLoading(true);
        fetchData();
    };

    return {
        data,
        loading,
        error,
        refresh
    };
};

/**
 * Hook specifically for footer data
 */
export const useFooterData = () => {
    return useSiteData({
        fetchSettings: true,
        fetchPages: true,
        fetchSocialLinks: true,
        position: 'footer'
    });
};

/**
 * Hook specifically for header data
 */
export const useHeaderData = () => {
    return useSiteData({
        fetchSettings: true,
        fetchPages: true,
        fetchSocialLinks: true,
        position: 'header'
    });
};

export default useSiteData;
