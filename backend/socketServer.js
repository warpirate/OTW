const { Server } = require('socket.io');
const http = require('http');
const ChatService = require('./services/chatService');

class SocketServer {
    constructor(app) {
        this.app = app;
        this.chatService = new ChatService();
        this.server = null;
        this.io = null;
    }

    async initialize() {
        try {
            // Initialize database connection
            await this.chatService.initDB();

            // Create HTTP server
            this.server = http.createServer(this.app);

            // Initialize Socket.IO
            this.io = new Server(this.server, {
                cors: {
                    origin: process.env.FRONTEND_URL || "http://localhost:5173",
                    methods: ["GET", "POST"],
                    credentials: true
                },
                transports: ['websocket', 'polling']
            });

            // Authentication middleware
            this.io.use((socket, next) => {
                this.chatService.authenticateUser(socket, next);
            });

            // Handle connections
            this.io.on('connection', (socket) => {
                this.chatService.handleConnection(socket);
            });

            console.log('Socket.IO server initialized successfully');
            return this.server;

        } catch (error) {
            console.error('Error initializing Socket.IO server:', error);
            throw error;
        }
    }

    getIO() {
        return this.io;
    }

    getChatService() {
        return this.chatService;
    }

    // Broadcast message to specific users
    broadcastToUsers(userIds, event, data) {
        if (!this.io) return;

        userIds.forEach(userId => {
            const socketId = this.chatService.connectedUsers.get(userId);
            if (socketId) {
                this.io.to(socketId).emit(event, data);
            }
        });
    }

    // Broadcast to all users in a session
    broadcastToSession(sessionId, event, data) {
        if (!this.io) return;
        this.io.to(`session_${sessionId}`).emit(event, data);
    }

    // Get online users count
    getOnlineUsersCount() {
        return this.chatService.connectedUsers.size;
    }

    // Get connected users list
    getConnectedUsers() {
        return Array.from(this.chatService.connectedUsers.keys());
    }

    // Check if user is online
    isUserOnline(userId) {
        return this.chatService.connectedUsers.has(userId);
    }

    // Graceful shutdown
    async shutdown() {
        try {
            if (this.io) {
                this.io.close();
            }
            if (this.server) {
                this.server.close();
            }
            if (this.chatService.db) {
                await this.chatService.db.end();
            }
            console.log('Socket.IO server shutdown complete');
        } catch (error) {
            console.error('Error during Socket.IO server shutdown:', error);
        }
    }
}

module.exports = SocketServer;
