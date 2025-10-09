-- Site Management Module Seed Data
-- Author: OTW Development Team
-- Date: 2025-01-06

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default site settings
INSERT INTO `site_settings` (
  `site_name`, 
  `site_tagline`, 
  `site_description`, 
  `support_email`, 
  `support_phone`, 
  `whatsapp_number`,
  `company_address`, 
  `company_city`, 
  `company_state`, 
  `company_country`, 
  `company_pincode`,
  `meta_title`,
  `meta_description`,
  `meta_keywords`,
  `copyright_text`,
  `footer_text`
) VALUES (
  'OTW - On The Way',
  'Your Trusted Service Partner',
  'OTW is your one-stop solution for all home services. From plumbing to electrical work, cleaning to pest control, we bring trusted professionals right to your doorstep.',
  'support@otw.com',
  '+91-9876543210',
  '+91-9876543210',
  '123, Tech Park, Sector 5',
  'Visakhapatnam',
  'Andhra Pradesh',
  'India',
  '530001',
  'OTW - Professional Home Services | Book Trusted Service Providers',
  'Book trusted professionals for home services including plumbing, electrical, cleaning, AC repair, and more. Quick, reliable, and affordable services at your doorstep.',
  'home services, plumber, electrician, AC repair, cleaning services, pest control, carpenter, painter, OTW, on demand services',
  '© 2025 OTW - On The Way. All rights reserved.',
  'OTW brings quality home services to your doorstep. Our verified professionals ensure safe and reliable service every time.'
) ON DUPLICATE KEY UPDATE `id` = `id`;

-- Insert default content pages
INSERT INTO `content_pages` (`page_key`, `page_title`, `page_subtitle`, `page_content`, `page_type`, `page_status`, `page_order`, `show_in_footer`) VALUES
-- About Us
('about-us', 'About Us', 'Learn more about OTW', 
'<h2>Welcome to OTW - On The Way</h2>
<p>Founded in 2023, OTW has been revolutionizing the home services industry by connecting customers with verified, skilled professionals.</p>
<h3>Our Mission</h3>
<p>To make quality home services accessible, affordable, and reliable for everyone.</p>
<h3>Our Vision</h3>
<p>To become the most trusted platform for home services across India.</p>
<h3>Why Choose OTW?</h3>
<ul>
<li>✓ Verified Professionals</li>
<li>✓ Transparent Pricing</li>
<li>✓ On-time Service</li>
<li>✓ Quality Guarantee</li>
<li>✓ 24/7 Support</li>
</ul>', 
'static', 'published', 1, TRUE),

-- Terms & Conditions
('terms-conditions', 'Terms & Conditions', 'Please read our terms carefully', 
'<h2>Terms and Conditions</h2>
<p><strong>Effective Date:</strong> January 1, 2025</p>
<h3>1. Acceptance of Terms</h3>
<p>By accessing and using OTW services, you agree to be bound by these Terms and Conditions.</p>
<h3>2. Services</h3>
<p>OTW provides a platform to connect customers with service professionals.</p>
<h3>3. User Accounts</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials.</p>
<h3>4. Booking and Cancellation</h3>
<p>Bookings can be cancelled as per our cancellation policy.</p>
<h3>5. Payment Terms</h3>
<p>Payment can be made through various modes including cash, card, and digital wallets.</p>', 
'legal', 'published', 2, TRUE),

-- Privacy Policy
('privacy-policy', 'Privacy Policy', 'Your privacy is important to us', 
'<h2>Privacy Policy</h2>
<p><strong>Last Updated:</strong> January 1, 2025</p>
<h3>1. Information We Collect</h3>
<p>We collect information you provide directly to us, including name, email, phone, and address.</p>
<h3>2. How We Use Your Information</h3>
<p>We use the information to provide and improve our services.</p>
<h3>3. Information Sharing</h3>
<p>We share your information only with service professionals for booking fulfillment.</p>
<h3>4. Data Security</h3>
<p>We implement industry-standard security measures to protect your data.</p>
<h3>5. Contact Us</h3>
<p>For privacy concerns, email us at privacy@otw.com</p>', 
'legal', 'published', 3, TRUE),

-- Become a Worker
('become-worker', 'Become a Service Partner', 'Join our network of professionals', 
'<h2>Join OTW as a Service Professional</h2>
<p>Turn your skills into a thriving business with OTW!</p>
<h3>Why Partner with OTW?</h3>
<ul>
<li>📱 Get more customers through our app</li>
<li>💰 Earn more with transparent pricing</li>
<li>⏰ Flexible working hours</li>
<li>📈 Grow your business</li>
</ul>
<h3>How to Join?</h3>
<ol>
<li>Download the OTW Partner app</li>
<li>Complete the registration form</li>
<li>Upload required documents</li>
<li>Start receiving bookings!</li>
</ol>
<p><a href="/worker/register">Apply Now</a></p>', 
'static', 'published', 4, TRUE),

-- Contact Us
('contact-us', 'Contact Us', 'Get in touch with us', 
'<h2>Contact OTW</h2>
<p>We are here to help you 24/7</p>
<h3>Customer Support</h3>
<p>📧 Email: support@otw.com<br>
📞 Phone: +91-9876543210<br>
💬 WhatsApp: +91-9876543210</p>
<h3>Head Office</h3>
<p>OTW Services Pvt. Ltd.<br>
123, Tech Park, Sector 5<br>
Visakhapatnam, Andhra Pradesh<br>
India - 530001</p>', 
'static', 'published', 5, TRUE),

-- Careers
('careers', 'Careers', 'Join our growing team', 
'<h2>Careers at OTW</h2>
<p>Be part of the revolution in home services!</p>
<h3>Current Openings</h3>
<ul>
<li>Senior Backend Developer (Node.js)</li>
<li>React Developer</li>
<li>City Operations Manager</li>
<li>Customer Support Executive</li>
</ul>
<h3>How to Apply</h3>
<p>Send your resume to careers@otw.com</p>', 
'static', 'published', 6, TRUE),

-- Help/FAQ
('help', 'Help & Support', 'Find answers to common questions', 
'<h2>Help Center</h2>
<h3>Frequently Asked Questions</h3>
<p><strong>Q: How do I book a service?</strong><br>
A: Simply select the service you need, choose your preferred time slot, and confirm.</p>
<p><strong>Q: What payment methods are accepted?</strong><br>
A: We accept cash, cards, UPI, and wallet payments.</p>
<p><strong>Q: Are your professionals verified?</strong><br>
A: Yes, all professionals undergo background verification.</p>
<h3>Still Need Help?</h3>
<p>Contact support at support@otw.com</p>', 
'help', 'published', 7, TRUE),

-- Refund Policy
('refund-policy', 'Refund Policy', 'Our refund and cancellation policy', 
'<h2>Refund and Cancellation Policy</h2>
<p><strong>Effective Date:</strong> January 1, 2025</p>
<h3>Cancellation Policy</h3>
<ul>
<li>Free cancellation up to 2 hours before scheduled service</li>
<li>50% charges for cancellation within 2 hours of service</li>
<li>No refund for cancellation after professional arrives</li>
</ul>
<h3>Refund Process</h3>
<ol>
<li>Raise refund request within 7 days of service</li>
<li>Our team will investigate within 48 hours</li>
<li>If approved, refund will be processed in 5-7 business days</li>
</ol>
<p>Email: refunds@otw.com</p>', 
'legal', 'published', 8, TRUE);

-- Insert default social links
INSERT INTO `social_links` (`platform`, `platform_name`, `platform_icon`, `platform_color`, `url`, `display_order`, `is_active`, `show_in_footer`) VALUES
('facebook', 'Facebook', 'fab fa-facebook-f', '#1877F2', 'https://facebook.com/otwservices', 1, TRUE, TRUE),
('twitter', 'Twitter', 'fab fa-twitter', '#1DA1F2', 'https://twitter.com/otwservices', 2, TRUE, TRUE),
('instagram', 'Instagram', 'fab fa-instagram', '#E4405F', 'https://instagram.com/otwservices', 3, TRUE, TRUE),
('linkedin', 'LinkedIn', 'fab fa-linkedin-in', '#0A66C2', 'https://linkedin.com/company/otwservices', 4, TRUE, TRUE),
('youtube', 'YouTube', 'fab fa-youtube', '#FF0000', 'https://youtube.com/otwservices', 5, TRUE, TRUE),
('whatsapp', 'WhatsApp', 'fab fa-whatsapp', '#25D366', 'https://wa.me/919876543210', 6, TRUE, TRUE);

-- Insert sample FAQs
INSERT INTO `faqs` (`category`, `question`, `answer`, `display_order`, `is_featured`, `is_active`) VALUES
('General', 'What is OTW?', 'OTW (On The Way) is a comprehensive home services platform that connects customers with verified service professionals.', 1, TRUE, TRUE),
('Booking', 'How do I book a service?', 'You can book a service in 3 simple steps: Select service, Choose time, Enter address and confirm.', 2, TRUE, TRUE),
('Payment', 'What payment methods do you accept?', 'We accept Cash, Cards, UPI, Net Banking, and Digital Wallets.', 3, TRUE, TRUE),
('Safety', 'Are your service professionals verified?', 'Yes, all professionals undergo thorough background verification.', 4, TRUE, TRUE),
('Pricing', 'How is the service price calculated?', 'Service prices are transparently displayed before booking.', 5, FALSE, TRUE);

-- Insert sample banner
INSERT INTO `banners` (`banner_key`, `banner_title`, `banner_subtitle`, `banner_content`, `banner_type`, `banner_position`, `is_active`) VALUES
('welcome-offer', 'Get 20% OFF on First Booking!', 'New user special offer', 'Use code FIRST20 at checkout', 'promo', 'top', TRUE),
('maintenance-notice', 'Scheduled Maintenance', 'Service will be unavailable on Sunday 2 AM - 4 AM', 'We are upgrading our systems for better performance', 'warning', 'top', FALSE);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_pages_view_count ON content_pages(view_count);
CREATE INDEX IF NOT EXISTS idx_faqs_view_count ON faqs(view_count);
CREATE INDEX IF NOT EXISTS idx_faqs_helpful ON faqs(helpful_count);

-- Add audit log entry for initial setup
INSERT INTO audit_logs (user_id, user_role, action, resource, resource_id, details, ip_address)
SELECT 
    u.id,
    'super admin',
    'CREATE',
    'site_settings',
    1,
    JSON_OBJECT('action', 'Initial site management setup', 'tables_created', JSON_ARRAY('site_settings', 'content_pages', 'social_links', 'faqs', 'banners')),
    '127.0.0.1'
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.role_name = 'super admin'
LIMIT 1;
