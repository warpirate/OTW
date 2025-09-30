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
    xl: 'w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32',
    '2xl': 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36',
    '3xl': 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44',
    // Larger sizes for prominent, eye-catching hero/category cards
    '4xl': 'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 xl:w-52 xl:h-52',
    '5xl': 'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-60 xl:h-60',
    '6xl': 'w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 xl:w-64 xl:h-64'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`aspect-square ${sizeClass} object-contain ${className}`}
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
  );
};

export default InfographicIcon;
