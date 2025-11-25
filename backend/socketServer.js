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
            const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173,https://omwhub.com,https://www.omwhub.com,https://d1v40s48mdt8sd.cloudfront.net,https://test.omwhub.com';
            const allowedOrigins = corsOrigins
              .split(',')
              .map(o => o.trim())
              .filter(Boolean);
            
            console.log('Socket.IO CORS allowed origins:', allowedOrigins);
            
            // Add mobile app origins for React Native and API domain
            const mobileOrigins = [
              'capacitor://localhost',
              'http://localhost',
              'https://localhost',
              'file://',
              'https://api.omwhub.com', // Add API domain for mobile app
              'https://api.omwhub.com:443', // Add API domain with port
              null, // Allow null origin for mobile apps
              undefined // Allow undefined origin for mobile apps
            ];
            
            allowedOrigins.push(...mobileOrigins);

            this.io = new Server(this.server, {
                cors: {
                    origin: (origin, callback) => {
                        // Always allow requests with no origin (mobile apps)
                        if (!origin) {
                            console.log('Socket.IO: Allowing request with no origin (mobile app)');
                            return callback(null, true);
                        }
                        
                        // Check if origin is in allowed list
                        if (allowedOrigins.includes(origin)) {
                            console.log(`Socket.IO: Allowing origin: ${origin}`);
                            return callback(null, true);
                        }
                        
                        // Log blocked origins for debugging
                        console.warn(`Socket.IO CORS blocked origin: ${origin}`);
                        console.warn('Allowed origins:', allowedOrigins);
                        return callback(new Error(`Socket.IO CORS blocked: ${origin}`));
                    },
                    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                    credentials: true
                },
                transports: ['websocket', 'polling'],
                allowEIO3: true,
                pingTimeout: 60000,
                pingInterval: 25000,
                connectTimeout: 45000
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
