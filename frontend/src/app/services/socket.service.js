import { io } from 'socket.io-client';
import AuthService from './auth.service';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
  }

  connect() {
    const token = AuthService.getToken();
    if (!token) {
      console.warn('No token available for socket connection');
      return;
    }

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
    
    this.socket = io(API_BASE_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('socket:connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('socket:disconnected', { reason });
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.emit('socket:error', { error: error.message });
      
      if (error.message.includes('Authentication')) {
        // Token might be expired, try to refresh
        this.handleAuthError();
      } else {
        this.reconnect();
      }
    });

    // Ride-specific events
    this.socket.on('trip:started', (data) => {
      console.log('🚗 Trip started:', data);
      this.emit('trip:started', data);
    });

    this.socket.on('trip:location_update', (data) => {
      this.emit('trip:location_update', data);
    });

    this.socket.on('trip:completed', (data) => {
      console.log('✅ Trip completed:', data);
      this.emit('trip:completed', data);
    });

    this.socket.on('trip:earnings', (data) => {
      console.log('💰 Trip earnings:', data);
      this.emit('trip:earnings', data);
    });

    // Booking events
    this.socket.on('booking:unavailable', (data) => {
      this.emit('booking:unavailable', data);
    });

    this.socket.on('booking:new_request', (data) => {
      console.log('📱 New booking request:', data);
      this.emit('booking:new_request', data);
    });

    this.socket.on('booking:accepted', (data) => {
      console.log('✅ Booking accepted:', data);
      this.emit('booking:accepted', data);
    });

    this.socket.on('booking:cancelled', (data) => {
      console.log('❌ Booking cancelled:', data);
      this.emit('booking:cancelled', data);
    });

    // Fare and pricing events
    this.socket.on('fare:updated', (data) => {
      console.log('💰 Fare updated:', data);
      this.emit('fare:updated', data);
    });

    this.socket.on('surge:updated', (data) => {
      console.log('⚡ Surge updated:', data);
      this.emit('surge:updated', data);
    });

    // Payment events
    this.socket.on('payment:completed', (data) => {
      console.log('💳 Payment completed:', data);
      this.emit('payment:completed', data);
    });

    this.socket.on('payment:failed', (data) => {
      console.log('❌ Payment failed:', data);
      this.emit('payment:failed', data);
    });
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('socket:max_reconnect_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  handleAuthError() {
    console.log('Socket authentication error, attempting token refresh');
    // Try to refresh token and reconnect
    AuthService.refreshToken()
      .then(() => {
        this.connect();
      })
      .catch((error) => {
        console.error('Token refresh failed:', error);
        this.emit('socket:auth_failed');
        // Redirect to login
        AuthService.logout();
        window.location.href = '/login';
      });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  // Event emitter functionality
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send data to server
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot send:', event, data);
    }
  }

  // Join a room
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', room);
      console.log(`Joined room: ${room}`);
    }
  }

  // Leave a room
  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_room', room);
      console.log(`Left room: ${room}`);
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
