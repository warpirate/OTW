import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMap = ({ 
  pickupLocation, 
  dropLocation, 
  onLocationSelect, 
  darkMode = false,
  height = '400px' 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add pickup marker
    if (pickupLocation && pickupLocation.lat && pickupLocation.lon) {
      const pickupMarker = L.marker([pickupLocation.lat, pickupLocation.lon], {
        icon: L.divIcon({
          className: 'custom-marker pickup-marker',
          html: '<div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapInstanceRef.current);
      
      pickupMarker.bindPopup('<b>Pickup Location</b><br>' + pickupLocation.display_name);
      markersRef.current.push(pickupMarker);
    }

    // Add drop marker
    if (dropLocation && dropLocation.lat && dropLocation.lon) {
      const dropMarker = L.marker([dropLocation.lat, dropLocation.lon], {
        icon: L.divIcon({
          className: 'custom-marker drop-marker',
          html: '<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapInstanceRef.current);
      
      dropMarker.bindPopup('<b>Drop Location</b><br>' + dropLocation.display_name);
      markersRef.current.push(dropMarker);
    }

    // Fit bounds if both locations are set
    if (pickupLocation?.lat && dropLocation?.lat) {
      const bounds = L.latLngBounds([
        [pickupLocation.lat, pickupLocation.lon],
        [dropLocation.lat, dropLocation.lon]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
    }

    // Handle map clicks for location selection
    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      
      // Reverse geocode to get address
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(response => response.json())
        .then(data => {
          if (data.display_name) {
            const locationData = {
              display_name: data.display_name,
              lat: lat,
              lon: lng,
              place_id: Date.now()
            };
            
            if (onLocationSelect) {
              onLocationSelect(locationData);
            }
          }
        })
        .catch(error => {
          console.error('Error reverse geocoding:', error);
        });
    };

    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [pickupLocation, dropLocation, onLocationSelect]);

  return (
    <div 
      ref={mapRef} 
      style={{ height }} 
      className="rounded-lg overflow-hidden border border-gray-200"
    />
  );
};

export default LocationMap; 