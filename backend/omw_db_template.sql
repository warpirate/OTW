-- OTW Database Template
-- This file contains the database structure without sensitive credentials
-- Use this as a template and populate with your own environment variables

-- System Settings Template
-- Replace placeholder values with actual environment variables

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `category`, `is_sensitive`, `description`, `updated_by`, `updated_at`) VALUES
('JWT_SECRET', 'YOUR_JWT_SECRET', 'string', 'security', 1, 'JWT Secret Key', 1, NOW()),
('JWT_EXPIRATION', '15h', 'string', 'security', 0, 'JWT Token Expiration Time', 1, NOW()),
('AWS_ACCESS_KEY_ID', 'YOUR_AWS_ACCESS_KEY_ID', 'string', 'aws', 1, 'AWS Access Key ID', 1, NOW()),
('AWS_SECRET_ACCESS_KEY', 'YOUR_AWS_SECRET_ACCESS_KEY', 'string', 'aws', 1, 'AWS Secret Access Key', 1, NOW()),
('AWS_REGION', 'ap-south-1', 'string', 'aws', 0, 'AWS Region', 1, NOW()),
('AWS_BUCKET_NAME', 'YOUR_BUCKET_NAME', 'string', 'aws', 0, 'AWS S3 Bucket Name', 1, NOW()),
('USER_GMAIL', 'YOUR_EMAIL@domain.com', 'string', 'email', 1, 'SMTP Email Address', 1, NOW()),
('USER_PASSWORD', 'YOUR_EMAIL_PASSWORD', 'string', 'email', 1, 'SMTP Email Password', 1, NOW()),
('RAZORPAY_KEY_ID', 'YOUR_RAZORPAY_KEY_ID', 'string', 'payment', 1, 'Razorpay Key ID', 1, NOW()),
('RAZORPAY_KEY_SECRET', 'YOUR_RAZORPAY_KEY_SECRET', 'string', 'payment', 1, 'Razorpay Key Secret', 1, NOW()),
('GOOGLE_MAPS_API_KEY', 'YOUR_GOOGLE_MAPS_API_KEY', 'string', 'general', 1, 'Google Maps API Key', 1, NOW());

-- Instructions:
-- 1. Replace all placeholder values (YOUR_*) with actual values from your .env file
-- 2. Never commit files containing real credentials to version control
-- 3. Use environment variables for sensitive configuration
