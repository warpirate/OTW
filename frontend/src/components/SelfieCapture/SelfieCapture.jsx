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

  // LOCATION VERIFICATION DISABLED - Skip location verification and always allow selfie capture
  const verifyLocation = async () => {
    try {
      setLocationError(null);
      
      // Still get location for metadata but don't verify distance
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        console.log('[Location] Location captured for metadata (verification disabled):', {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: `${Math.round(location.accuracy)}m`
        });
      } catch (locationError) {
        // If location fails, use dummy coordinates
        console.log('[Location] Location unavailable, using dummy coordinates');
        setCurrentLocation({
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: Date.now(),
          source: 'dummy_location_disabled'
        });
      }

      // Always set location as verified since verification is disabled
      setLocationVerified(true);
      setDistance(0); // Set distance to 0 since verification is disabled
      
      console.log('[Location] Location verification disabled - selfie capture allowed');
      toast.success('Ready to capture selfie - location verification disabled', { autoClose: 3000 });
      
    } catch (error) {
      console.error('[Location] Setup error (verification disabled):', error);
      // Even if location setup fails, allow selfie capture
      setCurrentLocation({
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: Date.now(),
        source: 'fallback_location_disabled'
      });
      setLocationVerified(true);
      setDistance(0);
      setLocationError(null); // Clear any error since verification is disabled
      
      toast.success('Ready to capture selfie - location verification disabled', { autoClose: 3000 });
    }
  };

  // Capture selfie
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    // LOCATION VERIFICATION DISABLED - Skip location verification check
    // if (!locationVerified) {
    //   toast.error('Please verify your location first');
    //   return;
    // }
    
    // Always allow selfie capture since location verification is disabled
    if (!locationVerified) {
      console.log('[Location] Location not verified, but verification is disabled - proceeding with selfie capture');
      // Set dummy location if not available
      if (!currentLocation) {
        setCurrentLocation({
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: Date.now(),
          source: 'selfie_capture_fallback'
        });
      }
      setLocationVerified(true);
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

    // LOCATION VERIFICATION DISABLED - Skip location verification check
    // if (!locationVerified) {
    //   toast.error('Location not verified');
    //   return;
    // }
    
    // Always allow upload since location verification is disabled
    console.log('[Upload] Uploading selfie (location verification disabled)');
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
            <li>• Take a clear selfie for job completion verification</li>
            <li>• Your face will be compared with your profile picture</li>
            <li>• Location verification is disabled - you can take selfie from anywhere</li>
            <li>• Timestamp will be recorded for audit purposes</li>
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
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-600">
                Ready
              </span>
            </div>
          </div>
          
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Location verification disabled - selfie capture allowed
          </p>
          
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
                disabled={isCapturing || cameraError}
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

        {/* Info Message */}
        <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
          <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
            Location verification is disabled. You can take your selfie from anywhere.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelfieCapture;
