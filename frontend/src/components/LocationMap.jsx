import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

const LocationMap = ({ 
  pickupLocation, 
  dropLocation, 
  onLocationSelect, 
  darkMode = false,
  height = '400px' 
}) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [googleMaps, setGoogleMaps] = useState(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

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
      center: { lat: 17.2473, lng: 80.1514 }, // Khammam coordinates
      zoom: 12,
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

    // Add click listener for location selection
    mapInstance.addListener('click', (event) => {
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
          
          if (onLocationSelect) {
            onLocationSelect(locationData);
          }
        }
      });
    });
  }, [mapLoaded, googleMaps, onLocationSelect, map]);

  // Update map with locations and route
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
  }, [map, directionsService, directionsRenderer, pickupLocation, dropLocation]);

  return (
    <div 
      ref={mapRef} 
      style={{ height }} 
      className="rounded-lg overflow-hidden border border-gray-200"
    />
  );
};

export default LocationMap; 