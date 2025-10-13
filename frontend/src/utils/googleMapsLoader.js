// Google Maps API Loader Utility
// Prevents multiple loading of Google Maps API

let googleMapsPromise = null;
let isGoogleMapsLoaded = false;

export const loadGoogleMaps = () => {
  // Return existing promise if already loading
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Return resolved promise if already loaded
  if (isGoogleMapsLoaded && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Check if script already exists
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    googleMapsPromise = new Promise((resolve, reject) => {
      existingScript.onload = () => {
        isGoogleMapsLoaded = true;
        resolve(window.google.maps);
      };
      existingScript.onerror = reject;
    });
    return googleMapsPromise;
  }

  // Create new script and promise
  googleMapsPromise = new Promise((resolve, reject) => {
    // Get API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      const error = new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
      console.error(error.message);
      reject(error);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGoogleMapsLoaded = true;
      resolve(window.google.maps);
    };
    script.onerror = () => {
      const error = new Error('Failed to load Google Maps API. Please check your API key and restrictions.');
      console.error(error.message);
      reject(error);
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export const isGoogleMapsReady = () => {
  return isGoogleMapsLoaded && window.google && window.google.maps;
};
