# Domain Email Setup for Better Deliverability

## Current Issue
Emails from `info@omwhub.com` are being sent successfully but may be filtered as spam due to missing email authentication records.

## Required DNS Records

### 1. SPF Record
Add this TXT record to your domain DNS:
```
Name: @
Type: TXT
Value: v=spf1 include:smtp.hostinger.com ~all
```

### 2. DKIM Record
Contact Hostinger support to get your DKIM record, then add it as a TXT record.

### 3. DMARC Record
Add this TXT record:
```
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:info@omwhub.com
```

## How to Add DNS Records

### If using Hostinger DNS:
1. Login to Hostinger control panel
2. Go to Domains → Manage → DNS Zone
3. Add the TXT records above

### If using external DNS (Cloudflare, etc.):
1. Login to your DNS provider
2. Add the TXT records to your domain

## Verification

After adding records, verify them:
```bash
# Check SPF
nslookup -type=txt omwhub.com

# Check DMARC
nslookup -type=txt _dmarc.omwhub.com
```

## Alternative: Use Subdomain

If you can't modify the main domain, create a subdomain:
- Use `mail.omwhub.com` or `noreply.omwhub.com`
- Add proper DNS records for the subdomain
- Update FROM_ADDRESS in emailService.js

## Testing Tools

Use these tools to check your domain reputation:
- https://mxtoolbox.com/spf.aspx
- https://dkimvalidator.com/
- https://dmarcian.com/dmarc-inspector/

## Immediate Workaround

Until DNS records are fixed, you can:
1. Use Gmail SMTP (see emailService-gmail.js)
2. Use a different sending domain
3. Ask users to check spam folders and whitelist the address
