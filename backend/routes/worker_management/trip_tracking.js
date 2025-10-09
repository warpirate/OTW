const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const FareCalculator = require('../../utils/fareCalculator');

/**
 * POST /trip/start - Start a trip (Captain/Driver)
 * 
 * Request body:
 * {
 *   booking_id: number,
 *   start_location: { lat: number, lng: number },
 *   start_time?: string (ISO datetime, defaults to now)
 * }
 */
router.post('/start', verifyToken, async (req, res) => {
  const { id: user_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can start trips' });
  }

  const { booking_id, start_location, start_time } = req.body;

  if (!booking_id || !start_location?.lat || !start_location?.lng) {
    return res.status(400).json({ 
      message: 'booking_id and start_location (lat, lng) are required' 
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the worker is assigned to this booking
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.provider_id, b.service_status, rb.pickup_lat, rb.pickup_lon
      FROM bookings b
      JOIN ride_bookings rb ON b.id = rb.booking_id
      WHERE b.id = ? AND b.booking_type = 'ride'
    `, [booking_id]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Ride booking not found' });
    }

    const booking = bookingCheck[0];

    // Get provider_id for this worker
    const [providerData] = await connection.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [user_id]
    );

    if (!providerData.length) {
      await connection.rollback();
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;

    if (booking.provider_id !== provider_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not assigned to this booking' });
    }

    if (booking.service_status !== 'accepted') {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Cannot start trip. Current status: ${booking.service_status}` 
      });
    }

    // Update booking status to in_progress
    await connection.query(
      'UPDATE bookings SET service_status = ? WHERE id = ?',
      ['in_progress', booking_id]
    );

    // Log trip start location
    const trip_start_time = start_time ? new Date(start_time) : new Date();
    await connection.query(`
      INSERT INTO trip_location_logs (
        booking_id, provider_id, latitude, longitude, event_type, recorded_at
      ) VALUES (?, ?, ?, ?, 'trip_start', ?)
    `, [booking_id, provider_id, start_location.lat, start_location.lng, trip_start_time]);

    // Update fare breakdown with trip start time
    await connection.query(`
      UPDATE ride_fare_breakdowns 
      SET trip_started_at = ? 
      WHERE booking_id = ?
    `, [trip_start_time, booking_id]);

    await connection.commit();

    // Emit Socket.IO event to notify customer
    try {
      const io = req.app.get('io');
      if (io) {
        // Get customer user_id from booking
        const [customerData] = await pool.query(
          'SELECT user_id FROM bookings WHERE id = ?',
          [booking_id]
        );
        
        if (customerData.length) {
          io.to(`user:${customerData[0].user_id}`).emit('trip:started', {
            booking_id,
            start_location,
            start_time: trip_start_time.toISOString(),
            message: 'Your driver has started the trip'
          });
        }

        // Notify other providers that this booking is no longer available
        io.emit('booking:unavailable', { booking_id });
      }
    } catch (emitErr) {
      console.error('Socket emit error (trip start):', emitErr.message);
    }

    res.json({
      message: 'Trip started successfully',
      booking_id,
      start_time: trip_start_time.toISOString(),
      start_location
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error starting trip:', error);
    res.status(500).json({ message: 'Server error while starting trip' });
  } finally {
    connection.release();
  }
});

/**
 * POST /trip/location-update - Update location during trip
 * 
 * Request body:
 * {
 *   booking_id: number,
 *   location: { lat: number, lng: number },
 *   speed_kmh?: number,
 *   bearing?: number,
 *   accuracy_meters?: number
 * }
 */
router.post('/location-update', verifyToken, async (req, res) => {
  const { id: user_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can update trip location' });
  }

  const { booking_id, location, speed_kmh, bearing, accuracy_meters } = req.body;

  if (!booking_id || !location?.lat || !location?.lng) {
    return res.status(400).json({ 
      message: 'booking_id and location (lat, lng) are required' 
    });
  }

  try {
    // Get provider_id for this worker
    const [providerData] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [user_id]
    );

    if (!providerData.length) {
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;

    // Verify the worker is assigned to this booking and trip is in progress
    const [bookingCheck] = await pool.query(`
      SELECT b.id, b.user_id as customer_id, b.service_status
      FROM bookings b
      WHERE b.id = ? AND b.provider_id = ? AND b.service_status = 'in_progress'
    `, [booking_id, provider_id]);

    if (!bookingCheck.length) {
      return res.status(403).json({ 
        message: 'Booking not found or not in progress' 
      });
    }

    const booking = bookingCheck[0];

    // Log location update
    await pool.query(`
      INSERT INTO trip_location_logs (
        booking_id, provider_id, latitude, longitude, speed_kmh, bearing, 
        accuracy_meters, event_type, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'location_update', NOW())
    `, [booking_id, provider_id, location.lat, location.lng, speed_kmh, bearing, accuracy_meters]);

    // Emit real-time location to customer
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${booking.customer_id}`).emit('trip:location_update', {
          booking_id,
          location,
          speed_kmh,
          bearing,
          timestamp: new Date().toISOString()
        });
      }
    } catch (emitErr) {
      console.error('Socket emit error (location update):', emitErr.message);
    }

    res.json({
      message: 'Location updated successfully',
      booking_id,
      location,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating trip location:', error);
    res.status(500).json({ message: 'Server error while updating location' });
  }
});

/**
 * POST /trip/end - End a trip and calculate final fare
 * 
 * Request body:
 * {
 *   booking_id: number,
 *   end_location: { lat: number, lng: number },
 *   end_time?: string (ISO datetime, defaults to now),
 *   additional_charges?: {
 *     tip?: number,
 *     waiting_charges?: number,
 *     toll_charges?: number,
 *     promo_discount?: number
 *   }
 * }
 */
router.post('/end', verifyToken, async (req, res) => {
  const { id: user_id, role } = req.user;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can end trips' });
  }

  const { booking_id, end_location, end_time, additional_charges = {} } = req.body;

  if (!booking_id || !end_location?.lat || !end_location?.lng) {
    return res.status(400).json({ 
      message: 'booking_id and end_location (lat, lng) are required' 
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get provider_id for this worker
    const [providerData] = await connection.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [user_id]
    );

    if (!providerData.length) {
      await connection.rollback();
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;

    // Verify the worker is assigned to this booking and trip is in progress
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.user_id as customer_id, b.service_status, b.estimated_cost,
             rb.pickup_lat, rb.pickup_lon, rb.drop_lat, rb.drop_lon
      FROM bookings b
      JOIN ride_bookings rb ON b.id = rb.booking_id
      WHERE b.id = ? AND b.provider_id = ? AND b.service_status = 'in_progress'
    `, [booking_id, provider_id]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(403).json({ 
        message: 'Booking not found or not in progress' 
      });
    }

    const booking = bookingCheck[0];

    // Get trip start time and calculate actual duration
    const [tripStartData] = await connection.query(`
      SELECT recorded_at FROM trip_location_logs 
      WHERE booking_id = ? AND event_type = 'trip_start' 
      ORDER BY recorded_at DESC LIMIT 1
    `, [booking_id]);

    if (!tripStartData.length) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Trip start time not found. Cannot calculate duration.' 
      });
    }

    const trip_start_time = new Date(tripStartData[0].recorded_at);
    const trip_end_time = end_time ? new Date(end_time) : new Date();
    const actual_duration_min = Math.ceil((trip_end_time - trip_start_time) / (1000 * 60));

    // Calculate actual distance from GPS logs
    const [locationLogs] = await connection.query(`
      SELECT latitude, longitude, recorded_at 
      FROM trip_location_logs 
      WHERE booking_id = ? AND provider_id = ? 
      ORDER BY recorded_at ASC
    `, [booking_id, provider_id]);

    let actual_distance_km = 0;
    if (locationLogs.length >= 2) {
      // Calculate distance from GPS polyline
      for (let i = 1; i < locationLogs.length; i++) {
        const prev = locationLogs[i - 1];
        const curr = locationLogs[i];
        actual_distance_km += FareCalculator.haversineDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        );
      }
    } else {
      // Fallback: use straight-line distance from pickup to drop
      actual_distance_km = FareCalculator.haversineDistance(
        booking.pickup_lat, booking.pickup_lon,
        booking.drop_lat, booking.drop_lon
      );
    }

    // Log trip end location
    await connection.query(`
      INSERT INTO trip_location_logs (
        booking_id, provider_id, latitude, longitude, event_type, recorded_at
      ) VALUES (?, ?, ?, ?, 'trip_end', ?)
    `, [booking_id, provider_id, end_location.lat, end_location.lng, trip_end_time]);

    // Calculate final fare
    const finalFareData = await FareCalculator.calculateFinalFare(
      booking_id, 
      actual_distance_km, 
      actual_duration_min, 
      additional_charges
    );

    // Validate fare deviation
    const fareValidation = await FareCalculator.validateFareDeviation(
      booking.estimated_cost, 
      finalFareData.final_fare
    );

    // Update booking status
    let final_status = 'completed';
    if (fareValidation.requires_review) {
      final_status = 'pending_review';
    }

    await connection.query(
      'UPDATE bookings SET service_status = ?, actual_cost = ? WHERE id = ?',
      [final_status, finalFareData.final_fare, booking_id]
    );

    // If the job is completed, clean up chat data for this booking
    if (final_status === 'completed') {
      try {
        const [chatSessions] = await connection.query(
          'SELECT id FROM chat_sessions WHERE booking_id = ? LIMIT 1',
          [booking_id]
        );
        if (chatSessions.length) {
          // Try stored procedures
          try { await connection.query('CALL sp_end_chat_session(?)', [booking_id]); } catch (_) {}
          try { await connection.query('CALL sp_delete_chat_data(?)', [booking_id]); } catch (spErr) {
            // Fallback manual cleanup
            await connection.query(
              'DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE booking_id = ?)',
              [booking_id]
            );
            await connection.query(
              'DELETE FROM chat_participants WHERE session_id IN (SELECT id FROM chat_sessions WHERE booking_id = ?)',
              [booking_id]
            );
            await connection.query(
              "UPDATE chat_sessions SET session_status = 'ended', last_message_at = NOW() WHERE booking_id = ?",
              [booking_id]
            );
          }
        }
      } catch (cleanupErr) {
        console.warn('Chat cleanup warning (trip end):', cleanupErr?.message || cleanupErr);
      }
    }

    await connection.commit();

    // Emit Socket.IO event to notify customer
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${booking.customer_id}`).emit('trip:completed', {
          booking_id,
          end_location,
          end_time: trip_end_time.toISOString(),
          final_fare: finalFareData.final_fare,
          trip_summary: {
            distance_km: actual_distance_km,
            duration_min: actual_duration_min,
            fare_breakdown: finalFareData
          },
          requires_review: fareValidation.requires_review,
          message: fareValidation.requires_review ? 
            'Trip completed. Fare under review due to significant deviation.' :
            'Trip completed successfully!'
        });

        // Notify provider about earnings
        io.to(`provider:${provider_id}`).emit('trip:earnings', {
          booking_id,
          final_fare: finalFareData.final_fare,
          distance_km: actual_distance_km,
          duration_min: actual_duration_min
        });
      }
    } catch (emitErr) {
      console.error('Socket emit error (trip end):', emitErr.message);
    }

    res.json({
      message: 'Trip completed successfully',
      booking_id,
      trip_summary: {
        start_time: trip_start_time.toISOString(),
        end_time: trip_end_time.toISOString(),
        duration_min: actual_duration_min,
        distance_km: Math.round(actual_distance_km * 100) / 100,
        start_location: {
          lat: locationLogs.length ? locationLogs[0].latitude : booking.pickup_lat,
          lng: locationLogs.length ? locationLogs[0].longitude : booking.pickup_lon
        },
        end_location
      },
      fare_details: finalFareData,
      fare_validation: fareValidation,
      status: final_status
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error ending trip:', error);
    res.status(500).json({ message: 'Server error while ending trip' });
  } finally {
    connection.release();
  }
});

/**
 * GET /trip/:booking_id/status - Get current trip status and location
 */
router.get('/:booking_id/status', verifyToken, async (req, res) => {
  const { booking_id } = req.params;
  const { id: user_id, role } = req.user;

  try {
    // Check if user has access to this booking
    let accessQuery = '';
    let accessParams = [booking_id];

    if (role === 'customer') {
      accessQuery = 'SELECT * FROM bookings WHERE id = ? AND user_id = ?';
      accessParams.push(user_id);
    } else if (role === 'worker') {
      // Get provider_id for worker
      const [providerData] = await pool.query(
        'SELECT id FROM providers WHERE user_id = ?',
        [user_id]
      );
      
      if (!providerData.length) {
        return res.status(403).json({ message: 'Worker profile not found' });
      }
      
      accessQuery = 'SELECT * FROM bookings WHERE id = ? AND provider_id = ?';
      accessParams.push(providerData[0].id);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [bookingAccess] = await pool.query(accessQuery, accessParams);
    
    if (!bookingAccess.length) {
      return res.status(404).json({ message: 'Booking not found or access denied' });
    }

    const booking = bookingAccess[0];

    // Get latest location if trip is in progress
    let current_location = null;
    let trip_progress = null;

    if (booking.service_status === 'in_progress') {
      const [latestLocation] = await pool.query(`
        SELECT latitude, longitude, speed_kmh, bearing, recorded_at
        FROM trip_location_logs 
        WHERE booking_id = ? AND event_type IN ('location_update', 'trip_start')
        ORDER BY recorded_at DESC LIMIT 1
      `, [booking_id]);

      if (latestLocation.length) {
        current_location = {
          lat: latestLocation[0].latitude,
          lng: latestLocation[0].longitude,
          speed_kmh: latestLocation[0].speed_kmh,
          bearing: latestLocation[0].bearing,
          last_updated: latestLocation[0].recorded_at
        };
      }

      // Calculate trip progress
      const [tripStart] = await pool.query(`
        SELECT recorded_at FROM trip_location_logs 
        WHERE booking_id = ? AND event_type = 'trip_start'
        ORDER BY recorded_at DESC LIMIT 1
      `, [booking_id]);

      if (tripStart.length) {
        const elapsed_min = Math.ceil((new Date() - new Date(tripStart[0].recorded_at)) / (1000 * 60));
        
        // Get estimated duration from fare breakdown
        const [fareData] = await pool.query(
          'SELECT time_min_est FROM ride_fare_breakdowns WHERE booking_id = ?',
          [booking_id]
        );
        
        const estimated_duration = fareData.length ? fareData[0].time_min_est : null;
        
        trip_progress = {
          elapsed_min,
          estimated_duration,
          progress_percentage: estimated_duration ? 
            Math.min(100, Math.round((elapsed_min / estimated_duration) * 100)) : null
        };
      }
    }

    // Get ride details
    const [rideDetails] = await pool.query(`
      SELECT pickup_address, pickup_lat, pickup_lon, drop_address, drop_lat, drop_lon
      FROM ride_bookings WHERE booking_id = ?
    `, [booking_id]);

    res.json({
      booking_id: parseInt(booking_id),
      status: booking.service_status,
      payment_status: booking.payment_status,
      estimated_cost: booking.estimated_cost,
      actual_cost: booking.actual_cost,
      current_location,
      trip_progress,
      ride_details: rideDetails.length ? rideDetails[0] : null,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching trip status:', error);
    res.status(500).json({ message: 'Server error while fetching trip status' });
  }
});

/**
 * POST /trip/pause - Pause trip (for waiting, traffic, etc.)
 */
router.post('/pause', verifyToken, async (req, res) => {
  const { id: user_id, role } = req.user;
  const { booking_id, reason, location } = req.body;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can pause trips' });
  }

  try {
    // Get provider_id and verify access
    const [providerData] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [user_id]
    );

    if (!providerData.length) {
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;

    // Verify booking is in progress
    const [bookingCheck] = await pool.query(
      'SELECT id FROM bookings WHERE id = ? AND provider_id = ? AND service_status = ?',
      [booking_id, provider_id, 'in_progress']
    );

    if (!bookingCheck.length) {
      return res.status(403).json({ message: 'Booking not found or not in progress' });
    }

    // Log pause event
    await pool.query(`
      INSERT INTO trip_location_logs (
        booking_id, provider_id, latitude, longitude, event_type, recorded_at
      ) VALUES (?, ?, ?, ?, 'pause', NOW())
    `, [booking_id, provider_id, location?.lat || null, location?.lng || null]);

    res.json({
      message: 'Trip paused successfully',
      booking_id,
      reason,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error pausing trip:', error);
    res.status(500).json({ message: 'Server error while pausing trip' });
  }
});

/**
 * POST /trip/resume - Resume paused trip
 */
router.post('/resume', verifyToken, async (req, res) => {
  const { id: user_id, role } = req.user;
  const { booking_id, location } = req.body;

  if (role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can resume trips' });
  }

  try {
    // Get provider_id and verify access
    const [providerData] = await pool.query(
      'SELECT id FROM providers WHERE user_id = ?',
      [user_id]
    );

    if (!providerData.length) {
      return res.status(403).json({ message: 'Worker profile not found' });
    }

    const provider_id = providerData[0].id;

    // Verify booking is in progress
    const [bookingCheck] = await pool.query(
      'SELECT id FROM bookings WHERE id = ? AND provider_id = ? AND service_status = ?',
      [booking_id, provider_id, 'in_progress']
    );

    if (!bookingCheck.length) {
      return res.status(403).json({ message: 'Booking not found or not in progress' });
    }

    // Log resume event
    await pool.query(`
      INSERT INTO trip_location_logs (
        booking_id, provider_id, latitude, longitude, event_type, recorded_at
      ) VALUES (?, ?, ?, ?, 'resume', NOW())
    `, [booking_id, provider_id, location?.lat || null, location?.lng || null]);

    res.json({
      message: 'Trip resumed successfully',
      booking_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error resuming trip:', error);
    res.status(500).json({ message: 'Server error while resuming trip' });
  }
});

module.exports = router;
