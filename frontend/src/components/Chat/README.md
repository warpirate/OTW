# Real-time Chat System Implementation

## Overview
This implementation provides a complete real-time chat system for the OMW platform, allowing customers and service providers to communicate during active service bookings.

## Features

### ✅ Core Functionality
- **Real-time messaging** using Socket.IO
- **File sharing** (images, documents, voice messages)
- **Typing indicators** and read receipts
- **Message history** with automatic loading
- **User status** (online/offline indicators)
- **Responsive design** for mobile and desktop

### ✅ Chat Lifecycle Management
- **Automatic chat creation** when a booking is accepted
- **Chat availability** only during active service periods
- **Automatic chat deletion** when service is completed
- **Status-based access control**

### ✅ Security & Authorization
- **JWT-based authentication** for Socket.IO connections
- **Role-based access control** (customer vs worker)
- **Session validation** and user authorization
- **Secure file upload** with type validation

## Architecture

### Backend Components
1. **Database Schema** (`chat_system_migration.sql`)
   - `chat_sessions` table for managing chat instances
   - `chat_messages` table for storing messages
   - Database triggers for automatic lifecycle management

2. **Socket.IO Server** (`socketServer.js`)
   - Real-time communication handling
   - Authentication middleware
   - Room management for chat sessions

3. **Chat Service** (`chatService.js`)
   - Business logic for chat operations
   - Message persistence and retrieval
   - User management and authorization

4. **REST API** (`routes/chat/chat.js`)
   - Fallback endpoints for message operations
   - File upload handling
   - Session management

### Frontend Components
1. **ChatWindow** - Main chat interface
2. **ChatHeader** - User info and actions
3. **MessageBubble** - Individual message display
4. **ChatInput** - Message composition and file upload
5. **Chat Service** - Frontend API integration

## Integration Points

### Customer App (`ServiceTracking.jsx`)
- Chat button appears when service provider is assigned
- Modal overlay for chat interface
- Status-based chat availability

### Worker App (`WorkerJobTracking.jsx`)
- Chat button appears when job is accepted
- Same modal interface as customer app
- Role-based message display

## Usage

### For Customers
1. Navigate to service tracking page
2. Click "Message" button when provider is assigned
3. Chat interface opens in modal overlay
4. Send messages, files, or voice notes
5. Chat automatically closes when service completes

### For Workers
1. Navigate to job tracking page
2. Click "Message" button when job is accepted
3. Same chat interface as customers
4. Communicate with customer during service
5. Chat data is automatically cleaned up after completion

## Technical Details

### Message Types
- `text` - Regular text messages
- `image` - Image files with preview
- `file` - Document attachments
- `audio` - Voice messages
- `system` - System notifications

### Real-time Events
- `new_message` - Incoming messages
- `user_typing` - Typing indicators
- `messages_read` - Read receipts
- `user_status_update` - Online/offline status

### File Upload
- Maximum file size: 10MB
- Supported formats: Images, PDFs, documents
- Secure upload with type validation
- Automatic file URL generation

## Security Considerations

1. **Authentication**: All Socket.IO connections require valid JWT tokens
2. **Authorization**: Users can only access chats for their own bookings
3. **File Security**: Uploaded files are validated and stored securely
4. **Data Privacy**: Chat data is automatically deleted after service completion
5. **Rate Limiting**: Message sending is rate-limited to prevent spam

## Performance Optimizations

1. **Lazy Loading**: Chat history is loaded on demand
2. **Message Pagination**: Large chat histories are paginated
3. **Connection Pooling**: Efficient database connections
4. **Caching**: User status and session data caching
5. **Compression**: Message payload compression

## Future Enhancements

- [ ] Message encryption for sensitive communications
- [ ] Push notifications for offline users
- [ ] Message search and filtering
- [ ] Chat analytics and reporting
- [ ] Multi-language support
- [ ] Voice and video calling integration

## Dependencies

### Backend
- `socket.io` - Real-time communication
- `jsonwebtoken` - Authentication
- `multer` - File upload handling
- `mysql2` - Database operations

### Frontend
- `socket.io-client` - Socket.IO client
- `@mui/material` - UI components
- `react-dropzone` - File upload
- `date-fns` - Date formatting

## Configuration

### Environment Variables
```env
# Socket.IO Configuration
SOCKET_CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_jwt_secret

# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=omw_database
```

### Frontend Configuration
```javascript
// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
```

## Troubleshooting

### Common Issues
1. **Chat not loading**: Check authentication token and booking status
2. **Messages not sending**: Verify Socket.IO connection and user permissions
3. **File upload fails**: Check file size and type restrictions
4. **Connection drops**: Verify network connectivity and server status

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('chat_debug', 'true');
```

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.
