const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, requireSuperAdmin } = require('../../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const DOMPurify = require('isomorphic-dompurify');
const { logAction } = require('../../services/auditLogger');

// Configure S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|ico/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Helper function to upload to S3
async function uploadToS3(file, key) {
    try {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'private'
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        
        return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw error;
    }
}

// Helper function to get presigned URL
async function getPresignedUrl(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key
        });
        
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        return url;
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return null;
    }
}

// =====================================================
// PUBLIC ROUTES
// =====================================================

// Get site settings (public)
router.get('/public/settings', async (req, res) => {
    try {
        const [settings] = await db.query(
            `SELECT 
                site_name, site_tagline, site_description,
                site_logo, site_favicon, site_logo_dark,
                support_email, support_phone, whatsapp_number,
                company_address, company_city, company_state,
                company_country, company_pincode,
                timezone, currency, currency_symbol,
                date_format, time_format, language,
                meta_title, meta_description, meta_keywords,
                google_analytics_id, facebook_pixel_id,
                maintenance_mode, maintenance_message,
                copyright_text, footer_text,
                enable_registration, enable_worker_registration,
                enable_booking, enable_chat, enable_notifications,
                enable_reviews, enable_wallet,
                terms_version, privacy_version
            FROM site_settings
            WHERE id = 1`
        );

        if (!settings || settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Site settings not found'
            });
        }

        const siteSettings = settings[0];

        // Generate presigned URLs for logos if they're S3 URLs
        if (siteSettings.site_logo && siteSettings.site_logo.includes('s3')) {
            const key = siteSettings.site_logo.split('.com/')[1];
            siteSettings.site_logo_url = await getPresignedUrl(key);
        }

        if (siteSettings.site_favicon && siteSettings.site_favicon.includes('s3')) {
            const key = siteSettings.site_favicon.split('.com/')[1];
            siteSettings.site_favicon_url = await getPresignedUrl(key);
        }

        if (siteSettings.site_logo_dark && siteSettings.site_logo_dark.includes('s3')) {
            const key = siteSettings.site_logo_dark.split('.com/')[1];
            siteSettings.site_logo_dark_url = await getPresignedUrl(key);
        }

        res.json({
            success: true,
            data: siteSettings
        });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch site settings'
        });
    }
});

// Get content page by key (public)
router.get('/public/pages/:pageKey', async (req, res) => {
    try {
        const { pageKey } = req.params;
        
        const [pages] = await db.query(
            `SELECT 
                page_key, page_title, page_subtitle,
                page_content, page_content_plain,
                page_type, meta_title, meta_description,
                meta_keywords, og_title, og_description,
                og_image, custom_css, custom_js,
                published_at, updated_at
            FROM content_pages
            WHERE page_key = ? 
            AND page_status = 'published'
            AND (requires_auth = 0 OR ? IS NOT NULL)`,
            [pageKey, req.user?.id || null]
        );

        if (!pages || pages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Update view count
        await db.query(
            `UPDATE content_pages 
            SET view_count = view_count + 1,
                last_viewed_at = NOW()
            WHERE page_key = ?`,
            [pageKey]
        );

        res.json({
            success: true,
            data: pages[0]
        });
    } catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch page content'
        });
    }
});

// Get all published pages for navigation (public)
router.get('/public/pages', async (req, res) => {
    try {
        const { position } = req.query; // footer, header, or all
        
        let whereClause = "page_status = 'published'";
        if (position === 'footer') {
            whereClause += " AND show_in_footer = 1";
        } else if (position === 'header') {
            whereClause += " AND show_in_header = 1";
        }

        const [pages] = await db.query(
            `SELECT 
                page_key, page_title, page_type,
                page_order, show_in_footer, show_in_header
            FROM content_pages
            WHERE ${whereClause}
            ORDER BY page_order ASC, page_title ASC`
        );

        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pages'
        });
    }
});

// Get active social links (public)
router.get('/public/social-links', async (req, res) => {
    try {
        const { position } = req.query; // footer, header, or all
        
        let whereClause = "is_active = 1";
        if (position === 'footer') {
            whereClause += " AND show_in_footer = 1";
        } else if (position === 'header') {
            whereClause += " AND show_in_header = 1";
        }

        const [links] = await db.query(
            `SELECT 
                platform, platform_name, platform_icon,
                platform_color, url, open_in_new_tab,
                show_in_mobile
            FROM social_links
            WHERE ${whereClause}
            ORDER BY display_order ASC, platform_name ASC`
        );

        res.json({
            success: true,
            data: links
        });
    } catch (error) {
        console.error('Error fetching social links:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch social links'
        });
    }
});

// Get FAQs (public)
router.get('/public/faqs', async (req, res) => {
    try {
        const { category, featured } = req.query;
        
        let whereClause = "is_active = 1";
        const params = [];
        
        if (category) {
            whereClause += " AND category = ?";
            params.push(category);
        }
        
        if (featured === 'true') {
            whereClause += " AND is_featured = 1";
        }

        const [faqs] = await db.query(
            `SELECT 
                id, category, question, answer,
                is_featured, helpful_count, not_helpful_count
            FROM faqs
            WHERE ${whereClause}
            ORDER BY display_order ASC, helpful_count DESC`,
            params
        );

        res.json({
            success: true,
            data: faqs
        });
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch FAQs'
        });
    }
});

// Get active banners (public)
router.get('/public/banners', async (req, res) => {
    try {
        const { position, page } = req.query;
        
        let whereClause = "is_active = 1 AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())";
        const params = [];
        
        if (position) {
            whereClause += " AND banner_position = ?";
            params.push(position);
        }

        const [banners] = await db.query(
            `SELECT 
                banner_key, banner_title, banner_subtitle,
                banner_content, banner_image, banner_link,
                banner_type, banner_position, is_dismissible,
                show_on_pages
            FROM banners
            WHERE ${whereClause}
            ORDER BY display_order ASC, created_at DESC`,
            params
        );

        // Filter by page if specified
        const filteredBanners = page ? banners.filter(banner => {
            if (!banner.show_on_pages || banner.show_on_pages === '*') return true;
            const pages = banner.show_on_pages.split(',').map(p => p.trim());
            return pages.includes(page);
        }) : banners;

        res.json({
            success: true,
            data: filteredBanners
        });
    } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch banners'
        });
    }
});

// =====================================================
// SUPER ADMIN ROUTES
// =====================================================

// Get site settings (super admin)
router.get('/settings', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const [settings] = await db.query(
            'SELECT * FROM site_settings WHERE id = 1'
        );

        if (!settings || settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Site settings not found'
            });
        }

        res.json({
            success: true,
            data: settings[0]
        });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch site settings'
        });
    }
});

// Update site settings (super admin)
router.put('/settings', 
    authenticateToken, 
    requireSuperAdmin,
    upload.fields([
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 },
        { name: 'site_logo_dark', maxCount: 1 }
    ]),
    async (req, res) => {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get current settings for comparison
            const [currentSettings] = await connection.query(
                'SELECT * FROM site_settings WHERE id = 1'
            );
            const oldValues = currentSettings[0] || {};

            // Prepare update data
            const updateData = { ...req.body };
            delete updateData.id; // Remove id if present
            
            // Handle file uploads
            if (req.files) {
                if (req.files.site_logo) {
                    const file = req.files.site_logo[0];
                    const key = `site-assets/logo-${Date.now()}${path.extname(file.originalname)}`;
                    updateData.site_logo = await uploadToS3(file, key);
                }
                
                if (req.files.site_favicon) {
                    const file = req.files.site_favicon[0];
                    const key = `site-assets/favicon-${Date.now()}${path.extname(file.originalname)}`;
                    updateData.site_favicon = await uploadToS3(file, key);
                }
                
                if (req.files.site_logo_dark) {
                    const file = req.files.site_logo_dark[0];
                    const key = `site-assets/logo-dark-${Date.now()}${path.extname(file.originalname)}`;
                    updateData.site_logo_dark = await uploadToS3(file, key);
                }
            }
            
            // Sanitize HTML content
            if (updateData.footer_text) {
                updateData.footer_text = DOMPurify.sanitize(updateData.footer_text);
            }
            if (updateData.maintenance_message) {
                updateData.maintenance_message = DOMPurify.sanitize(updateData.maintenance_message);
            }
            
            // Add update metadata
            updateData.last_updated_by = req.user.id;
            updateData.updated_at = new Date();
            
            // Build update query
            const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updateData);
            
            // Update settings
            await connection.query(
                `UPDATE site_settings SET ${updateFields} WHERE id = 1`,
                updateValues
            );
            
            // Log audit
            await logAction(req, {
                action: 'UPDATE',
                resourceType: 'site_settings',
                resourceId: 1,
                description: `Updated site settings: ${Object.keys(updateData).join(', ')}`
            });
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Site settings updated successfully',
                data: updateData
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error updating site settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update site settings'
            });
        } finally {
            connection.release();
        }
    }
);

module.exports = router;
