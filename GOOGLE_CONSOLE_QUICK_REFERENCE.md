# Google Cloud Console - Quick Reference Card

## What to Select in Google OAuth Client ID Setup

### 🎯 Application Type
```
✅ Web application
```

### 📝 Name
```
OTW Customer Portal
(or any descriptive name you prefer)
```

### 🌐 Authorized JavaScript Origins

**For Development:**
```
http://localhost:5173
http://localhost:3000
http://localhost:5001
```

**For Production (add these when deploying):**
```
https://yourdomain.com
https://www.yourdomain.com
```

### 🔄 Authorized Redirect URIs

**For Development:**
```
http://localhost:5001/api/auth/google/callback
http://localhost:5173/auth/google/success
```

**For Production (add these when deploying):**
```
https://yourdomain.com/api/auth/google/callback
https://yourdomain.com/auth/google/success
```

---

## 📋 Step-by-Step Checklist

- [ ] 1. Create or select Google Cloud project
- [ ] 2. Enable Google+ API or Google Identity Services
- [ ] 3. Configure OAuth consent screen
  - [ ] Select "External" user type
  - [ ] Fill in app name: "OTW Platform"
  - [ ] Add support email
  - [ ] Add scopes: email, profile
  - [ ] Add test users (your email)
- [ ] 4. Create OAuth Client ID
  - [ ] Select "Web application"
  - [ ] Add JavaScript origins (see above)
  - [ ] Add redirect URIs (see above)
  - [ ] Click "Create"
- [ ] 5. Copy Client ID and Client Secret
- [ ] 6. Paste into backend/.env file
- [ ] 7. Generate SESSION_SECRET
- [ ] 8. Run database migration
- [ ] 9. Restart backend server
- [ ] 10. Test OAuth flow

---

## 🔑 Environment Variables to Update

```env
# In backend/.env

GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
SESSION_SECRET=generate_random_32_char_string_here
FRONTEND_URL=http://localhost:5173
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Quick Test

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open: `http://localhost:5173/login`
4. Click "Continue with Google"
5. Sign in with Google
6. You should be redirected back and logged in! ✅

---

## ⚠️ Common Mistakes to Avoid

❌ Don't include trailing slashes in URIs
❌ Don't mix http:// and https://
❌ Don't forget the port numbers in development
❌ Don't use localhost in production URLs
❌ Don't commit .env file to Git

---

## 📞 Support

If something isn't working:

1. Check backend console for errors
2. Check browser console for errors
3. Verify all URIs exactly match
4. Ensure backend is running on port 5001
5. Ensure frontend is running on port 5173
6. Double-check .env credentials

---

## 🎉 Success Indicators

✅ Clicking Google button redirects to Google
✅ Can sign in with Google account
✅ Redirected back to app after sign-in
✅ User appears logged in
✅ User info displayed in app
✅ User record created in database with google_id

---

**You're all set! Follow the main GOOGLE_OAUTH_SETUP_GUIDE.md for detailed instructions.**
