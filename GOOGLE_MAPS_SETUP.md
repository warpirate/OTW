# Google Maps API Setup Guide

## Overview
The OTW application now uses Google Maps Geocoding API for address validation and coordinate generation in the booking system.

## Setup Steps

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Geocoding API" for your project
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

### 2. Configure Environment Variables

#### Frontend (.env file in frontend folder)
```bash
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
```

#### Backend (.env file in backend folder)
```bash
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
```

### 3. API Key Restrictions (Recommended)
For security, restrict your API key to:
- **Application restrictions**: HTTP referrers (web sites)
- **Website restrictions**: Add your domain(s)
- **API restrictions**: Geocoding API only

### 4. Testing
1. Add an address in the booking flow
2. Check browser console for geocoding success messages
3. Verify coordinates are properly generated

## Fallback Behavior
- If no API key is configured, the system will use default coordinates for India (20.5937, 78.9629)
- If geocoding fails, it will also fall back to these default coordinates
- The system will log warnings when falling back to defaults

## Cost Considerations
- Google Maps Geocoding API has usage limits and costs
- Monitor usage in Google Cloud Console
- Consider implementing caching for frequently geocoded addresses

## Troubleshooting
- Check browser console for API errors
- Verify API key is correctly set in environment variables
- Ensure Geocoding API is enabled in Google Cloud Console
- Check API key restrictions if requests are failing
