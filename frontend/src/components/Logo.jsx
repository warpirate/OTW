import React from 'react';

/**
 * Reusable brand logo component.
 *
 * Usage:
 *   <Logo size="md" className="mr-2" />
 *
 * Notes:
 * - The image is served from /public as /omw_logo.jpg via Vite.
 */
const sizeMap = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-20',
};

const Logo = ({ size = 'md', className = '', rounded = false, alt = 'OMW', ...props }) => {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const shapeClass = rounded ? 'rounded-full' : 'rounded';
  return (
    <img
      src="/omw_logo.jpg"
      alt={alt}
      className={
        `${sizeClass} w-auto object-contain ${shapeClass}` +
        (className ? ` ${className}` : '')
      }
      {...props}
    />
  );
};

export default Logo;
