const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const FareCalculator = require('../../utils/fareCalculator');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData && geocodeData.length > 0) {
            latitude = parseFloat(geocodeData[0].lat);
            longitude = parseFloat(geocodeData[0].lon);
            
            // Update provider's location in database for future use
            await pool.query(
              'UPDATE providers SET location_lat = ?, location_lng = ? WHERE id = ?',
              [latitude, longitude, provider.provider_id]
            );
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

  const with_vehicle = booking_type === 'with_car' ? 1 : 0;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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
        cost_type,
        duration
      ]
    );

    const bookingId = mainBookingResult.insertId;

    // 2. Insert into ride_bookings table (ride-specific data)
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

    // 3. Store fare breakdown if using new quote system
    if (fareBreakdown && quote_id) {
      await FareCalculator.storeFareQuote(fareBreakdown, bookingId);
    }

    // 4. Get ride category id
    const [rideCategory] = await connection.query(
      `SELECT id FROM service_categories WHERE category_type = 'driver' AND is_active = 1`
    );

    if (!rideCategory.length) {
      await connection.rollback();
      return res.status(500).json({ message: 'Driver category not found or inactive' });
    }

    const rideCategoryId = rideCategory[0].id;

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
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData && geocodeData.length > 0) {
            latitude = parseFloat(geocodeData[0].lat);
            longitude = parseFloat(geocodeData[0].lon);
            
            // Update provider's location in database
            await connection.query(
              'UPDATE providers SET location_lat = ?, location_lng = ? WHERE id = ?',
              [latitude, longitude, provider.provider_id]
            );
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

    // 7. Insert booking requests
    for (const providerId of driverIds) {
      await connection.query(
        `INSERT INTO booking_requests (booking_id, provider_id, status, requested_at)
         VALUES (?, ?, 'pending', NOW())`,
        [bookingId, providerId]
      );
    }

    await connection.commit();

    // Emit Socket.IO events to notify providers and customer about new ride booking requests
    try {
      const io = req.app.get('io');
      if (io) {
        for (const providerId of driverIds) {
          io.to(`provider:${providerId}`).emit('booking_requests:new', {
            booking_id: bookingId,
            booking_type: 'ride',
            status: 'pending'
          });
        }
        // Notify the customer that their booking was created
        io.to(`user:${user_id}`).emit('bookings:created', {
          booking_ids: [bookingId]
        });
      }
    } catch (emitErr) {
      console.error('Socket emit error (driver book-ride):', emitErr.message);
    }

    res.status(201).json({
      message: 'Driver booking created successfully',
      booking_id: bookingId,
      available_providers: driverIds,
      quote_id: quote_id || null,
      estimated_cost: finalEstimatedCost,
      fare_breakdown: fareBreakdown ? {
        distance_km: fareBreakdown.distance_km,
        duration_min: fareBreakdown.duration_min,
        vehicle_type: fareBreakdown.vehicle_type_name,
        total_fare: fareBreakdown.total_fare,
        surge_multiplier: fareBreakdown.surge_multiplier,
        night_hours: fareBreakdown.night_hours_applied
      } : null
    });

  } catch (error) {
    await connection.rollback();
    console.error('Transaction error in /book-ride:', error);
    res.status(500).json({ message: 'Server error while creating driver booking' });
  } finally {
    connection.release();
  }
});

module.exports = router;