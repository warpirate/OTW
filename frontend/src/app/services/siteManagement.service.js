import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class SiteManagementService {
    constructor() {
        this.setupInterceptors();
    }

    setupInterceptors() {
        // Request interceptor for authentication
        axios.interceptors.request.use(
            (config) => {
                // Only add auth for superadmin endpoints
                if (config.url && config.url.includes('/superadmin/')) {
                    const token = AuthService.getToken('superadmin') || AuthService.getToken('super admin');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for error handling
        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    // Handle superadmin logout
                    if (error.config?.url?.includes('/superadmin/')) {
                        AuthService.logout('super admin');
                        window.location.href = '/superadmin/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // =====================================================
    // SITE SETTINGS
    // =====================================================

    async getSiteSettings(isPublic = false) {
        try {
            const endpoint = isPublic 
                ? `${API_BASE_URL}/superadmin/site-settings/public/settings`
                : `${API_BASE_URL}/superadmin/site-settings/settings`;
            const response = await axios.get(endpoint);
            return response.data;
        } catch (error) {
            console.error('Error fetching site settings:', error);
            throw error;
        }
    }

    async updateSiteSettings(settings, files = {}) {
        try {
            const formData = new FormData();
            
            // Add settings data
            Object.keys(settings).forEach(key => {
                if (settings[key] !== null && settings[key] !== undefined) {
                    formData.append(key, settings[key]);
                }
            });
            
            // Add files if provided
            if (files.site_logo) {
                formData.append('site_logo', files.site_logo);
            }
            if (files.site_favicon) {
                formData.append('site_favicon', files.site_favicon);
            }
            if (files.site_logo_dark) {
                formData.append('site_logo_dark', files.site_logo_dark);
            }
            
            const response = await axios.put(
                `${API_BASE_URL}/superadmin/site-settings/settings`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating site settings:', error);
            throw error;
        }
    }

    // =====================================================
    // CONTENT PAGES
    // =====================================================

    async getContentPages(filters = {}) {
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/content-pages/pages${params ? `?${params}` : ''}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching content pages:', error);
            throw error;
        }
    }

    async getContentPage(id) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/content-pages/pages/${id}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching content page:', error);
            throw error;
        }
    }

    async getPublicContentPage(pageKey) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/content-pages/public/pages/${pageKey}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public content page:', error);
            throw error;
        }
    }

    async getPublicPages(position = null) {
        try {
            const params = position ? `?position=${position}` : '';
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/content-pages/public/pages${params}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public pages:', error);
            throw error;
        }
    }

    async createContentPage(pageData, ogImage = null) {
        try {
            const formData = new FormData();
            
            // Add page data
            Object.keys(pageData).forEach(key => {
                if (pageData[key] !== null && pageData[key] !== undefined) {
                    formData.append(key, pageData[key]);
                }
            });
            
            // Add OG image if provided
            if (ogImage) {
                formData.append('og_image', ogImage);
            }
            
            const response = await axios.post(
                `${API_BASE_URL}/superadmin/content-pages/pages`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error creating content page:', error);
            throw error;
        }
    }

    async updateContentPage(id, pageData, ogImage = null) {
        try {
            const formData = new FormData();
            
            // Add page data
            Object.keys(pageData).forEach(key => {
                if (pageData[key] !== null && pageData[key] !== undefined) {
                    formData.append(key, pageData[key]);
                }
            });
            
            // Add OG image if provided
            if (ogImage) {
                formData.append('og_image', ogImage);
            }
            
            const response = await axios.put(
                `${API_BASE_URL}/superadmin/content-pages/pages/${id}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating content page:', error);
            throw error;
        }
    }

    async deleteContentPage(id) {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/superadmin/content-pages/pages/${id}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting content page:', error);
            throw error;
        }
    }

    async duplicateContentPage(id) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/superadmin/content-pages/pages/${id}/duplicate`
            );
            return response.data;
        } catch (error) {
            console.error('Error duplicating content page:', error);
            throw error;
        }
    }

    async reorderContentPages(pages) {
        try {
            const response = await axios.put(
                `${API_BASE_URL}/superadmin/content-pages/pages/reorder`,
                { pages }
            );
            return response.data;
        } catch (error) {
            console.error('Error reordering content pages:', error);
            throw error;
        }
    }

    // =====================================================
    // SOCIAL LINKS
    // =====================================================

    async getSocialLinks() {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/social-links/social-links`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching social links:', error);
            throw error;
        }
    }

    async getPublicSocialLinks(position = null) {
        try {
            const params = position ? `?position=${position}` : '';
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/social-links/public/social-links${params}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public social links:', error);
            throw error;
        }
    }

    async getSocialLink(id) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/social-links/social-links/${id}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching social link:', error);
            throw error;
        }
    }

    async createSocialLink(linkData) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/superadmin/social-links/social-links`,
                linkData
            );
            return response.data;
        } catch (error) {
            console.error('Error creating social link:', error);
            throw error;
        }
    }

    async updateSocialLink(id, linkData) {
        try {
            const response = await axios.put(
                `${API_BASE_URL}/superadmin/social-links/social-links/${id}`,
                linkData
            );
            return response.data;
        } catch (error) {
            console.error('Error updating social link:', error);
            throw error;
        }
    }

    async deleteSocialLink(id) {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/superadmin/social-links/social-links/${id}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting social link:', error);
            throw error;
        }
    }

    async toggleSocialLink(id) {
        try {
            const response = await axios.patch(
                `${API_BASE_URL}/superadmin/social-links/social-links/${id}/toggle`
            );
            return response.data;
        } catch (error) {
            console.error('Error toggling social link:', error);
            throw error;
        }
    }

    async reorderSocialLinks(links) {
        try {
            const response = await axios.put(
                `${API_BASE_URL}/superadmin/social-links/social-links/reorder`,
                { links }
            );
            return response.data;
        } catch (error) {
            console.error('Error reordering social links:', error);
            throw error;
        }
    }

    async getSocialPlatforms() {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/social-links/social-platforms`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching social platforms:', error);
            throw error;
        }
    }

    // =====================================================
    // PUBLIC API METHODS (No Authentication Required)
    // =====================================================

    async getPublicSiteSettings() {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/site-settings/public/settings`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public site settings:', error);
            throw error;
        }
    }

    async getPublicContentPages(position = null) {
        try {
            const params = position ? `?position=${position}` : '';
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/content-pages/public/pages${params}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public content pages:', error);
            throw error;
        }
    }

    async getPublicContentPage(pageKey) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/content-pages/public/pages/${pageKey}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public content page:', error);
            throw error;
        }
    }

    async getPublicSocialLinks(position = null) {
        try {
            const params = position ? `?position=${position}` : '';
            const response = await axios.get(
                `${API_BASE_URL}/superadmin/social-links/public/social-links${params}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching public social links:', error);
            throw error;
        }
    }

}

export default new SiteManagementService();
