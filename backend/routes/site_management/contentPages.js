const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, requireSuperAdmin } = require('../../middlewares/auth');
const DOMPurify = require('isomorphic-dompurify');
const { logAction } = require('../../services/auditLogger');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');

// Configure S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for content images
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Helper function to extract plain text from HTML
function extractPlainText(html) {
    if (!html) return '';
    // Remove HTML tags and decode entities
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// =====================================================
// PUBLIC ROUTES
// =====================================================

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

// =====================================================
// SUPER ADMIN ROUTES - CONTENT PAGES
// =====================================================

// Get all content pages (super admin)
router.get('/pages', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { page_type, page_status, search } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (page_type) {
            whereClause += ' AND page_type = ?';
            params.push(page_type);
        }
        
        if (page_status) {
            whereClause += ' AND page_status = ?';
            params.push(page_status);
        }
        
        if (search) {
            whereClause += ' AND (page_title LIKE ? OR page_content LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        const [pages] = await db.query(
            `SELECT 
                p.*,
                u1.name as created_by_name,
                u2.name as updated_by_name
            FROM content_pages p
            LEFT JOIN users u1 ON p.created_by = u1.id
            LEFT JOIN users u2 ON p.updated_by = u2.id
            WHERE ${whereClause}
            ORDER BY page_order ASC, created_at DESC`,
            params
        );
        
        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Error fetching content pages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch content pages'
        });
    }
});

// Get single content page (super admin)
router.get('/pages/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [pages] = await db.query(
            `SELECT 
                p.*,
                u1.name as created_by_name,
                u2.name as updated_by_name
            FROM content_pages p
            LEFT JOIN users u1 ON p.created_by = u1.id
            LEFT JOIN users u2 ON p.updated_by = u2.id
            WHERE p.id = ?`,
            [id]
        );
        
        if (!pages || pages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }
        
        res.json({
            success: true,
            data: pages[0]
        });
    } catch (error) {
        console.error('Error fetching content page:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch content page'
        });
    }
});

// Create new content page (super admin)
router.post('/pages', 
    authenticateToken, 
    requireSuperAdmin,
    upload.single('og_image'),
    async (req, res) => {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const {
                page_title,
                page_subtitle,
                page_content,
                page_type = 'static',
                page_status = 'draft',
                page_order = 0,
                show_in_footer = true,
                show_in_header = false,
                show_in_sitemap = true,
                requires_auth = false,
                meta_title,
                meta_description,
                meta_keywords,
                og_title,
                og_description,
                custom_css,
                custom_js
            } = req.body;
            
            // Generate page key if not provided
            let page_key = req.body.page_key || generateSlug(page_title);
            
            // Check if page key already exists
            const [existing] = await connection.query(
                'SELECT id FROM content_pages WHERE page_key = ?',
                [page_key]
            );
            
            if (existing.length > 0) {
                page_key = `${page_key}-${Date.now()}`;
            }
            
            // Sanitize HTML content
            const sanitizedContent = DOMPurify.sanitize(page_content, {
                ADD_TAGS: ['iframe', 'script', 'style'],
                ADD_ATTR: ['target', 'rel', 'style', 'class', 'id']
            });
            
            // Extract plain text for SEO
            const plainText = extractPlainText(sanitizedContent);
            
            // Handle OG image upload
            let ogImageUrl = null;
            if (req.file) {
                const key = `content-images/og-${page_key}-${Date.now()}${path.extname(req.file.originalname)}`;
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: key,
                    Body: req.file.buffer,
                    ContentType: req.file.mimetype,
                    ACL: 'private'
                };
                
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
                ogImageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
            }
            
            // Insert new page
            const [result] = await connection.query(
                `INSERT INTO content_pages (
                    page_key, page_title, page_subtitle,
                    page_content, page_content_plain,
                    page_type, page_status, page_order,
                    show_in_footer, show_in_header, show_in_sitemap,
                    requires_auth, meta_title, meta_description,
                    meta_keywords, og_title, og_description,
                    og_image, custom_css, custom_js,
                    created_by, published_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    page_key, page_title, page_subtitle,
                    sanitizedContent, plainText,
                    page_type, page_status, page_order,
                    show_in_footer, show_in_header, show_in_sitemap,
                    requires_auth, meta_title, meta_description,
                    meta_keywords, og_title, og_description,
                    ogImageUrl, custom_css, custom_js,
                    req.user.id,
                    page_status === 'published' ? new Date() : null
                ]
            );
            
            // Log audit
            await logAction(req, {
                action: 'CREATE',
                resourceType: 'content_pages',
                resourceId: result.insertId,
                description: `Created content page: ${page_title} (${page_key})`
            });
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Content page created successfully',
                data: {
                    id: result.insertId,
                    page_key
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error creating content page:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create content page'
            });
        } finally {
            connection.release();
        }
    }
);

// Update content page (super admin)
router.put('/pages/:id', 
    authenticateToken, 
    requireSuperAdmin,
    upload.single('og_image'),
    async (req, res) => {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            
            // Get current page data
            const [currentPage] = await connection.query(
                'SELECT * FROM content_pages WHERE id = ?',
                [id]
            );
            
            if (!currentPage || currentPage.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            
            const oldValues = currentPage[0];
            
            // Prepare update data
            const updateData = { ...req.body };
            delete updateData.id;
            delete updateData.created_at;
            delete updateData.created_by;
            
            // Sanitize HTML content if provided
            if (updateData.page_content) {
                updateData.page_content = DOMPurify.sanitize(updateData.page_content, {
                    ADD_TAGS: ['iframe', 'script', 'style'],
                    ADD_ATTR: ['target', 'rel', 'style', 'class', 'id']
                });
                updateData.page_content_plain = extractPlainText(updateData.page_content);
            }
            
            // Handle OG image upload
            if (req.file) {
                const key = `content-images/og-${oldValues.page_key}-${Date.now()}${path.extname(req.file.originalname)}`;
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: key,
                    Body: req.file.buffer,
                    ContentType: req.file.mimetype,
                    ACL: 'private'
                };
                
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
                updateData.og_image = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                
                // Delete old image if exists
                if (oldValues.og_image && oldValues.og_image.includes('s3')) {
                    try {
                        const oldKey = oldValues.og_image.split('.com/')[1];
                        const deleteCommand = new DeleteObjectCommand({
                            Bucket: process.env.AWS_S3_BUCKET,
                            Key: oldKey
                        });
                        await s3Client.send(deleteCommand);
                    } catch (deleteError) {
                        console.error('Error deleting old OG image:', deleteError);
                    }
                }
            }
            
            // Update metadata
            updateData.updated_by = req.user.id;
            updateData.updated_at = new Date();
            
            // Handle publish date
            if (updateData.page_status === 'published' && oldValues.page_status !== 'published') {
                updateData.published_at = new Date();
            }
            
            // Build update query
            const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updateData);
            updateValues.push(id);
            
            // Update page
            await connection.query(
                `UPDATE content_pages SET ${updateFields} WHERE id = ?`,
                updateValues
            );
            
            // Log audit
            await logAction(req, {
                action: 'UPDATE',
                resourceType: 'content_pages',
                resourceId: id,
                description: `Updated content page: ${updateData.page_title || oldValues.page_title}`
            });
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Content page updated successfully',
                data: { ...oldValues, ...updateData }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error updating content page:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update content page'
            });
        } finally {
            connection.release();
        }
    }
);

// Delete content page (super admin)
router.delete('/pages/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.promise().getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Get page data before deletion
        const [page] = await connection.query(
            'SELECT * FROM content_pages WHERE id = ?',
            [id]
        );
        
        if (!page || page.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }
        
        const pageData = page[0];
        
        // Delete OG image from S3 if exists
        if (pageData.og_image && pageData.og_image.includes('s3')) {
            try {
                const key = pageData.og_image.split('.com/')[1];
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: key
                });
                await s3Client.send(deleteCommand);
            } catch (deleteError) {
                console.error('Error deleting OG image:', deleteError);
            }
        }
        
        // Delete page
        await connection.query(
            'DELETE FROM content_pages WHERE id = ?',
            [id]
        );
        
        // Log audit
        await logAction(req, {
            action: 'DELETE',
            resourceType: 'content_pages',
            resourceId: id,
            description: `Deleted content page: ${pageData.page_title} (${pageData.page_key})`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Content page deleted successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting content page:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete content page'
        });
    } finally {
        connection.release();
    }
});

// Duplicate content page (super admin)
router.post('/pages/:id/duplicate', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.promise().getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Get original page
        const [original] = await connection.query(
            'SELECT * FROM content_pages WHERE id = ?',
            [id]
        );
        
        if (!original || original.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }
        
        const originalPage = original[0];
        
        // Create new page key
        const newPageKey = `${originalPage.page_key}-copy-${Date.now()}`;
        const newTitle = `${originalPage.page_title} (Copy)`;
        
        // Insert duplicate
        const [result] = await connection.query(
            `INSERT INTO content_pages (
                page_key, page_title, page_subtitle,
                page_content, page_content_plain,
                page_type, page_status, page_order,
                show_in_footer, show_in_header, show_in_sitemap,
                requires_auth, meta_title, meta_description,
                meta_keywords, og_title, og_description,
                custom_css, custom_js, created_by
            ) SELECT 
                ?, ?, page_subtitle,
                page_content, page_content_plain,
                page_type, 'draft', page_order,
                show_in_footer, show_in_header, show_in_sitemap,
                requires_auth, meta_title, meta_description,
                meta_keywords, og_title, og_description,
                custom_css, custom_js, ?
            FROM content_pages WHERE id = ?`,
            [newPageKey, newTitle, req.user.id, id]
        );
        
        // Log audit
        await logAction(req, {
            action: 'CREATE',
            resourceType: 'content_pages',
            resourceId: result.insertId,
            description: `Duplicated content page: ${newTitle} (${newPageKey}) from original ID ${id}`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Content page duplicated successfully',
            data: {
                id: result.insertId,
                page_key: newPageKey
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error duplicating content page:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to duplicate content page'
        });
    } finally {
        connection.release();
    }
});

// Reorder pages (super admin)
router.put('/pages/reorder', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.promise().getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { pages } = req.body; // Array of { id, order }
        
        if (!Array.isArray(pages)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid pages array'
            });
        }
        
        // Update order for each page
        for (const page of pages) {
            await connection.query(
                'UPDATE content_pages SET page_order = ? WHERE id = ?',
                [page.order, page.id]
            );
        }
        
        // Log audit
        await logAction(req, {
            action: 'UPDATE',
            resourceType: 'content_pages',
            resourceId: null,
            description: `Reordered ${pages.length} content pages`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Pages reordered successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error reordering pages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder pages'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
