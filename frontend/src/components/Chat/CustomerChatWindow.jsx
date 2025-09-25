import React from 'react';
import ChatWindow from './ChatWindow';

const CustomerChatWindow = ({ bookingId, onClose, isOpen = true, onError, provider, booking }) => {
  const otherParticipantOverride = provider
    ? {
        id: provider.id,
        name: provider.name || 'Service Provider',
        phone: provider.phone || provider.phone_number,
        avatar: provider.avatar || null,
      }
    : null;

  return (
    <ChatWindow
      bookingId={bookingId}
      onClose={onClose}
      isOpen={isOpen}
      onError={onError}
      provider={provider}
      booking={booking}
      forceRole="customer"
      otherParticipantOverride={otherParticipantOverride}
    />
  );
};

export default CustomerChatWindow;
