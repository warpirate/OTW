const express = require('express');
const router = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const faceComparisonService = require('../../services/faceComparisonService');

// Configure AWS S3 with separate selfie verification credentials
const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.SELFIE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SELFIE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
});

// Configure multer for memory storage (we'll upload directly to S3)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * POST /api/worker-management/selfie-verification/upload
 * Upload selfie for job completion verification
 */
router.post('/upload', verifyToken, upload.single('selfie'), async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        const { 
            bookingId, 
            latitude, 
            longitude, 
            timestamp 
        } = req.body;

        // Validate required parameters
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token. Please login as a worker.'
            });
        }

        // Validate required fields
        if (!bookingId || !latitude || !longitude || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: bookingId, latitude, longitude, and selfie image'
            });
        }

        // Validate coordinates
        const selfieLatitude = parseFloat(latitude);
        const selfieLongitude = parseFloat(longitude);
        
        if (isNaN(selfieLatitude) || isNaN(selfieLongitude)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid GPS coordinates'
            });
        }

        connection = await pool.getConnection();

        // Verify booking belongs to worker and is in progress
        const [bookingRows] = await connection.execute(`
            SELECT 
                b.*, 
                u.name as customer_name, 
                u.phone_number as customer_phone,
                p.id as provider_id,
                CASE 
                    WHEN b.booking_type = 'ride' THEN rb.drop_lat
                    ELSE ca.location_lat 
                END as customer_latitude,
                CASE 
                    WHEN b.booking_type = 'ride' THEN rb.drop_lon
                    ELSE ca.location_lng 
                END as customer_longitude,
                CASE 
                    WHEN b.booking_type = 'ride' THEN rb.drop_address
                    ELSE COALESCE(sb.address, ca.address, b.address)
                END as customer_address
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN customers c ON b.customer_id = c.id
            LEFT JOIN providers p ON b.provider_id = p.id
            LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
            LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
            LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default = 1 AND b.booking_type = 'service'
            WHERE b.id = ? AND b.provider_id = (SELECT id FROM providers WHERE user_id = ?) AND b.service_status = 'in_progress'
        `, [bookingId, userId]);

        if (bookingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not in progress. Please ensure the booking exists and is currently in progress.'
            });
        }

        const booking = bookingRows[0];
        const workerId = booking.provider_id;

        console.log('Booking found for selfie verification:', {
            bookingId,
            bookingType: booking.booking_type,
            status: booking.service_status,
            selfieRequired: booking.selfie_verification_required,
            verificationType: booking.booking_type === 'ride' ? 'DROP_LOCATION' : 'SERVICE_LOCATION',
            customerLocation: {
                latitude: booking.customer_latitude,
                longitude: booking.customer_longitude,
                address: booking.customer_address
            }
        });

        // Validate customer location data
        if (!booking.customer_latitude || !booking.customer_longitude) {
            return res.status(400).json({
                success: false,
                message: 'Customer location not available for this booking. Cannot verify worker location.',
                debug: {
                    bookingType: booking.booking_type,
                    hasLatitude: !!booking.customer_latitude,
                    hasLongitude: !!booking.customer_longitude
                }
            });
        }

        // Upload selfie to S3 first
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No selfie image provided'
            });
        }

        // Check if selfie already exists for this booking
        const [existingSelfie] = await connection.execute(
            'SELECT id FROM job_completion_selfies WHERE booking_id = ?',
            [bookingId]
        );

        if (existingSelfie.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Selfie already uploaded for this booking'
            });
        }

        // Verify worker is at customer location
        const maxDistance = parseInt(process.env.SELFIE_MAX_DISTANCE_METERS || '400');
        const locationVerification = await faceComparisonService.verifyLocation(
            selfieLatitude,
            selfieLongitude,
            booking.customer_latitude,
            booking.customer_longitude,
            maxDistance
        );

        if (!locationVerification.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to verify location',
                error: locationVerification.error
            });
        }

        if (!locationVerification.withinRange) {
            // Log audit trail for location verification failure
            await faceComparisonService.logAuditTrail({
                bookingId,
                workerId,
                action: 'location_verification_failed',
                details: {
                    distance: locationVerification.distance,
                    maxDistance: maxDistance,
                    selfieCoords: { latitude: selfieLatitude, longitude: selfieLongitude },
                    customerCoords: { latitude: booking.customer_latitude, longitude: booking.customer_longitude }
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(400).json({
                success: false,
                message: locationVerification.message,
                locationVerification: {
                    withinRange: false,
                    distance: locationVerification.distance,
                    maxDistance: maxDistance
                }
            });
        }

        // Generate unique S3 key for selfie
        const timestamp_str = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
        const s3Key = `selfies/${workerId}/${bookingId}/${timestamp_str}.${fileExtension}`;

        // Upload selfie to S3
        const uploadParams = {
            Bucket: process.env.SELFIE_S3_BUCKET || 'worker-verification-images',
            Key: s3Key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            Metadata: {
                workerId: workerId.toString(),
                bookingId: bookingId.toString(),
                capturedAt: timestamp || new Date().toISOString(),
                latitude: selfieLatitude.toString(),
                longitude: selfieLongitude.toString()
            }
        };

        const s3Result = await s3.upload(uploadParams).promise();
        console.log('Selfie uploaded to S3:', s3Result.Location);

        // Get worker's profile picture for face comparison
        console.log(`[Selfie Verification] Checking profile picture for worker ID: ${workerId}`);
        const profilePictureData = await faceComparisonService.getWorkerProfilePictureData(workerId);
        
        if (!profilePictureData || !profilePictureData.key) {
            console.log(`[Selfie Verification] No profile picture found for worker ID: ${workerId}`);
            return res.status(400).json({
                success: false,
                message: 'No profile picture found. Please upload a profile picture from your Worker Profile page before completing the job.',
                requiresProfilePicture: true,
                workerId: workerId
            });
        }
        
        console.log(`[Selfie Verification] Profile picture found for worker ID: ${workerId}`, {
            key: profilePictureData.key,
            url: profilePictureData.url
        });

        // Perform face comparison
        const faceComparison = await faceComparisonService.compareFaces(s3Key, profilePictureData.key);
        
        let verificationStatus = 'pending';
        let verificationNotes = '';

        if (!faceComparison.success) {
            verificationStatus = 'failed';
            verificationNotes = faceComparison.error || 'Face comparison failed';
        } else if (faceComparison.matched) {
            verificationStatus = 'verified';
            verificationNotes = `Face match confirmed with ${faceComparison.confidence.toFixed(2)}% confidence`;
        } else {
            verificationStatus = 'failed';
            verificationNotes = `Face match failed. Confidence: ${faceComparison.confidence.toFixed(2)}%, Required: ${faceComparison.threshold}%`;
        }

        // Save verification record
        const verificationData = {
            bookingId,
            workerId,
            selfieS3Url: s3Result.Location,
            profilePictureS3Url: profilePictureData.url,
            selfieLatitude,
            selfieLongitude,
            customerLatitude: booking.customer_latitude,
            customerLongitude: booking.customer_longitude,
            distanceMeters: locationVerification.distance,
            locationVerified: locationVerification.withinRange,
            faceMatchConfidence: faceComparison.confidence || 0,
            faceComparisonSuccessful: faceComparison.success && faceComparison.matched,
            rekognitionResponse: faceComparison.rekognitionResponse || null,
            verificationStatus,
            verificationNotes
        };

        const saveResult = await faceComparisonService.saveSelfieVerification(verificationData);

        if (!saveResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save verification data',
                error: saveResult.error
            });
        }

        // Log audit trail
        await faceComparisonService.logAuditTrail({
            bookingId,
            workerId,
            action: 'selfie_uploaded',
            details: {
                verificationStatus,
                locationVerified: locationVerification.withinRange,
                faceMatched: faceComparison.matched,
                confidence: faceComparison.confidence,
                distance: locationVerification.distance
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // After successful verification, update booking status to completed
        if (verificationStatus === 'verified') {
            await connection.execute(
                'UPDATE bookings SET service_status = "completed", selfie_verification_status = ?, updated_at = NOW() WHERE id = ?',
                [verificationStatus, bookingId]
            );
            
            // Emit status update through socket if needed
            // Add your socket emission code here if required
        }

        res.json({
            success: true,
            message: 'Selfie uploaded and verification completed',
            verification: {
                status: verificationStatus,
                locationVerified: locationVerification.withinRange,
                distance: locationVerification.distance,
                faceMatched: faceComparison.matched,
                confidence: faceComparison.confidence,
                notes: verificationNotes
            }
        });

    } catch (error) {
        console.error('Selfie upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload selfie',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

/**
 * GET /api/worker-management/selfie-verification/status/:bookingId
 * Get selfie verification status for a booking
 */
router.get('/status/:bookingId', verifyToken, async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        // Validate required parameters
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token. Please login as a worker.'
            });
        }

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        connection = await pool.getConnection();

        // Get verification status
        const [rows] = await connection.execute(`
            SELECT jcs.*, b.service_status, b.selfie_verification_required, b.selfie_verification_status, b.booking_type
            FROM job_completion_selfies jcs
            RIGHT JOIN bookings b ON jcs.booking_id = b.id
            WHERE b.id = ? AND b.provider_id = (SELECT id FROM providers WHERE user_id = ?)
        `, [bookingId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = rows[0];
        
        res.json({
            success: true,
            verification: {
                required: booking.selfie_verification_required,
                status: booking.selfie_verification_status,
                uploaded: !!booking.selfie_s3_url,
                verificationDetails: booking.selfie_s3_url ? {
                    locationVerified: booking.location_verified,
                    distance: booking.distance_meters,
                    faceMatched: booking.face_comparison_successful,
                    confidence: booking.face_match_confidence,
                    verificationStatus: booking.verification_status,
                    notes: booking.verification_notes,
                    capturedAt: booking.captured_at,
                    verifiedAt: booking.verified_at
                } : null
            }
        });

    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification status',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

/**
 * GET /api/worker-management/selfie-verification/requirements/:bookingId
 * Get selfie verification requirements for a booking
 */
router.get('/requirements/:bookingId', verifyToken, async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        // Validate required parameters
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token. Please login as a worker.'
            });
        }

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        connection = await pool.getConnection();

        // Get booking details and customer location (different logic for ride vs service bookings)
        const [rows] = await connection.execute(`
            SELECT 
                b.id, 
                b.service_status, 
                b.selfie_verification_required,
                b.booking_type,
                b.address as booking_address,
                u.name as customer_name,
                p.profile_picture_url, 
                p.id as provider_id,
                -- For ride bookings, use pickup location
                CASE 
                    WHEN b.booking_type = 'ride' THEN rb.pickup_lat
                    ELSE ca.location_lat 
                END as customer_latitude,
                CASE 
                    WHEN b.booking_type = 'ride' THEN rb.pickup_lon
                    ELSE ca.location_lng 
                END as customer_longitude,
                CASE 
                    WHEN b.booking_type = 'ride' THEN rb.pickup_address
                    ELSE COALESCE(sb.address, ca.address, b.address)
                END as customer_address
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN customers c ON b.customer_id = c.id
            LEFT JOIN providers p ON b.provider_id = p.id
            LEFT JOIN ride_bookings rb ON b.id = rb.booking_id AND b.booking_type = 'ride'
            LEFT JOIN service_bookings sb ON b.id = sb.booking_id AND b.booking_type = 'service'
            LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default = 1 AND b.booking_type = 'service'
            WHERE b.id = ? AND b.provider_id = (SELECT id FROM providers WHERE user_id = ?)
        `, [bookingId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = rows[0];

        // Allow selfie verification during in_progress status
        if (booking.service_status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Selfie verification is only available during service'
            });
        }

        // Check if profile picture exists
        const hasProfilePicture = !!booking.profile_picture_url;

        res.json({
            success: true,
            requirements: {
                selfieRequired: booking.selfie_verification_required,
                jobCompleted: ['completed', 'in_progress'].includes(booking.service_status),
                hasProfilePicture,
                customerLocation: {
                    latitude: booking.customer_latitude,
                    longitude: booking.customer_longitude,
                    address: booking.customer_address
                },
                maxDistance: parseInt(process.env.SELFIE_MAX_DISTANCE_METERS || '400'),
                faceMatchThreshold: parseFloat(process.env.SELFIE_FACE_MATCH_THRESHOLD || '80.0'),
                timeoutHours: parseInt(process.env.SELFIE_VERIFICATION_TIMEOUT_HOURS || '24')
            }
        });

    } catch (error) {
        console.error('Get verification requirements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification requirements',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

/**
 * POST /api/worker-management/selfie-verification/presign
 * Generate presigned URL for selfie upload (alternative method)
 */
router.post('/presign', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId, fileType } = req.body;

        // Validate required parameters
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token. Please login as a worker.'
            });
        }

        if (!bookingId || !fileType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: bookingId and fileType'
            });
        }

        // Get provider ID for this user
        const [providerResult] = await pool.query(
            'SELECT id FROM providers WHERE user_id = ?',
            [userId]
        );

        if (providerResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found for this user'
            });
        }

        const workerId = providerResult[0].id;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Only JPEG and PNG images are allowed.'
            });
        }

        // Generate unique S3 key
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = fileType.split('/')[1];
        const s3Key = `selfies/${workerId}/${bookingId}/${timestamp}.${extension}`;

        // Generate presigned URL
        const presignedUrl = s3.getSignedUrl('putObject', {
            Bucket: process.env.SELFIE_S3_BUCKET || 'worker-verification-images',
            Key: s3Key,
            ContentType: fileType,
            Expires: 300, // 5 minutes
            Metadata: {
                workerId: workerId.toString(),
                bookingId: bookingId.toString()
            }
        });

        res.json({
            success: true,
            presignedUrl,
            s3Key,
            expiresIn: 300
        });

    } catch (error) {
        console.error('Generate presigned URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate upload URL',
            error: error.message
        });
    }
});

module.exports = router;
