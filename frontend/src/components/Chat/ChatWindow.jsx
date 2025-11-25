import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import chatService from '../../services/chat.service';
import AuthService from '../../app/services/auth.service';
import './ChatWindow.css';
import { isDarkMode as getIsDarkMode, addThemeListener } from '../../app/utils/themeUtils';

// CSS classes will be used instead of styled components

const ChatWindow = ({ 
    bookingId, 
    onClose,
    isOpen = true,
    onError,
    provider = null,
    customer = null,
    booking = null,
    // New props to explicitly control role/participant from wrappers
    forceRole = null,
    otherParticipantOverride = null
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
    const [isDark, setIsDark] = useState(() => {
        try {
            const attrDark = getIsDarkMode();
            const classDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
            const savedPref = localStorage.getItem('prefersDarkMode') === 'true';
            return attrDark || classDark || savedPref;
        } catch {
            return getIsDarkMode();
        }
    });
    
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const socketRef = useRef(null);
    const historyPollRef = useRef(null);

    // Local theme listener so dark mode works in both customer and worker apps
    useEffect(() => {
        setIsDark(getIsDarkMode());
        const cleanup = addThemeListener((dark) => setIsDark(dark));
        return cleanup;
    }, []);

    // Scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Load chat session and messages
    const loadChatSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Determine the effective role first to get the correct user context
            const effectiveRole = forceRole || localStorage.getItem('current_role') || 'customer';
            
            // CRITICAL: Get current user based on the role being used
            const user = AuthService.getCurrentUser(effectiveRole);
            
            // Validate that we have the correct token for this role
            const token = AuthService.getToken(effectiveRole);
            if (!token) {
                throw new Error(`No authentication token found for role: ${effectiveRole}. Please log in again.`);
            }
            
            // Enhanced validation to ensure user matches the expected role
            if (!user) {
                throw new Error(`User not authenticated for role: ${effectiveRole}. Please log in again.`);
            }
            
            // Validate role consistency
            if (forceRole && user.role && user.role !== forceRole) {
                console.warn(`⚠️ Role mismatch detected: user.role=${user.role}, forceRole=${forceRole}`);
                // For forced role scenarios, prioritize the forced role but keep user data
                user.role = forceRole;
            }
            
            setCurrentUser(user);

            // Enhanced logging for debugging authentication issues
            console.log('🔍 Authentication Context:', {
                effectiveRole,
                forceRole,
                userId: user.id,
                userRole: user.role,
                userName: user.name,
                tokenPresent: !!token,
                tokenSubstring: token ? token.substring(0, 20) + '...' : 'None',
                bookingId: bookingId
            });

            // Ensure chat requests use the correct role token
            chatService.activeRole = effectiveRole;

            // Create or get existing chat session (do NOT error if not yet available)
            let sessionIdResp;
            try {
                sessionIdResp = await chatService.createChatSession(bookingId);
                console.log('Chat session created successfully:', sessionIdResp);
            } catch (createError) {
                console.warn('Failed to create chat session, checking for existing one:', createError);
                
                // Enhanced error handling with detailed logging
                const errorDetails = {
                    message: createError?.message || 'Unknown error',
                    status: createError?.response?.status,
                    data: createError?.response?.data,
                    bookingId
                };
                console.log('🔍 Chat session creation error details:', errorDetails);
                
                // If it's a 400 error with status information, show more specific message
                if (createError?.response?.status === 400 && createError?.response?.data?.currentStatus) {
                    console.log('📋 Booking status issue detected:', {
                        currentStatus: createError.response.data.currentStatus,
                        allowedStatuses: createError.response.data.allowedStatuses
                    });
                    setError(`Chat not available for booking status: ${createError.response.data.currentStatus}`);
                }
                
                try {
                    const sessions = await chatService.getChatSessions();
                    const existing = sessions.find(s => s.bookingId === Number(bookingId) || s.bookingId === bookingId);
                    if (!existing) {
                        // No session yet - provide better status-based messaging
                        const bookingStatus = booking?.service_status || booking?.status || 'pending';
                        console.log('📋 No existing session found, booking status:', bookingStatus);
                        
                        setBookingInfo({ 
                            id: bookingId,
                            service: booking?.service_name || 'Service',
                            status: bookingStatus
                        });
                        setIsLoading(false);
                        return;
                    }
                    sessionIdResp = { sessionId: existing.sessionId };
                    console.log('✅ Found existing session:', existing.sessionId);
                } catch (sessionsError) {
                    console.error('❌ Failed to get existing sessions:', sessionsError);
                    // Gracefully render placeholder if sessions endpoint not yet available
                    setBookingInfo({ 
                        id: bookingId,
                        service: booking?.service_name || 'Service',
                        status: booking?.service_status || booking?.status || 'pending'
                    });
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
                
                console.log('Session details received:', session);
                console.log('Customer prop passed:', customer);
                console.log('Provider prop passed:', provider);
                console.log('User role:', user.role);
                
                setBookingInfo({ 
                    id: bookingId,
                    service: session.serviceName || session.service_name || 'Service',
                    status: session.serviceStatus || session.service_status || 'pending'
                });

                // Determine the other participant based on the authenticated user's role
                if (otherParticipantOverride) {
                    setOtherParticipant(otherParticipantOverride);
                } else if (effectiveRole === 'customer') {
                    setOtherParticipant({
                        id: session.provider?.id || provider?.id,
                        name: session.provider?.name || provider?.name || 'Service Provider',
                        avatar: null,
                        phone: session.provider?.phone || provider?.phone
                    });
                } else if (effectiveRole === 'worker' || effectiveRole === 'provider') {
                    // Prioritize customer prop data over session data for worker view
                    const customerData = {
                        id: customer?.id || session.customer?.id,
                        name: customer?.name || session.customer?.name || 'Customer',
                        avatar: customer?.avatar || null,
                        phone: customer?.phone || session.customer?.phone
                    };
                    console.log('Setting other participant (customer) for worker:', customerData);
                    setOtherParticipant(customerData);
                }

                // Load chat history
                try {
                    console.log('📚 Loading chat history for session:', actualSessionId);
                    const history = await chatService.getChatHistory(actualSessionId);
                    const formattedMessages = history.messages.map(msg => chatService.formatMessage(msg));
                    console.log('📚 Loaded chat history:', {
                        sessionId: actualSessionId,
                        messageCount: formattedMessages.length,
                        messages: formattedMessages.map(m => ({ id: m.id, content: m.content?.substring(0, 30) + '...', senderId: m.senderId }))
                    });
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

                if (otherParticipantOverride) {
                    setOtherParticipant(otherParticipantOverride);
                } else if (effectiveRole === 'customer') {
                    setOtherParticipant({
                        id: provider?.id || 'provider',
                        name: provider?.name || 'Service Provider',
                        avatar: provider?.avatar || null,
                        phone: provider?.phone || null
                    });
                } else if (effectiveRole === 'worker' || effectiveRole === 'provider') {
                    // Always prioritize customer prop data for worker view
                    const customerData = {
                        id: customer?.id || 'customer',
                        name: customer?.name || 'Customer',
                        avatar: customer?.avatar || null,
                        phone: customer?.phone || null
                    };
                    console.log('Using fallback customer data for worker:', customerData);
                    setOtherParticipant(customerData);
                }
                setMessages([]);
            }

            // Initialize socket connection with enhanced error handling
            try {
                const token = AuthService.getToken(effectiveRole);
                console.log('🔑 Initializing socket with token:', token ? 'Present (' + token.substring(0, 20) + '...)' : 'Missing');
                console.log('👤 User role:', effectiveRole, 'User ID:', user.id);
                
                if (token) {
                    console.log('🔌 Starting socket initialization...');
                    const socket = chatService.initializeSocket(token);
                    
                    if (socket) {
                        console.log('✅ Socket instance created successfully');
                        
                        // Wait for socket connection before proceeding
                        socket.on('connect', () => {
                            console.log('🎉 Socket connected successfully! ID:', socket.id);
                            setIsConnected(true);
                        });
                        
                        socket.on('disconnect', (reason) => {
                            console.log('🔌 Socket disconnected:', reason);
                            setIsConnected(false);
                        });
                        
                        socket.on('connect_error', (error) => {
                            console.error('❌ Socket connection error:', error);
                            setError('Failed to connect to chat server: ' + error.message);
                        });
                        
                    } else {
                        console.error('❌ Failed to create socket instance');
                        setError('Failed to initialize chat connection');
                    }
                } else {
                    console.error('❌ No authentication token available for socket connection');
                    setError('Authentication required for chat functionality');
                }
            } catch (socketError) {
                console.error('❌ Socket connection failed:', socketError);
                setError('Failed to initialize chat: ' + socketError.message);
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
            if (!sessionId) {
                console.log('⚠️ No sessionId available for socket connection');
                return;
            }
            const socket = chatService.getSocket();
            socketRef.current = socket;

            if (!socket) {
                console.log('⚠️ Socket not available yet; will queue join and proceed to register handlers.');
            }

            console.log('🔍 Current socket state:', {
                socketExists: !!socket,
                socketId: socket ? socket.id : null,
                connected: socket ? socket.connected : false,
                chatServiceConnected: chatService.isSocketConnected()
            });

            // Set up message handlers first (only once per component instance)
            const messageHandlerId = `chat-${sessionId}-${Date.now()}`;
            
            // Define handler functions that will be reused
            const handleNewMessage = (newMessage) => {
                console.log('📨 Received new message:', {
                    id: newMessage.id,
                    session_id: newMessage.session_id,
                    sender_id: newMessage.sender_id
                });
            
                // Only process messages for the current session
                if (Number(sessionId) !== Number(newMessage.session_id)) {
                    return;
                }
            
                const formattedMessage = chatService.formatMessage(newMessage);
            
                setMessages(prev => {
                    // Remove any temp messages that match this real message
                    const withoutTemps = prev.filter(msg => {
                        if (msg.isTemp && msg.content === formattedMessage.content && 
                            String(msg.senderId) === String(formattedMessage.senderId)) {
                            return false;
                        }
                        return true;
                    });
                    
                    // Enhanced duplicate check - check by ID, content, and sender
                    const isDuplicate = withoutTemps.some(msg => {
                        // Check by ID first (most reliable)
                        if (msg.id && formattedMessage.id && String(msg.id) === String(formattedMessage.id)) {
                            return true;
                        }
                        // Check by content and sender as fallback
                        if (msg.content === formattedMessage.content && 
                            String(msg.senderId) === String(formattedMessage.senderId) &&
                            Math.abs(new Date(msg.createdAt) - new Date(formattedMessage.createdAt)) < 1000) {
                            return true;
                        }
                        return false;
                    });
                    
                    if (isDuplicate) {
                        return withoutTemps;
                    }
                    
                    const newMessages = [...withoutTemps, formattedMessage];
                    return newMessages;
                });
            
                // Scroll to bottom after a short delay to ensure message is rendered
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            };
            
            const handleChatHistory = (data) => {
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
            };
            
            const handleUserTyping = (data) => {
                if (data.userId !== currentUser?.id) {
                    setIsTyping(true);
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                    }
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsTyping(false);
                    }, 3000);
                }
            };
            
            const handleMessagesRead = (data) => {
                if (data.sessionId === sessionId && data.readerId !== currentUser?.id) {
                    // Update messages to show as read
                    setMessages(prev => prev.map(msg => 
                        msg.senderId === currentUser?.id 
                            ? { ...msg, isRead: true }
                            : msg
                    ));
                }
            };
            
            const handleJoinedChat = (data) => {
                console.log('✅ Successfully joined chat session:', data.sessionId);
                setIsConnected(true);
            };
            
            const handleChatError = (error) => {
                console.error('❌ Chat error:', error);
                setError(error.message || 'Chat error occurred');
            };
            
            // Set up all message handlers
            chatService.onMessage('new_message', handleNewMessage);
            chatService.onMessage('chat_history', handleChatHistory);
            chatService.onMessage('user_typing', handleUserTyping);
            chatService.onMessage('messages_read', handleMessagesRead);
            chatService.onMessage('joined_chat', handleJoinedChat);
            chatService.onMessage('error', handleChatError);
            
            // Function to join chat (simplified)
            const joinChatRoom = () => {
                // Join the chat room
                chatService.joinChat(sessionId);

                // Handle connection events
                const onConnected = () => {
                    setIsConnected(true);
                };
                
                const onDisconnected = () => {
                    setIsConnected(false);
                };
                
                const onConnectionError = (error) => {
                    console.error('Chat connection error:', error);
                    setError('Chat connection error: ' + (error?.message || error));
                };
                
                chatService.onConnection('connected', onConnected);
                chatService.onConnection('disconnected', onDisconnected);
                chatService.onConnection('error', onConnectionError);

                // Message handlers are already set up above

                // All message handlers are set up above this function
            };

            // Always attempt to join; chatService will queue if socket not ready
            joinChatRoom();

            // If a socket instance exists but isn't connected, ensure join after connect
            if (socket && !socket.connected) {
                socket.once('connect', () => {
                    chatService.joinChat(sessionId);
                });
                if (!socket.connecting) {
                    socket.connect();
                }
            }
            
            // Cleanup function for handlers
            return () => {
                chatService.offMessage('new_message', handleNewMessage);
                chatService.offMessage('chat_history', handleChatHistory);
                chatService.offMessage('user_typing', handleUserTyping);
                chatService.offMessage('messages_read', handleMessagesRead);
                chatService.offMessage('joined_chat', handleJoinedChat);
                chatService.offMessage('error', handleChatError);
            }

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
            const effectiveRole = forceRole || currentUser?.role || 'customer';
            const tempMessage = {
                id: `temp_${Date.now()}`,
                content: messageText.trim(),
                senderId: currentUser?.id,
                senderName: currentUser?.name || 'You',
                senderType: effectiveRole === 'customer' ? 'customer' : 'provider',
                createdAt: new Date().toISOString(),
                messageType: 'text',
                isRead: false,
                isTemp: true
            };

            console.log('📤 Sending message:', {
                content: messageText.trim(),
                senderId: currentUser?.id,
                senderType: effectiveRole === 'customer' ? 'customer' : 'provider',
                sessionId,
                userRole: currentUser?.role,
                effectiveRole,
                forceRole
            });

            // Add to local messages immediately for better UX
            setMessages(prev => [...prev, tempMessage]);
            
            // Try to send via socket first
            try {
                chatService.sendMessage(sessionId, messageText.trim());
                
                // Don't remove temp message immediately - let the real message replace it
                // The new_message handler will handle deduplication
                
            } catch (socketError) {
                console.warn('Socket send failed, trying REST API:', socketError);
                
                // Fallback to REST API
                try {
                    const response = await chatService.sendMessageViaRest(sessionId, messageText.trim());
                    if (response.success && response.message) {
                        // Replace temp message with real message
                        const realMessage = chatService.formatMessage(response.message);
                        setMessages(prev => prev.map(msg => 
                            msg.id === tempMessage.id ? realMessage : msg
                        ));
                        console.log('Message sent via REST fallback');
                    }
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
            const cleanup = connectToChat();
            return cleanup;
        }
    }, [sessionId, connectToChat]);

    // REST polling fallback: periodically refresh history when socket is not connected
    useEffect(() => {
        const startPolling = () => {
            if (historyPollRef.current) return;
            historyPollRef.current = setInterval(async () => {
                try {
                    if (!sessionId) return;
                    // Only poll when socket is not connected
                    if (chatService && !chatService.isSocketConnected()) {
                        const history = await chatService.getChatHistory(sessionId, 50, 0);
                        const formatted = history.messages.map(m => chatService.formatMessage(m));
                        // Merge without duplicating
                        setMessages(prev => {
                            const byId = new Map(prev.map(m => [String(m.id), m]));
                            formatted.forEach(m => {
                                byId.set(String(m.id), m);
                            });
                            const merged = Array.from(byId.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            return merged;
                        });
                    }
                } catch (e) {
                    // silent fail for polling
                }
            }, 3000);
        };

        const stopPolling = () => {
            if (historyPollRef.current) {
                clearInterval(historyPollRef.current);
                historyPollRef.current = null;
            }
        };

        if (sessionId) {
            if (!chatService.isSocketConnected()) {
                startPolling();
            } else {
                stopPolling();
            }
        }

        // Also listen to socket connection changes via connection handlers
        const onConnected = () => stopPolling();
        const onDisconnected = () => startPolling();
        chatService.onConnection('connected', onConnected);
        chatService.onConnection('disconnected', onDisconnected);

        return () => {
            stopPolling();
        };
    }, [sessionId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Cleanup on unmount - DO NOT clear chat data, only clean up local resources
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // DO NOT call leaveChat or disconnect here - chat should persist until booking completion
            // Only reset role override when leaving chat UI
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

    const containerBase = "flex flex-col h-full max-h-screen relative shadow-lg rounded-lg border";
    const themeClasses = isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200";

    if (isLoading) {
        return (
            <div className={`${isDark ? 'dark ' : ''}${containerBase} ${themeClasses}`}>
                <div className="flex justify-center items-center h-48 flex-col gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Loading chat...</p>
                </div>
            </div>
        );
    }

    if (error && !sessionId) {
        return (
            <div className={`${isDark ? 'dark ' : ''}${containerBase} ${themeClasses}`}>
                <div className="p-6">
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded flex items-center justify-between">
                        <span>{error}</span>
                        <button 
                            onClick={loadChatSession}
                            className="text-red-700 dark:text-red-300 underline cursor-pointer"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Prefer override participant when provided for header and bubbles
    const participantForUI = otherParticipantOverride || otherParticipant;

    const isCustomer = (forceRole || currentUser?.role || '').toString().toLowerCase() === 'customer';
    const isCompleted = (bookingInfo?.status || '').toString().toLowerCase() === 'completed';

    return (
        <div className={`${isDark ? 'dark ' : ''}${containerBase} ${themeClasses}`}>
            <ChatHeader
                otherParticipant={participantForUI}
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
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400 gap-2">
                        <h6 className="text-lg font-medium">{isCompleted ? 'Chat closed' : (sessionId ? 'No messages yet' : 'Chat not active yet')}</h6>
                        <p className="text-sm">
                            {isCompleted 
                                ? 'This conversation has been closed because the job was completed.' 
                                : (sessionId ? 'Start the conversation by sending a message' : error ? error : 'Chat will be available once the job is accepted/assigned.')}
                        </p>
                        {error && (
                            <button 
                                onClick={loadChatSession}
                                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                ) : (
                    messages.map((message, index) => {
                        // ENHANCED MESSAGE OWNERSHIP LOGIC
                        // Primary check: Compare sender ID with current user ID
                        const senderIdMatch = String(message.senderId) === String(currentUser?.id);
                        
                        // Secondary check: Compare sender type with current user role for additional validation
                        const effectiveRole = forceRole || currentUser?.role || 'customer';
                        const expectedSenderType = effectiveRole === 'customer' ? 'customer' : 'provider';
                        const senderTypeMatch = message.senderType === expectedSenderType;
                        
                        // For forced role scenarios, prioritize role-based matching
                        const isOwn = forceRole ? senderTypeMatch : senderIdMatch;
                        
                        const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;

                        // Enhanced message debugging with role context
                        console.log('🎯 Message Ownership Debug:', {
                            index,
                            messageId: message.id,
                            content: message.content?.substring(0, 30) + '...',
                            messageSenderId: message.senderId,
                            messageSenderType: message.senderType,
                            currentUserId: currentUser?.id,
                            currentUserRole: currentUser?.role,
                            effectiveRole,
                            expectedSenderType,
                            forceRole,
                            senderIdMatch,
                            senderTypeMatch,
                            isOwn: isOwn,
                            senderName: message.senderName,
                            createdAt: message.createdAt,
                            isTemp: message.isTemp
                        });
                        
                        return (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isOwn={isOwn}
                                showAvatar={showAvatar}
                                otherParticipant={participantForUI}
                            />
                        );
                    })
                )}
            </div>

            {isCompleted && (
                <div className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
                    Chat is closed after job completion. You can no longer send messages.
                </div>
            )}

            {isTyping && (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{participantForUI?.name} is typing...</span>
                </div>
            )}

            <ChatInput
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                onTyping={handleTyping}
                disabled={!sessionId || (isCustomer && isCompleted)}
                placeholder="Type a message..."
            />

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded z-50">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="ml-2 text-red-700 dark:text-red-300 font-bold"
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