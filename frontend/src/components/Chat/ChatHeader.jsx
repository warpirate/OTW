import React, { useState } from 'react';
import {
    Phone,
    X
} from 'lucide-react';

// CSS classes will be used instead of styled components

const ChatHeader = ({
    otherParticipant,
    bookingInfo,
    isOnline = false,
    lastSeen,
    onCall,
    onClose,
    isBlocked = false,
    showCallButtons = true
}) => {

    const getStatusText = () => {
        if (isOnline) {
            return 'Online';
        }
        if (lastSeen) {
            const lastSeenDate = new Date(lastSeen);
            const now = new Date();
            const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
            
            if (diffInMinutes < 1) {
                return 'Just now';
            } else if (diffInMinutes < 60) {
                return `${diffInMinutes}m ago`;
            } else if (diffInMinutes < 1440) {
                return `${Math.floor(diffInMinutes / 60)}h ago`;
            } else {
                return lastSeenDate.toLocaleDateString();
            }
        }
        return 'Offline';
    };

    const getStatusColor = () => {
        if (isOnline) return 'online';
        if (lastSeen) {
            const lastSeenDate = new Date(lastSeen);
            const now = new Date();
            const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
            return diffInMinutes < 5 ? 'online' : 'away';
        }
        return 'offline';
    };

    return (
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 min-h-16">
            <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                    <div 
                        className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center"
                    >
                        {otherParticipant?.avatar ? (
                            <img 
                                src={otherParticipant.avatar} 
                                alt={otherParticipant.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <span className="text-purple-600 font-semibold text-lg">
                                {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        getStatusColor() === 'online' ? 'bg-green-500 status-online' : 
                        getStatusColor() === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                </div>

                <div className="flex flex-col min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {otherParticipant?.name || 'Unknown User'}
                    </h3>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                            getStatusColor() === 'online' ? 'bg-green-500' : 
                            getStatusColor() === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm text-gray-600">
                            {getStatusText()}
                        </span>
                    </div>
                    {bookingInfo && (
                        <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Booking #{bookingInfo.id}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {showCallButtons && (
                    <button
                        onClick={onCall}
                        disabled={isBlocked}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Voice call"
                    >
                        <Phone className="h-5 w-5" />
                    </button>
                )}

                <button 
                    onClick={onClose} 
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" 
                    title="Close chat"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
