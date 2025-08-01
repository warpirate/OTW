const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    estimated_cost,
    cost_type,
    duration
  } = req.body;

  if (!pickup_address || !pickup_lat || !pickup_lon || !drop_address || !drop_lat || !drop_lon || !pickup_time) {
    return res.status(400).json({ message: 'Missing required booking information.' });
  }

  const with_vehicle = booking_type === 'with_car' ? 1 : 0;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert booking
    const [result] = await connection.query(
      `INSERT INTO bookings (
          user_id, with_vehicle, pickup_address, pickup_lat, pickup_lon,
          drop_address, drop_lat, drop_lon, booking_type, scheduled_time,
          estimated_cost, service_status, payment_status, created_at, cost_type,duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW(), ?, ?)`,
      [
        user_id,
        with_vehicle,
        pickup_address,
        pickup_lat,
        pickup_lon,
        drop_address,
        drop_lat,
        drop_lon,
        'ride',
        pickup_time,
        estimated_cost || 0,
        cost_type,
        duration
      ]
    );

    const bookingId = result.insertId;

    // 2. Get ride category id
    const [rideCategory] = await connection.query(
      `SELECT id FROM service_categories WHERE category_type = 'driver' AND is_active = 1`
    );

    if (!rideCategory.length) {
      await connection.rollback();
      return res.status(500).json({ message: 'Driver category not found or inactive' });
    }

    const rideCategoryId = rideCategory[0].id;

    // 3. Fetch provider locations
    const [locations] = await connection.query(`
      SELECT pll.provider_id, pll.latitude, pll.longitude, p.service_radius_km
      FROM provider_location_logs pll
      INNER JOIN (
        SELECT provider_id, MAX(recorded_at) as max_time
        FROM provider_location_logs
        GROUP BY provider_id
      ) latest ON pll.provider_id = latest.provider_id AND pll.recorded_at = latest.max_time
      INNER JOIN providers p ON p.id = pll.provider_id
      WHERE p.active = 1 AND p.verified = 1
    `);

    const driverIds = [];
    console.log("locations", locations);
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
    console.log("driver iDs", driverIds);
    // 4. Insert booking requests
    for (const providerId of driverIds) {
      await connection.query(
        `INSERT INTO booking_requests (booking_id, provider_id, status, requested_at)
         VALUES (?, ?, 'pending', NOW())`,
        [bookingId, providerId]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Driver booking created successfully',
      booking_id: bookingId,
      available_providers: driverIds
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
