-- Site Management Module Database Schema
-- Author: OTW Development Team
-- Date: 2025-01-06
-- Description: Dynamic site management tables for Super Admin configuration

-- =====================================================
-- 1. SITE SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `site_name` VARCHAR(255) NOT NULL DEFAULT 'OTW - On The Way',
  `site_tagline` VARCHAR(500) DEFAULT 'Your Trusted Service Partner',
  `site_description` TEXT,
  `site_logo` VARCHAR(500) DEFAULT NULL COMMENT 'S3 URL or local path',
  `site_favicon` VARCHAR(500) DEFAULT NULL COMMENT 'S3 URL or local path',
  `site_logo_dark` VARCHAR(500) DEFAULT NULL COMMENT 'Logo for dark mode',
  `support_email` VARCHAR(255) NOT NULL DEFAULT 'support@otw.com',
  `support_phone` VARCHAR(20) DEFAULT '+91-9876543210',
  `whatsapp_number` VARCHAR(20) DEFAULT NULL,
  `company_address` TEXT,
  `company_city` VARCHAR(100) DEFAULT NULL,
  `company_state` VARCHAR(100) DEFAULT NULL,
  `company_country` VARCHAR(100) DEFAULT 'India',
  `company_pincode` VARCHAR(10) DEFAULT NULL,
  `timezone` VARCHAR(50) DEFAULT 'Asia/Kolkata',
  `currency` VARCHAR(10) DEFAULT 'INR',
  `currency_symbol` VARCHAR(10) DEFAULT '₹',
  `date_format` VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  `time_format` VARCHAR(20) DEFAULT '12h',
  `language` VARCHAR(10) DEFAULT 'en',
  `meta_title` VARCHAR(255) DEFAULT NULL,
  `meta_description` TEXT,
  `meta_keywords` TEXT,
  `google_analytics_id` VARCHAR(50) DEFAULT NULL,
  `facebook_pixel_id` VARCHAR(50) DEFAULT NULL,
  `maintenance_mode` BOOLEAN DEFAULT FALSE,
  `maintenance_message` TEXT,
  `copyright_text` VARCHAR(500) DEFAULT '© 2025 OTW. All rights reserved.',
  `footer_text` TEXT,
  `enable_registration` BOOLEAN DEFAULT TRUE,
  `enable_worker_registration` BOOLEAN DEFAULT TRUE,
  `enable_booking` BOOLEAN DEFAULT TRUE,
  `enable_chat` BOOLEAN DEFAULT TRUE,
  `enable_notifications` BOOLEAN DEFAULT TRUE,
  `enable_reviews` BOOLEAN DEFAULT TRUE,
  `enable_wallet` BOOLEAN DEFAULT TRUE,
  `terms_version` VARCHAR(20) DEFAULT '1.0',
  `privacy_version` VARCHAR(20) DEFAULT '1.0',
  `last_updated_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_maintenance_mode` (`maintenance_mode`),
  CONSTRAINT `fk_site_settings_updated_by` FOREIGN KEY (`last_updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. CONTENT PAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS `content_pages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `page_key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL slug identifier',
  `page_title` VARCHAR(255) NOT NULL,
  `page_subtitle` VARCHAR(500) DEFAULT NULL,
  `page_content` LONGTEXT NOT NULL COMMENT 'HTML content',
  `page_content_plain` LONGTEXT DEFAULT NULL COMMENT 'Plain text version for SEO',
  `page_type` ENUM('static', 'legal', 'help', 'blog', 'custom') DEFAULT 'static',
  `page_status` ENUM('draft', 'published', 'archived') DEFAULT 'published',
  `page_order` INT(11) DEFAULT 0 COMMENT 'Display order in navigation',
  `show_in_footer` BOOLEAN DEFAULT TRUE,
  `show_in_header` BOOLEAN DEFAULT FALSE,
  `show_in_sitemap` BOOLEAN DEFAULT TRUE,
  `requires_auth` BOOLEAN DEFAULT FALSE,
  `meta_title` VARCHAR(255) DEFAULT NULL,
  `meta_description` TEXT,
  `meta_keywords` TEXT,
  `og_title` VARCHAR(255) DEFAULT NULL COMMENT 'Open Graph title',
  `og_description` TEXT COMMENT 'Open Graph description',
  `og_image` VARCHAR(500) DEFAULT NULL COMMENT 'Open Graph image URL',
  `custom_css` TEXT DEFAULT NULL COMMENT 'Page-specific CSS',
  `custom_js` TEXT DEFAULT NULL COMMENT 'Page-specific JavaScript',
  `view_count` INT(11) DEFAULT 0,
  `last_viewed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `updated_by` INT(11) DEFAULT NULL,
  `published_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_page_key` (`page_key`),
  KEY `idx_page_status` (`page_status`),
  KEY `idx_page_type` (`page_type`),
  KEY `idx_show_in_footer` (`show_in_footer`),
  KEY `idx_show_in_header` (`show_in_header`),
  KEY `idx_page_order` (`page_order`),
  CONSTRAINT `fk_content_pages_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_content_pages_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. SOCIAL LINKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS `social_links` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `platform` VARCHAR(50) NOT NULL COMMENT 'facebook, twitter, instagram, linkedin, youtube, etc.',
  `platform_name` VARCHAR(100) NOT NULL COMMENT 'Display name',
  `platform_icon` VARCHAR(100) DEFAULT NULL COMMENT 'Icon class or SVG path',
  `platform_color` VARCHAR(7) DEFAULT NULL COMMENT 'Brand color hex code',
  `url` VARCHAR(500) NOT NULL,
  `display_order` INT(11) DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `open_in_new_tab` BOOLEAN DEFAULT TRUE,
  `show_in_footer` BOOLEAN DEFAULT TRUE,
  `show_in_header` BOOLEAN DEFAULT FALSE,
  `show_in_mobile` BOOLEAN DEFAULT TRUE,
  `created_by` INT(11) DEFAULT NULL,
  `updated_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_platform` (`platform`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `fk_social_links_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_social_links_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. FAQ TABLE (Bonus)
-- =====================================================
CREATE TABLE IF NOT EXISTS `faqs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(100) DEFAULT 'General',
  `question` TEXT NOT NULL,
  `answer` TEXT NOT NULL,
  `display_order` INT(11) DEFAULT 0,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `view_count` INT(11) DEFAULT 0,
  `helpful_count` INT(11) DEFAULT 0,
  `not_helpful_count` INT(11) DEFAULT 0,
  `created_by` INT(11) DEFAULT NULL,
  `updated_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_featured` (`is_featured`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `fk_faqs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_faqs_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. BANNERS TABLE (Bonus)
-- =====================================================
CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `banner_key` VARCHAR(100) NOT NULL UNIQUE,
  `banner_title` VARCHAR(255) NOT NULL,
  `banner_subtitle` VARCHAR(500) DEFAULT NULL,
  `banner_content` TEXT,
  `banner_image` VARCHAR(500) DEFAULT NULL,
  `banner_link` VARCHAR(500) DEFAULT NULL,
  `banner_type` ENUM('info', 'warning', 'success', 'promo', 'announcement') DEFAULT 'info',
  `banner_position` ENUM('top', 'bottom', 'popup', 'sidebar') DEFAULT 'top',
  `display_order` INT(11) DEFAULT 0,
  `is_dismissible` BOOLEAN DEFAULT TRUE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `show_on_pages` TEXT COMMENT 'Comma-separated page keys or * for all',
  `start_date` DATETIME DEFAULT NULL,
  `end_date` DATETIME DEFAULT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `updated_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_banner_key` (`banner_key`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_banner_position` (`banner_position`),
  KEY `idx_display_order` (`display_order`),
  KEY `idx_dates` (`start_date`, `end_date`),
  CONSTRAINT `fk_banners_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_banners_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
