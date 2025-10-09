-- Remove FAQs and Banners Tables Migration
-- Author: OTW Development Team
-- Date: 2025-01-09
-- Description: Drop FAQs and Banners tables as they are being removed from SuperAdmin panel

-- =====================================================
-- DROP BANNERS TABLE
-- =====================================================
DROP TABLE IF EXISTS `banners`;

-- =====================================================
-- DROP FAQS TABLE
-- =====================================================
DROP TABLE IF EXISTS `faqs`;

-- Note: If you need to preserve data before dropping, 
-- create a backup first using:
-- CREATE TABLE faqs_backup AS SELECT * FROM faqs;
-- CREATE TABLE banners_backup AS SELECT * FROM banners;
