# Google OAuth Integration Setup Guide

## Overview
This guide walks you through setting up Google OAuth authentication for the OTW application. Users will be able to sign in with their Google accounts.

---

## 1. Google Cloud Console Configuration

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one

### Step 2: Enable Google+ API
1. Navigate to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: OTW Platform
   - **User support email**: Your support email
   - **Developer contact email**: Your email
4. Add scopes:
   - `./auth/userinfo.email`
   - `./auth/userinfo.profile`
5. Add test users (for development)
6. Save and continue

### Step 4: Create OAuth Client ID

Based on your screenshots, configure as follows:

**Application type**: `Web application`

**Name**: `OTW Customer Portal` (or any descriptive name)

**Authorized JavaScript origins**:
```
http://localhost:5173
http://localhost:3000
http://localhost:5001
https://yourdomain.com (for production)
```

**Authorized redirect URIs**:
```
http://localhost:5001/api/auth/google/callback
http://localhost:5173/auth/google/success
https://yourdomain.com/api/auth/google/callback (for production)
https://yourdomain.com/auth/google/success (for production)
```

Click **Create** and save your:
- **Client ID**: `your_client_id_here.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxx`

---

## 2. Backend Configuration

### Step 1: Update Environment Variables

Open `backend/.env` and update these values:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
SESSION_SECRET=generate_a_random_secret_here_minimum_32_characters

# Frontend URL (already exists)
FRONTEND_URL=http://localhost:5173
```

**To generate SESSION_SECRET**, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Run Database Migration

Execute the SQL migration to add Google OAuth support:

```bash
mysql -u root -p omw_db < backend/database_updates/add_google_oauth_support.sql
```

Or manually run the SQL in your database client:
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL UNIQUE COMMENT 'Google OAuth unique identifier',
ADD INDEX IF NOT EXISTS idx_google_id (google_id);
```

### Step 3: Restart Backend Server

```bash
cd backend
npm install  # Install new dependencies (passport, passport-google-oauth20, express-session)
npm run dev  # or npm start
```

---

## 3. Frontend Configuration

### Step 1: Update API Base URL (if needed)

Check `frontend/src/app/config.js` to ensure API_BASE_URL is correct:

```javascript
export const API_BASE_URL = 'http://localhost:5001';
```

### Step 2: Restart Frontend Server

```bash
cd frontend
npm run dev  # or npm start
```

---

## 4. Testing the Integration

### Step 1: Test Backend OAuth Endpoint

Open browser and navigate to:
```
http://localhost:5001/api/auth/google
```

You should be redirected to Google's sign-in page.

### Step 2: Test Full Login Flow

1. Navigate to: `http://localhost:5173/login`
2. Click the **"Continue with Google"** button
3. You'll be redirected to Google's sign-in page
4. Sign in with your Google account
5. Grant permissions when prompted
6. You should be redirected back to your app and automatically logged in
7. Check that you're redirected to the homepage (`/`)

### Step 3: Verify User Creation

Check the database to confirm:
```sql
SELECT id, name, email, google_id, email_verified, created_at 
FROM users 
WHERE google_id IS NOT NULL;
```

You should see your Google account user with:
- `google_id` populated
- `email_verified` = 1
- `customer` role assigned

---

## 5. OAuth Flow Explanation

### Backend Flow:
1. User clicks "Continue with Google" → Redirects to `/api/auth/google`
2. Backend redirects to Google OAuth page
3. User signs in and grants permissions
4. Google redirects to `/api/auth/google/callback`
5. Backend validates OAuth response
6. Backend creates/updates user in database
7. Backend generates JWT token
8. Backend redirects to frontend: `/auth/google/success?token=JWT_TOKEN`

### Frontend Flow:
1. `GoogleCallback.jsx` component receives the token
2. Token is decoded and stored in localStorage
3. User info is extracted and stored
4. User is redirected to homepage
5. User is now logged in

---

## 6. File Structure

### Backend Files Created/Modified:
```
backend/
├── config/
│   └── passport.js                          # NEW: Passport Google strategy
├── routes/
│   └── authentication/
│       ├── auth.js                          # Modified: Existing routes
│       └── oauth.js                         # NEW: OAuth routes
├── server.js                                # Modified: Added passport middleware
├── .env                                     # Modified: Added Google OAuth credentials
├── database_updates/
│   └── add_google_oauth_support.sql        # NEW: Database migration
└── package.json                             # Modified: Added new dependencies
```

### Frontend Files Created/Modified:
```
frontend/
├── src/
│   ├── App.jsx                              # Modified: Added OAuth callback route
│   └── app/
│       ├── auth/
│       │   ├── CustomerLogin.jsx           # Modified: Added Google button handler
│       │   └── GoogleCallback.jsx          # NEW: OAuth callback handler
│       └── services/
│           └── auth.service.js             # Modified: Added OAuth methods
```

---

## 7. Production Deployment

### Step 1: Update Google Cloud Console

Add your production domains to:
- **Authorized JavaScript origins**: `https://yourdomain.com`
- **Authorized redirect URIs**: 
  - `https://yourdomain.com/api/auth/google/callback`
  - `https://yourdomain.com/auth/google/success`

### Step 2: Update Environment Variables

In production `.env`:
```env
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
SESSION_SECRET=use_a_different_secret_in_production
NODE_ENV=production
```

### Step 3: Enable HTTPS

Ensure your server is running with HTTPS in production. OAuth requires secure connections.

---

## 8. Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different credentials** for development and production
3. **Rotate SESSION_SECRET** regularly
4. **Enable rate limiting** on OAuth endpoints
5. **Monitor OAuth usage** for suspicious activity
6. **Keep dependencies updated**: `npm audit fix`

---

## 9. Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution**: Ensure the redirect URI in Google Console exactly matches your backend callback URL.

### Issue: "Invalid client" error
**Solution**: Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### Issue: "Session secret not set"
**Solution**: Generate a secure `SESSION_SECRET` using crypto.randomBytes(32)

### Issue: User not created in database
**Solution**: Check backend logs for database errors. Ensure migration was run.

### Issue: Token not received on frontend
**Solution**: Check browser console for errors. Verify `FRONTEND_URL` in backend `.env`

### Issue: OAuth callback URL not working
**Solution**: Verify your backend server is running on the port specified in `GOOGLE_CALLBACK_URL`

---

## 10. Additional Features (Optional)

### Add Google OAuth to Worker/Admin Login

You can extend OAuth to other user types by:

1. Creating separate OAuth routes for each role:
   ```javascript
   router.get('/worker/google', ...)
   router.get('/admin/google', ...)
   ```

2. Modifying the callback handler to assign appropriate roles

3. Adding Google buttons to `WorkerLogin.jsx` and `AdminLogin.jsx`

---

## Support

For issues or questions:
- Check backend console for error logs
- Check browser console for frontend errors
- Review Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
- Check Passport.js documentation: http://www.passportjs.org/

---

## Summary

✅ Backend OAuth integration completed
✅ Frontend Google login button added
✅ Callback handler created
✅ User auto-creation/login implemented
✅ Database schema updated
✅ Security best practices applied

**Your OAuth integration is ready for testing!**
