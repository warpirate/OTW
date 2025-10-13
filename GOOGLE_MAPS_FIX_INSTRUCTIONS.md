# Google Maps API Fix Instructions

## Issue Fixed
The Google Maps API was failing to load due to:
1. **Hardcoded API key** in `googleMapsLoader.js` instead of using environment variables
2. **RefererNotAllowedMapError** - API key restrictions blocking localhost

## Changes Made

### 1. Updated `googleMapsLoader.js`
- Now reads API key from environment variable `VITE_GOOGLE_MAPS_API_KEY`
- Added validation to check if API key is configured
- Enhanced error messages for debugging

### 2. Environment Variable Configuration
Your `.env.development` file already has:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAH8081SHaUSXwnvIVOoEC4dCGhftZrfGg
```

## Critical: Update Google Cloud Console API Restrictions

The **RefererNotAllowedMapError** means your API key has website restrictions that don't allow `localhost:5173`. You need to update the API key restrictions in Google Cloud Console:

### Steps to Fix API Key Restrictions:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project

2. **Find Your API Key**
   - Look for the API key: `AIzaSyAH8081SHaUSXwnvIVOoEC4dCGhftZrfGg`
   - Click on it to edit

3. **Update Application Restrictions**
   - Under "Application restrictions", select **"HTTP referrers (web sites)"**
   - Add the following referrers:
     ```
     http://localhost:5173/*
     http://localhost:5001/*
     http://127.0.0.1:5173/*
     http://127.0.0.1:5001/*
     https://yourdomain.com/*  (for production)
     ```

4. **Update API Restrictions**
   - Under "API restrictions", ensure these APIs are enabled:
     - Maps JavaScript API
     - Geocoding API
     - Places API
     - Directions API

5. **Save Changes**
   - Click "Save" at the bottom
   - Wait 1-2 minutes for changes to propagate

## Alternative: Create New Unrestricted API Key (Development Only)

If you want to quickly test without restrictions (NOT recommended for production):

1. Create a new API key in Google Cloud Console
2. Leave "Application restrictions" as **"None"**
3. Under "API restrictions", select **"Restrict key"** and enable:
   - Maps JavaScript API
   - Geocoding API
   - Places API
   - Directions API
4. Copy the new API key
5. Update `.env.development`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_new_api_key_here
   ```

## Testing the Fix

1. **Restart your development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete` (Windows)
   - Clear cached images and files
   - Or use Incognito/Private mode

3. **Navigate to Driver Booking:**
   - Go to `http://localhost:5173/driver`
   - The map should now load without errors

4. **Check Console:**
   - Open DevTools (F12)
   - Console should show: "Connected to real-time server"
   - No "RefererNotAllowedMapError" errors

## Verification Checklist

- [ ] API key restrictions updated in Google Cloud Console
- [ ] Development server restarted
- [ ] Browser cache cleared
- [ ] Map loads on driver booking page
- [ ] No console errors related to Google Maps
- [ ] Location selection works
- [ ] Route drawing works between pickup and drop locations

## Troubleshooting

### If map still doesn't load:

1. **Check API key in console:**
   ```javascript
   console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
   ```

2. **Verify API is enabled:**
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Maps JavaScript API"
   - Ensure it's enabled

3. **Check billing:**
   - Google Maps requires a billing account
   - Go to: https://console.cloud.google.com/billing
   - Ensure billing is enabled for your project

4. **Check quota:**
   - Go to: https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/quotas
   - Ensure you haven't exceeded daily quota

## Production Deployment

When deploying to production:

1. **Create production environment file** (`.env.production`):
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_production_api_key
   ```

2. **Update API key restrictions** to include your production domain:
   ```
   https://yourdomain.com/*
   https://www.yourdomain.com/*
   ```

3. **Never commit API keys** to version control
   - Add `.env*` to `.gitignore`
   - Use environment variables in deployment platform

## Security Best Practices

1. **Use separate API keys** for development and production
2. **Always restrict API keys** by HTTP referrer in production
3. **Enable only required APIs** for each key
4. **Set up billing alerts** to monitor usage
5. **Rotate API keys** periodically
6. **Never expose API keys** in client-side code (Maps API is an exception as it's designed for browser use)

## Support

If you continue to experience issues:
- Check Google Maps Platform status: https://status.cloud.google.com/
- Review Google Maps documentation: https://developers.google.com/maps/documentation
- Check API usage in Cloud Console: https://console.cloud.google.com/apis/dashboard
