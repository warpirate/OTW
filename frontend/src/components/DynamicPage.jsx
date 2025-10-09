import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Eye, Loader2 } from 'lucide-react';
import SiteManagementService from '../app/services/siteManagement.service';
import { useTheme } from '../contexts/ThemeContext';

const DynamicPage = () => {
    const { pageKey } = useParams();
    const navigate = useNavigate();
    const { darkMode } = useTheme();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const contentRef = useRef(null);

    useEffect(() => {
        fetchPage();
    }, [pageKey]);

    // Handle link clicks in dynamic content
    useEffect(() => {
        if (!contentRef.current) return;

        const handleLinkClick = (event) => {
            const target = event.target.closest('a');
            if (!target) return;

            const href = target.getAttribute('href');
            if (!href) return;

            // Handle internal navigation links
            if (href.startsWith('/') || href.includes('localhost') || href.includes(window.location.hostname)) {
                event.preventDefault();
                
                // Extract the path from full URLs
                let path = href;
                if (href.includes('://')) {
                    try {
                        const url = new URL(href);
                        path = url.pathname;
                    } catch (e) {
                        return; // Invalid URL, let default behavior handle it
                    }
                }
                
                // Special handling for common routes
                const lowerHref = href.toLowerCase();
                const lowerPath = path.toLowerCase();
                const linkText = target.textContent?.toLowerCase() || '';
                
                if (lowerHref.includes('apply') || lowerPath.includes('apply') || 
                    lowerHref.includes('signup') || lowerPath.includes('signup') ||
                    linkText.includes('apply now') || linkText.includes('join now') ||
                    linkText.includes('register') || linkText.includes('sign up')) {
                    navigate('/worker/signup');
                } else if (lowerPath.includes('login') || linkText.includes('login')) {
                    navigate('/login');
                } else if (lowerPath.includes('contact') || linkText.includes('contact')) {
                    navigate('/contact');
                } else {
                    navigate(path);
                }
            }
            // External links will use default behavior (open in new tab/same tab)
        };

        contentRef.current.addEventListener('click', handleLinkClick);
        
        return () => {
            if (contentRef.current) {
                contentRef.current.removeEventListener('click', handleLinkClick);
            }
        };
    }, [page, navigate]);

    const fetchPage = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await SiteManagementService.getPublicContentPage(pageKey);
            
            if (response.success) {
                setPage(response.data);
                
                // Update document title and meta tags
                if (response.data.meta_title) {
                    document.title = response.data.meta_title;
                } else {
                    document.title = response.data.page_title;
                }
                
                // Update meta description
                if (response.data.meta_description) {
                    const metaDescription = document.querySelector('meta[name="description"]');
                    if (metaDescription) {
                        metaDescription.setAttribute('content', response.data.meta_description);
                    }
                }
                
                // Update meta keywords
                if (response.data.meta_keywords) {
                    const metaKeywords = document.querySelector('meta[name="keywords"]');
                    if (metaKeywords) {
                        metaKeywords.setAttribute('content', response.data.meta_keywords);
                    }
                }
            } else {
                setError('Page not found');
            }
        } catch (err) {
            console.error('Error fetching page:', err);
            setError('Failed to load page content');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Theme-aware classes
    const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
    const textClass = darkMode ? 'text-white' : 'text-gray-900';
    const mutedTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';
    const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
    const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

    if (loading) {
        return (
            <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
                <div className="text-center">
                    <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${mutedTextClass}`} />
                    <p className={mutedTextClass}>Loading page...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
                <div className="text-center">
                    <div className={`text-6xl mb-4 ${mutedTextClass}`}>404</div>
                    <h1 className={`text-2xl font-bold mb-2 ${textClass}`}>Page Not Found</h1>
                    <p className={`mb-6 ${mutedTextClass}`}>{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!page) {
        return null;
    }

    return (
        <div className={`min-h-screen ${bgClass} transition-colors duration-200`}>
            {/* Custom CSS */}
            {page.custom_css && (
                <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
            )}
            
            {/* Header */}
            <div className={`${cardBgClass} border-b ${borderClass}`}>
                <div className="container-custom py-8">
                    <button
                        onClick={() => navigate(-1)}
                        className={`inline-flex items-center mb-4 ${mutedTextClass} hover:${textClass} transition-colors`}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </button>
                    
                    <div className="max-w-4xl">
                        <h1 className={`text-4xl font-bold mb-4 ${textClass}`}>
                            {page.page_title}
                        </h1>
                        
                        {page.page_subtitle && (
                            <p className={`text-xl mb-6 ${mutedTextClass}`}>
                                {page.page_subtitle}
                            </p>
                        )}
                        
                        {/* Page Meta */}
                        <div className={`flex flex-wrap items-center gap-6 text-sm ${mutedTextClass}`}>
                            {page.published_at && (
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Published {formatDate(page.published_at)}
                                </div>
                            )}
                            
                            {page.updated_at && page.updated_at !== page.published_at && (
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Updated {formatDate(page.updated_at)}
                                </div>
                            )}
                            
                            <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-2" />
                                {page.page_type} page
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <div className="container-custom py-12">
                <div className="max-w-4xl mx-auto">
                    <article className={`${cardBgClass} rounded-lg shadow-lg overflow-hidden`}>
                        {/* OG Image */}
                        {page.og_image && (
                            <div className="aspect-video w-full overflow-hidden">
                                <img
                                    src={page.og_image}
                                    alt={page.og_title || page.page_title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        
                        {/* Content Body */}
                        <div className="p-8">
                            <div 
                                ref={contentRef}
                                className={`prose prose-lg max-w-none ${darkMode ? 'prose-invert' : ''}`}
                                dangerouslySetInnerHTML={{ __html: page.page_content }}
                            />
                        </div>
                    </article>
                </div>
            </div>
            
            {/* Custom JavaScript */}
            {page.custom_js && (
                <script dangerouslySetInnerHTML={{ __html: page.custom_js }} />
            )}
        </div>
    );
};

export default DynamicPage;
