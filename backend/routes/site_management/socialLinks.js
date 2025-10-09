const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, requireSuperAdmin } = require('../../middlewares/auth');
const { logAction } = require('../../services/auditLogger');

// =====================================================
// PUBLIC ROUTES
// =====================================================

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

// =====================================================
// SUPER ADMIN ROUTES - SOCIAL LINKS
// =====================================================

// Get all social links (super admin)
router.get('/social-links', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const [links] = await db.query(
            `SELECT 
                sl.*,
                u1.name as created_by_name,
                u2.name as updated_by_name
            FROM social_links sl
            LEFT JOIN users u1 ON sl.created_by = u1.id
            LEFT JOIN users u2 ON sl.updated_by = u2.id
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

// Get single social link (super admin)
router.get('/social-links/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [links] = await db.query(
            `SELECT 
                sl.*,
                u1.name as created_by_name,
                u2.name as updated_by_name
            FROM social_links sl
            LEFT JOIN users u1 ON sl.created_by = u1.id
            LEFT JOIN users u2 ON sl.updated_by = u2.id
            WHERE sl.id = ?`,
            [id]
        );
        
        if (!links || links.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Social link not found'
            });
        }
        
        res.json({
            success: true,
            data: links[0]
        });
    } catch (error) {
        console.error('Error fetching social link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch social link'
        });
    }
});

// Create new social link (super admin)
router.post('/social-links', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const {
            platform,
            platform_name,
            platform_icon,
            platform_color,
            url,
            display_order = 0,
            is_active = true,
            open_in_new_tab = true,
            show_in_footer = true,
            show_in_header = false,
            show_in_mobile = true
        } = req.body;
        
        // Validate required fields
        if (!platform || !platform_name || !url) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Platform, platform name, and URL are required'
            });
        }
        
        // Check if platform already exists
        const [existing] = await connection.query(
            'SELECT id FROM social_links WHERE platform = ?',
            [platform]
        );
        
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Social link for this platform already exists'
            });
        }
        
        // Insert new social link
        const [result] = await connection.query(
            `INSERT INTO social_links (
                platform, platform_name, platform_icon,
                platform_color, url, display_order,
                is_active, open_in_new_tab, show_in_footer,
                show_in_header, show_in_mobile, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                platform, platform_name, platform_icon,
                platform_color, url, display_order,
                is_active, open_in_new_tab, show_in_footer,
                show_in_header, show_in_mobile, req.user.id
            ]
        );
        
        // Log audit
        await logAction(req, {
            action: 'CREATE',
            resourceType: 'social_links',
            resourceId: result.insertId,
            description: `Created social link for ${platform_name} (${platform})`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Social link created successfully',
            data: {
                id: result.insertId,
                platform
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating social link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create social link'
        });
    } finally {
        connection.release();
    }
});

// Update social link (super admin)
router.put('/social-links/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Get current link data
        const [currentLink] = await connection.query(
            'SELECT * FROM social_links WHERE id = ?',
            [id]
        );
        
        if (!currentLink || currentLink.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Social link not found'
            });
        }
        
        const oldValues = currentLink[0];
        
        // Prepare update data
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.created_at;
        delete updateData.created_by;
        
        // Check if platform is being changed and already exists
        if (updateData.platform && updateData.platform !== oldValues.platform) {
            const [existing] = await connection.query(
                'SELECT id FROM social_links WHERE platform = ? AND id != ?',
                [updateData.platform, id]
            );
            
            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Social link for this platform already exists'
                });
            }
        }
        
        // Update metadata
        updateData.updated_by = req.user.id;
        updateData.updated_at = new Date();
        
        // Build update query
        const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(updateData);
        updateValues.push(id);
        
        // Update social link
        await connection.query(
            `UPDATE social_links SET ${updateFields} WHERE id = ?`,
            updateValues
        );
        
        // Log audit
        await logAction(req, {
            action: 'UPDATE',
            resourceType: 'social_links',
            resourceId: id,
            description: `Updated social link for ${updateData.platform_name || oldValues.platform_name}`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Social link updated successfully',
            data: { ...oldValues, ...updateData }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating social link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update social link'
        });
    } finally {
        connection.release();
    }
});

// Delete social link (super admin)
router.delete('/social-links/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Get link data before deletion
        const [link] = await connection.query(
            'SELECT * FROM social_links WHERE id = ?',
            [id]
        );
        
        if (!link || link.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Social link not found'
            });
        }
        
        const linkData = link[0];
        
        // Delete social link
        await connection.query(
            'DELETE FROM social_links WHERE id = ?',
            [id]
        );
        
        // Log audit
        await logAction(req, {
            action: 'DELETE',
            resourceType: 'social_links',
            resourceId: id,
            description: `Deleted social link for ${linkData.platform_name} (${linkData.platform})`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Social link deleted successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting social link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete social link'
        });
    } finally {
        connection.release();
    }
});

// Reorder social links (super admin)
router.put('/social-links/reorder', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { links } = req.body; // Array of { id, order }
        
        if (!Array.isArray(links)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid links array'
            });
        }
        
        // Update order for each link
        for (const link of links) {
            await connection.query(
                'UPDATE social_links SET display_order = ? WHERE id = ?',
                [link.order, link.id]
            );
        }
        
        // Log audit
        await logAction(req, {
            action: 'UPDATE',
            resourceType: 'social_links',
            resourceId: null,
            description: `Reordered ${links.length} social links`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Social links reordered successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error reordering social links:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder social links'
        });
    } finally {
        connection.release();
    }
});

// Toggle social link status (super admin)
router.patch('/social-links/:id/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Get current status
        const [link] = await connection.query(
            'SELECT is_active FROM social_links WHERE id = ?',
            [id]
        );
        
        if (!link || link.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Social link not found'
            });
        }
        
        const newStatus = !link[0].is_active;
        
        // Update status
        await connection.query(
            'UPDATE social_links SET is_active = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, req.user.id, id]
        );
        
        // Log audit
        await logAction(req, {
            action: 'UPDATE',
            resourceType: 'social_links',
            resourceId: id,
            description: `${newStatus ? 'Activated' : 'Deactivated'} social link for ${link[0].platform_name}`
        });
        
        await connection.commit();
        
        res.json({
            success: true,
            message: `Social link ${newStatus ? 'activated' : 'deactivated'} successfully`,
            data: {
                is_active: newStatus
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error toggling social link status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle social link status'
        });
    } finally {
        connection.release();
    }
});

// Get predefined social platforms (super admin)
router.get('/social-platforms', authenticateToken, requireSuperAdmin, (req, res) => {
    const platforms = [
        { platform: 'facebook', name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2' },
        { platform: 'twitter', name: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2' },
        { platform: 'instagram', name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F' },
        { platform: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin-in', color: '#0A66C2' },
        { platform: 'youtube', name: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000' },
        { platform: 'whatsapp', name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
        { platform: 'telegram', name: 'Telegram', icon: 'fab fa-telegram', color: '#0088CC' },
        { platform: 'pinterest', name: 'Pinterest', icon: 'fab fa-pinterest-p', color: '#BD081C' },
        { platform: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' },
        { platform: 'snapchat', name: 'Snapchat', icon: 'fab fa-snapchat-ghost', color: '#FFFC00' },
        { platform: 'reddit', name: 'Reddit', icon: 'fab fa-reddit-alien', color: '#FF4500' },
        { platform: 'discord', name: 'Discord', icon: 'fab fa-discord', color: '#5865F2' },
        { platform: 'github', name: 'GitHub', icon: 'fab fa-github', color: '#181717' },
        { platform: 'medium', name: 'Medium', icon: 'fab fa-medium-m', color: '#000000' },
        { platform: 'email', name: 'Email', icon: 'fas fa-envelope', color: '#EA4335' },
        { platform: 'phone', name: 'Phone', icon: 'fas fa-phone', color: '#25D366' },
        { platform: 'website', name: 'Website', icon: 'fas fa-globe', color: '#4285F4' }
    ];
    
    res.json({
        success: true,
        data: platforms
    });
});

module.exports = router;
