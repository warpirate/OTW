import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../app/config';
import AuthService from '../app/services/auth.service';

class ChatService {
    constructor() {
        this.baseURL = '/api/chat';
        this.socket = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.connectionHandlers = new Map();
        this.pendingMessages = [];
        this.pendingJoins = new Set();
        this.activeRole = null; // optionally set by callers to force a role-specific token
        
        // Create axios instance for chat API calls
        this.apiClient = axios.create({
            baseURL: `${API_BASE_URL}/api/chat`,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor to include JWT token
        this.apiClient.interceptors.request.use(
            (config) => {
                // Prefer explicitly set role, then fallback to current_role
                const role = this.activeRole || localStorage.getItem('current_role');
                const token = AuthService.getToken(role);

                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    // Initialize Socket.IO connection
    initializeSocket(token) {
        if (this.socket) {
            this.disconnect();
        }

        if (!token) {
            console.warn('No token provided for socket connection');
            return null;
        }

        try {
            this.socket = io(API_BASE_URL, {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                timeout: 15000,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                forceNew: true,
                autoConnect: false // We'll connect manually
            });

            this.setupSocketEventHandlers();
            
            // Start the connection
            this.socket.connect();
            
            return this.socket;
        } catch (error) {
            console.error('Error initializing socket:', error);
            return null;
        }
    }

    // Setup socket event handlers
    setupSocketEventHandlers() {
        if (!this.socket) return;

        
        this.socket.on('connect', () => {
            console.log('Chat socket connected successfully');
            this.isConnected = true;
            this.emitConnectionEvent('connected');
            
            // Flush any pending messages
            if (this.pendingMessages.length > 0) {
                this.pendingMessages.forEach((msg) => {
                    this.socket.emit('send_message', msg);
                });
                this.pendingMessages = [];
            }

            // Join any rooms queued before socket was ready
            if (this.pendingJoins && this.pendingJoins.size > 0) {
                this.pendingJoins.forEach((sid) => {
                    try {
                        this.socket.emit('join_chat', { sessionId: sid });
                        // Optionally request history to sync
                        this.getChatHistoryViaSocket(sid);
                    } catch (e) {
                        console.warn('Failed to join queued chat room:', sid, e);
                    }
                });
                this.pendingJoins.clear();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Chat socket disconnected:', reason);
            this.isConnected = false;
            this.emitConnectionEvent('disconnected', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Chat socket connection error:', error.message || error);
            this.isConnected = false;
            this.emitConnectionEvent('error', error);
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Chat socket reconnected after', attemptNumber, 'attempts');
            this.isConnected = true;
            this.emitConnectionEvent('connected');
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('Chat socket reconnection failed:', error.message || error);
        });

        // Chat-specific events
        this.socket.on('new_message', (message) => {
            this.emitMessageEvent('new_message', message);
        });

        this.socket.on('message_sent', (data) => {
            this.emitMessageEvent('message_sent', data);
        });

        this.socket.on('user_typing', (data) => {
            this.emitMessageEvent('user_typing', data);
        });

        this.socket.on('messages_read', (data) => {
            this.emitMessageEvent('messages_read', data);
        });

        this.socket.on('user_joined', (data) => {
            this.emitMessageEvent('user_joined', data);
        });

        this.socket.on('user_left', (data) => {
            this.emitMessageEvent('user_left', data);
        });

        this.socket.on('joined_chat', (data) => {
            this.emitMessageEvent('joined_chat', data);
        });

        this.socket.on('left_chat', (data) => {
            this.emitMessageEvent('left_chat', data);
        });

        this.socket.on('chat_history', (data) => {
            this.emitMessageEvent('chat_history', data);
        });

        this.socket.on('error', (error) => {
            console.error('Chat socket error:', error);
            this.emitMessageEvent('error', error);
        });
    }

    // Emit connection events
    emitConnectionEvent(event, data) {
        const handlers = this.connectionHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    }

    // Emit message events
    emitMessageEvent(event, data) {
        const handlers = this.messageHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    }

    // Add event listeners
    onConnection(event, handler) {
        if (!this.connectionHandlers.has(event)) {
            this.connectionHandlers.set(event, []);
        }
        this.connectionHandlers.get(event).push(handler);
    }

    onMessage(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(handler);
    }

    // Remove event listeners
    offConnection(event, handler) {
        const handlers = this.connectionHandlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    offMessage(event, handler) {
        const handlers = this.messageHandlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    // Socket.IO methods
    joinChat(sessionId) {
        // If socket isn't ready yet, queue the join and let 'connect' handler flush it
        if (!this.socket) {
            console.warn('Cannot join chat yet (socket not initialized). Queuing join for session:', sessionId);
            this.pendingJoins.add(sessionId);
            return;
        }

        if (this.isConnected) {
            this.socket.emit('join_chat', { sessionId });
            this.getChatHistoryViaSocket(sessionId);
        } else {
            // Queue and ensure connection
            this.pendingJoins.add(sessionId);
            // Ensure socket tries to connect
            if (!this.socket.connected && !this.socket.connecting) {
                try {
                    this.socket.connect();
                } catch (error) {
                    console.error('Failed to start socket connection:', error);
                }
            }
        }
    }

    leaveChat(sessionId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_chat', { sessionId });
        }
    }

    sendMessage(sessionId, content, messageType = 'text', fileData = null) {
        if (!this.socket) {
            console.error('Socket not initialized, cannot send message');
            throw new Error('Socket not initialized');
        }
        
        const messageData = {
            sessionId,
            content,
            messageType
        };

        if (fileData) {
            messageData.fileUrl = fileData.url;
            messageData.fileName = fileData.name;
            messageData.fileSize = fileData.size;
        }


        if (this.isConnected && this.socket.connected) {
            this.socket.emit('send_message', messageData);
        } else {
            // Queue until connected
            this.pendingMessages.push(messageData);
            
            // Try to connect/reconnect
            if (!this.socket.connected && !this.socket.connecting) {
                try { 
                    this.socket.connect(); 
                } catch (connectError) {
                    console.error('Failed to connect socket:', connectError);
                    throw connectError;
                }
            }
        }
    }

    startTyping(sessionId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing_start', { sessionId });
        }
    }

    stopTyping(sessionId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing_stop', { sessionId });
        }
    }

    markMessagesAsReadViaSocket(sessionId, messageIds = []) {
        if (this.socket && this.isConnected) {
            this.socket.emit('mark_read', { sessionId, messageIds });
        }
    }

    getChatHistoryViaSocket(sessionId, limit = 50, offset = 0) {
        if (this.socket && this.isConnected) {
            this.socket.emit('get_chat_history', { sessionId, limit, offset });
        }
    }

    // Disconnect socket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    // REST API methods
    async getChatSessions() {
        try {
            const response = await this.apiClient.get('/sessions');
            const sessions = response.data.sessions || [];
            // normalize to frontend shape
            return sessions.map((s) => this.formatSession(s));
        } catch (error) {
            console.error('Error getting chat sessions:', error);
            throw error;
        }
    }

    async getChatHistory(sessionId, limit = 50, offset = 0) {
        try {
            const response = await this.apiClient.get(
                `/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
            );
            return {
                messages: response.data.messages || [],
                hasMore: response.data.hasMore || false
            };
        } catch (error) {
            // Treat missing history as an empty conversation (no error toast)
            const status = error?.response?.status;
            const code = error?.response?.data?.code || error?.code;
            if (status === 404 || code === 'NO_HISTORY') {
                return { messages: [], hasMore: false };
            }
            console.error('Error getting chat history:', error);
            throw error;
        }
    }

    async markMessagesAsRead(sessionId, messageIds = []) {
        try {
            const response = await this.apiClient.put(
                `/sessions/${sessionId}/messages/read`,
                { messageIds }
            );
            return response.data;
        } catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        }
    }

    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await this.apiClient.post(
                `/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    async getUnreadCount() {
        try {
            const response = await this.apiClient.get('/unread-count');
            return response.data;
        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    async getChatSessionDetails(sessionId) {
        try {
            const response = await this.apiClient.get(`/sessions/${sessionId}`);
            const raw = response.data.session || {};
            // Normalize to our frontend shape
            return { session: this.formatSession(raw) };
        } catch (error) {
            console.error('Error getting chat session details:', error);
            throw error;
        }
    }

    async createChatSession(bookingId) {
        try {
            const response = await this.apiClient.post('/sessions', { bookingId });
            return {
                sessionId: response.data.sessionId
            };
        } catch (error) {
            console.error('Error creating chat session:', error);
            throw error;
        }
    }

    async endChatSession(sessionId) {
        try {
            const response = await this.apiClient.put(`/sessions/${sessionId}/end`);
            return response.data;
        } catch (error) {
            console.error('Error ending chat session:', error);
            throw error;
        }
    }

    async deleteChatData(sessionId) {
        try {
            const response = await this.apiClient.delete(`/sessions/${sessionId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting chat data:', error);
            throw error;
        }
    }

    async sendMessageViaRest(sessionId, content, messageType = 'text', fileData = null) {
        try {
            const messageData = {
                content,
                messageType
            };

            if (fileData) {
                messageData.fileUrl = fileData.url;
                messageData.fileName = fileData.name;
                messageData.fileSize = fileData.size;
            }

            const response = await this.apiClient.post(`/sessions/${sessionId}/messages`, messageData);
            return response.data;
        } catch (error) {
            console.error('Error sending message via REST:', error);
            throw error;
        }
    }

    // Utility methods
    isSocketConnected() {
        return this.isConnected;
    }

    getSocket() {
        return this.socket;
    }

    // Format message for display
    formatMessage(message) {
        return {
            id: message.id,
            content: message.content,
            senderId: message.sender_id,
            senderName: message.sender_name,
            senderType: message.sender_type,
            messageType: message.message_type,
            fileUrl: message.file_url,
            fileName: message.file_name,
            fileSize: message.file_size,
            isRead: message.is_read,
            readAt: message.read_at,
            createdAt: new Date(message.created_at),
            sender: {
                id: message.sender_id,
                name: message.sender_name,
                phone: message.sender_phone
            }
        };
    }

    // Format session for display
    formatSession(session) {
        return {
            sessionId: session.session_id,
            bookingId: session.booking_id,
            messageCount: session.message_count,
            lastMessageAt: session.last_message_at ? new Date(session.last_message_at) : null,
            createdAt: new Date(session.created_at),
            unreadCount: session.unread_count || 0,
            userRole: session.user_role,
            serviceStatus: session.service_status,
            bookingType: session.booking_type,
            scheduledTime: session.scheduled_time ? new Date(session.scheduled_time) : null,
            serviceName: session.service_name,
            serviceDescription: session.service_description,
            customer: {
                id: session.customer_id,
                name: session.customer_name,
                phone: session.customer_phone
            },
            provider: {
                id: session.provider_id,
                name: session.provider_name,
                phone: session.provider_phone
            }
        };
    }
}

// Create singleton instance
const chatService = new ChatService();
export default chatService;
