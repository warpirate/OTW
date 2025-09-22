import React from 'react';
import {
    CheckCircle,
    Clock,
    Image,
    Paperclip
} from 'lucide-react';

// CSS classes will be used instead of styled components

const MessageBubble = ({ 
    message, 
    isOwn, 
    showAvatar, 
    otherParticipant 
}) => {
    const formatTime = (date) => {
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return 'Invalid time';
            }
            return new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(dateObj);
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Invalid time';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleImageClick = () => {
        if (message.fileUrl) {
            window.open(message.fileUrl, '_blank');
        }
    };

    const handleFileClick = () => {
        if (message.fileUrl) {
            window.open(message.fileUrl, '_blank');
        }
    };

    const renderMessageContent = () => {
        switch (message.messageType) {
            case 'image':
                return (
                    <div>
                        <img
                            src={message.fileUrl}
                            alt={message.fileName || 'Image'}
                            onClick={handleImageClick}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                            className="max-w-full max-h-80 rounded-lg cursor-pointer hover:opacity-90"
                        />
                        {message.content && (
                            <div className={`mt-2 text-sm leading-relaxed ${
                                isOwn ? 'text-white' : 'text-gray-900'
                            }`}>
                                {message.content}
                            </div>
                        )}
                    </div>
                );

            case 'file':
                return (
                    <div>
                        <div 
                            onClick={handleFileClick}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100"
                        >
                            <Paperclip className="h-5 w-5 text-purple-600" />
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                    {message.fileName}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {formatFileSize(message.fileSize)}
                                </div>
                            </div>
                        </div>
                        {message.content && (
                            <div className={`mt-2 text-sm leading-relaxed ${
                                isOwn ? 'text-white' : 'text-gray-900'
                            }`}>
                                {message.content}
                            </div>
                        )}
                    </div>
                );

            case 'system':
                return (
                    <div className="text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {message.content}
                        </span>
                    </div>
                );

            default:
                return (
                    <div className={`text-sm leading-relaxed ${
                        isOwn ? 'text-white' : 'text-gray-900'
                    }`}>
                        {message.content}
                    </div>
                );
        }
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end mb-2 gap-2`}>
            {!isOwn && showAvatar && (
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {otherParticipant?.avatar ? (
                        <img 
                            src={otherParticipant.avatar} 
                            alt={otherParticipant.name}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <span className="text-purple-600 font-semibold text-sm">
                            {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                        </span>
                    )}
                </div>
            )}
            
            {!isOwn && !showAvatar && (
                <div className="w-8" /> // Spacer for alignment
            )}

            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div className={`px-4 py-2 rounded-2xl message-bubble ${
                    isOwn 
                        ? 'bg-purple-600 text-white rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                } ${message.messageType === 'image' ? 'p-2 bg-transparent shadow-none' : 'shadow-sm'}`}>
                    {renderMessageContent()}
                </div>

                <div className={`flex items-center gap-1 mt-1 text-xs ${
                    isOwn ? 'text-purple-200' : 'text-gray-500'
                }`}>
                    <span>{formatTime(message.createdAt || message.timestamp || new Date())}</span>
                    {isOwn && (
                        <div title={message.isRead ? 'Read' : 'Sent'}>
                            {message.isRead ? (
                                <CheckCircle className="h-3 w-3 text-purple-300" />
                            ) : (
                                <Clock className="h-3 w-3 text-purple-300" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
