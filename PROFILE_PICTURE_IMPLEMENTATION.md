# Worker Profile Picture Upload Implementation

## Overview
Implemented a complete profile picture upload system for workers using AWS S3 storage with secure presigned URLs.

## Database Changes

### Migration File
- **File**: `backend/database_updates/add_profile_picture_to_providers.sql`
- **Changes**:
  - Added `profile_picture_url` VARCHAR(500) column to `providers` table
  - Added index on `profile_picture_url` for performance
  - Column stores S3 URL of uploaded profile pictures

### How to Apply
```bash
# Run the migration SQL file
mysql -u your_user -p your_database < backend/database_updates/add_profile_picture_to_providers.sql
```

## Backend Implementation

### API Endpoints (worker.js)

#### 1. Generate Presigned Upload URL
- **Endpoint**: `POST /api/worker-management/worker/profile-picture/presign`
- **Auth**: Required (Worker JWT)
- **Request Body**:
  ```json
  {
    "file_name": "profile.jpg",
    "content_type": "image/jpeg"
  }
  ```
- **Response**:
  ```json
  {
    "upload_url": "https://s3.amazonaws.com/...",
    "s3_key": "provider_profile_pictures/123/timestamp_profile.jpg",
    "expires_in": 300
  }
  ```
- **Validation**:
  - Only accepts: image/jpeg, image/jpg, image/png, image/webp
  - 5-minute expiration on presigned URL

#### 2. Update Profile Picture URL
- **Endpoint**: `PUT /api/worker-management/worker/profile-picture`
- **Auth**: Required (Worker JWT)
- **Request Body**:
  ```json
  {
    "profile_picture_url": "https://s3.amazonaws.com/..."
  }
  ```
- **Features**:
  - Updates database with new S3 URL
  - Automatically deletes old profile picture from S3

#### 3. Get Profile Picture View URL
- **Endpoint**: `GET /api/worker-management/worker/profile-picture/presign`
- **Auth**: Required (Worker JWT)
- **Response**:
  ```json
  {
    "url": "https://s3.amazonaws.com/...",
    "storage": "s3",
    "expires_in": 3600
  }
  ```
- **Features**:
  - Returns presigned URL for viewing (1-hour expiration)
  - Returns 404 if no profile picture exists

#### 4. Delete Profile Picture
- **Endpoint**: `DELETE /api/worker-management/worker/profile-picture`
- **Auth**: Required (Worker JWT)
- **Features**:
  - Deletes file from S3
  - Removes URL from database

### S3 Configuration
- **Bucket Structure**: `provider_profile_pictures/{providerId}/{timestamp}_{filename}`
- **File Naming**: Sanitized to prevent security issues
- **Access Control**: Private bucket with presigned URLs only

## Frontend Implementation

### Service Methods (worker.service.js)

#### New Methods Added:
1. `getProfilePictureUploadUrl(fileName, contentType)` - Get presigned upload URL
2. `uploadProfilePictureToS3(presignedUrl, file)` - Upload to S3 using fetch
3. `updateProfilePictureUrl(profilePictureUrl)` - Update database
4. `getProfilePictureViewUrl()` - Get presigned view URL
5. `deleteProfilePicture()` - Delete profile picture
6. `uploadProfilePicture(file)` - Complete upload flow (all-in-one)

### UI Components (WorkerProfile.jsx)

#### Features Implemented:
1. **Profile Picture Display**:
   - Circular avatar (24x24 size)
   - Shows uploaded image or default User icon
   - Loading spinner during fetch/upload

2. **Upload Functionality**:
   - Hover overlay with Camera icon
   - Click to upload new picture
   - Hidden file input with proper accept types
   - Validates file type (JPEG, PNG, WebP only)
   - Validates file size (max 5MB)

3. **Delete Functionality**:
   - Trash icon appears on hover (if picture exists)
   - Confirmation dialog before deletion
   - Reverts to default User icon after deletion

4. **User Feedback**:
   - Loading indicators during operations
   - Success/error toast notifications
   - Smooth transitions and animations

#### State Management:
- `profilePictureUrl` - Current presigned URL for display
- `uploadingPicture` - Upload/delete operation in progress
- `loadingPicture` - Initial picture load state
- `fileInputRef` - Reference to hidden file input

## Security Features

1. **File Type Validation**:
   - Backend: Only accepts image/jpeg, image/jpg, image/png, image/webp
   - Frontend: Validates before upload

2. **File Size Limits**:
   - Maximum 5MB per image
   - Validated on frontend before upload

3. **Presigned URLs**:
   - Upload URLs expire in 5 minutes
   - View URLs expire in 1 hour
   - Private S3 bucket - no direct access

4. **Authentication**:
   - All endpoints require valid worker JWT token
   - Worker can only access their own profile picture

5. **Automatic Cleanup**:
   - Old profile pictures deleted when new one uploaded
   - Orphaned files prevented

## Usage Flow

### Upload Flow:
1. Worker clicks on profile picture
2. File picker opens
3. Worker selects image file
4. Frontend validates file type and size
5. Frontend requests presigned upload URL from backend
6. Frontend uploads file directly to S3
7. Frontend updates database with S3 URL
8. Frontend fetches presigned view URL
9. Profile picture displays immediately

### View Flow:
1. Component loads
2. Frontend requests presigned view URL
3. Backend generates temporary URL (1-hour expiration)
4. Image displays using presigned URL
5. URL automatically refreshes when expired

### Delete Flow:
1. Worker clicks delete button
2. Confirmation dialog appears
3. Frontend calls delete endpoint
4. Backend deletes from S3 and database
5. Frontend reverts to default icon

## Environment Variables Required

Ensure these are set in your `.env` file:
```env
AWS_REGION=your-region
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Testing Checklist

- [ ] Run database migration
- [ ] Verify AWS credentials are configured
- [ ] Test profile picture upload
- [ ] Test profile picture display
- [ ] Test profile picture deletion
- [ ] Test file type validation
- [ ] Test file size validation
- [ ] Test presigned URL expiration
- [ ] Test with different image formats (JPEG, PNG, WebP)
- [ ] Test error handling (network failures, S3 errors)
- [ ] Test on different browsers
- [ ] Test mobile responsiveness

## Files Modified/Created

### Backend:
- ✅ `backend/database_updates/add_profile_picture_to_providers.sql` (NEW)
- ✅ `backend/routes/worker_management/worker.js` (MODIFIED)

### Frontend:
- ✅ `frontend/src/app/services/worker.service.js` (MODIFIED)
- ✅ `frontend/src/app/features/worker/WorkerProfile.jsx` (MODIFIED)

## Notes

- Profile pictures are optional - workers can use default avatar
- Old profile pictures are automatically cleaned up when new ones are uploaded
- Presigned URLs provide secure, temporary access to private S3 objects
- The implementation follows the same pattern as existing S3 integrations (qualifications, documents)
- Images are stored in a separate S3 folder structure for organization

## Future Enhancements

Potential improvements for future iterations:
- Image cropping/resizing before upload
- Multiple profile picture sizes (thumbnail, medium, large)
- Image compression to reduce file sizes
- CDN integration for faster loading
- Profile picture in worker listings/search results
- Admin ability to moderate profile pictures
