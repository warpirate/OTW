const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

class ChatService {
    constructor() {
        this.connectedUsers = new Map(); // Map of userId -> socketId
        this.userSessions = new Map(); // Map of socketId -> userId
        this.typingUsers = new Map(); // Map of sessionId -> Set of userIds
    }

    // Initialize database connection (using existing pool)
    async initDB() {
        // Test the connection
        try {
            await pool.query('SELECT 1');
            console.log('✅ ChatService database connection established');
        } catch (error) {
            console.error('❌ ChatService database connection failed:', error);
            throw error;
        }
    }

    // Authenticate user from socket connection
    async authenticateUser(socket, next) {
        try {
            const headerAuth = socket.handshake.headers?.authorization;
            const headerToken = headerAuth && headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : null;
            const token = socket.handshake.auth?.token || headerToken;

            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key');

            const userId = decoded.userId || decoded.id || decoded.user_id;
            if (!userId) {
                return next(new Error('Invalid token payload'));
            }

            // Verify user exists and is active
            const [users] = await pool.execute(
                'SELECT id, name, email, phone_number FROM users WHERE id = ? AND is_active = 1',
                [userId]
            );

            if (users.length === 0) {
                return next(new Error('User not found or inactive'));
            }

            socket.userId = userId;
            socket.userType = decoded.userType || decoded.role || 'customer';
            socket.user = users[0];

            next();
        } catch (error) {
            next(new Error('Invalid authentication token'));
        }
    }

    // Handle user connection
    async handleConnection(socket) {
        console.log(`User ${socket.userId} connected with socket ${socket.id}`);
        
        // Store user connection
        this.connectedUsers.set(socket.userId, socket.id);
        this.userSessions.set(socket.id, socket.userId);

        // Update user online status in database
        await this.updateUserOnlineStatus(socket.userId, true);

        // Join user to their active chat sessions
        await this.joinUserToSessions(socket);

        // Handle disconnection
        socket.on('disconnect', () => this.handleDisconnection(socket));

        // Handle chat events
        socket.on('join_chat', (data) => this.handleJoinChat(socket, data));
        socket.on('leave_chat', (data) => this.handleLeaveChat(socket, data));
        socket.on('send_message', (data) => this.handleSendMessage(socket, data));
        socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
        socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
        socket.on('mark_read', (data) => this.handleMarkRead(socket, data));
        socket.on('get_chat_history', (data) => this.handleGetChatHistory(socket, data));
    }

    // Handle user disconnection
    async handleDisconnection(socket) {
        console.log(`User ${socket.userId} disconnected`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.userId);
        this.userSessions.delete(socket.id);

        // Update user offline status
        await this.updateUserOnlineStatus(socket.userId, false);

        // Remove from typing users
        for (const [sessionId, typingSet] of this.typingUsers.entries()) {
            typingSet.delete(socket.userId);
            if (typingSet.size === 0) {
                this.typingUsers.delete(sessionId);
            }
        }
    }

    // Update user online status in database
    async updateUserOnlineStatus(userId, isOnline) {
        try {
            await pool.execute(
                'UPDATE chat_participants SET is_online = ?, last_seen_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [isOnline ? 1 : 0, userId]
            );
        } catch (error) {
            console.error('Error updating user online status:', error);
        }
    }

    // Join user to their active chat sessions
    async joinUserToSessions(socket) {
        try {
            const [userSessions] = await pool.execute(
                `SELECT cs.id as session_id, cs.booking_id 
                 FROM chat_sessions cs 
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 WHERE cs.session_status = 'active'
                   AND (
                        cs.customer_id = ?
                     OR cs.provider_id = ?
                     OR p.user_id = ?
                   )`,
                [socket.userId, socket.userId, socket.userId]
            );

            userSessions.forEach(session => {
                socket.join(`session_${session.session_id}`);
                console.log(`User ${socket.userId} joined session ${session.session_id}`);
            });
        } catch (error) {
            console.error('Error joining user to sessions:', error);
        }
    }

    // Handle join chat event
    async handleJoinChat(socket, data) {
        try {
            const { sessionId } = data;
            
            // Verify user has access to this session (support provider mapping)
            const [joinAccessSessions] = await pool.execute(
                `SELECT cs.id
                 FROM chat_sessions cs
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 WHERE cs.id = ?
                   AND cs.session_status = 'active'
                   AND (
                        cs.customer_id = ?
                     OR cs.provider_id = ?
                     OR (p.user_id = ?)
                   )`,
                [sessionId, socket.userId, socket.userId, socket.userId]
            );

            if (joinAccessSessions.length === 0) {
                socket.emit('error', { message: 'Access denied to this chat session' });
                return;
            }

            socket.join(`session_${sessionId}`);
            socket.emit('joined_chat', { sessionId });
            
            // Notify other participants
            socket.to(`session_${sessionId}`).emit('user_joined', {
                sessionId,
                userId: socket.userId,
                userName: socket.user.name
            });

        } catch (error) {
            console.error('Error joining chat:', error);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    }

    // Handle leave chat event
    async handleLeaveChat(socket, data) {
        try {
            const { sessionId } = data;
            
            socket.leave(`session_${sessionId}`);
            socket.emit('left_chat', { sessionId });
            
            // Notify other participants
            socket.to(`session_${sessionId}`).emit('user_left', {
                sessionId,
                userId: socket.userId,
                userName: socket.user.name
            });

        } catch (error) {
            console.error('Error leaving chat:', error);
            socket.emit('error', { message: 'Failed to leave chat' });
        }
    }

    // Handle send message event
    async handleSendMessage(socket, data) {
        try {
            const { sessionId, content, messageType = 'text', fileUrl, fileName, fileSize } = data;

            // Validate input
            if (!sessionId || !content) {
                socket.emit('error', { message: 'Session ID and content are required' });
                return;
            }

            // Verify user has access to this session and determine sender type
            const [sendAccessSessions] = await pool.execute(
                `SELECT 
                    cs.id, cs.customer_id, cs.provider_id, cs.booking_id,
                    b.provider_id as booking_provider_id,
                    p.user_id as provider_user_id,
                    CASE 
                        WHEN cs.customer_id = ? THEN 'customer'
                        WHEN cs.provider_id = ? OR p.user_id = ? THEN 'provider'
                        ELSE NULL
                    END as sender_type
                 FROM chat_sessions cs
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 WHERE cs.id = ?
                   AND cs.session_status = 'active'
                   AND (
                        cs.customer_id = ?
                     OR cs.provider_id = ?
                     OR p.user_id = ?
                   )`,
                [socket.userId, socket.userId, socket.userId, sessionId, socket.userId, socket.userId, socket.userId]
            );

            if (sendAccessSessions.length === 0 || !sendAccessSessions[0].sender_type) {
                socket.emit('error', { message: 'Access denied to this chat session' });
                return;
            }
            
            const session = sendAccessSessions[0];
            const senderType = session.sender_type;

            // Save message to database
            console.log('💾 Inserting message to database:', {
                sessionId,
                senderId: socket.userId,
                senderType,
                messageType,
                content: content.substring(0, 50) + '...'
            });
            
            const [result] = await pool.execute(
                `INSERT INTO chat_messages (session_id, sender_id, sender_type, message_type, content, file_url, file_name, file_size) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    sessionId,
                    socket.userId,
                    senderType,
                    messageType,
                    content,
                    fileUrl ?? null,
                    fileName ?? null,
                    (typeof fileSize === 'number' ? fileSize : null)
                ]
            );
            
            console.log('✅ Message inserted successfully, ID:', result.insertId);

            const messageId = result.insertId;

            // Prepare message object for broadcast
            const message = {
                id: messageId,
                session_id: sessionId,
                sender_id: socket.userId,
                sender_type: senderType,
                message_type: messageType,
                content,
                file_url: fileUrl ?? null,
                file_name: fileName ?? null,
                file_size: (typeof fileSize === 'number' ? fileSize : null),
                is_read: 0,
                created_at: new Date(),
                sender_name: socket.user.name,
                sender_phone: socket.user.phone_number
            };

            // Broadcast message to all participants in the session (including sender)
            console.log('📡 Broadcasting message to session:', sessionId);
            console.log('📡 Broadcasting to other participants...');
            socket.to(`session_${sessionId}`).emit('new_message', message);
            
            console.log('📡 Broadcasting to sender...');
            socket.emit('new_message', message);
            
            // Send confirmation to sender
            socket.emit('message_sent', { messageId, sessionId });

            // Create push notification for recipient
            await this.createPushNotification(sessionId, socket.userId, messageId);

        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    // Handle typing start event
    async handleTypingStart(socket, data) {
        try {
            const { sessionId } = data;

            // Verify user has access to this session (support provider mapping)
            const [typingStartSessions] = await pool.execute(
                `SELECT cs.id
                 FROM chat_sessions cs
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 WHERE cs.id = ?
                   AND cs.session_status = 'active'
                   AND (
                        cs.customer_id = ?
                     OR cs.provider_id = ?
                     OR (p.user_id = ?)
                   )`,
                [sessionId, socket.userId, socket.userId, socket.userId]
            );

            if (typingStartSessions.length === 0) return;

            // Add user to typing set
            if (!this.typingUsers.has(sessionId)) {
                this.typingUsers.set(sessionId, new Set());
            }
            this.typingUsers.get(sessionId).add(socket.userId);

            // Notify other participants
            socket.to(`session_${sessionId}`).emit('user_typing', {
                sessionId,
                userId: socket.userId,
                userName: socket.user.name,
                isTyping: true
            });

        } catch (error) {
            console.error('Error handling typing start:', error);
        }
    }

    // Handle typing stop event
    async handleTypingStop(socket, data) {
        try {
            const { sessionId } = data;

            // Remove user from typing set
            if (this.typingUsers.has(sessionId)) {
                this.typingUsers.get(sessionId).delete(socket.userId);
                
                if (this.typingUsers.get(sessionId).size === 0) {
                    this.typingUsers.delete(sessionId);
                }
            }

            // Notify other participants
            socket.to(`session_${sessionId}`).emit('user_typing', {
                sessionId,
                userId: socket.userId,
                userName: socket.user.name,
                isTyping: false
            });

        } catch (error) {
            console.error('Error handling typing stop:', error);
        }
    }

    // Handle mark message as read
    async handleMarkRead(socket, data) {
        try {
            const { sessionId, messageIds } = data;

            // Verify user has access to this session (support provider mapping)
            const [markReadSessions] = await pool.execute(
                `SELECT cs.id
                 FROM chat_sessions cs
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 WHERE cs.id = ?
                   AND cs.session_status = 'active'
                   AND (
                        cs.customer_id = ?
                     OR cs.provider_id = ?
                     OR (p.user_id = ?)
                   )`,
                [sessionId, socket.userId, socket.userId, socket.userId]
            );

            if (markReadSessions.length === 0) {
                socket.emit('error', { message: 'Access denied to this chat session' });
                return;
            }

            // Mark messages as read
            if (messageIds && messageIds.length > 0) {
                const placeholders = messageIds.map(() => '?').join(',');
                await pool.execute(
                    `UPDATE chat_messages 
                     SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                     WHERE id IN (${placeholders}) AND session_id = ? AND sender_id != ?`,
                    [...messageIds, sessionId, socket.userId]
                );
            }

            // Notify sender about read status
            socket.to(`session_${sessionId}`).emit('messages_read', {
                sessionId,
                readerId: socket.userId,
                messageIds
            });

        } catch (error) {
            console.error('Error marking messages as read:', error);
            socket.emit('error', { message: 'Failed to mark messages as read' });
        }
    }

    // Handle get chat history
    async handleGetChatHistory(socket, data) {
        try {
            const { sessionId, limit = 50, offset = 0 } = data;

            // Verify user has access to this session
            const [historyAccessSessions] = await pool.execute(
                `SELECT cs.id
                 FROM chat_sessions cs
                 JOIN bookings b ON b.id = cs.booking_id
                 LEFT JOIN providers p ON p.id = b.provider_id
                 WHERE cs.id = ?
                   AND cs.session_status = 'active'
                   AND (
                        cs.customer_id = ?
                     OR cs.provider_id = ?
                     OR (p.user_id = ?)
                   )`,
                [sessionId, socket.userId, socket.userId, socket.userId]
            );

            if (historyAccessSessions.length === 0) {
                socket.emit('error', { message: 'Access denied to this chat session' });
                return;
            }

            // Get chat history - Note: LIMIT and OFFSET need to be integers, not parameters
            const limitInt = parseInt(limit) || 50;
            const offsetInt = parseInt(offset) || 0;
            
            const [messages] = await pool.execute(
                `SELECT 
                    cm.id, cm.sender_id, cm.sender_type, cm.message_type, 
                    cm.content, cm.file_url, cm.file_name, cm.file_size,
                    cm.is_read, cm.read_at, cm.created_at,
                    u.name as sender_name, u.phone_number as sender_phone
                 FROM chat_messages cm
                 JOIN users u ON cm.sender_id = u.id
                 WHERE cm.session_id = ?
                 ORDER BY cm.created_at DESC
                 LIMIT ${limitInt} OFFSET ${offsetInt}`,
                [sessionId]
            );

            socket.emit('chat_history', {
                sessionId,
                messages: messages.reverse(), // Reverse to show oldest first
                hasMore: messages.length === limit
            });

        } catch (error) {
            console.error('Error getting chat history:', error);
            socket.emit('error', { message: 'Failed to get chat history' });
        }
    }

    // Create push notification
    async createPushNotification(sessionId, senderId, messageId) {
        try {
            // Get recipient ID
            const [sessions] = await pool.execute(
                'SELECT customer_id, provider_id FROM chat_sessions WHERE id = ?',
                [sessionId]
            );

            if (sessions.length === 0) return;

            const session = sessions[0];
            const recipientId = senderId === session.customer_id ? session.provider_id : session.customer_id;

            // Check if recipient is online
            const isOnline = this.connectedUsers.has(recipientId);

            // Create notification record
            await pool.execute(
                'INSERT INTO chat_notifications (session_id, recipient_id, message_id, notification_type, is_sent) VALUES (?, ?, ?, "new_message", ?)',
                [sessionId, recipientId, messageId, isOnline ? 1 : 0]
            );

            // If user is offline, you can trigger push notification service here
            if (!isOnline) {
                // TODO: Integrate with push notification service (FCM, APNS, etc.)
                console.log(`Push notification needed for user ${recipientId}`);
            }

        } catch (error) {
            console.error('Error creating push notification:', error);
        }
    }

    // Create chat session when booking is accepted
    async createChatSession(bookingId) {
        try {
            const [result] = await pool.execute(
                'CALL sp_create_chat_session(?)',
                [bookingId]
            );

            const sessionId = result[0][0].session_id;
            console.log(`Chat session created for booking ${bookingId}: ${sessionId}`);
            return sessionId;

        } catch (error) {
            console.error('Error creating chat session:', error);
            throw error;
        }
    }

    // End chat session when service is completed
    async endChatSession(bookingId) {
        try {
            await pool.execute('CALL sp_end_chat_session(?)', [bookingId]);
            console.log(`Chat session ended for booking ${bookingId}`);

        } catch (error) {
            console.error('Error ending chat session:', error);
            throw error;
        }
    }

    // Delete chat data when service is completed
    async deleteChatData(bookingId) {
        try {
            await pool.execute('CALL sp_delete_chat_data(?)', [bookingId]);
            console.log(`Chat data deleted for booking ${bookingId}`);

        } catch (error) {
            console.error('Error deleting chat data:', error);
            throw error;
        }
    }

    // Get user's active chat sessions
    async getUserChatSessions(userId) {
        try {
            const [sessions] = await pool.execute(
                `SELECT 
                    cs.id as session_id, cs.booking_id, cs.message_count, cs.last_message_at,
                    cu.name as customer_name, cu.phone_number as customer_phone,
                    COALESCE(wu.name, pu.name) as provider_name, 
                    COALESCE(wu.phone_number, pu.phone_number) as provider_phone,
                    b.service_status, b.booking_type, sc.name as service_name
                 FROM chat_sessions cs
                 JOIN users cu ON cs.customer_id = cu.id
                 LEFT JOIN users pu ON cs.provider_id = pu.id
                 LEFT JOIN providers p ON p.id = (SELECT provider_id FROM bookings WHERE id = cs.booking_id)
                 LEFT JOIN users wu ON wu.id = p.user_id
                 JOIN bookings b ON cs.booking_id = b.id
                 LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
                 WHERE (cs.customer_id = ? OR cs.provider_id = ? OR p.user_id = ?) 
                 AND cs.session_status = 'active'
                 ORDER BY cs.last_message_at DESC`,
                [userId, userId, userId]
            );

            return sessions;

        } catch (error) {
            console.error('Error getting user chat sessions:', error);
            throw error;
        }
    }

    // Get unread message count for user
    async getUnreadCount(userId) {
        try {
            const [result] = await pool.execute(
                'SELECT unread_count FROM v_user_unread_counts WHERE user_id = ?',
                [userId]
            );

            return result.length > 0 ? result[0].unread_count : 0;

        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }
}

module.exports = ChatService;
