const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const FareCalculator = require('../../utils/fareCalculator');
const { retryTransaction, isNoDriversError, isTemporaryServiceError } = require('../../utils/databaseRetry');
require('dotenv').config();

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /location-search - Search for locations using Google Maps API
router.get('/location-search', async (req, res) => {
  try {
    const { query, country = 'in' } = req.query;
    
    if (!query || query.length < 3) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleApiKey) {
      // Fallback to mock data if Google Maps API key is not configured
      const mockSuggestions = [
        {
          place_id: `mock_${Date.now()}_1`,
          formatted_address: `${query}, India`,
          geometry: {
            location: {
              lat: 17.2473 + (Math.random() - 0.5) * 0.1,
              lng: 80.1514 + (Math.random() - 0.5) * 0.1
            }
          },
          name: query,
          types: ['locality', 'political']
        }
      ];
      
      return res.json({
        success: true,
        suggestions: mockSuggestions
      });
    }

    // Use Google Places API for location search
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:${country}&key=${googleApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.predictions) {
      // Get detailed information for each prediction
      const detailedSuggestions = await Promise.all(
        data.predictions.slice(0, 5).map(async (prediction) => {
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=formatted_address,geometry,name,types&key=${googleApiKey}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            
            if (detailsData.status === 'OK' && detailsData.result) {
              return {
                place_id: prediction.place_id,
                formatted_address: detailsData.result.formatted_address,
                geometry: detailsData.result.geometry,
                name: detailsData.result.name || prediction.description,
                types: detailsData.result.types || prediction.types
              };
            }
          } catch (error) {
            console.error('Error fetching place details:', error);
          }
          
          // Fallback to basic prediction data
          return {
            place_id: prediction.place_id,
            formatted_address: prediction.description,
            geometry: null,
            name: prediction.structured_formatting?.main_text || prediction.description,
            types: prediction.types
          };
        })
      );
      
      res.json({
        success: true,
        suggestions: detailedSuggestions
      });
    } else {
      res.json({
        success: true,
        suggestions: []
      });
    }
  } catch (error) {
    console.error('Error in location search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations'
    });
  }
});

// POST /search - Search for nearby available drivers
router.post('/search', async (req, res) => {
  try {
    const { pickup } = req.body;
    
    if (!pickup?.lat || !pickup?.lng) {
      return res.status(400).json({ message: 'Pickup location with lat and lng is required' });
    }

    // Get ride category id
    const [rideCategory] = await pool.query(
      `SELECT id FROM service_categories WHERE category_type = 'driver' AND is_active = 1 LIMIT 1`
    );

    if (!rideCategory.length) {
      return res.status(404).json({ message: 'Driver category not found' });
    }

    const rideCategoryId = rideCategory[0].id;

    // Find active, verified providers with driver services
    const [providers] = await pool.query(`
      SELECT DISTINCT
        p.id as provider_id,
        p.service_radius_km,
        p.location_lat,
        p.location_lng,
        u.name as provider_name,
        pa.street_address,
        pa.city,
        pa.state,
        pa.zip_code
      FROM providers p
      INNER JOIN provider_services ps ON p.id = ps.provider_id
      INNER JOIN subcategories s ON ps.subcategory_id = s.id
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN provider_addresses pa ON p.id = pa.provider_id AND pa.address_type = 'permanent'
      WHERE p.active = 1 
        AND p.verified = 1 
        AND s.category_id = ?
        AND p.service_radius_km IS NOT NULL
    `, [rideCategoryId]);

    const nearbyDrivers = [];
    
    for (const provider of providers) {
      let latitude = provider.location_lat;
      let longitude = provider.location_lng;
      
      // If no coordinates, try to geocode the address
      if (!latitude || !longitude) {
        const address = `${provider.street_address}, ${provider.city}, ${provider.state}, ${provider.zip_code}, India`;
        try {
          const apiKey = process.env.GOOGLE_MAPS_API_KEY;
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();

          if (geocodeData && geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
            const loc = geocodeData.results[0].geometry.location;
            latitude = parseFloat(loc.lat);
            longitude = parseFloat(loc.lng);

            // Update provider's location in database for future use
            await pool.query(
              'UPDATE providers SET location_lat = ?, location_lng = ? WHERE id = ?',
              [latitude, longitude, provider.provider_id]
            );
          } else {
            console.warn(`Google geocoding failed for provider ${provider.provider_id}:`, geocodeData?.status || 'NO_RESULTS');
          }
        } catch (error) {
          console.error(`Error geocoding address for provider ${provider.provider_id}:`, error);
          continue;
        }
      }
      
      if (latitude && longitude) {
        const distance = haversineDistance(pickup.lat, pickup.lng, latitude, longitude);
        
        if (distance <= provider.service_radius_km) {
          nearbyDrivers.push({
            provider_id: provider.provider_id,
            provider_name: provider.provider_name,
            lat: latitude,
            lng: longitude,
            distance_km: Math.round(distance * 100) / 100,
            eta_minutes: Math.ceil(distance / 0.5) // Rough estimate: 30 km/h average speed
          });
        }
      }
    }

    // Sort by distance
    nearbyDrivers.sort((a, b) => a.distance_km - b.distance_km);

    res.json({
      drivers: nearbyDrivers,
      total_found: nearbyDrivers.length,
      message: nearbyDrivers.length > 0 ? 'Drivers found nearby' : 'No drivers available in your area'
    });

  } catch (error) {
    console.error('Error searching drivers:', error);
    res.status(500).json({ message: 'Server error while searching drivers' });
  }
});

router.post('/book-ride', verifyToken, async (req, res) => {
  const { id: user_id, role } = req.user;

  if (role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can book rides' });
  }

  const {
    pickup_address,
    pickup_lat,
    pickup_lon,
    drop_address,
    drop_lat,
    drop_lon,
    pickup_time,
    booking_type, // 'with_car' or 'without_car'
    quote_id, // New: replaces estimated_cost
    vehicle_type_id, // New: vehicle type for fare calculation
    estimated_cost, // Deprecated: kept for backward compatibility
    cost_type,
    duration,
    vehicle_id // Optional: if booking with a specific vehicle
  } = req.body;

  console.log("pickup_time", pickup_time);
  console.log("body", req.body);

  if (!pickup_address || !pickup_lat || !pickup_lon || !drop_address || !drop_lat || !drop_lon || !pickup_time) {
    return res.status(400).json({ message: 'Missing required booking information.' });
  }

  // Validate quote_id if provided (new flow) or fall back to estimated_cost (legacy)
  if (!quote_id && !estimated_cost) {
    return res.status(400).json({ 
      message: 'Either quote_id (recommended) or estimated_cost is required' 
    });
  }

  if (quote_id && !vehicle_type_id) {
    return res.status(400).json({ 
      message: 'vehicle_type_id is required when using quote_id' 
    });
  }

  // Handle new booking type 'ride' (defaults to without_car for now)
  const with_vehicle = booking_type === 'with_car' ? 1 : 0;

  try {
    // Use retry mechanism for the entire booking transaction
    const result = await retryTransaction(pool, async (connection) => {

    let finalEstimatedCost = estimated_cost || 0;
    let fareBreakdown = null;

    // Handle new quote-based booking flow
    if (quote_id && vehicle_type_id) {
      try {
        // Recalculate fare to ensure quote is still valid
        const distanceData = await FareCalculator.getDistanceAndDuration(
          { lat: pickup_lat, lng: pickup_lon },
          { lat: drop_lat, lng: drop_lon }
        );

        fareBreakdown = await FareCalculator.calculateFareEstimate({
          distance_km: distanceData.distance_km,
          duration_min: distanceData.duration_min,
          vehicle_type_id,
          pickup_time: new Date(pickup_time),
          pickup_location: { lat: pickup_lat, lng: pickup_lon },
          drop_location: { lat: drop_lat, lng: drop_lon }
        });

        // Validate quote_id matches (basic validation)
        if (fareBreakdown.quote_id !== quote_id) {
          // For now, accept any valid UUID format quote_id
          // In production, validate against stored quotes
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(quote_id)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid or expired quote_id' });
          }
          // Use the provided quote_id but with recalculated fare
          fareBreakdown.quote_id = quote_id;
        }

        finalEstimatedCost = fareBreakdown.total_fare;
        
      } catch (fareError) {
        console.error('Error calculating fare for booking:', fareError);
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Error validating fare quote. Please request a new quote.' 
        });
      }
    }

    // 1. Insert into bookings table (main booking record)
    console.log('Inserting into bookings table...');
    const [mainBookingResult] = await connection.query(
      `INSERT INTO bookings (
          user_id, booking_type, scheduled_time, estimated_cost, 
          service_status, payment_status, created_at, cost_type, duration
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        user_id,
        'ride',
        pickup_time,
        finalEstimatedCost,
        'pending',
        'pending',
        cost_type || 'per_hour',
        duration || 1
      ]
    );

    const bookingId = mainBookingResult.insertId;
    console.log('Booking ID created:', bookingId);

    // 2. Insert into ride_bookings table (ride-specific data)
    console.log('Inserting into ride_bookings table...');
    await connection.query(
      `INSERT INTO ride_bookings (
          booking_id, with_vehicle, vehicle_id, pickup_address, pickup_lat, pickup_lon,
          drop_address, drop_lat, drop_lon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        with_vehicle,
        vehicle_id || null,
        pickup_address,
        pickup_lat,
        pickup_lon,
        drop_address,
        drop_lat,
        drop_lon
      ]
    );
    console.log('Ride booking data inserted successfully');

    // 3. Store fare breakdown if using new quote system
    if (fareBreakdown && quote_id) {
      console.log('Storing fare breakdown...');
      try {
        await FareCalculator.storeFareQuote(fareBreakdown, bookingId);
        console.log('Fare breakdown stored successfully');
      } catch (fareError) {
        console.warn('Failed to store fare breakdown, continuing with booking:', fareError.message);
        // Don't fail the entire booking if fare breakdown storage fails
        // The booking can proceed without detailed fare breakdown
      }
    }

    // 4. Get ride category id
    console.log('Getting ride category...');
    const [rideCategory] = await connection.query(
      `SELECT id FROM service_categories WHERE category_type = 'driver' AND is_active = 1`
    );

    if (!rideCategory.length) {
      await connection.rollback();
      return res.status(500).json({ message: 'Driver category not found or inactive' });
    }

    const rideCategoryId = rideCategory[0].id;
    console.log('Ride category ID:', rideCategoryId);

    // 5. Fetch provider permanent addresses and convert to coordinates
    const [providers] = await connection.query(`
      SELECT 
        p.id as provider_id,
        p.service_radius_km,
        pa.street_address,
        pa.city,
        pa.state,
        pa.zip_code,
        p.location_lat,
        p.location_lng
      FROM providers p
      LEFT JOIN provider_addresses pa ON p.id = pa.provider_id AND pa.address_type = 'permanent'
      WHERE p.active = 1 AND p.verified = 1
    `);

    const locations = [];
    for (const provider of providers) {
      let latitude = provider.location_lat;
      let longitude = provider.location_lng;
      
      // If no coordinates in providers table, geocode the permanent address
      if (!latitude || !longitude) {
        const address = `${provider.street_address}, ${provider.city}, ${provider.state}, ${provider.zip_code}, India`;
        try {
          const apiKey = process.env.GOOGLE_MAPS_API_KEY;
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();

          if (geocodeData && geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
            const loc = geocodeData.results[0].geometry.location;
            latitude = parseFloat(loc.lat);
            longitude = parseFloat(loc.lng);

            // Update provider's location in database
            await connection.query(
              'UPDATE providers SET location_lat = ?, location_lng = ? WHERE id = ?',
              [latitude, longitude, provider.provider_id]
            );
          } else {
            console.warn(`Google geocoding failed for provider ${provider.provider_id}:`, geocodeData?.status || 'NO_RESULTS');
          }
        } catch (error) {
          console.error(`Error geocoding address for provider ${provider.provider_id}:`, error);
          continue; // Skip this provider if geocoding fails
        }
      }
      
      if (latitude && longitude) {
        locations.push({
          provider_id: provider.provider_id,
          latitude: latitude,
          longitude: longitude,
          service_radius_km: provider.service_radius_km
        });
      }
    }

    const driverIds = [];
    console.log("locations", locations);
    
    // 6. Find drivers within service radius
    for (const row of locations) {
      const distance = haversineDistance(pickup_lat, pickup_lon, row.latitude, row.longitude);
      if (distance <= row.service_radius_km) {
        const [isDriver] = await connection.query(`
          SELECT ps.provider_id
          FROM provider_services ps
          JOIN subcategories s ON ps.subcategory_id = s.id
          WHERE ps.provider_id = ? AND s.category_id = ?
        `, [row.provider_id, rideCategoryId]);

        if (isDriver.length) {
          driverIds.push(row.provider_id);
        }
      }
    }
    
    console.log("driver IDs", driverIds);

    // Check if any drivers were found
    if (driverIds.length === 0) {
      console.log('No drivers found in service area');
      // Instead of failing, we'll still create the booking but mark it appropriately
      // This prevents database locks from failed bookings
    }

    // 7. Insert booking requests only if drivers are available
    for (const providerId of driverIds) {
      await connection.query(
        `INSERT INTO booking_requests (booking_id, provider_id, status, requested_at)
         VALUES (?, ?, 'pending', NOW())`,
        [bookingId, providerId]
      );
    }

      // Return the booking data from the transaction
      return {
        bookingId,
        driverIds,
        finalEstimatedCost,
        fareBreakdown
      };
    }, {
      maxRetries: 2, // Retry up to 2 times for booking operations
      baseDelay: 2000, // Start with 2 second delay
      maxDelay: 8000 // Max 8 second delay
    });

    // Emit Socket.IO events to notify providers and customer about new ride booking requests
    try {
      const io = req.app.get('io');
      if (io) {
        for (const providerId of result.driverIds) {
          io.to(`provider:${providerId}`).emit('booking_requests:new', {
            booking_id: result.bookingId,
            booking_type: 'ride',
            status: 'pending'
          });
        }
        // Notify the customer that their booking was created
        io.to(`user:${user_id}`).emit('bookings:created', {
          booking_ids: [result.bookingId]
        });
      }
    } catch (emitErr) {
      console.error('Socket emit error (driver book-ride):', emitErr.message);
    }

    // Check if no drivers were found and return appropriate response
    if (result.driverIds.length === 0) {
      return res.status(503).json({
        message: 'No available drivers in your area at the moment. Please try again later.',
        error_code: 'NO_DRIVERS_AVAILABLE',
        booking_id: result.bookingId,
        retry_after: 30
      });
    }

    res.status(201).json({
      message: 'Driver booking created successfully',
      booking_id: result.bookingId,
      available_providers: result.driverIds,
      quote_id: quote_id || null,
      estimated_cost: result.finalEstimatedCost,
      fare_breakdown: result.fareBreakdown ? {
        distance_km: result.fareBreakdown.distance_km,
        duration_min: result.fareBreakdown.duration_min,
        vehicle_type: result.fareBreakdown.vehicle_type_name,
        total_fare: result.fareBreakdown.total_fare,
        surge_multiplier: result.fareBreakdown.surge_multiplier,
        night_hours: result.fareBreakdown.night_hours_applied
      } : null
    });

  } catch (error) {
    console.error('Transaction error in /book-ride:', error);
    
    // Use utility functions to determine error type
    if (isNoDriversError(error)) {
      console.error('Database lock timeout occurred - no drivers available');
      return res.status(503).json({ 
        message: 'No available drivers at the moment. Please try again later.',
        error_code: 'NO_DRIVERS_AVAILABLE',
        retry_after: 30 // seconds
      });
    }
    
    if (isTemporaryServiceError(error)) {
      console.error('Temporary service error occurred');
      return res.status(503).json({ 
        message: 'Service temporarily unavailable. Please try again later.',
        error_code: 'SERVICE_TIMEOUT',
        retry_after: 30
      });
    }
    
    res.status(500).json({ message: 'Server error while creating driver booking' });
  }
});

/**
 * POST /verify-otp/:bookingId - Verify OTP for provider arrival
 */
router.post('/verify-otp/:bookingId', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { otp } = req.body;
  const { id: user_id, role } = req.user;

  if (role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can verify OTP' });
  }

  if (!otp || otp.length !== 6) {
    return res.status(400).json({ message: 'Valid 6-digit OTP is required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the customer owns this booking
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.customer_id, b.service_status, rb.otp_code
      FROM bookings b
      JOIN ride_bookings rb ON b.id = rb.booking_id
      WHERE b.id = ? AND b.booking_type = 'ride'
    `, [bookingId]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingCheck[0];

    if (booking.customer_id !== user_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to verify OTP for this booking' });
    }

    if (booking.service_status !== 'arrived') {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Cannot verify OTP. Current status: ${booking.service_status}` 
      });
    }

    // Verify OTP
    if (booking.otp_code !== otp) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    // Update booking status to in_progress
    await connection.query(
      'UPDATE bookings SET service_status = ? WHERE id = ?',
      ['in_progress', bookingId]
    );

    // Clear OTP after successful verification
    await connection.query(
      'UPDATE ride_bookings SET otp_code = NULL WHERE booking_id = ?',
      [bookingId]
    );

    await connection.commit();

    // Emit Socket.IO event to notify provider
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`booking_${bookingId}`).emit('otp_verified', {
          booking_id: bookingId,
          status: 'in_progress',
          message: 'OTP verified successfully. Service can now begin.'
        });
      }
    } catch (socketError) {
      console.error('Socket error in OTP verification:', socketError);
      // Don't fail the request if socket fails
    }

    res.json({ 
      success: true, 
      message: 'OTP verified successfully. Service can now begin.',
      status: 'in_progress'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error in OTP verification:', error);
    res.status(500).json({ message: 'Server error while verifying OTP' });
  } finally {
    connection.release();
  }
});

/**
 * POST /rate/:bookingId - Rate and review completed service
 */
router.post('/rate/:bookingId', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { rating, review } = req.body;
  const { id: user_id, role } = req.user;

  if (role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can rate services' });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the customer owns this booking and it's completed
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.user_id, b.customer_id, b.service_status, b.provider_id
      FROM bookings b
      WHERE b.id = ? AND b.booking_type = 'ride'
    `, [bookingId]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingCheck[0];

    // Check if customer owns this booking (check both user_id and customer_id for compatibility)
    const customerId = booking.customer_id || booking.user_id;
    if (customerId !== user_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to rate this booking' });
    }

    if (booking.service_status !== 'completed') {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Cannot rate booking. Current status: ${booking.service_status}` 
      });
    }

    // Check if already rated
    const [existingRating] = await connection.query(`
      SELECT id FROM booking_ratings 
      WHERE booking_id = ? AND customer_id = ?
    `, [bookingId, user_id]);

    if (existingRating.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'You have already rated this booking' });
    }

    // Insert rating
    await connection.query(`
      INSERT INTO booking_ratings (booking_id, customer_id, provider_id, rating, review, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [bookingId, user_id, booking.provider_id, rating, review || null]);

    // Update provider's average rating
    const [ratingStats] = await connection.query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
      FROM booking_ratings 
      WHERE provider_id = ?
    `, [booking.provider_id]);

    if (ratingStats.length > 0) {
      const { avg_rating, total_ratings } = ratingStats[0];
      await connection.query(`
        UPDATE providers 
        SET rating = ?, total_ratings = ?
        WHERE id = ?
      `, [avg_rating, total_ratings, booking.provider_id]);
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Thank you for your feedback!',
      rating: rating,
      review: review
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error in rating submission:', error);
    res.status(500).json({ message: 'Server error while submitting rating' });
  } finally {
    connection.release();
  }
});

module.exports = router;