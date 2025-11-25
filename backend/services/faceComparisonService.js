const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const pool = require('../config/db');

class FaceComparisonService {
    constructor() {
        // Initialize AWS Rekognition with separate selfie verification credentials
        this.rekognition = new AWS.Rekognition({
            region: process.env.AWS_REGION || 'ap-south-1',
            accessKeyId: process.env.SELFIE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.SELFIE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
        });

        // Initialize S3 for image access with separate credentials
        this.s3 = new AWS.S3({
            region: process.env.AWS_REGION || 'ap-south-1',
            accessKeyId: process.env.SELFIE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.SELFIE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
        });

        this.FACE_MATCH_THRESHOLD = parseFloat(process.env.SELFIE_FACE_MATCH_THRESHOLD || '80.0');
        this.SELFIE_BUCKET = process.env.SELFIE_S3_BUCKET || 'worker-verification-images';
        this.PROFILE_BUCKET = process.env.AWS_S3_BUCKET || 'files-and-image-storage-bucket';
    }

    /**
     * Compare faces between selfie and profile picture using Amazon Rekognition
     * @param {string} selfieS3Key - S3 key for the selfie image
     * @param {string} profilePictureS3Key - S3 key for the profile picture
     * @returns {Object} Comparison result with confidence score
     */
    async compareFaces(selfieS3Key, profilePictureS3Key) {
        try {
            console.log('[Face Comparison] Starting face comparison:', {
                selfieKey: selfieS3Key,
                selfieBucket: this.SELFIE_BUCKET,
                profileKey: profilePictureS3Key,
                profileBucket: this.PROFILE_BUCKET,
                threshold: this.FACE_MATCH_THRESHOLD,
                region: process.env.AWS_REGION
            });

            const params = {
                SourceImage: {
                    S3Object: {
                        Bucket: this.SELFIE_BUCKET,
                        Name: selfieS3Key
                    }
                },
                TargetImage: {
                    S3Object: {
                        Bucket: this.PROFILE_BUCKET,
                        Name: profilePictureS3Key
                    }
                },
                SimilarityThreshold: this.FACE_MATCH_THRESHOLD
            };
            
            console.log('[Face Comparison] Rekognition params:', JSON.stringify(params, null, 2));

            const result = await this.rekognition.compareFaces(params).promise();
            
            console.log('Rekognition response:', JSON.stringify(result, null, 2));

            if (result.FaceMatches && result.FaceMatches.length > 0) {
                const bestMatch = result.FaceMatches[0];
                const confidence = bestMatch.Similarity;
                
                return {
                    success: true,
                    matched: confidence >= this.FACE_MATCH_THRESHOLD,
                    confidence: confidence,
                    threshold: this.FACE_MATCH_THRESHOLD,
                    faceMatches: result.FaceMatches.length,
                    rekognitionResponse: result
                };
            } else {
                return {
                    success: true,
                    matched: false,
                    confidence: 0,
                    threshold: this.FACE_MATCH_THRESHOLD,
                    faceMatches: 0,
                    rekognitionResponse: result,
                    message: 'No matching faces found'
                };
            }
        } catch (error) {
            console.error('[Face Comparison] Error:', {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
                requestId: error.requestId
            });
            
            // Handle specific Rekognition errors
            if (error.code === 'InvalidImageFormatException') {
                return {
                    success: false,
                    error: 'Invalid image format. Please use JPEG or PNG images.',
                    code: 'INVALID_FORMAT'
                };
            } else if (error.code === 'ImageTooLargeException') {
                return {
                    success: false,
                    error: 'Image is too large. Please use a smaller image.',
                    code: 'IMAGE_TOO_LARGE'
                };
            } else if (error.code === 'InvalidS3ObjectException' || error.code === 'AccessDeniedException') {
                console.error('[Face Comparison] S3 Access Error Details:', {
                    selfieBucket: this.SELFIE_BUCKET,
                    profileBucket: this.PROFILE_BUCKET,
                    selfieKey: error.message.includes('Source') ? 'Issue with selfie' : 'OK',
                    profileKey: error.message.includes('Target') ? 'Issue with profile picture' : 'OK',
                    awsCredentials: {
                        hasAccessKey: !!process.env.SELFIE_AWS_ACCESS_KEY_ID,
                        hasSecretKey: !!process.env.SELFIE_AWS_SECRET_ACCESS_KEY,
                        region: process.env.AWS_REGION
                    }
                });
                return {
                    success: false,
                    error: 'Could not access image from S3. Please ensure AWS permissions are configured correctly.',
                    code: 'S3_ACCESS_ERROR',
                    details: error.message
                };
            } else if (error.code === 'InvalidParameterException') {
                return {
                    success: false,
                    error: 'Invalid image parameters. Please ensure images contain faces.',
                    code: 'NO_FACES_DETECTED'
                };
            } else {
                return {
                    success: false,
                    error: 'Face comparison service temporarily unavailable. Please try again later.',
                    code: 'SERVICE_ERROR',
                    details: error.message
                };
            }
        }
    }

    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
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
    }

    /**
     * Verify location is within acceptable range
     * @param {number} selfieLatitude - Latitude where selfie was taken
     * @param {number} selfieLongitude - Longitude where selfie was taken
     * @param {number} customerLatitude - Customer's location latitude
     * @param {number} customerLongitude - Customer's location longitude
     * @param {number} maxDistanceMeters - Maximum allowed distance in meters
     * @returns {Object} Location verification result
     */
    verifyLocation(selfieLatitude, selfieLongitude, customerLatitude, customerLongitude, maxDistanceMeters = 400) {
        try {
            console.log('[Location Verification] Starting verification:', {
                workerLocation: { lat: selfieLatitude, lng: selfieLongitude },
                customerLocation: { lat: customerLatitude, lng: customerLongitude },
                maxDistance: `${maxDistanceMeters}m`
            });

            const distance = this.calculateDistance(
                selfieLatitude, selfieLongitude,
                customerLatitude, customerLongitude
            );

            const withinRange = distance <= maxDistanceMeters;
            const roundedDistance = Math.round(distance * 100) / 100;

            console.log('[Location Verification] Result:', {
                distance: `${roundedDistance}m`,
                maxDistance: `${maxDistanceMeters}m`,
                withinRange: withinRange,
                status: withinRange ? 'VERIFIED' : 'TOO_FAR'
            });

            return {
                success: true,
                withinRange: withinRange,
                distance: roundedDistance,
                maxDistance: maxDistanceMeters,
                message: withinRange
                    ? `Location verified (${Math.round(distance)}m from customer)`
                    : `Too far from customer location (${Math.round(distance)}m, max ${maxDistanceMeters}m)`
            };
        } catch (error) {
            console.error('[Location Verification] Error:', error);
            return {
                success: false,
                error: 'Failed to verify location',
                details: error.message
            };
        }
    }

    /**
     * Get worker's profile picture data (URL and S3 key) from database
     * @param {number} workerId - Worker/Provider ID
     * @returns {Object|null} Object with url and key, or null if not found
     */
    async getWorkerProfilePictureData(workerId) {
        let connection;
        try {
            connection = await pool.getConnection();
            
            const [rows] = await connection.execute(
                'SELECT profile_picture_url FROM providers WHERE id = ?',
                [workerId]
            );

            if (rows.length === 0) {
                console.log(`[Profile Picture] No provider found with ID: ${workerId}`);
                return null;
            }

            const profilePictureUrl = rows[0].profile_picture_url;
            if (!profilePictureUrl) {
                console.log(`[Profile Picture] Provider ${workerId} has no profile picture URL`);
                return null;
            }
            
            console.log(`[Profile Picture] Found URL for provider ${workerId}: ${profilePictureUrl}`);

            // Extract S3 key from URL
            let s3Key = null;
            if (profilePictureUrl.includes('amazonaws.com')) {
                const match = profilePictureUrl.match(/\.com\/(.+)$/);
                if (match && match[1]) {
                    s3Key = match[1];
                    console.log(`[Profile Picture] Extracted S3 key: ${s3Key}`);
                } else {
                    const urlParts = profilePictureUrl.split('/');
                    const comIndex = urlParts.findIndex(part => part.includes('.com'));
                    if (comIndex !== -1 && comIndex < urlParts.length - 1) {
                        s3Key = urlParts.slice(comIndex + 1).join('/');
                        console.log(`[Profile Picture] Extracted S3 key (fallback): ${s3Key}`);
                    }
                }
            } else {
                s3Key = profilePictureUrl;
                console.log(`[Profile Picture] Using direct key: ${profilePictureUrl}`);
            }

            return {
                url: profilePictureUrl,
                key: s3Key
            };
        } catch (error) {
            console.error('Error getting worker profile picture data:', error);
            return null;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Get worker's profile picture S3 key from database (deprecated - use getWorkerProfilePictureData)
     * @param {number} workerId - Worker/Provider ID
     * @returns {string|null} S3 key for profile picture
     */
    async getWorkerProfilePictureKey(workerId) {
        let connection;
        try {
            connection = await pool.getConnection();
            
            const [rows] = await connection.execute(
                'SELECT profile_picture_url FROM providers WHERE id = ?',
                [workerId]
            );

            if (rows.length === 0) {
                console.log(`[Profile Picture] No provider found with ID: ${workerId}`);
                return null;
            }

            const profilePictureUrl = rows[0].profile_picture_url;
            if (!profilePictureUrl) {
                console.log(`[Profile Picture] Provider ${workerId} has no profile picture URL`);
                return null;
            }
            
            console.log(`[Profile Picture] Found URL for provider ${workerId}: ${profilePictureUrl}`);

            // Extract S3 key from URL
            // Handle both full S3 URLs and direct keys
            if (profilePictureUrl.includes('amazonaws.com')) {
                // Extract everything after .com/ to get the full S3 key
                const match = profilePictureUrl.match(/\.com\/(.+)$/);
                if (match && match[1]) {
                    console.log(`[Profile Picture] Extracted S3 key: ${match[1]}`);
                    return match[1]; // Return the full S3 key path
                }
                // Fallback: try splitting and taking everything after the domain
                const urlParts = profilePictureUrl.split('/');
                const comIndex = urlParts.findIndex(part => part.includes('.com'));
                if (comIndex !== -1 && comIndex < urlParts.length - 1) {
                    const key = urlParts.slice(comIndex + 1).join('/');
                    console.log(`[Profile Picture] Extracted S3 key (fallback): ${key}`);
                    return key;
                }
                console.log(`[Profile Picture] Failed to extract S3 key from URL`);
                return null;
            } else {
                console.log(`[Profile Picture] Using direct key: ${profilePictureUrl}`);
                return profilePictureUrl; // Already a key
            }
        } catch (error) {
            console.error('Error getting worker profile picture:', error);
            return null;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Save selfie verification record to database
     * @param {Object} verificationData - Verification data to save
     * @returns {Object} Save result
     */
    async saveSelfieVerification(verificationData) {
        let connection;
        try {
            connection = await pool.getConnection();
            
            console.log('💾 Saving selfie verification data:', {
                bookingId: verificationData.bookingId,
                workerId: verificationData.workerId,
                verificationStatus: verificationData.verificationStatus,
                hasS3Url: !!verificationData.selfieS3Url,
                hasProfilePicture: !!verificationData.profilePictureS3Url
            });
            
            const {
                bookingId,
                workerId,
                selfieS3Url,
                profilePictureS3Url,
                selfieLatitude,
                selfieLongitude,
                customerLatitude,
                customerLongitude,
                distanceMeters,
                locationVerified,
                faceMatchConfidence,
                faceComparisonSuccessful,
                rekognitionResponse,
                verificationStatus,
                verificationNotes
            } = verificationData;

            const [result] = await connection.execute(`
                INSERT INTO job_completion_selfies (
                    booking_id, worker_id, selfie_s3_url, profile_picture_s3_url,
                    selfie_latitude, selfie_longitude, customer_latitude, customer_longitude,
                    distance_meters, location_verified, face_match_confidence,
                    face_comparison_successful, rekognition_response, verification_status,
                    verification_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    selfie_s3_url = VALUES(selfie_s3_url),
                    profile_picture_s3_url = VALUES(profile_picture_s3_url),
                    selfie_latitude = VALUES(selfie_latitude),
                    selfie_longitude = VALUES(selfie_longitude),
                    customer_latitude = VALUES(customer_latitude),
                    customer_longitude = VALUES(customer_longitude),
                    distance_meters = VALUES(distance_meters),
                    location_verified = VALUES(location_verified),
                    face_match_confidence = VALUES(face_match_confidence),
                    face_comparison_successful = VALUES(face_comparison_successful),
                    rekognition_response = VALUES(rekognition_response),
                    verification_status = VALUES(verification_status),
                    verification_notes = VALUES(verification_notes),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                bookingId, workerId, selfieS3Url, profilePictureS3Url,
                selfieLatitude, selfieLongitude, customerLatitude, customerLongitude,
                distanceMeters, locationVerified, faceMatchConfidence,
                faceComparisonSuccessful, JSON.stringify(rekognitionResponse),
                verificationStatus, verificationNotes
            ]);

            // Update booking selfie verification status
            await connection.execute(`
                UPDATE bookings 
                SET selfie_verification_status = ?,
                    selfie_verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE selfie_verified_at END
                WHERE id = ?
            `, [verificationStatus, verificationStatus, bookingId]);

            console.log('✅ Selfie verification saved successfully:', {
                bookingId,
                verificationId: result.insertId || result.affectedRows,
                affectedRows: result.affectedRows
            });

            return {
                success: true,
                verificationId: result.insertId || result.affectedRows,
                message: 'Selfie verification saved successfully'
            };
        } catch (error) {
            console.error('❌ Error saving selfie verification:', {
                bookingId: verificationData.bookingId,
                workerId: verificationData.workerId,
                error: error.message,
                code: error.code,
                sqlState: error.sqlState,
                stack: error.stack
            });
            return {
                success: false,
                error: 'Failed to save verification data',
                details: error.message
            };
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Log audit trail for selfie verification actions
     * @param {Object} auditData - Audit data to log
     */
    async logAuditTrail(auditData) {
        let connection;
        try {
            connection = await pool.getConnection();
            
            const {
                bookingId,
                workerId,
                action,
                details,
                ipAddress,
                userAgent
            } = auditData;

            await connection.execute(`
                INSERT INTO selfie_verification_audit (
                    booking_id, worker_id, action, details, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                bookingId, workerId, action, 
                JSON.stringify(details), ipAddress, userAgent
            ]);
        } catch (error) {
            console.error('Error logging audit trail:', error);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}

module.exports = new FaceComparisonService();
