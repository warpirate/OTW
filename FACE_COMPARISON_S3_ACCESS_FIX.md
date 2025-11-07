# Face Comparison S3 Access Fix

## Issue Summary

**Error Message:**
```json
{
    "success": true,
    "message": "Selfie uploaded and verification completed",
    "verification": {
        "status": "failed",
        "locationVerified": true,
        "distance": 2970.38,
        "notes": "Could not access image from S3. Please try uploading again."
    }
}
```

**Root Cause:**
AWS Rekognition cannot access the profile picture from S3 because:
1. Missing `AWS_S3_BUCKET` environment variable
2. Possible AWS IAM permission issues for Rekognition to access the bucket

---

## ✅ Fixes Applied

### 1. Environment Variable Fix

**File:** `backend/.env`

**Added:**
```env
AWS_S3_BUCKET=files-and-image-storage-bucket
```

This ensures the face comparison service knows which bucket contains the profile pictures.

**Current Configuration:**
```env
# Main AWS Configuration (for profile pictures)
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=files-and-image-storage-bucket
AWS_S3_BUCKET=files-and-image-storage-bucket  ← ADDED

# Selfie Verification AWS Configuration (for selfies)
SELFIE_AWS_ACCESS_KEY_ID=YOUR_SELFIE_AWS_ACCESS_KEY_ID
SELFIE_AWS_SECRET_ACCESS_KEY=YOUR_SELFIE_AWS_SECRET_ACCESS_KEY
SELFIE_S3_BUCKET=worker-verification-images
```

---

### 2. Enhanced Logging

**File:** `backend/services/faceComparisonService.js`

**Added detailed logging to track:**
- Bucket names being used
- S3 keys for both images
- AWS credentials status
- Specific error details

**Console Output Example:**
```javascript
[Face Comparison] Starting face comparison: {
  selfieKey: 'selfie_verifications/4/1730196907000_selfie.jpg',
  selfieBucket: 'worker-verification-images',
  profileKey: 'provider_profile_pictures/4/1761742280247_TGCphoto.jpg',
  profileBucket: 'files-and-image-storage-bucket',
  threshold: 80,
  region: 'ap-south-1'
}
```

---

## 🔧 AWS IAM Permissions Required

### For Rekognition to Access S3 Buckets:

The AWS IAM user (`SELFIE_AWS_ACCESS_KEY_ID`) needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rekognition:CompareFaces",
                "rekognition:DetectFaces"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::worker-verification-images/*",
                "arn:aws:s3:::files-and-image-storage-bucket/*"
            ]
        }
    ]
}
```

### Steps to Add Permissions in AWS Console:

1. **Go to AWS IAM Console**
2. **Find the user:** `YOUR_SELFIE_AWS_ACCESS_KEY_ID`
3. **Add inline policy** with the JSON above
4. **Save the policy**

---

## 📊 How Face Comparison Works

### S3 Bucket Structure:

```
worker-verification-images/          ← Selfie bucket
└── selfie_verifications/
    └── {workerId}/
        └── {timestamp}_selfie.jpg

files-and-image-storage-bucket/      ← Profile picture bucket
└── provider_profile_pictures/
    └── {providerId}/
        └── {timestamp}_{filename}.jpg
```

### Comparison Flow:

```
1. Worker uploads selfie
   ↓
2. Selfie saved to: worker-verification-images/selfie_verifications/4/...
   ↓
3. System retrieves profile picture key from database
   ↓
4. Profile picture location: files-and-image-storage-bucket/provider_profile_pictures/4/...
   ↓
5. AWS Rekognition compareFaces() called with:
   - Source: selfie (worker-verification-images)
   - Target: profile picture (files-and-image-storage-bucket)
   ↓
6. Rekognition needs READ access to BOTH buckets
   ↓
7. Returns similarity score (0-100%)
```

---

## 🧪 Testing Guide

### Step 1: Restart Backend
```bash
cd backend
# Backend should auto-reload with nodemon
# If not, restart manually:
nodemon server.js
```

### Step 2: Check Console Logs

When a worker uploads a selfie, you should see:

```
[Profile Picture] Found URL for provider 4: https://files-and-image-storage-bucket.s3...
[Profile Picture] Extracted S3 key: provider_profile_pictures/4/1761742280247_TGCphoto.jpg

[Face Comparison] Starting face comparison: {
  selfieKey: 'selfie_verifications/4/...',
  selfieBucket: 'worker-verification-images',
  profileKey: 'provider_profile_pictures/4/1761742280247_TGCphoto.jpg',
  profileBucket: 'files-and-image-storage-bucket',
  threshold: 80,
  region: 'ap-south-1'
}

[Face Comparison] Rekognition params: {
  "SourceImage": {
    "S3Object": {
      "Bucket": "worker-verification-images",
      "Name": "selfie_verifications/4/..."
    }
  },
  "TargetImage": {
    "S3Object": {
      "Bucket": "files-and-image-storage-bucket",
      "Name": "provider_profile_pictures/4/1761742280247_TGCphoto.jpg"
    }
  },
  "SimilarityThreshold": 80
}
```

### Step 3: Test Selfie Upload

1. **Worker with profile picture** (ID: 4)
2. **Complete a job** and upload selfie
3. **Check response:**

**Success:**
```json
{
    "success": true,
    "verification": {
        "status": "verified",
        "locationVerified": true,
        "faceMatched": true,
        "confidence": 95.5
    }
}
```

**If Still Failing:**
```json
{
    "success": true,
    "verification": {
        "status": "failed",
        "notes": "Could not access image from S3..."
    }
}
```

Check console for detailed error:
```
[Face Comparison] S3 Access Error Details: {
  selfieBucket: 'worker-verification-images',
  profileBucket: 'files-and-image-storage-bucket',
  selfieKey: 'OK',
  profileKey: 'Issue with profile picture',  ← Problem here
  awsCredentials: {
    hasAccessKey: true,
    hasSecretKey: true,
    region: 'ap-south-1'
  }
}
```

---

## 🔍 Troubleshooting

### Issue 1: "Could not access image from S3"

**Possible Causes:**
1. ❌ IAM user doesn't have `s3:GetObject` permission
2. ❌ Bucket name mismatch
3. ❌ S3 key is incorrect
4. ❌ Image doesn't exist in S3

**Solutions:**
1. ✅ Add IAM policy (see above)
2. ✅ Check `.env` has correct bucket names
3. ✅ Check console logs for extracted S3 key
4. ✅ Verify image exists in S3 console

### Issue 2: "No matching faces found"

**Possible Causes:**
1. ❌ Images don't contain faces
2. ❌ Face similarity < 80%
3. ❌ Poor image quality

**Solutions:**
1. ✅ Ensure both images show clear faces
2. ✅ Lower threshold in `.env`: `SELFIE_FACE_MATCH_THRESHOLD=70.0`
3. ✅ Use better quality images

### Issue 3: "Invalid image format"

**Possible Causes:**
1. ❌ Image is not JPEG/PNG
2. ❌ Image is corrupted

**Solutions:**
1. ✅ Convert to JPEG/PNG
2. ✅ Re-upload the image

---

## 📝 Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `AWS_S3_BUCKET` | Profile pictures bucket | `files-and-image-storage-bucket` |
| `SELFIE_S3_BUCKET` | Selfie uploads bucket | `worker-verification-images` |
| `AWS_ACCESS_KEY_ID` | Main AWS credentials | `YOUR_AWS_ACCESS_KEY_ID` |
| `SELFIE_AWS_ACCESS_KEY_ID` | Rekognition credentials | `YOUR_SELFIE_AWS_ACCESS_KEY_ID` |
| `SELFIE_FACE_MATCH_THRESHOLD` | Minimum similarity % | `80.0` |
| `AWS_REGION` | AWS region | `ap-south-1` |

---

## ✨ Summary

### Changes Made:
1. ✅ Added `AWS_S3_BUCKET` to `.env`
2. ✅ Enhanced logging in `faceComparisonService.js`
3. ✅ Better error messages with details

### Next Steps:
1. **Restart backend** (should auto-reload)
2. **Add IAM permissions** in AWS Console
3. **Test selfie upload** with a worker who has a profile picture
4. **Check console logs** for detailed debugging info

### AWS IAM Action Required:
⚠️ **IMPORTANT:** Add the IAM policy to user `YOUR_SELFIE_AWS_ACCESS_KEY_ID` to allow Rekognition to access both S3 buckets.

---

## 🚀 Status

- ✅ Environment variables fixed
- ✅ Logging enhanced
- ⏳ AWS IAM permissions need to be added (manual step in AWS Console)
- ⏳ Testing required after IAM permissions are added

Once IAM permissions are added, face comparison should work! 🎉
