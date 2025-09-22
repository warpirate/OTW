const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Initialize database connection
let db;
const initDB = async () => {
    if (!db) {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'omw_db',
            charset: 'utf8mb4'
        });
    }
    return db;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/chat');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    }
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key');

        // Support tokens that use different claim keys
        const verifiedUserId = decoded.userId || decoded.id || decoded.user_id;
        if (!verifiedUserId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        // Verify user exists
        const database = await initDB();
        const [users] = await database.execute(
            'SELECT id, name, email, phone_number FROM users WHERE id = ? AND is_active = 1',
            [verifiedUserId]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid user' });
        }

        req.user = users[0];
        req.userType = decoded.userType || decoded.role || 'customer';
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Get user's active chat sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const database = await initDB();
        const userId = req.user.id;

        const [sessions] = await database.execute(
            `SELECT 
                cs.id as session_id, cs.booking_id, cs.message_count, cs.last_message_at, cs.created_at,
                cu.name as customer_name, cu.phone_number as customer_phone,
                pu.name as provider_name, pu.phone_number as provider_phone,
                b.service_status, b.booking_type, b.scheduled_time,
                sc.name as service_name, sc.description as service_description,
                CASE 
                    WHEN cs.customer_id = ? THEN 'customer'
                    ELSE 'provider'
                END as user_role
             FROM chat_sessions cs
             JOIN users cu ON cs.customer_id = cu.id
             JOIN users pu ON cs.provider_id = pu.id
             JOIN bookings b ON cs.booking_id = b.id
             LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
             WHERE (cs.customer_id = ? OR cs.provider_id = ?) 
             AND cs.session_status = 'active'
             ORDER BY cs.last_message_at DESC`,
            [userId, userId, userId]
        );

        // Get unread count for each session
        for (let session of sessions) {
            const [unreadResult] = await database.execute(
                `SELECT COUNT(*) as unread_count 
                 FROM chat_messages 
                 WHERE session_id = ? AND sender_id != ? AND is_read = 0`,
                [session.session_id, userId]
            );
            session.unread_count = unreadResult[0].unread_count;
        }

        res.json({
            success: true,
            sessions: sessions
        });

    } catch (error) {
        console.error('Error getting chat sessions:', error);
        res.status(500).json({ error: 'Failed to get chat sessions' });
    }
});

// Get chat history for a specific session
router.get('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const userId = req.user.id;

        const database = await initDB();

        // Verify user has access to this session
        // Verify user has access to this session (support legacy data where provider_id stores providers.id)
        const [sessions] = await database.execute(
            `SELECT cs.id
             FROM chat_sessions cs
             WHERE cs.id = ?
               AND cs.session_status = 'active'
               AND (
                    cs.customer_id = ?
                 OR cs.provider_id = ?
                 OR EXISTS (
                      SELECT 1 FROM providers p
                      WHERE p.user_id = ?
                        AND p.id = (SELECT b.provider_id FROM bookings b WHERE b.id = cs.booking_id)
                 )
               )`,
            [sessionId, userId, userId, userId]
        );

        if (sessions.length === 0) {
            return res.status(403).json({ error: 'Access denied to this chat session' });
        }

        // Get messages (inline validated numeric limit/offset to avoid MySQL param issues)
        const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(parseInt(limit), 1), 200) : 50;
        const safeOffset = Number.isFinite(Number(offset)) ? Math.max(parseInt(offset), 0) : 0;
        const [messages] = await database.execute(
            `SELECT 
                cm.id, cm.sender_id, cm.sender_type, cm.message_type, 
                cm.content, cm.file_url, cm.file_name, cm.file_size,
                cm.is_read, cm.read_at, cm.created_at,
                u.name as sender_name, u.phone_number as sender_phone
             FROM chat_messages cm
             JOIN users u ON cm.sender_id = u.id
             WHERE cm.session_id = ?
             ORDER BY cm.created_at DESC
             LIMIT ${safeLimit} OFFSET ${safeOffset}`,
            [sessionId]
        );

        res.json({
            success: true,
            messages: messages.reverse(), // Reverse to show oldest first
            hasMore: messages.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

// Mark messages as read
router.put('/sessions/:sessionId/messages/read', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { messageIds } = req.body;
        const userId = req.user.id;

        const database = await initDB();

        // Verify user has access to this session
        const [sessions] = await database.execute(
            `SELECT cs.id
             FROM chat_sessions cs
             WHERE cs.id = ?
               AND cs.session_status = 'active'
               AND (
                    cs.customer_id = ?
                 OR cs.provider_id = ?
                 OR EXISTS (
                      SELECT 1 FROM providers p
                      WHERE p.user_id = ?
                        AND p.id = (SELECT b.provider_id FROM bookings b WHERE b.id = cs.booking_id)
                 )
               )`,
            [sessionId, userId, userId, userId]
        );

        if (sessions.length === 0) {
            return res.status(403).json({ error: 'Access denied to this chat session' });
        }

        // Mark messages as read
        if (messageIds && messageIds.length > 0) {
            const placeholders = messageIds.map(() => '?').join(',');
            await database.execute(
                `UPDATE chat_messages 
                 SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                 WHERE id IN (${placeholders}) AND session_id = ? AND sender_id != ?`,
                [...messageIds, sessionId, userId]
            );
        } else {
            // Mark all unread messages in session as read
            await database.execute(
                `UPDATE chat_messages 
                 SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                 WHERE session_id = ? AND sender_id != ? AND is_read = 0`,
                [sessionId, userId]
            );
        }

        res.json({
            success: true,
            message: 'Messages marked as read'
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// Upload file for chat
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/chat/${req.file.filename}`;
        
        res.json({
            success: true,
            file: {
                url: fileUrl,
                name: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Get unread message count for user
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const database = await initDB();
        const userId = req.user.id;

        const [result] = await database.execute(
            'SELECT unread_count FROM v_user_unread_counts WHERE user_id = ?',
            [userId]
        );

        const unreadCount = result.length > 0 ? result[0].unread_count : 0;

        res.json({
            success: true,
            unreadCount: unreadCount
        });

    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// Get chat session details
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const database = await initDB();

        const [sessions] = await database.execute(
            `SELECT 
                cs.id as session_id, cs.booking_id, cs.message_count, cs.last_message_at, cs.created_at,
                cu.id as customer_id, cu.name as customer_name, cu.phone_number as customer_phone,
                pu.id as provider_id, pu.name as provider_name, pu.phone_number as provider_phone,
                b.service_status, b.booking_type, b.scheduled_time, b.estimated_cost,
                sc.name as service_name, sc.description as service_description,
                sb.address as service_address,
                CASE 
                    WHEN cs.customer_id = ? THEN 'customer'
                    ELSE 'provider'
                END as user_role
             FROM chat_sessions cs
             JOIN users cu ON cs.customer_id = cu.id
             LEFT JOIN users pu ON cs.provider_id = pu.id
             JOIN bookings b ON cs.booking_id = b.id
             LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
             LEFT JOIN service_bookings sb ON b.id = sb.booking_id
             WHERE cs.id = ? 
               AND cs.session_status = 'active'
               AND (
                    cs.customer_id = ?
                 OR cs.provider_id = ?
                 OR EXISTS (
                      SELECT 1 FROM providers p
                      WHERE p.user_id = ?
                        AND p.id = b.provider_id
                 )
               )`,
            [userId, sessionId, userId, userId, userId]
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Chat session not found' });
        }

        const session = sessions[0];

        // Get participant online status
        const [participants] = await database.execute(
            'SELECT user_id, is_online, last_seen_at FROM chat_participants WHERE session_id = ?',
            [sessionId]
        );

        session.participants = participants;

        res.json({
            success: true,
            session: session
        });

    } catch (error) {
        console.error('Error getting chat session details:', error);
        res.status(500).json({ error: 'Failed to get chat session details' });
    }
});

// Create chat session (called when booking is accepted)
router.post('/sessions', authenticateToken, async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user.id;

        if (!bookingId) {
            return res.status(400).json({ error: 'Booking ID is required' });
        }

        const database = await initDB();

        // Resolve provider_id for workers (providers.user_id -> providers.id)
        let providerIdForUser = null;
        try {
            const [providerRows] = await database.execute(
                'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
                [userId]
            );
            if (providerRows.length > 0) {
                providerIdForUser = providerRows[0].id;
            }
        } catch (_) {
            // Ignore provider lookup errors; fallback to null which simply disables provider-side access in the next query
        }

        // Verify user has access to this booking: either the customer (bookings.user_id) or the assigned provider (bookings.provider_id)
        const [bookings] = await database.execute(
            `SELECT id, user_id, provider_id, service_status 
             FROM bookings 
             WHERE id = ? 
             AND (
                user_id = ?
                OR (provider_id = ? AND ? IS NOT NULL)
             )`,
            [bookingId, userId, providerIdForUser, providerIdForUser]
        );

        if (bookings.length === 0) {
            return res.status(403).json({ error: 'Access denied to this booking' });
        }

        const booking = bookings[0];

        // Check if chat session already exists (return it regardless of current status)
        const [existingSessions] = await database.execute(
            'SELECT id FROM chat_sessions WHERE booking_id = ?',
            [bookingId]
        );

        if (existingSessions.length > 0) {
            return res.json({
                success: true,
                sessionId: existingSessions[0].id,
                message: 'Chat session already exists'
            });
        }

        // Allow chat creation for accepted/assigned and progressed service statuses
        const allowedStatuses = ['assigned', 'accepted', 'started', 'en_route', 'arrived', 'in_progress'];
        if (!allowedStatuses.includes(booking.service_status)) {
            return res.status(400).json({ error: 'Chat can only be created for accepted bookings' });
        }

        // Create chat session
        const [result] = await database.execute(
            'CALL sp_create_chat_session(?)',
            [bookingId]
        );

        const sessionId = result[0][0].session_id;

        // Normalize provider_id in chat_sessions to store users.id (not providers.id) in case bookings.provider_id references providers.id
        try {
            await database.execute(
                `UPDATE chat_sessions cs
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 SET cs.customer_id = b.user_id,
                     cs.provider_id = COALESCE(p.user_id, b.provider_id)
                 WHERE cs.id = ?`,
                [sessionId]
            );
        } catch (normErr) {
            // log but don't fail the request
            console.warn('Chat session normalization warning:', normErr?.message || normErr);
        }

        res.json({
            success: true,
            sessionId: sessionId,
            message: 'Chat session created successfully'
        });

    } catch (error) {
        console.error('Error creating chat session:', error);
        res.status(500).json({ error: 'Failed to create chat session' });
    }
});

// End chat session (called when service is completed)
router.put('/sessions/:sessionId/end', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const database = await initDB();

        // Verify user has access to this session
        const [sessions] = await database.execute(
            'SELECT booking_id FROM chat_sessions WHERE id = ? AND (customer_id = ? OR provider_id = ?)',
            [sessionId, userId, userId]
        );

        if (sessions.length === 0) {
            return res.status(403).json({ error: 'Access denied to this chat session' });
        }

        const bookingId = sessions[0].booking_id;

        // End chat session
        await database.execute('CALL sp_end_chat_session(?)', [bookingId]);

        res.json({
            success: true,
            message: 'Chat session ended successfully'
        });

    } catch (error) {
        console.error('Error ending chat session:', error);
        res.status(500).json({ error: 'Failed to end chat session' });
    }
});

// Delete chat data (called when service is completed and data should be cleaned up)
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const database = await initDB();

        // Verify user has access to this session
        const [sessions] = await database.execute(
            'SELECT booking_id FROM chat_sessions WHERE id = ? AND (customer_id = ? OR provider_id = ?)',
            [sessionId, userId, userId]
        );

        if (sessions.length === 0) {
            return res.status(403).json({ error: 'Access denied to this chat session' });
        }

        const bookingId = sessions[0].booking_id;

        // Delete chat data
        await database.execute('CALL sp_delete_chat_data(?)', [bookingId]);

        res.json({
            success: true,
            message: 'Chat data deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting chat data:', error);
        res.status(500).json({ error: 'Failed to delete chat data' });
    }
});

module.exports = router;
