-- Update existing refund policy to match Razorpay's "Cancellation & Refunds" requirement
-- This script updates the existing refund-policy page to be more comprehensive and meet payment gateway standards

UPDATE content_pages 
SET 
    page_title = 'Cancellation & Refunds Policy',
    page_subtitle = 'Complete cancellation and refund terms for OMW services',
    page_content = '<h1>Cancellation & Refunds Policy</h1>
<p><strong>Company:</strong> OMW Services Private Limited</p>
<p><strong>Website:</strong> https://omwhub.com</p>
<p><strong>Effective Date:</strong> January 1, 2025</p>
<p><strong>Last Updated:</strong> January 1, 2025</p>

<h2>1. Overview</h2>
<p>This Cancellation & Refunds Policy governs the terms and conditions for cancelling bookings and requesting refunds for services provided through the OMW platform. This policy applies to all customers using our home services marketplace.</p>

<h2>2. Service Cancellation Policy</h2>
<h3>2.1 Customer-Initiated Cancellations</h3>
<ul>
<li><strong>Free Cancellation:</strong> Bookings can be cancelled free of charge up to 2 hours before the scheduled service time</li>
<li><strong>Partial Charges:</strong> Cancellations made within 2 hours of scheduled service will incur 50% of the total service fee</li>
<li><strong>No Refund Cancellations:</strong> No refund will be provided for cancellations made after the service professional has arrived at the customer location</li>
<li><strong>Emergency Cancellations:</strong> Genuine medical or family emergencies will be reviewed on a case-by-case basis</li>
<li><strong>Weather Cancellations:</strong> Services cancelled due to severe weather conditions will receive full refund</li>
</ul>

<h4>1.2 Service Provider Cancellations</h4>
<ul>
<li>Full refund if service provider cancels</li>
<li>Alternative service provider will be arranged when possible</li>
<li>Compensation may be provided for inconvenience</li>
</ul>

<h3>2. Refund Policy</h3>
<h4>2.1 Eligible Refund Scenarios</h4>
<ul>
<li>Service not provided as per booking</li>
<li>Service quality issues reported within 24 hours</li>
<li>Technical issues preventing service delivery</li>
<li>Service provider cancellation</li>
<li>Duplicate payments or billing errors</li>
</ul>

<h4>2.2 Refund Process</h4>
<ol>
<li><strong>Request Submission:</strong> Raise refund request within 7 days of service completion</li>
<li><strong>Investigation:</strong> Our team will review and investigate within 48 hours</li>
<li><strong>Decision:</strong> Refund approval/rejection communicated within 72 hours</li>
<li><strong>Processing:</strong> Approved refunds processed within 5-7 business days</li>
</ol>

<h4>2.3 Refund Methods</h4>
<ul>
<li>Original payment method (preferred)</li>
<li>Bank transfer for cash payments</li>
<li>Wallet credit (faster processing)</li>
<li>UPI transfer where applicable</li>
</ul>

<h3>3. Non-Refundable Scenarios</h3>
<ul>
<li>Service completed satisfactorily</li>
<li>Customer unavailable at scheduled time</li>
<li>Cancellation after service commencement</li>
<li>Requests made after 7-day window</li>
<li>Services consumed partially or fully</li>
</ul>

<h3>4. Partial Refunds</h3>
<p>Partial refunds may be applicable in cases of:</p>
<ul>
<li>Incomplete service delivery</li>
<li>Service quality issues affecting part of the work</li>
<li>Material or equipment issues</li>
</ul>

<h3>5. Dispute Resolution</h3>
<p>In case of disputes:</p>
<ol>
<li>Contact customer support immediately</li>
<li>Provide detailed explanation and evidence</li>
<li>Allow 48-72 hours for investigation</li>
<li>Escalation to management if unresolved</li>
</ol>

<h3>6. Contact Information</h3>
<p><strong>For Cancellations & Refunds:</strong></p>
<ul>
<li>📧 Email: refunds@omwhub.com</li>
<li>📞 Phone: +91-9876543210</li>
<li>💬 WhatsApp: +91-9876543210</li>
<li>🕒 Support Hours: 24/7</li>
</ul>

<h3>7. Policy Updates</h3>
<p>This policy may be updated from time to time. Continued use of OMW services constitutes acceptance of any changes to this policy.</p>

<p><em>For any questions regarding cancellations and refunds, please contact our customer support team.</em></p>',
    meta_title = 'Cancellation & Refunds Policy - OMW Services',
    meta_description = 'Complete cancellation and refund policy for OMW services. Learn about our cancellation terms, refund process, and customer protection policies.',
    meta_keywords = 'cancellation policy, refund policy, OMW refunds, service cancellation, money back guarantee',
    updated_at = NOW()
WHERE page_key = 'refund-policy';

-- If the above update doesn't work (page doesn't exist), insert new page
INSERT IGNORE INTO content_pages (
    page_key, page_title, page_subtitle, page_content, page_type, page_status, 
    page_order, show_in_footer, show_in_header, show_in_sitemap, requires_auth,
    meta_title, meta_description, meta_keywords, created_at, updated_at
) VALUES (
    'refund-policy', 
    'Cancellation & Refunds', 
    'Our comprehensive cancellation and refund policy',
    '<h2>Cancellation & Refunds Policy</h2>
<p><strong>Effective Date:</strong> January 1, 2025</p>
<p><strong>Last Updated:</strong> January 1, 2025</p>

<h3>1. Service Cancellation Policy</h3>
<h4>1.1 Customer Cancellations</h4>
<ul>
<li><strong>Free Cancellation:</strong> Up to 2 hours before scheduled service time</li>
<li><strong>Partial Charges:</strong> 50% of service fee for cancellation within 2 hours of service</li>
<li><strong>No Refund:</strong> Cancellation after service professional arrives at location</li>
<li><strong>Emergency Cancellations:</strong> Genuine emergencies will be reviewed case-by-case</li>
</ul>

<h4>1.2 Service Provider Cancellations</h4>
<ul>
<li>Full refund if service provider cancels</li>
<li>Alternative service provider will be arranged when possible</li>
<li>Compensation may be provided for inconvenience</li>
</ul>

<h3>2. Refund Policy</h3>
<h4>2.1 Eligible Refund Scenarios</h4>
<ul>
<li>Service not provided as per booking</li>
<li>Service quality issues reported within 24 hours</li>
<li>Technical issues preventing service delivery</li>
<li>Service provider cancellation</li>
<li>Duplicate payments or billing errors</li>
</ul>

<h4>2.2 Refund Process</h4>
<ol>
<li><strong>Request Submission:</strong> Raise refund request within 7 days of service completion</li>
<li><strong>Investigation:</strong> Our team will review and investigate within 48 hours</li>
<li><strong>Decision:</strong> Refund approval/rejection communicated within 72 hours</li>
<li><strong>Processing:</strong> Approved refunds processed within 5-7 business days</li>
</ol>

<h4>2.3 Refund Methods</h4>
<ul>
<li>Original payment method (preferred)</li>
<li>Bank transfer for cash payments</li>
<li>Wallet credit (faster processing)</li>
<li>UPI transfer where applicable</li>
</ul>

<h3>3. Non-Refundable Scenarios</h3>
<ul>
<li>Service completed satisfactorily</li>
<li>Customer unavailable at scheduled time</li>
<li>Cancellation after service commencement</li>
<li>Requests made after 7-day window</li>
<li>Services consumed partially or fully</li>
</ul>

<h3>4. Partial Refunds</h3>
<p>Partial refunds may be applicable in cases of:</p>
<ul>
<li>Incomplete service delivery</li>
<li>Service quality issues affecting part of the work</li>
<li>Material or equipment issues</li>
</ul>

<h3>5. Dispute Resolution</h3>
<p>In case of disputes:</p>
<ol>
<li>Contact customer support immediately</li>
<li>Provide detailed explanation and evidence</li>
<li>Allow 48-72 hours for investigation</li>
<li>Escalation to management if unresolved</li>
</ol>

<h3>6. Contact Information</h3>
<p><strong>For Cancellations & Refunds:</strong></p>
<ul>
<li>📧 Email: refunds@omwhub.com</li>
<li>📞 Phone: +91-9876543210</li>
<li>💬 WhatsApp: +91-9876543210</li>
<li>🕒 Support Hours: 24/7</li>
</ul>

<h3>7. Policy Updates</h3>
<p>This policy may be updated from time to time. Continued use of OMW services constitutes acceptance of any changes to this policy.</p>

<p><em>For any questions regarding cancellations and refunds, please contact our customer support team.</em></p>',
    'legal', 
    'published', 
    8, 
    TRUE, 
    FALSE, 
    TRUE, 
    FALSE,
    'Cancellation & Refunds Policy - OMW Services',
    'Complete cancellation and refund policy for OMW services. Learn about our cancellation terms, refund process, and customer protection policies.',
    'cancellation policy, refund policy, OMW refunds, service cancellation, money back guarantee',
    NOW(),
    NOW()
);
