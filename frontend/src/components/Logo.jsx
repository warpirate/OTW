import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Reusable brand logo component.
 *
 * Usage:
 *   - Fixed size: <Logo size="md" />
 *   - Responsive (recommended): <Logo responsive />
 *     Scales nicely across mobile, tablet, and desktop.
 *
 * Notes:
 * - The image is served from /public as /omw_logo.png via Vite.
 */
const sizeMap = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-20',
};

// Larger responsive heights so the name in the PNG is clearly readable
const responsiveHeights = 'h-12 sm:h-16 md:h-20 lg:h-24 xl:h-24';

const Logo = ({ size = 'md', responsive = false, className = '', rounded = false, alt = 'OMW', ...props }) => {
  const { darkMode } = useTheme();
  const sizeClass = responsive ? responsiveHeights : (sizeMap[size] || sizeMap.md);
  // Only apply rounding when explicitly requested
  const shapeClass = rounded ? 'rounded-lg' : '';
  // Build inline style so the logo is visible on dark backgrounds
  const imgStyle = { ...(props.style || {}) };
  if (darkMode) {
    // Turn dark/navy parts (text) into white while keeping transparency
    imgStyle.filter = 'brightness(0) invert(1)';
  }
  return (
    <img
      src="/omw_logo.png"
      alt={alt}
      className={
        `${sizeClass} w-auto object-contain ${shapeClass}` +
        (className ? ` ${className}` : '')
      }
      {...props}
      /* In dark theme, make the text white for better contrast */
      style={imgStyle}
    />
  );
};

export default Logo;
