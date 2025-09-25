import React from 'react';
import ChatWindow from './ChatWindow';

const WorkerChatWindow = ({ bookingId, onClose, isOpen = true, onError, customer, booking }) => {
  const otherParticipantOverride = customer
    ? {
        id: customer.id,
        name: customer.name || 'Customer',
        phone: customer.phone || customer.phone_number,
        avatar: customer.avatar || null,
      }
    : null;

  return (
    <ChatWindow
      bookingId={bookingId}
      onClose={onClose}
      isOpen={isOpen}
      onError={onError}
      customer={customer}
      booking={booking}
      forceRole="worker"
      otherParticipantOverride={otherParticipantOverride}
    />
  );
};

export default WorkerChatWindow;
