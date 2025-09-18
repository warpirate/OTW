import React from 'react';

const InfographicIcon = ({ 
  src, 
  alt = '', 
  size = 'md', 
  tone = 'neutral', 
  className = '',
  ...props 
}) => {
  // Size classes - optimized for mobile first, then scale up
  const sizeClasses = {
    xs: 'w-6 h-6 sm:w-8 sm:h-8',
    sm: 'w-8 h-8 sm:w-12 sm:h-12',
    md: 'w-12 h-12 sm:w-16 sm:h-16',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
    xl: 'w-18 h-18 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32',
    '2xl': 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36',
    '3xl': 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44'
  };

  // Tone classes for styling
  const toneClasses = {
    neutral: '',
    brand: 'ring-2 ring-brand/20',
    accent: 'ring-2 ring-accent/20',
    success: 'ring-2 ring-green-500/20',
    warning: 'ring-2 ring-yellow-500/20',
    error: 'ring-2 ring-red-500/20'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const toneClass = toneClasses[tone] || '';

  return (
    <div className={`flex-shrink-0 ${sizeClass} ${toneClass} rounded-2xl bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-50 dark:to-gray-100 shadow-lg ring-1 ring-gray-200/50 dark:ring-gray-300/50 overflow-hidden backdrop-blur-sm ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain p-1 sm:p-2 md:p-3"
        onError={(e) => {
          // Fallback to a default icon if image fails to load
          e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
              <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#F8FAFC"/>
                  <stop offset="100%" stop-color="#E2E8F0"/>
                </linearGradient>
              </defs>
              <rect width="96" height="96" rx="20" fill="url(#bg)"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                    font-family="Inter, system-ui" font-size="32" fill="#475569">🔧</text>
            </svg>
          `);
        }}
        {...props}
      />
    </div>
  );
};

export default InfographicIcon;
