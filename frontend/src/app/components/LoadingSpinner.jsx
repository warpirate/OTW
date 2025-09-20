import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  overlay = false,
  className = '',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const SpinnerContent = () => (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {showText && text && (
        <p className={`mt-2 text-gray-600 ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <SpinnerContent />
        </div>
      </div>
    );
  }

  return <SpinnerContent />;
};

// Inline spinner for buttons
export const ButtonSpinner = ({ size = 'sm', className = '' }) => (
  <Loader2 className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} animate-spin ${className}`} />
);

// Page loading spinner
export const PageLoader = ({ text = 'Loading page...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <LoadingSpinner size="xl" text={text} />
  </div>
);

// Card loading skeleton
export const CardSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
    {Array.from({ length: lines }).map((_, index) => (
      <div 
        key={index}
        className={`h-3 bg-gray-200 rounded mb-2 ${
          index === lines - 1 ? 'w-1/2' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
);

// Table loading skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 mb-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div 
            key={colIndex}
            className="h-4 bg-gray-200 rounded flex-1"
          ></div>
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSpinner;
