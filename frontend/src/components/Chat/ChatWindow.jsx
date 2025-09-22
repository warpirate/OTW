import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import chatService from '../../services/chat.service';
import AuthService from '../../app/services/auth.service';
import './ChatWindow.css';

// CSS classes will be used instead of styled components

const ChatWindow = ({ 
    bookingId, 
    onClose,
    isOpen = true,
    onError,
    provider = null,
    customer = null,
    booking = null
}) => {
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [otherParticipant, setOtherParticipant] = useState(null);
    const [bookingInfo, setBookingInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const socketRef = useRef(null);

    // Scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Load chat session and messages
    const loadChatSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get current user
            const user = AuthService.getCurrentUser();
            setCurrentUser(user);

            if (!user) {
                throw new Error('User not authenticated. Please log in again.');
            }

            console.log('Chat session loading for user:', {
                userId: user.id,
                userRole: user.role,
                bookingId: bookingId
            });

            // Ensure chat requests use the correct role token
            chatService.activeRole = user.role;

            // Create or get existing chat session (do NOT error if not yet available)
            let sessionIdResp;
            try {
                sessionIdResp = await chatService.createChatSession(bookingId);
                console.log('Chat session created successfully:', sessionIdResp);
            } catch (createError) {
                console.warn('Failed to create chat session, checking for existing one:', createError);
                try {
                    const sessions = await chatService.getChatSessions();
                    const existing = sessions.find(s => s.bookingId === Number(bookingId) || s.bookingId === bookingId);
                    if (!existing) {
                        // No session yet (booking likely not accepted). Render header + placeholder, keep input disabled.
                        setIsLoading(false);
                        return;
                    }
                    sessionIdResp = { sessionId: existing.sessionId };
                } catch (sessionsError) {
                    // Gracefully render placeholder if sessions endpoint not yet available
                    setIsLoading(false);
                    return;
                }
            }

            const actualSessionId = sessionIdResp.sessionId;
            setSessionId(actualSessionId);

            // Get session details with participant information
            try {
                const sessionDetails = await chatService.getChatSessionDetails(actualSessionId);
                const session = sessionDetails.session;
                
                setBookingInfo({ 
                    id: bookingId,
                    service: session.serviceName || 'Service',
                    status: session.serviceStatus || 'pending'
                });

                // Determine the other participant based on the authenticated user's role
                if (user.role === 'customer') {
                    setOtherParticipant({
                        id: session.provider?.id,
                        name: session.provider?.name || 'Service Provider',
                        avatar: null,
                        phone: session.provider?.phone
                    });
                } else {
                    setOtherParticipant({
                        id: session.customer?.id,
                        name: session.customer?.name || 'Customer',
                        avatar: null,
                        phone: session.customer?.phone
                    });
                }

                // Load chat history
                try {
                    const history = await chatService.getChatHistory(actualSessionId);
                    const formattedMessages = history.messages.map(msg => chatService.formatMessage(msg));
                    setMessages(formattedMessages);
                } catch (historyError) {
                    console.warn('Failed to load chat history:', historyError);
                    setMessages([]);
                }

            } catch (detailsError) {
                console.warn('Failed to get session details, using fallback data:', detailsError);
                // Fallback to props data
                setBookingInfo({ 
                    id: bookingId,
                    service: booking?.service_name || 'Service',
                    status: booking?.service_status || 'pending'
                });

                if (user.role === 'customer') {
                    setOtherParticipant({
                        id: provider?.id || 'provider',
                        name: provider?.name || 'Service Provider',
                        avatar: provider?.avatar || null,
                        phone: provider?.phone || null
                    });
                } else {
                    setOtherParticipant({
                        id: customer?.id || 'customer',
                        name: customer?.name || 'Customer',
                        avatar: customer?.avatar || null,
                        phone: customer?.phone || null
                    });
                }
                setMessages([]);
            }

            // Initialize socket connection
            try {
                const token = AuthService.getToken(user.role);
                if (token) {
                    chatService.initializeSocket(token);
                }
            } catch (socketError) {
                console.warn('Socket connection failed, continuing without real-time features:', socketError);
            }

            setIsLoading(false);
        } catch (error) {
            console.error('Error loading chat session:', error);
            setError(error.message || 'Failed to load chat session');
            setIsLoading(false);
        }
    }, [bookingId, provider, customer, booking]);

    // Connect to socket and join chat room
    const connectToChat = useCallback(() => {
        try {
            if (!sessionId) return;

            const socket = chatService.getSocket();
            socketRef.current = socket;

            // Join the chat room
            chatService.joinChat(sessionId);

            // Handle connection events
            chatService.onConnection('connected', () => {
                console.log('Connected to chat socket');
                setIsConnected(true);
            });

            chatService.onConnection('disconnected', () => {
                console.log('Disconnected from chat socket');
                setIsConnected(false);
            });

            chatService.onConnection('error', (error) => {
                console.error('Socket connection error:', error);
                setError('Failed to connect to chat server');
            });

            // Handle incoming messages
            chatService.onMessage('new_message', (newMessage) => {
                const formattedMessage = chatService.formatMessage(newMessage);
                setMessages(prev => {
                    // Remove any optimistic temp messages that match this real message
                    const withoutTemps = prev.filter(msg => !(msg.isTemp && msg.content === formattedMessage.content && msg.senderId === formattedMessage.senderId));
                    // Skip if this message already exists (deduplication)
                    if (withoutTemps.some(msg => msg.id === formattedMessage.id)) {
                        return withoutTemps;
                    }
                    return [...withoutTemps, formattedMessage];
                });
                scrollToBottom();
            });

            // Handle chat history
            chatService.onMessage('chat_history', (data) => {
                if (data.sessionId === sessionId) {
                    const formattedMessages = data.messages.map(msg => chatService.formatMessage(msg));
                    setMessages(prev => {
                        const combined = [...prev];
                        formattedMessages.forEach(m => {
                            if (!combined.some(existing => existing.id === m.id)) {
                                combined.push(m);
                            }
                        });
                        // Sort chronologically
                        return combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    });
                    scrollToBottom();
                }
            });

            // Handle typing indicators
            chatService.onMessage('user_typing', (data) => {
                if (data.userId !== currentUser?.id) {
                    setIsTyping(true);
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                    }
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsTyping(false);
                    }, 3000);
                }
            });

            // Handle read receipts
            chatService.onMessage('messages_read', (data) => {
                if (data.sessionId === sessionId && data.readerId !== currentUser?.id) {
                    // Update messages to show as read
                    setMessages(prev => prev.map(msg => 
                        msg.senderId === currentUser?.id 
                            ? { ...msg, isRead: true }
                            : msg
                    ));
                }
            });

            // Handle errors
            chatService.onMessage('error', (error) => {
                console.error('Chat error:', error);
                setError(error.message || 'Chat error occurred');
            });

        } catch (error) {
            console.error('Error connecting to chat:', error);
            setError(error.message || 'Failed to connect to chat');
        }
    }, [sessionId, currentUser]);

    // Send message
    const handleSendMessage = useCallback(async (messageText) => {
        if (!sessionId || !messageText.trim()) return;

        try {
            // Create a temporary message object for immediate UI update
            const tempMessage = {
                id: `temp_${Date.now()}`,
                content: messageText.trim(),
                senderId: currentUser?.id,
                senderName: currentUser?.name || 'You',
                createdAt: new Date().toISOString(),
                messageType: 'text',
                isRead: false,
                isTemp: true
            };

            // Add to local messages immediately for better UX
            setMessages(prev => [...prev, tempMessage]);
            
            // Try to send via socket first
            try {
                chatService.sendMessage(sessionId, messageText.trim());
                
                // If socket send succeeds, remove temp message and let real message come through
                setTimeout(() => {
                    setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
                }, 100);
                
            } catch (socketError) {
                console.warn('Socket send failed, trying REST API:', socketError);
                
                // Fallback to REST API
                try {
                    // For now, we'll keep the temp message since we don't have a REST endpoint for sending
                    // In a real implementation, you'd call a REST API to save the message
                    console.log('Message sent via fallback method');
                } catch (restError) {
                    console.error('Both socket and REST send failed:', restError);
                    // Remove temp message on failure
                    setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
                    setError('Failed to send message');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message');
        }
    }, [sessionId, currentUser]);

    // Send file
    const handleSendFile = useCallback(async (file, type = 'file') => {
        if (!sessionId || !file) return;

        try {
            // Upload file first
            const uploadResponse = await chatService.uploadFile(file);
            
            // Send message with file data
            chatService.sendMessage(
                sessionId, 
                uploadResponse.fileName || 'File shared', 
                type,
                {
                    url: uploadResponse.fileUrl,
                    name: uploadResponse.fileName,
                    size: uploadResponse.fileSize
                }
            );
            
            return uploadResponse;
        } catch (error) {
            console.error('Error sending file:', error);
            setError('Failed to send file');
            throw error;
        }
    }, [sessionId]);

    // Handle typing
    const handleTyping = useCallback((isTyping) => {
        if (sessionId) {
            if (isTyping) {
                chatService.startTyping(sessionId);
            } else {
                chatService.stopTyping(sessionId);
            }
        }
    }, [sessionId]);

    // Initialize chat
    useEffect(() => {
        if (isOpen && bookingId) {
            loadChatSession();
        }
    }, [isOpen, bookingId, loadChatSession]);

    // Connect to socket after session is loaded
    useEffect(() => {
        if (sessionId && !socketRef.current) {
            connectToChat();
        }
    }, [sessionId, connectToChat]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (sessionId) {
                chatService.leaveChat(sessionId);
            }
            chatService.disconnect();
            // Reset role override when leaving chat
            chatService.activeRole = null;
        };
    }, [sessionId]);

    // Handle errors
    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    if (!isOpen) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-full max-h-screen bg-white relative shadow-lg rounded-lg border border-gray-200">
                <div className="flex justify-center items-center h-48 flex-col gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="text-sm text-gray-600">Loading chat...</p>
                </div>
            </div>
        );
    }

    if (error && !sessionId) {
        return (
            <div className="flex flex-col h-full max-h-screen bg-white relative shadow-lg rounded-lg border border-gray-200">
                <div className="p-6">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center justify-between">
                        <span>{error}</span>
                        <button 
                            onClick={loadChatSession}
                            className="text-red-700 underline cursor-pointer"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-h-screen bg-white relative shadow-lg rounded-lg border border-gray-200">
            <ChatHeader
                otherParticipant={otherParticipant}
                bookingInfo={bookingInfo}
                isOnline={isConnected}
                lastSeen={lastSeen}
                onClose={onClose}
                onCall={() => {
                    // Handle voice call
                    console.log('Start voice call');
                }}
                showCallButtons={true}
            />

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin chat-message-container">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
                        <h6 className="text-lg font-medium">{sessionId ? 'No messages yet' : 'Chat not active yet'}</h6>
                        <p className="text-sm">
                            {sessionId ? 'Start the conversation by sending a message' : 'Chat will be available once the job is accepted/assigned.'}
                        </p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const isOwn = String(message.senderId) === String(currentUser?.id);
                        const showAvatar = index === 0 || 
                            messages[index - 1]?.senderId !== message.senderId;
                        
                        return (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isOwn={isOwn}
                                showAvatar={showAvatar}
                                otherParticipant={otherParticipant}
                            />
                        );
                    })
                )}

                {isTyping && (
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
                        <span>{otherParticipant?.name} is typing...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <ChatInput
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                onTyping={handleTyping}
                disabled={!sessionId}
                placeholder="Type a message..."
            />

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="ml-2 text-red-700 font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;