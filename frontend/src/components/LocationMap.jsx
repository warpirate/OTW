import React, { useEffect, useRef, useState } from 'react';
import { Navigation as NavigationIcon, AlertTriangle } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';
import { toast } from 'react-toastify';

const LocationMap = ({ 
  pickupLocation, 
  dropLocation, 
  onLocationSelect, 
  nearbyDrivers = [],
  darkMode = false,
  height = '100%'
}) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [googleMaps, setGoogleMaps] = useState(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [locating, setLocating] = useState(false);
  const [autoLocateDone, setAutoLocateDone] = useState(false);
  // 0 = next click sets pickup, 1 = next click sets drop
  const [selectionStep, setSelectionStep] = useState(0);

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then((maps) => {
        setGoogleMaps(maps);
        setMapLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !googleMaps || !mapRef.current || map) return;

    const mapInstance = new googleMaps.Map(mapRef.current, {
      // Start with a neutral world view; no city-specific fallback
      center: { lat: 0, lng: 0 },
      zoom: 2,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    const directionsServiceInstance = new googleMaps.DirectionsService();
    const directionsRendererInstance = new googleMaps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    directionsRendererInstance.setMap(mapInstance);

    setMap(mapInstance);
    setDirectionsService(directionsServiceInstance);
    setDirectionsRenderer(directionsRendererInstance);
  }, [mapLoaded, googleMaps, map]);

  // Add click listener for location selection (separate effect to avoid recreation)
  useEffect(() => {
    if (!map || !googleMaps || !onLocationSelect) return;

    const handleMapClick = (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      // Use Google Geocoding API for reverse geocoding
      const geocoder = new googleMaps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const locationData = {
            display_name: results[0].formatted_address,
            lat: lat,
            lon: lng,
            place_id: results[0].place_id || Date.now()
          };
          
          // Determine target based on current state
          let target;
          if (!pickupLocation) {
            target = 'pickup';
          } else if (!dropLocation) {
            target = 'drop';
          } else {
            // Both locations are set, allow overwriting drop location
            target = 'drop';
          }
          
          onLocationSelect(locationData, target);
        }
      });
    };

    map.addListener('click', handleMapClick);

    // Cleanup listener on unmount or when dependencies change
    return () => {
      googleMaps.event.clearListeners(map, 'click');
    };
  }, [map, googleMaps, onLocationSelect, pickupLocation, dropLocation]);

  // Auto-attempt to locate once when map is ready (prompts user for permission)
  useEffect(() => {
    if (!map || !googleMaps || autoLocateDone) return;
    // Attempt geolocation once to center map to real position
    if (navigator.geolocation) {
      setAutoLocateDone(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          map.setCenter({ lat, lng });
          map.setZoom(15);
        },
        (error) => {
          // If denied or failed, keep neutral world view
          // Only show error message if it's a permission denied error
          if (error.code === error.PERMISSION_DENIED) {
            toast.info(
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Location Access Required</div>
                  <div className="text-sm">Allow location access to automatically center the map on your location.</div>
                </div>
              </div>,
              { autoClose: 6000 }
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [map, googleMaps, autoLocateDone]);

  // Keep selection step in sync with provided props (for UI indicators if needed)
  useEffect(() => {
    if (!pickupLocation && !dropLocation) {
      setSelectionStep(0);
    } else if (pickupLocation && !dropLocation) {
      setSelectionStep(1);
    } else if (pickupLocation && dropLocation) {
      setSelectionStep(2);
    }
  }, [pickupLocation, dropLocation]);

  // Update map with locations, drivers and route
  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer) return;

    // Clear existing route
    directionsRenderer.setDirections({ routes: [] });

    // Add markers for pickup and drop locations
    const markers = [];

    if (pickupLocation && pickupLocation.lat && pickupLocation.lon) {
      const pickupMarker = new googleMaps.Marker({
        position: { lat: pickupLocation.lat, lng: pickupLocation.lon },
        map: map,
        title: 'Pickup Location',
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        label: {
          text: 'A',
          color: '#FFFFFF',
          fontWeight: 'bold',
        }
      });

      const pickupInfoWindow = new googleMaps.InfoWindow({
        content: `<div class="p-2"><strong>Pickup Location</strong><br>${pickupLocation.display_name}</div>`
      });

      pickupMarker.addListener('click', () => {
        pickupInfoWindow.open(map, pickupMarker);
      });

      markers.push(pickupMarker);
    }

    if (dropLocation && dropLocation.lat && dropLocation.lon) {
      const dropMarker = new googleMaps.Marker({
        position: { lat: dropLocation.lat, lng: dropLocation.lon },
        map: map,
        title: 'Drop Location',
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        label: {
          text: 'B',
          color: '#FFFFFF',
          fontWeight: 'bold',
        }
      });

      const dropInfoWindow = new googleMaps.InfoWindow({
        content: `<div class="p-2"><strong>Drop Location</strong><br>${dropLocation.display_name}</div>`
      });

      dropMarker.addListener('click', () => {
        dropInfoWindow.open(map, dropMarker);
      });

      markers.push(dropMarker);
    }

    // Nearby driver markers
    if (Array.isArray(nearbyDrivers) && nearbyDrivers.length > 0) {
      nearbyDrivers.forEach((driver, index) => {
        const lat = parseFloat(driver.lat || driver.latitude || driver.location?.lat);
        const lng = parseFloat(driver.lng || driver.longitude || driver.location?.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const driverMarker = new googleMaps.Marker({
            position: { lat, lng },
            map: map,
            title: driver.provider_name ? `Driver: ${driver.provider_name}` : 'Nearby driver',
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#10B981',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
            label: {
              text: 'D',
              color: '#FFFFFF',
              fontWeight: 'bold',
            }
          });

          if (driver.provider_name || driver.distance_km) {
            const info = new googleMaps.InfoWindow({
              content: `<div class="p-2"><strong>${driver.provider_name || 'Driver'}</strong>${driver.distance_km ? `<br>${driver.distance_km.toFixed ? driver.distance_km.toFixed(1) : driver.distance_km} km away` : ''}</div>`
            });
            driverMarker.addListener('click', () => info.open(map, driverMarker));
          }

          markers.push(driverMarker);
        }
      });
    }

    // Draw route if both locations are available
    if (pickupLocation?.lat && dropLocation?.lat) {
      const request = {
        origin: { lat: pickupLocation.lat, lng: pickupLocation.lon },
        destination: { lat: dropLocation.lat, lng: dropLocation.lon },
        travelMode: googleMaps.TravelMode.DRIVING,
        unitSystem: googleMaps.UnitSystem.METRIC,
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          
          // Fit map to show the entire route
          const bounds = new googleMaps.LatLngBounds();
          result.routes[0].legs.forEach(leg => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
          });
          map.fitBounds(bounds);
        } else {
          console.error('Directions request failed:', status);
        }
      });
    } else if (markers.length > 0) {
      // Fit map to show all markers
      const bounds = new googleMaps.LatLngBounds();
      markers.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
    }

    return () => {
      markers.forEach(marker => marker.setMap(null));
    };
  }, [map, directionsService, directionsRenderer, pickupLocation, dropLocation, nearbyDrivers]);

  const useMyLocation = () => {
    if (!navigator.geolocation || !googleMaps) {
      console.error('Geolocation is not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(15);
        }

        const geocoder = new googleMaps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const displayName = status === 'OK' && results && results[0]
            ? results[0].formatted_address
            : 'Current location';
          const placeId = status === 'OK' && results && results[0] ? (results[0].place_id || Date.now()) : Date.now();

          const locationData = {
            display_name: displayName,
            lat,
            lon: lng,
            place_id: placeId
          };

          if (onLocationSelect) {
            // Determine target based on current state, same logic as map clicks
            let target;
            if (!pickupLocation) {
              target = 'pickup';
            } else if (!dropLocation) {
              target = 'drop';
            } else {
              // Both locations are set, default to pickup (user's current location)
              target = 'pickup';
            }
            onLocationSelect(locationData, target);
          }
          setLocating(false);
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocating(false);
        
        // Show user-friendly error messages based on error code
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error(
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Location Access Denied</div>
                  <div className="text-sm">Please allow location access in your browser settings to use this feature.</div>
                </div>
              </div>,
              { autoClose: 8000 }
            );
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable. Please check your device settings.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out. Please try again.');
            break;
          default:
            toast.error('Unable to get your location. Please try again or enter your location manually.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative h-full">
      <div 
        ref={mapRef} 
        style={{ height }} 
        className="w-full h-full"
      />
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={useMyLocation}
          className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all hover:shadow-xl ${
            darkMode
              ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'
              : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
          }`}
          disabled={locating}
        >
          <div className="flex items-center space-x-2">
            <NavigationIcon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {locating ? 'Locating…' : 'Use My Location'}
            </span>
          </div>
        </button>
      </div>
      
      {/* Map Controls Overlay */}
      <div className="absolute bottom-4 left-4 z-10 space-y-2">
        <div className={`px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${
          darkMode ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-white text-gray-700 border border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Pickup</span>
          </div>
        </div>
        <div className={`px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${
          darkMode ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-white text-gray-700 border border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Drop</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMap; 