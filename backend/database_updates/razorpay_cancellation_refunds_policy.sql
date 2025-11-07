-- Comprehensive Cancellation & Refunds Policy for Razorpay Verification
-- This creates a detailed policy that meets payment gateway requirements

-- Create multiple policy pages for different URL patterns that Razorpay might check
-- First, create the main refund-policy page
INSERT INTO content_pages (
    page_key, page_title, page_subtitle, page_content, page_type, page_status, 
    page_order, show_in_footer, show_in_header, show_in_sitemap, requires_auth,
    meta_title, meta_description, meta_keywords, created_at, updated_at
) VALUES (
    'refund-policy', 
    'Cancellation & Refunds Policy', 
    'Complete cancellation and refund terms for OMW services',
    '<h1>Cancellation & Refunds Policy</h1>
<p><strong>Company:</strong> OMW Services Private Limited</p>
<p><strong>Website:</strong> https://omwhub.com</p>
<p><strong>Contact Email:</strong> support@omwhub.com</p>
<p><strong>Effective Date:</strong> January 1, 2025</p>
<p><strong>Last Updated:</strong> January 1, 2025</p>

<h2>1. Overview</h2>
<p>This Cancellation & Refunds Policy governs the terms and conditions for cancelling bookings and requesting refunds for services provided through the OMW platform. This policy applies to all customers using our home services marketplace and covers all payment methods including credit cards, debit cards, net banking, UPI, digital wallets, and cash payments.</p>

<h2>2. Service Cancellation Policy</h2>
<h3>2.1 Customer-Initiated Cancellations</h3>
<ul>
<li><strong>Free Cancellation:</strong> Bookings can be cancelled free of charge up to 2 hours before the scheduled service time with full refund</li>
<li><strong>Partial Charges:</strong> Cancellations made within 2 hours of scheduled service will incur 50% of the total service fee</li>
<li><strong>No Refund Cancellations:</strong> No refund will be provided for cancellations made after the service professional has arrived at the customer location</li>
<li><strong>Emergency Cancellations:</strong> Genuine medical or family emergencies will be reviewed on a case-by-case basis and may qualify for full refund</li>
<li><strong>Weather Cancellations:</strong> Services cancelled due to severe weather conditions will receive full refund</li>
</ul>

<h3>2.2 Service Provider Cancellations</h3>
<ul>
<li><strong>Full Refund:</strong> If service provider cancels, customer receives 100% refund</li>
<li><strong>Alternative Arrangement:</strong> We will attempt to arrange alternative service provider at no extra cost</li>
<li><strong>Compensation:</strong> Additional compensation may be provided for significant inconvenience</li>
</ul>

<h2>3. Refund Policy</h2>
<h3>3.1 Eligible Refund Scenarios</h3>
<ul>
<li>Service not provided as per booking confirmation</li>
<li>Service quality issues reported within 24 hours of completion</li>
<li>Technical issues preventing service delivery</li>
<li>Service provider cancellation or no-show</li>
<li>Duplicate payments or billing errors</li>
<li>Overcharging or incorrect billing amounts</li>
<li>Service not completed due to circumstances beyond customer control</li>
</ul>

<h3>3.2 Refund Request Process</h3>
<ol>
<li><strong>Request Submission:</strong> Submit refund request within 7 days of service date through app, website, or customer support</li>
<li><strong>Documentation:</strong> Provide booking details, payment proof, and reason for refund</li>
<li><strong>Investigation:</strong> Our team will review and investigate the request within 48 hours</li>
<li><strong>Decision Communication:</strong> Refund approval or rejection will be communicated within 72 hours</li>
<li><strong>Processing:</strong> Approved refunds will be processed within the timelines specified below</li>
</ol>

<h2>4. Payment Method Specific Refund Terms</h2>
<h3>4.1 Credit Card Refunds</h3>
<ul>
<li><strong>Processing Time:</strong> 5-7 business days from approval date</li>
<li><strong>Refund Method:</strong> Credit to original card used for payment</li>
<li><strong>Bank Processing:</strong> Additional 2-3 days may be required by issuing bank</li>
<li><strong>Statement Reflection:</strong> Refund will appear in next billing cycle</li>
</ul>

<h3>4.2 Debit Card Refunds</h3>
<ul>
<li><strong>Processing Time:</strong> 5-7 business days from approval date</li>
<li><strong>Refund Method:</strong> Credit to original card/account used for payment</li>
<li><strong>Bank Processing:</strong> May take additional time based on issuing bank policies</li>
</ul>

<h3>4.3 Net Banking Refunds</h3>
<ul>
<li><strong>Processing Time:</strong> 5-7 business days from approval date</li>
<li><strong>Refund Method:</strong> Credit to original bank account</li>
<li><strong>Verification Required:</strong> Bank account details must match original payment source</li>
</ul>

<h3>4.4 UPI Refunds</h3>
<ul>
<li><strong>Processing Time:</strong> 1-3 business days from approval date</li>
<li><strong>Refund Method:</strong> Credit to original UPI account/VPA</li>
<li><strong>Instant Processing:</strong> Most UPI refunds are processed within 24 hours</li>
</ul>

<h3>4.5 Digital Wallet Refunds</h3>
<ul>
<li><strong>Processing Time:</strong> 24-48 hours from approval date</li>
<li><strong>Refund Method:</strong> Credit to original wallet account</li>
<li><strong>Supported Wallets:</strong> Paytm, PhonePe, Google Pay, Amazon Pay, and others</li>
</ul>

<h3>4.6 Cash Payment Refunds</h3>
<ul>
<li><strong>Processing Time:</strong> 3-5 business days after bank account verification</li>
<li><strong>Refund Method:</strong> Bank transfer to customer registered account</li>
<li><strong>Documentation Required:</strong> Valid bank account details and identity verification</li>
</ul>

<h2>5. Non-Refundable Scenarios</h2>
<ul>
<li>Service completed satisfactorily as per booking terms</li>
<li>Customer unavailable at scheduled time and location</li>
<li>Cancellation after service has commenced</li>
<li>Refund requests made after 7-day window</li>
<li>Services consumed partially or fully without valid quality issues</li>
<li>Change of mind after service completion</li>
<li>Failure to provide access to service location</li>
</ul>

<h2>6. Partial Refunds</h2>
<p>Partial refunds may be applicable in the following cases:</p>
<ul>
<li><strong>Incomplete Service:</strong> When service is partially completed due to unforeseen circumstances</li>
<li><strong>Quality Issues:</strong> When service quality affects only part of the booked work</li>
<li><strong>Material Issues:</strong> When customer-provided materials cause service limitations</li>
<li><strong>Time Constraints:</strong> When service cannot be completed due to time limitations beyond provider control</li>
</ul>

<h2>7. Dispute Resolution Process</h2>
<ol>
<li><strong>Initial Contact:</strong> Contact customer support immediately via phone, email, or chat</li>
<li><strong>Detailed Report:</strong> Provide comprehensive explanation with supporting evidence (photos, videos, etc.)</li>
<li><strong>Investigation Period:</strong> Allow 48-72 hours for thorough investigation</li>
<li><strong>Management Review:</strong> Unresolved cases are escalated to management team</li>
<li><strong>Final Resolution:</strong> Final decision communicated within 5 business days</li>
<li><strong>External Mediation:</strong> Customers may approach consumer forums if unsatisfied</li>
</ol>

<h2>8. Refund Processing Timeline Summary</h2>
<table border="1" style="width:100%; border-collapse: collapse; margin: 20px 0;">
<tr style="background-color: #f2f2f2;">
<th style="padding: 10px; text-align: left;">Payment Method</th>
<th style="padding: 10px; text-align: left;">Refund Timeline</th>
<th style="padding: 10px; text-align: left;">Additional Notes</th>
</tr>
<tr>
<td style="padding: 8px;">Credit Cards</td>
<td style="padding: 8px;">5-7 business days</td>
<td style="padding: 8px;">Plus bank processing time</td>
</tr>
<tr>
<td style="padding: 8px;">Debit Cards</td>
<td style="padding: 8px;">5-7 business days</td>
<td style="padding: 8px;">Plus bank processing time</td>
</tr>
<tr>
<td style="padding: 8px;">Net Banking</td>
<td style="padding: 8px;">5-7 business days</td>
<td style="padding: 8px;">Direct to bank account</td>
</tr>
<tr>
<td style="padding: 8px;">UPI</td>
<td style="padding: 8px;">1-3 business days</td>
<td style="padding: 8px;">Usually within 24 hours</td>
</tr>
<tr>
<td style="padding: 8px;">Digital Wallets</td>
<td style="padding: 8px;">24-48 hours</td>
<td style="padding: 8px;">Fastest processing</td>
</tr>
<tr>
<td style="padding: 8px;">Cash Payments</td>
<td style="padding: 8px;">3-5 business days</td>
<td style="padding: 8px;">After account verification</td>
</tr>
</table>

<h2>9. Customer Support & Contact Information</h2>
<p><strong>For Cancellations, Refunds & Support:</strong></p>
<ul>
<li><strong>Email:</strong> refunds@omwhub.com</li>
<li><strong>Customer Support Email:</strong> support@omwhub.com</li>
<li><strong>Phone:</strong> +91-9876543210</li>
<li><strong>WhatsApp Support:</strong> +91-9876543210</li>
<li><strong>Business Address:</strong> OMW Services Private Limited, Visakhapatnam, Andhra Pradesh, India</li>
<li><strong>Support Hours:</strong> 24/7 Customer Support Available</li>
<li><strong>Business Hours:</strong> Monday to Sunday, 9:00 AM to 9:00 PM IST</li>
<li><strong>Emergency Support:</strong> Available for urgent cancellations and refund issues</li>
</ul>

<h2>10. Legal Compliance & Regulatory Information</h2>
<p>This Cancellation & Refunds Policy is designed in compliance with:</p>
<ul>
<li><strong>Reserve Bank of India (RBI)</strong> guidelines for digital payments and refunds</li>
<li><strong>Consumer Protection Act, 2019</strong> - Consumer rights and protection</li>
<li><strong>Information Technology Act, 2000</strong> - Digital transactions and data protection</li>
<li><strong>Payment and Settlement Systems Act, 2007</strong> - Payment system regulations</li>
<li><strong>Foreign Exchange Management Act (FEMA)</strong> - For international transactions</li>
<li><strong>Goods and Services Tax (GST) Act</strong> - Tax implications on refunds</li>
</ul>

<h2>11. Special Circumstances</h2>
<h3>11.1 Force Majeure Events</h3>
<p>In case of natural disasters, government restrictions, pandemics, or other force majeure events:</p>
<ul>
<li>Full refunds will be provided for cancelled services</li>
<li>Rescheduling options will be offered without additional charges</li>
<li>Extended refund request windows may be applicable</li>
</ul>

<h3>11.2 Technical Issues</h3>
<p>For payment or technical failures:</p>
<ul>
<li>Immediate investigation and resolution within 24 hours</li>
<li>Full refund for duplicate or failed transactions</li>
<li>Compensation for significant inconvenience caused</li>
</ul>

<h2>12. Policy Updates and Modifications</h2>
<p>This Cancellation & Refunds Policy may be updated periodically to reflect:</p>
<ul>
<li>Changes in service offerings or business model</li>
<li>Updates in legal or regulatory requirements</li>
<li>Improvements in customer service processes</li>
<li>Changes in payment gateway or banking partnerships</li>
</ul>

<p><strong>Notification of Changes:</strong> Customers will be notified of policy changes via email, app notifications, or website announcements at least 15 days before implementation.</p>

<p><strong>Acceptance of Changes:</strong> Continued use of OMW services after policy updates constitutes acceptance of the revised terms.</p>

<h2>13. Important Dates</h2>
<ul>
<li><strong>Policy Effective Date:</strong> January 1, 2025</li>
<li><strong>Last Updated:</strong> January 1, 2025</li>
<li><strong>Last Review Date:</strong> January 1, 2025</li>
<li><strong>Next Scheduled Review:</strong> July 1, 2025</li>
</ul>

<h2>14. Additional Information</h2>
<p><strong>Language:</strong> This policy is available in English and Hindi. In case of any discrepancy, the English version shall prevail.</p>
<p><strong>Jurisdiction:</strong> This policy is governed by Indian law and subject to the jurisdiction of courts in Visakhapatnam, Andhra Pradesh.</p>
<p><strong>Severability:</strong> If any provision of this policy is found to be unenforceable, the remaining provisions shall continue to be valid and enforceable.</p>

<hr style="margin: 30px 0;">
<p><em><strong>Note:</strong> For any questions, clarifications, or assistance regarding cancellations and refunds, please contact our customer support team using the contact information provided above. We are committed to providing fair and transparent refund processes for all our customers.</em></p>

<p><strong>Document Version:</strong> 1.0</p>
<p><strong>Document ID:</strong> OMW-CRP-2025-001</p>',
    'legal', 
    'published', 
    8, 
    TRUE, 
    FALSE, 
    TRUE, 
    FALSE,
    'Cancellation & Refunds Policy - OMW Services | Complete Terms',
    'Comprehensive cancellation and refund policy for OMW home services. Detailed terms for all payment methods including cards, UPI, wallets, net banking. Customer protection and refund processing guidelines.',
    'cancellation policy, refund policy, OMW refunds, service cancellation, money back guarantee, payment refunds, credit card refunds, UPI refunds, digital wallet refunds, consumer protection',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    page_title = VALUES(page_title),
    page_subtitle = VALUES(page_subtitle),
    page_content = VALUES(page_content),
    meta_title = VALUES(meta_title),
    meta_description = VALUES(meta_description),
    meta_keywords = VALUES(meta_keywords),
    updated_at = NOW();

-- Create additional policy pages for different URL patterns Razorpay might check
INSERT INTO content_pages (
    page_key, page_title, page_subtitle, page_content, page_type, page_status, 
    page_order, show_in_footer, show_in_header, show_in_sitemap, requires_auth,
    meta_title, meta_description, meta_keywords, created_at, updated_at
) VALUES 
-- Cancellation policy page
('cancellation-policy', 'Cancellation Policy', 'Service cancellation terms and conditions', 
'<h1>Cancellation Policy</h1>
<p><strong>Company:</strong> OMW Services Private Limited</p>
<p><strong>Website:</strong> https://omwhub.com</p>
<p><strong>Effective Date:</strong> January 1, 2025</p>

<h2>Service Cancellation Terms</h2>
<p>This cancellation policy applies to all services booked through OMW platform.</p>

<h3>Free Cancellation</h3>
<ul>
<li>Cancel free of charge up to 2 hours before service</li>
<li>Full refund processed within 5-7 business days</li>
<li>No questions asked cancellation policy</li>
</ul>

<h3>Cancellation Charges</h3>
<ul>
<li>50% charges for cancellation within 2 hours</li>
<li>No refund after service professional arrives</li>
<li>Emergency cancellations reviewed case by case</li>
</ul>

<h3>Refund Process</h3>
<p>Refunds are processed to original payment method within 5-7 business days for cards, 1-3 days for UPI, and 24-48 hours for wallets.</p>

<p><strong>Contact:</strong> refunds@omwhub.com | +91-9876543210</p>', 
'legal', 'published', 9, TRUE, FALSE, TRUE, FALSE,
'Cancellation Policy - OMW Services', 
'Service cancellation policy for OMW home services. Free cancellation up to 2 hours before service.',
'cancellation policy, service cancellation, free cancellation, refund policy',
NOW(), NOW()),

-- Cancellation and refunds page (alternative URL)
('cancellation-refunds', 'Cancellation and Refunds', 'Complete cancellation and refund policy', 
'<h1>Cancellation and Refunds Policy</h1>
<p><strong>Company:</strong> OMW Services Private Limited</p>
<p><strong>Website:</strong> https://omwhub.com</p>
<p><strong>Effective Date:</strong> January 1, 2025</p>

<h2>Cancellation Terms</h2>
<p>Customers can cancel services with the following terms:</p>
<ul>
<li><strong>Free Cancellation:</strong> Up to 2 hours before scheduled service</li>
<li><strong>Partial Charges:</strong> 50% fee for cancellation within 2 hours</li>
<li><strong>No Refund:</strong> After service professional arrives</li>
</ul>

<h2>Refund Policy</h2>
<p>Refunds are processed based on payment method:</p>
<ul>
<li><strong>Credit/Debit Cards:</strong> 5-7 business days</li>
<li><strong>UPI:</strong> 1-3 business days</li>
<li><strong>Digital Wallets:</strong> 24-48 hours</li>
<li><strong>Net Banking:</strong> 5-7 business days</li>
</ul>

<h2>Contact Information</h2>
<p>For cancellations and refunds:</p>
<ul>
<li>Email: refunds@omwhub.com</li>
<li>Phone: +91-9876543210</li>
<li>Support: 24/7 available</li>
</ul>', 
'legal', 'published', 10, TRUE, FALSE, TRUE, FALSE,
'Cancellation and Refunds - OMW Services', 
'Complete cancellation and refund policy for OMW services. Clear terms for service cancellation and money back guarantee.',
'cancellation refunds, service cancellation, money back, refund policy',
NOW(), NOW())

ON DUPLICATE KEY UPDATE
    page_title = VALUES(page_title),
    page_subtitle = VALUES(page_subtitle),
    page_content = VALUES(page_content),
    meta_title = VALUES(meta_title),
    meta_description = VALUES(meta_description),
    meta_keywords = VALUES(meta_keywords),
    updated_at = NOW();
