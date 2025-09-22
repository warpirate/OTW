import React, { useState, useRef, useCallback } from 'react';
import { Paperclip, Image, Send } from 'lucide-react';

const ChatInput = ({
    onSendMessage,
    onSendFile,
    onTyping,
    disabled = false,
    placeholder = "Type a message...",
    maxLength = 1000
}) => {
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        if (value.length <= maxLength) {
            setMessage(value);
            
            // Handle typing indicators
            if (!isTyping && value.trim()) {
                setIsTyping(true);
                onTyping?.(true);
            }
            
            // Clear typing indicator after user stops typing
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                onTyping?.(false);
            }, 1000);
        }
    }, [maxLength, isTyping, onTyping]);

    const handleSend = useCallback(() => {
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
            setIsTyping(false);
            onTyping?.(false);
            
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }
    }, [message, disabled, onSendMessage, onTyping]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleFileSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            onSendFile?.(file, 'file');
        }
        e.target.value = ''; // Reset input
    }, [onSendFile]);

    const handleImageSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate image file
            if (file.type.startsWith('image/')) {
                onSendFile?.(file, 'image');
            } else {
                alert('Please select a valid image file');
            }
        }
        e.target.value = ''; // Reset input
    }, [onSendFile]);

    const handleFileClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleImageClick = useCallback(() => {
        imageInputRef.current?.click();
    }, []);

    return (
        <div className="flex items-end gap-2 p-4 bg-white border-t border-gray-200">
            {/* File Upload Button */}
            <button
                onClick={handleFileClick}
                disabled={disabled}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach file"
            >
                <Paperclip className="h-5 w-5" />
            </button>

            {/* Image Upload Button */}
            <button
                onClick={handleImageClick}
                disabled={disabled}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send image"
            >
                <Image className="h-5 w-5" />
            </button>

            {/* Message Input */}
            <div className="flex-1 relative">
                <textarea
                    value={message}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{
                        minHeight: '48px',
                        maxHeight: '120px',
                        height: 'auto'
                    }}
                    onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                />
                
                {/* Character Count */}
                <div className="absolute bottom-1 right-2 text-xs text-gray-400">
                    {message.length}/{maxLength}
                </div>
            </div>

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={disabled || !message.trim()}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
            >
                <Send className="h-5 w-5" />
            </button>

            {/* Hidden File Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
            />
            <input
                ref={imageInputRef}
                type="file"
                onChange={handleImageSelect}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
};

export default ChatInput;