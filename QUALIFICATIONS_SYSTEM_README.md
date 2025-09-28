# Provider Qualifications System Implementation

## Overview
Implemented a comprehensive provider qualifications system with S3 file upload support and admin approval workflow for the OTW platform. Workers can now upload their professional qualifications along with supporting certificate documents, and admins can approve or reject them with remarks.

## Database Schema Updates

### Table: `provider_qualifications`
Updated the existing table with new columns:

```sql
-- New columns added
ALTER TABLE provider_qualifications 
ADD COLUMN certificate_url VARCHAR(255) NULL COMMENT 'S3 object key or local file path for certificate document',
ADD COLUMN status ENUM('pending_review', 'approved', 'rejected') DEFAULT 'pending_review' COMMENT 'Admin approval status',
ADD COLUMN remarks TEXT NULL COMMENT 'Admin remarks for approval/rejection',
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

**Migration Required:** Run `backend/database_updates/add_qualifications_certificate_support.sql`

## Backend Implementation

### New API Endpoints

#### Worker Endpoints (`/api/worker/`)

1. **POST /qualifications/presign** - Generate presigned URL for certificate upload
   - Generates S3 presigned PUT URL for direct file upload
   - Creates unique object key: `provider_qualifications/{providerId}/{timestamp}_{filename}`
   - Returns upload URL, object key, and expiration info

2. **GET /qualifications** - Get worker's qualifications (Enhanced)
   - Now returns status, remarks, certificate_url, and timestamps
   - Ordered by creation date (newest first)

3. **POST /qualifications** - Create qualification (Enhanced)
   - Now accepts `certificate_url` parameter
   - Sets status to 'pending_review' by default
   - Supports both with and without certificate upload

4. **GET /qualifications/:id/presign** - Get presigned URL to view certificate
   - Generates S3 presigned GET URL for certificate viewing
   - Handles both S3 and local file storage
   - Forces download with attachment disposition

5. **DELETE /qualifications/:id** - Delete qualification (Enhanced)
   - Now deletes associated certificate from S3
   - Handles both S3 and local file cleanup

#### Admin Endpoints (`/api/worker/`)

6. **PUT /qualifications/:id/status** - Approve/reject qualification
   - Updates qualification status to 'approved' or 'rejected'
   - Accepts optional remarks for rejection reasons
   - Updates timestamp on status change

7. **GET /admin/qualifications** - Get qualifications for admin review
   - Paginated results with provider information
   - Filter by status (pending_review, approved, rejected)
   - Includes provider name, email, and phone for context

### S3 Integration Features

- **Presigned URL Upload Flow**: Direct browser-to-S3 upload without server processing
- **Automatic File Organization**: Files stored in `provider_qualifications/{providerId}/` structure
- **Legacy File Migration**: Automatic migration of local files to S3 when accessed
- **Secure File Access**: Temporary presigned URLs with 5-minute expiration
- **File Cleanup**: Automatic S3 file deletion when qualifications are removed

## Frontend Implementation

### WorkerDocuments.jsx Updates

#### New Features Added:
1. **Certificate File Upload Field**
   - File input for PDF, JPG, JPEG, PNG files (max 5MB)
   - Integrated into qualification form
   - Automatic file clearing after successful submission

2. **Enhanced Qualification Display**
   - Status badges with color coding (pending/approved/rejected)
   - "View Certificate" button for uploaded documents
   - Admin remarks display for rejected qualifications
   - Creation timestamp display
   - Prevent deletion of approved qualifications

3. **Improved User Experience**
   - Loading states during file upload
   - Clear error messages for upload failures
   - Fallback handling when S3 upload fails

### WorkerDocumentsService.js Updates

#### New Methods:
1. **createQualification()** - Enhanced with S3 upload support
   - Attempts presigned S3 upload first
   - Falls back to creating qualification without certificate if upload fails
   - Handles both scenarios gracefully

2. **getQualificationCertificatePresignedUrl()** - View certificates
   - Generates presigned URLs for certificate viewing
   - Opens certificates in new browser tab

### Admin Interface

#### QualificationApproval.jsx (New Component)
- **Comprehensive Admin Dashboard** for qualification management
- **Status Filtering**: View pending, approved, or rejected qualifications
- **Provider Information**: Display worker details for context
- **Bulk Actions**: Approve or reject with optional remarks
- **Certificate Viewing**: Direct access to uploaded certificates
- **Pagination**: Handle large volumes of qualifications efficiently

## Security Features

### File Upload Security
- **File Type Validation**: Only PDF and image files allowed
- **File Size Limits**: Maximum 5MB per certificate
- **Sanitized Filenames**: Special characters removed from S3 keys
- **Presigned URL Expiration**: 5-minute timeout for security

### Access Control
- **Worker Isolation**: Workers can only access their own qualifications
- **Admin Verification**: Status updates require admin privileges
- **Secure File Access**: Temporary URLs prevent unauthorized access

## Usage Workflow

### For Workers:
1. Navigate to `/worker/documents` and select "Qualifications" tab
2. Fill out qualification details (name, institution, date, certificate number)
3. Upload certificate document (optional but recommended)
4. Submit qualification - status will be "Pending Review"
5. View submitted qualifications with status updates
6. Check for admin remarks if qualification is rejected

### For Admins:
1. Access qualification approval interface
2. Filter qualifications by status (pending/approved/rejected)
3. Review qualification details and provider information
4. View uploaded certificates by clicking "View Certificate"
5. Approve qualifications or reject with remarks
6. Track approval history and statistics

## File Storage Strategy

### S3 Storage Structure:
```
bucket-name/
├── provider_qualifications/
│   ├── {provider_id_1}/
│   │   ├── {timestamp}_certificate1.pdf
│   │   └── {timestamp}_certificate2.jpg
│   └── {provider_id_2}/
│       └── {timestamp}_certificate3.pdf
```

### Fallback Handling:
- **Primary**: Direct S3 upload via presigned URLs
- **Fallback**: Create qualification without certificate if upload fails
- **Legacy Support**: Existing local files automatically migrated to S3

## Error Handling

### Upload Failures:
- Network issues during S3 upload
- Invalid file types or sizes
- S3 configuration problems
- Graceful degradation to qualification-only creation

### Admin Actions:
- Validation of status values
- Proper error messages for failed operations
- Transaction rollback on database errors

## Performance Optimizations

### Database:
- Indexes on provider_id and status for fast queries
- Efficient pagination for admin interface
- Optimized JOIN queries for provider information

### File Handling:
- Direct browser-to-S3 upload (no server processing)
- Presigned URLs reduce server load
- Automatic cleanup prevents storage bloat

## Integration Points

### Existing Systems:
- **Provider Management**: Links to existing provider records
- **Authentication**: Uses existing worker/admin auth tokens
- **Document System**: Follows same patterns as other document uploads
- **Status Management**: Consistent with other approval workflows

### Future Enhancements:
- Email notifications for status changes
- Bulk approval operations
- Certificate expiration tracking
- Integration with verification services

## Testing Recommendations

### Manual Testing:
1. **Upload Flow**: Test S3 upload with various file types and sizes
2. **Admin Approval**: Test approve/reject workflow with remarks
3. **Error Scenarios**: Test network failures, invalid files, etc.
4. **Cross-browser**: Ensure file upload works across browsers
5. **Mobile**: Test responsive design on mobile devices

### Database Testing:
1. Run migration script on test database
2. Verify indexes are created correctly
3. Test pagination with large datasets
4. Validate foreign key constraints

## Deployment Notes

### Environment Variables Required:
- `AWS_REGION`: S3 region configuration
- `S3_BUCKET`: S3 bucket name for file storage
- `AWS_ACCESS_KEY_ID`: S3 access credentials
- `AWS_SECRET_ACCESS_KEY`: S3 secret credentials

### Migration Steps:
1. Run database migration script
2. Update environment variables
3. Deploy backend changes
4. Deploy frontend changes
5. Test file upload functionality
6. Verify admin interface access

## Monitoring and Maintenance

### Key Metrics:
- Qualification submission rates
- Approval/rejection ratios
- File upload success rates
- S3 storage usage
- Admin response times

### Maintenance Tasks:
- Monitor S3 storage costs
- Clean up orphaned files
- Archive old qualifications
- Update file type restrictions as needed

## Support and Troubleshooting

### Common Issues:
1. **S3 Upload Failures**: Check AWS credentials and bucket permissions
2. **File Not Found**: Verify S3 object keys in database match actual files
3. **Admin Access**: Ensure proper role-based access control
4. **Large Files**: Monitor upload timeouts and adjust limits

### Debugging:
- Check browser console for upload errors
- Monitor server logs for S3 API errors
- Verify database constraints and foreign keys
- Test presigned URL generation manually
