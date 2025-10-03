-- Migration to add image_url fields to service_categories and subcategories tables
-- This enables S3-based image storage for categories and subcategories

-- Add image_url to service_categories table
ALTER TABLE service_categories 
ADD COLUMN image_url VARCHAR(512) DEFAULT NULL COMMENT 'S3 URL for category image' AFTER category_type;

-- Add image_url to subcategories table  
ALTER TABLE subcategories 
ADD COLUMN image_url VARCHAR(512) DEFAULT NULL COMMENT 'S3 URL for subcategory image' AFTER base_price;

-- Add indexes for better query performance
CREATE INDEX idx_service_categories_image ON service_categories(image_url);
CREATE INDEX idx_subcategories_image ON subcategories(image_url);
