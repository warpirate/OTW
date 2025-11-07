import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  X, 
  RotateCcw,
  Upload,
  Loader
} from 'lucide-react';
import { isDarkMode } from '../../app/utils/themeUtils';
import { toast } from 'react-toastify';

const SelfieCapture = ({ 
  onCapture, 
  onClose, 
  isOpen, 
  customerLocation, 
  maxDistance = 400,
  loading = false 
}) => {
  const [darkMode] = useState(isDarkMode());
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [distance, setDistance] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Calculate distance between two GPS coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Get current location using browser geolocation with Google Maps fallback
  const getCurrentLocation = async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      // Try to get high-accuracy location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            source: 'browser_geolocation'
          };
          
          console.log('[Location] Browser geolocation success:', {
            lat: location.latitude,
            lng: location.longitude,
            accuracy: `${Math.round(location.accuracy)}m`
          });
          
          // Warn if accuracy is poor (>50m)
          if (location.accuracy > 50) {
            toast.warning(`Location accuracy: ${Math.round(location.accuracy)}m. For best results, ensure GPS is enabled.`, {
              autoClose: 3000
            });
          }
          
          resolve(location);
        },
        (error) => {
          console.error('[Location] Browser geolocation error:', error);
          let message = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location permissions in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable. Please check if GPS/location services are enabled.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out. Please try again.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true, // Request GPS-level accuracy
          timeout: 15000, // Increased timeout for better accuracy
          maximumAge: 0 // Don't use cached position
        }
      );
    });
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      setCameraError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for selfie
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      let message = 'Unable to access camera';
      
      if (error.name === 'NotAllowedError') {
        message = 'Camera access denied. Please allow camera permissions.';
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        message = 'Camera not supported in this browser.';
      }
      
      setCameraError(message);
      toast.error(message);
    }
  };

  // Verify location is within acceptable range
  const verifyLocation = async () => {
    try {
      setLocationError(null);
      toast.info('Getting your current location...', { autoClose: 2000 });
      
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      if (customerLocation && customerLocation.latitude && customerLocation.longitude) {
        const dist = calculateDistance(
          location.latitude,
          location.longitude,
          customerLocation.latitude,
          customerLocation.longitude
        );

        setDistance(Math.round(dist));
        
        console.log('[Location Verification]', {
          workerLocation: { lat: location.latitude, lng: location.longitude },
          customerLocation: { lat: customerLocation.latitude, lng: customerLocation.longitude },
          distance: `${Math.round(dist)}m`,
          maxDistance: `${maxDistance}m`,
          accuracy: `${Math.round(location.accuracy)}m`,
          withinRange: dist <= maxDistance
        });
        
        if (dist <= maxDistance) {
          setLocationVerified(true);
          const accuracyWarning = location.accuracy > 50 ? ' (Low GPS accuracy - ensure location services are enabled)' : '';
          toast.success(
            `✓ Location verified: ${Math.round(dist)}m from customer${accuracyWarning}`,
            { autoClose: 4000 }
          );
        } else {
          setLocationVerified(false);
          toast.error(
            `✗ You are too far from customer location!\n\nYour distance: ${Math.round(dist)}m\nMaximum allowed: ${maxDistance}m\n\nPlease move closer to the customer location.`,
            { autoClose: 6000 }
          );
        }
      } else {
        // If no customer location provided, assume location is valid
        setLocationVerified(true);
        console.log('[Location] No customer location to verify against, accepting current location');
        toast.success('Location captured successfully');
      }
    } catch (error) {
      console.error('[Location Verification Error]', error);
      setLocationError(error.message);
      toast.error(
        `Location Error: ${error.message}\n\nPlease ensure:\n• Location permissions are enabled\n• GPS is turned on\n• You are not in airplane mode`,
        { autoClose: 8000 }
      );
    }
  };

  // Capture selfie
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    if (!locationVerified) {
      toast.error('Please verify your location first');
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          
          // Create file object for upload
          const file = new File([blob], `selfie_${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });

          // Store capture data
          const captureData = {
            file,
            imageUrl,
            location: currentLocation,
            timestamp: new Date().toISOString(),
            distance
          };

          setCapturedImage(captureData);
          toast.success('Selfie captured successfully!');
        } else {
          toast.error('Failed to capture selfie');
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture selfie');
      setIsCapturing(false);
    }
  };

  // Retake selfie
  const retakeSelfie = () => {
    setCapturedImage(null);
    if (capturedImage && capturedImage.imageUrl) {
      URL.revokeObjectURL(capturedImage.imageUrl);
    }
  };

  // Upload selfie
  const uploadSelfie = () => {
    if (!capturedImage) {
      toast.error('No selfie captured');
      return;
    }

    if (!locationVerified) {
      toast.error('Location not verified');
      return;
    }

    onCapture(capturedImage);
  };

  // Initialize camera and location when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
      verifyLocation();
    }

    return () => {
      // Cleanup camera stream when modal closes
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Cleanup captured image URL
      if (capturedImage && capturedImage.imageUrl) {
        URL.revokeObjectURL(capturedImage.imageUrl);
      }
    };
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (capturedImage && capturedImage.imageUrl) {
        URL.revokeObjectURL(capturedImage.imageUrl);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Job Completion Selfie
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Instructions */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
            Verification Requirements:
          </h4>
          <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            <li>• Take a clear selfie at the customer location</li>
            <li>• Ensure you are within {maxDistance}m of the customer address</li>
            <li>• Your face will be compared with your profile picture</li>
            <li>• Location and timestamp will be recorded</li>
          </ul>
        </div>

        {/* Location Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className={`w-5 h-5 ${locationVerified ? 'text-green-600' : 'text-orange-600'}`} />
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Location Status
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {locationVerified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <span className={`text-sm ${
                locationVerified ? 'text-green-600' : 'text-orange-600'
              }`}>
                {locationVerified ? 'Verified' : 'Checking...'}
              </span>
            </div>
          </div>
          
          {distance !== null && (
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Distance from customer: {distance}m (max {maxDistance}m)
            </p>
          )}
          
          {locationError && (
            <p className="text-sm text-red-600 mt-1">{locationError}</p>
          )}
        </div>

        {/* Camera Section */}
        <div className="mb-6">
          {!capturedImage ? (
            <div className="relative">
              {cameraError ? (
                <div className={`aspect-video rounded-lg border-2 border-dashed flex items-center justify-center ${
                  darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                }`}>
                  <div className="text-center">
                    <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {cameraError}
                    </p>
                    <button
                      onClick={initializeCamera}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video rounded-lg bg-black"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              <img
                src={capturedImage.imageUrl}
                alt="Captured selfie"
                className="w-full aspect-video rounded-lg object-cover"
              />
              <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                ✓ Captured
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {!capturedImage ? (
            <>
              <button
                onClick={captureSelfie}
                disabled={!locationVerified || isCapturing || cameraError}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isCapturing ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <span>{isCapturing ? 'Capturing...' : 'Capture Selfie'}</span>
              </button>
              <button
                onClick={onClose}
                className={`px-6 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={uploadSelfie}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span>{loading ? 'Uploading...' : 'Upload & Verify'}</span>
              </button>
              <button
                onClick={retakeSelfie}
                disabled={loading}
                className={`px-6 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } flex items-center space-x-2`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>
            </>
          )}
        </div>

        {/* Status Messages */}
        {!locationVerified && (
          <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-orange-900 border-orange-700' : 'bg-orange-50 border-orange-200'} border`}>
            <p className={`text-sm ${darkMode ? 'text-orange-200' : 'text-orange-800'}`}>
              Please ensure you are at the customer location before taking the selfie.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfieCapture;
