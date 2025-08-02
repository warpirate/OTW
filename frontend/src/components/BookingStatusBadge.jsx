import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, UserCheck } from 'lucide-react';

const BookingStatusBadge = ({ status, showIcon = true, size = 'default' }) => {
  const getStatusConfig = (status) => {
    const normalized = status ? status.trim().toLowerCase() : '';
    switch (normalized) {
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          colors: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'PENDING'
        };
      case 'assigned':
        return {
          icon: <UserCheck className="h-4 w-4 text-green-500" />,
          colors: 'bg-green-100 text-green-800 border-green-200',
          text: 'ASSIGNED'
        };
      case 'accepted':
      case 'confirmed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
          colors: 'bg-blue-100 text-blue-800 border-blue-200',
          text: 'ACCEPTED'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          colors: 'bg-green-100 text-green-800 border-green-200',
          text: 'COMPLETED'
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          colors: 'bg-red-100 text-red-800 border-red-200',
          text: 'CANCELLED'
        };
      case 'timeout':
        return {
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          colors: 'bg-gray-100 text-gray-800 border-gray-200',
          text: 'TIMEOUT'
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          colors: 'bg-red-100 text-red-800 border-red-200',
          text: 'REJECTED'
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          colors: 'bg-gray-100 text-gray-800 border-gray-200',
          text: 'UNKNOWN'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full border font-medium ${config.colors} ${sizeClasses[size]}`}>
      {showIcon && config.icon}
      <span>{config.text}</span>
    </span>
  );
};

export default BookingStatusBadge; 