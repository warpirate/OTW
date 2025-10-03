import React, { useState, useEffect } from 'react';
import { CategoryService } from '../services/api.service';
import InfographicIcon from '../../components/InfographicIcon';

/**
 * S3Image Component - Handles loading S3 images with presigned URLs for public access
 * @param {string} type - 'category' or 'subcategory'
 * @param {number} id - Category or subcategory ID
 * @param {string} fallbackSrc - Fallback image source if S3 image fails
 * @param {string} alt - Alt text for the image
 * @param {string} className - CSS classes for the image
 * @param {function} onError - Optional error callback
 */
const S3Image = ({ 
  type, 
  id, 
  fallbackSrc, 
  alt, 
  className = '', 
  onError = null,
  size = '4xl',
  tone = 'brand',
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(fallbackSrc);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPresignedUrl = async () => {
      if (!id) {
        setImageSrc(fallbackSrc);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        
        let presignedUrl;
        if (type === 'category') {
          presignedUrl = await CategoryService.getPublicCategoryImageUrl(id);
        } else if (type === 'subcategory') {
          presignedUrl = await CategoryService.getPublicSubcategoryImageUrl(id);
        } else {
          throw new Error('Invalid type. Must be "category" or "subcategory"');
        }
        
        // If we got a presigned URL, use it, otherwise fall back
        if (presignedUrl) {
          setImageSrc(presignedUrl);
        } else {
          setError(true);
          setImageSrc(fallbackSrc);
        }
      } catch (err) {
        console.warn(`No S3 image found for ${type} ${id}, using fallback:`, err.message);
        setError(true);
        setImageSrc(fallbackSrc);
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPresignedUrl();
  }, [type, id, fallbackSrc, onError]);

  const handleImageError = () => {
    if (!error) {
      setError(true);
      setImageSrc(fallbackSrc);
    }
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200 animate-pulse`}>
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If we have an error or no S3 image, use InfographicIcon as fallback
  if (error || imageSrc === fallbackSrc) {
    return (
      <InfographicIcon
        src={fallbackSrc}
        alt={alt}
        size={size}
        tone={tone}
        className={className}
      />
    );
  }

  // Render S3 image
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleImageError}
      {...props}
    />
  );
};

export default S3Image;
