# Category & Subcategory Image Upload System

Complete S3-based image upload system for categories and subcategories in the OTW platform.

## Overview

This system allows administrators to upload custom images for categories and subcategories, which are then displayed on the customer-facing landing page. Images are stored in AWS S3 for scalability and performance.

## Database Changes

### Migration Script
Run the following migration to add image support:
```bash
mysql -u your_user -p your_database < backend/database_updates/add_category_images.sql
```

### Schema Updates
- **service_categories**: Added `image_url` VARCHAR(512) field
- **subcategories**: Added `image_url` VARCHAR(512) field
- Added indexes for better query performance

## Backend Implementation

### S3 Presigned URL Endpoints

#### Category Image Upload
**POST** `/api/categories/categories/:categoryId/image/presign`
- Generates presigned URL for direct browser-to-S3 upload
- Validates file type (JPG, PNG, GIF, WebP)
- Returns `uploadUrl` and `fileUrl`

**GET** `/api/categories/categories/:categoryId/image/presign`
- Generates presigned URL to view category image
- 5-minute expiration for security

#### Subcategory Image Upload
**POST** `/api/categories/subcategories/:subcategoryId/image/presign`
- Generates presigned URL for subcategory image upload
- Same validation as category images

**GET** `/api/categories/subcategories/:subcategoryId/image/presign`
- Generates presigned URL to view subcategory image

### S3 Storage Structure
```
category_images/
  ├── {categoryId}/
  │   └── {timestamp}_{filename}

subcategory_images/
  ├── {categoryId}/
  │   └── {subcategoryId}/
  │       └── {timestamp}_{filename}
```

### Enhanced CRUD Operations
- **Create Category/Subcategory**: Supports `image_url` parameter
- **Update Category/Subcategory**: Supports `image_url` parameter
- **Delete Category/Subcategory**: Automatically deletes associated S3 images

## Frontend Implementation

### Admin Interface

#### CategoryManagement.jsx
**Features:**
- Image upload field in category add/edit modal
- Image preview before upload
- File validation (type and size)
- Progress indicators during upload

**Usage:**
1. Navigate to Admin → Category Management
2. Click "Add Category" or "Edit" on existing category
3. Click "Choose File" under "Category Image"
4. Select image (max 5MB, JPG/PNG/GIF/WebP)
5. Preview appears automatically
6. Click "Save" to upload and save

#### CategoryDetailsPage.jsx
**Features:**
- Image upload for subcategories
- Same validation and preview as categories
- Integrated with subcategory add/edit workflow

**Usage:**
1. Navigate to Admin → Categories → View Category
2. Click "Add Subcategory" or "Edit" on existing subcategory
3. Upload image using file input
4. Save to upload to S3

### Customer Landing Page

#### LandingPage.jsx
**Features:**
- Displays category images in category cards
- Displays subcategory images in service cards
- Falls back to icon system if no image uploaded
- Optimized image loading with caching

**Behavior:**
- If `image_url` exists: Displays uploaded S3 image
- If no `image_url`: Falls back to existing icon mapping system
- Smooth transitions and hover effects

## API Service Layer

### CategoryService Methods

```javascript
// Upload category image
uploadCategoryImage(categoryId, file)
  // Returns: S3 URL of uploaded image

// Upload subcategory image
uploadSubcategoryImage(subcategoryId, file)
  // Returns: S3 URL of uploaded image

// Get presigned URL to view category image
getCategoryImageUrl(categoryId)
  // Returns: Temporary URL with 5-min expiration

// Get presigned URL to view subcategory image
getSubcategoryImageUrl(subcategoryId)
  // Returns: Temporary URL with 5-min expiration
```

## File Validation

### Allowed File Types
- image/jpeg
- image/jpg
- image/png
- image/gif
- image/webp

### Size Limit
- Maximum: 5MB per image

### Security Features
- File type validation on both frontend and backend
- Sanitized S3 object keys (special characters removed)
- Presigned URLs with 5-minute expiration
- Admin-only upload permissions

## Usage Workflow

### Admin uploads image:
1. Admin navigates to Category Management
2. Selects category/subcategory to edit
3. Chooses image file from local system
4. Frontend validates file type and size
5. Frontend requests presigned URL from backend
6. Frontend uploads directly to S3 using presigned URL
7. Frontend saves S3 URL to database via update API
8. Success message displayed

### Customer views image:
1. Customer visits landing page
2. System fetches categories/subcategories from API (includes `image_url`)
3. If `image_url` exists: Display S3 image
4. If `image_url` is null: Display fallback icon
5. Images cached by browser for performance

## Error Handling

### Upload Failures
- **Network Error**: User notified, can retry
- **Invalid File Type**: Immediate validation error
- **File Too Large**: Immediate validation error
- **S3 Upload Failed**: Category/subcategory created but image not uploaded, can edit later to add image

### Fallback Behavior
- No image uploaded: System uses existing icon mapping
- Image load failed: Falls back to icon system
- Presigned URL expired: Regenerate URL on next request

## Testing

### Manual Testing Checklist
- [ ] Upload category image (JPG)
- [ ] Upload category image (PNG)
- [ ] Upload subcategory image
- [ ] Verify image displays on landing page
- [ ] Delete category with image (verify S3 cleanup)
- [ ] Delete subcategory with image (verify S3 cleanup)
- [ ] Try uploading invalid file type
- [ ] Try uploading file > 5MB
- [ ] Update existing category image
- [ ] Update existing subcategory image

### Environment Variables Required
```env
AWS_REGION=your-aws-region
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Best Practices

### Image Recommendations
- **Dimensions**: 512x512px or 1024x1024px (square format)
- **Format**: PNG with transparency for best results
- **File Size**: Keep under 500KB for optimal loading
- **Content**: Clear, recognizable icons or illustrations

### Performance Optimization
- Use WebP format for smaller file sizes
- Compress images before upload
- Consider CDN for faster delivery (CloudFront)

## Troubleshooting

### Image not uploading
1. Check AWS credentials in `.env`
2. Verify S3 bucket permissions
3. Check browser console for errors
4. Ensure file meets validation criteria

### Image not displaying
1. Verify `image_url` in database
2. Check S3 bucket CORS settings
3. Verify presigned URL generation
4. Check browser network tab for 403/404 errors

### S3 Access Denied
1. Verify IAM user has S3 permissions
2. Check bucket policy
3. Verify bucket name in environment variables

## Future Enhancements

- [ ] Image cropping/editing before upload
- [ ] Multiple image sizes (thumbnail, medium, large)
- [ ] Bulk image upload
- [ ] Image optimization pipeline
- [ ] CDN integration for faster delivery
- [ ] Image analytics (views, load times)

## Support

For issues or questions:
1. Check backend logs for S3 errors
2. Check frontend console for upload errors
3. Verify environment variables
4. Test S3 connectivity independently

---

**Last Updated**: 2025-10-03
**Version**: 1.0.0
