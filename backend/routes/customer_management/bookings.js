const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');

// Haversine distance calculation function
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper function to generate available time slots for a given date
const generateTimeSlots = (date) => {
  const slots = [];
  const startHour = 8; // 8 AM
  const endHour = 20; // 8 PM
  const intervalMinutes = 60; // 1 hour slots

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeSlot = {
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        datetime: `${date} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`,
        available: true
      };
      slots.push(timeSlot);
    }
  }

  return slots;
};

// GET /available-slots - Get available time slots for a date
router.get('/available-slots', verifyToken, async (req, res) => {
  try {
    const { date, subcategory_id } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Check if date is not in the past
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({ message: 'Cannot book slots for past dates' });
    }

    // Generate all possible time slots
    const allSlots = generateTimeSlots(date);

    // Get booked slots for the date (if subcategory_id is provided, check provider availability)
    let bookedSlotsQuery = `
      SELECT scheduled_time, COUNT(*) as booking_count 
      FROM bookings 
      WHERE DATE(scheduled_time) = ? 
      AND service_status NOT IN ('cancelled', 'completed')
    `;
    let queryParams = [date];

    if (subcategory_id) {
      bookedSlotsQuery += ' AND subcategory_id = ?';
      queryParams.push(subcategory_id);
    }

    bookedSlotsQuery += ' GROUP BY scheduled_time';

    const [bookedSlots] = await pool.query(bookedSlotsQuery, queryParams);

    // Create a map of booked slots
    const bookedSlotsMap = {};
    bookedSlots.forEach(slot => {
      const time = slot.scheduled_time.toISOString().slice(11, 16); // Extract HH:MM
      bookedSlotsMap[time] = slot.booking_count;
    });

    // Mark slots as unavailable if they're fully booked
    // For simplicity, assuming each slot can handle max 3 concurrent bookings
    const maxConcurrentBookings = 3;
    
    const availableSlots = allSlots.map(slot => ({
      ...slot,
      available: !bookedSlotsMap[slot.time] || bookedSlotsMap[slot.time] < maxConcurrentBookings,
      bookingCount: bookedSlotsMap[slot.time] || 0
    }));

    res.json({
      date,
      slots: availableSlots
    });
  } catch (err) {
    console.error('Error fetching available slots:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /create - Create a new booking
// POST /create - Create a new booking
router.post('/create', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      cart_items,
      scheduled_time,
      address_id,
      notes,
      payment_method = 'online'
    } = req.body;
    console.log(req.body);
    // Validate required fields
    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required' });
    }
    if (!scheduled_time) {
      return res.status(400).json({ message: 'Scheduled time is required' });
    }
    if (!address_id) {
      return res.status(400).json({ message: 'Address is required' });
    }

 
    const nowUTC = new Date();
    // Treat incoming scheduled_time (YYYY-MM-DD HH:mm:ss) as UTC
    const scheduledUtcDate = new Date((scheduled_time + 'Z').replace(' ', 'T'));
    if (scheduledUtcDate <= nowUTC) {
      return res.status(400).json({ message: 'Cannot book for past time' });
    }

    // Verify address belongs to customer
    const [addressResult] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ? AND customer_id = ? AND is_active = 1',
      [address_id, customerId]
    );
    if (addressResult.length === 0) {
      return res.status(400).json({ message: 'Invalid address' });
    }
    const customerAddress = addressResult[0];

    // UTC timestamp for created_at in MySQL format
    const createdAtUTC = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Start transaction
    await pool.query('START TRANSACTION');

    try {
      const bookingIds = [];
      let totalAmount = 0;
      // Collect provider notifications to emit after COMMIT
      const emitsToProviders = [];

      // Create a booking for each cart item
      for (const item of cart_items) {
        const { subcategory_id, quantity = 1, price } = item;
        if (!subcategory_id || !price) {
          throw new Error('Invalid cart item: subcategory_id and price are required');
        }

        // Get subcategory details
        const [subcategoryResult] = await pool.query(
          'SELECT s.*, c.name as category_name FROM subcategories s JOIN service_categories c ON s.category_id = c.id WHERE s.id = ?',
          [subcategory_id]
        );
        if (subcategoryResult.length === 0) {
          throw new Error(`Subcategory not found: ${subcategory_id}`);
        }
        
        const subcategory = subcategoryResult[0];
        // Determine booking type based on category (assuming ride category has specific name/id)
        const booking_type = subcategory.category_name?.toLowerCase().includes('ride') || subcategory.category_name?.toLowerCase().includes('driver') ? 'ride' : 'service';

        // For now, provider_id is null
        const provider_id = null;

        // Calculate prices
        const itemPrice = price * quantity;
        const gst = Math.round(itemPrice * 0.18); // 18% GST
        const totalPrice = itemPrice + gst;
        totalAmount += totalPrice;

        // Create booking with explicit UTC created_at
        const [bookingResult] = await pool.query(
          `INSERT INTO bookings 
           (user_id, provider_id, booking_type, subcategory_id, scheduled_time, gst, 
            estimated_cost, price, service_status, payment_status, created_at, duration, cost_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)`,
          [
            customerId,
            provider_id,
            booking_type,
            subcategory_id,
            scheduled_time,
            gst,
            totalPrice, // estimated_cost
            totalPrice, // price
            createdAtUTC,
            1, // duration - default 1 hour/day
            'per_hour' // cost_type - default per hour
          ]
        );

        const bookingId = bookingResult.insertId;
        bookingIds.push(bookingId);

        // Insert into appropriate booking type table
        if (booking_type === 'service') {
          // Insert into service_bookings table
          await pool.query(
            `INSERT INTO service_bookings (booking_id, address)
             VALUES (?, ?)`,
            [
              bookingId,
              `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.state} - ${customerAddress.pin_code}, ${customerAddress.country}`
            ]
          );
        } else if (booking_type === 'ride') {
          // For ride bookings, you would insert into ride_bookings table
          // This would need pickup_address, pickup_lat, pickup_lon, drop_address, drop_lat, drop_lon
          // For now, we'll skip this as it requires additional data from the frontend
          console.log('Ride booking created, but ride_bookings table insertion not implemented yet');
        }

        // Find available providers (simplified — same as your original code)
        const customerLat = customerAddress.location_lat || null;
        const customerLon = customerAddress.location_lng || null;
        console.log("customerLat", customerLat);
        console.log("customerLon", customerLon);
        console.log("subcategory_id", subcategory_id);
        console.log("bookingId", bookingId);
        console.log("scheduled_time", scheduled_time);
        const [providers] = await pool.query(`
          SELECT p.id as provider_id, p.service_radius_km, p.location_lat, p.location_lng
          FROM providers p
          INNER JOIN provider_services ps ON p.id = ps.provider_id
          WHERE ps.subcategory_id = ? 
            AND p.active = 1 
            AND p.verified = 1
            AND p.location_lat IS NOT NULL 
            AND p.location_lng IS NOT NULL
        `, [subcategory_id]);
        console.log("providers", providers);
        const availableProviderIds = [];
        for (const provider of providers) {
          if (provider.location_lat && provider.location_lng) {
            const distance = haversineDistance(
              customerLat, 
              customerLon, 
              provider.location_lat, 
              provider.location_lng
            );
            if (distance <= provider.service_radius_km) {
              availableProviderIds.push(provider.provider_id);
            }
          }
        }
        console.log("availableProviderIds", availableProviderIds);
        console.log("bookingId", bookingId);
        // Create booking requests
        for (const providerId of availableProviderIds) {
          await pool.query(
            `INSERT INTO booking_requests (booking_id, provider_id, status, requested_at)
             VALUES (?, ?, 'pending', ?)`,
            [bookingId, providerId, createdAtUTC]
          );
          // Queue socket emission to provider room after commit
          emitsToProviders.push({ providerId, bookingId, booking_type });
        }
      }

      // Clear the cart
      await pool.query('DELETE FROM carts WHERE customer_id = ?', [customerId]);

      // Commit transaction
      await pool.query('COMMIT');

      // Emit Socket.IO events to notify providers of new booking requests
      try {
        const io = req.app.get('io');
        if (io) {
          for (const item of emitsToProviders) {
            io.to(`provider:${item.providerId}`).emit('booking_requests:new', {
              booking_id: item.bookingId,
              booking_type: item.booking_type || 'service',
              status: 'pending'
            });
          }
          // Optionally notify the customer their bookings were created
          io.to(`user:${customerId}`).emit('bookings:created', {
            booking_ids: bookingIds
          });
        }
      } catch (emitErr) {
        console.error('Socket emit error (create booking):', emitErr.message);
      }

      // Fetch created bookings
      const [bookings] = await pool.query(
        `SELECT b.*, s.name as service_name, s.description as service_description
         FROM bookings b
         JOIN subcategories s ON s.id = b.subcategory_id
         WHERE b.id IN (${bookingIds.map(() => '?').join(',')})`,
        bookingIds
      );

      res.status(201).json({
        message: 'Booking created successfully',
        bookings,
        total_amount: totalAmount,
        booking_ids: bookingIds
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { limit = 10, status, lastId } = req.query;

    // Common WHERE clause
    let whereClause = 'WHERE b.user_id = ?';
    const baseParams = [customerId];
    if (status) {
      whereClause += ' AND b.service_status = ?';
      baseParams.push(status);
    }

    // Cursor-based pagination only: order by id DESC and use lastId cursor
    const perPage = parseInt(limit);
    const fetchLimit = perPage + 1; // fetch one extra to know if there's more

    let cursorWhere = whereClause;
    const params = [...baseParams];
    if (lastId) {
      cursorWhere += ' AND b.id < ?';
      params.push(parseInt(lastId));
    }

    const [rows] = await pool.query(
      `SELECT b.*, 
              COALESCE(s.name, 'Ride Service') as service_name, 
              COALESCE(s.description, 'Driver transportation service') as service_description,
              CASE WHEN b.provider_id IS NOT NULL THEN 
                (SELECT u.name FROM users u WHERE u.id = (SELECT user_id FROM providers WHERE id = b.provider_id))
              ELSE 'Not Assigned' END as provider_name,
              CASE 
                WHEN b.booking_type = 'ride' THEN 
                  CONCAT(rb.pickup_address, ' → ', rb.drop_address)
                ELSE sb.address 
              END as display_address,
              CASE 
                WHEN b.booking_type = 'ride' THEN b.estimated_cost
                ELSE b.price 
              END as display_price
       FROM bookings b
       LEFT JOIN ride_bookings rb ON rb.booking_id = b.id
       LEFT JOIN subcategories s ON s.id = b.subcategory_id
       LEFT JOIN service_bookings sb ON sb.booking_id = b.id
       ${cursorWhere}
       ORDER BY b.id DESC
       LIMIT ?`,
      [...params, fetchLimit]
    );

    const hasMore = rows.length > perPage;
    const bookings = hasMore ? rows.slice(0, perPage) : rows;
    const nextLastId = bookings.length ? bookings[bookings.length - 1].id : null;

    return res.json({
      bookings,
      hasMore,
      lastId: nextLastId
    });
  } catch (err) {
    console.error('Error fetching booking history:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /summary - Get aggregate stats for customer's bookings (independent of pagination)
router.get('/summary', verifyToken, async (req, res) => {
try {
  const customerId = req.user.id;

  const [rows] = await pool.query(
    `SELECT 
       COUNT(*) AS totalBookings,
       SUM(CASE WHEN service_status IN ('pending','assigned') THEN 1 ELSE 0 END) AS activeBookings,
       COALESCE(SUM(CASE WHEN service_status = 'completed' THEN 
         (CASE WHEN booking_type = 'ride' THEN estimated_cost ELSE price END)
       ELSE 0 END), 0) AS totalSpent
     FROM bookings
     WHERE user_id = ?`,
    [customerId]
  );

  const { totalBookings = 0, activeBookings = 0, totalSpent = 0 } = rows[0] || {};
  return res.json({ totalBookings, activeBookings, totalSpent });
} catch (err) {
  console.error('Error fetching booking summary:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
}
});

// GET /:id - Get booking details
router.get('/:id', verifyToken, async (req, res) => {
try {
  const customerId = req.user.id;
  const bookingId = req.params.id;

  const [bookings] = await pool.query(
    `SELECT b.*, 
          
            COALESCE(s.name, 'Ride Service') as service_name, 
            COALESCE(s.description, 'Driver transportation service') as service_description,
            CASE WHEN b.provider_id IS NOT NULL THEN 
              (SELECT u.name FROM users u WHERE u.id = (SELECT user_id FROM providers WHERE id = b.provider_id))
            ELSE 'Not Assigned' END as provider_name,
            CASE WHEN b.provider_id IS NOT NULL THEN 
              (SELECT u.phone_number FROM users u WHERE u.id = (SELECT user_id FROM providers WHERE id = b.provider_id))
            ELSE NULL END as provider_phone,
            CASE 
              WHEN b.booking_type = 'ride' THEN 
                CONCAT(rb.pickup_address, ' → ', rb.drop_address)
              ELSE sb.address 
            END as display_address,
            CASE 
              WHEN b.booking_type = 'ride' THEN b.estimated_cost
              ELSE b.price 
            END as display_price
     FROM bookings b
     
     LEFT JOIN ride_bookings rb ON rb.booking_id = b.id
     LEFT JOIN service_bookings sb ON sb.booking_id = b.id
     LEFT JOIN subcategories s ON s.id = b.subcategory_id
     WHERE b.id = ? AND b.user_id = ?`,
    [bookingId, customerId]
  );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking: bookings[0] });

  } catch (err) {
    console.error('Error fetching booking details:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /:id/cancel - Cancel a booking
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const bookingId = req.params.id;
    const { cancellation_reason } = req.body;
    console.log("booking cancel " , req.body);
    // Check if booking exists and belongs to customer
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, customerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookings[0];

    // Check if booking can be cancelled
    if (booking.service_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (booking.service_status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed booking' });
    }

    // Check if booking is too close to scheduled time (e.g., within 2 hours)
    // Use client-provided UTC time if available, else fall back to server time
    const scheduledTime = new Date(booking.scheduled_time);
    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff > 2) {
      return res.status(400).json({ 
        message: 'Cannot cancel booking more than 2 hours before scheduled time' 
      });
    }

    // Cancel the booking
    await pool.query(
      `UPDATE bookings 
       SET service_status = 'cancelled', payment_status = 'refunded'
       WHERE id = ?`,
      [bookingId]
    );

    // Emit Socket.IO events to notify providers and customer
    try {
      const io = req.app.get('io');
      if (io) {
        // Notify all providers who received a request for this booking
        const [reqProviders] = await pool.query(
          'SELECT provider_id FROM booking_requests WHERE booking_id = ?',
          [bookingId]
        );
        for (const row of reqProviders) {
          io.to(`provider:${row.provider_id}`).emit('bookings:cancelled', {
            booking_id: parseInt(bookingId)
          });
        }
        // Notify the customer as well
        io.to(`user:${booking.user_id}`).emit('bookings:cancelled', {
          booking_id: parseInt(bookingId)
        });
      }
    } catch (emitErr) {
      console.error('Socket emit error (cancel booking):', emitErr.message);
    }

    res.json({ message: 'Booking cancelled successfully' });

  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 