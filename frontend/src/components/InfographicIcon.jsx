import React from 'react';

const InfographicIcon = ({ 
  src, 
  alt = '', 
  size = 'md', 
  tone = 'neutral', 
  className = '',
  ...props 
}) => {
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24'
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
    <div className={`flex-shrink-0 ${sizeClass} ${toneClass} ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover rounded-lg"
        onError={(e) => {
          // Fallback to a default icon if image fails to load
          e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
              <rect width="96" height="96" rx="16" fill="#F1F5F9"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                    font-family="Inter, system-ui" font-size="32" fill="#64748B">🔧</text>
            </svg>
          `);
        }}
        {...props}
      />
    </div>
  );
};

export default InfographicIcon;
