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
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDUeBZjHSO9yfR0PiE05P39w7TXFEvGCno&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGoogleMapsLoaded = true;
      resolve(window.google.maps);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      reject(new Error('Failed to load Google Maps API'));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export const isGoogleMapsReady = () => {
  return isGoogleMapsLoaded && window.google && window.google.maps;
};
