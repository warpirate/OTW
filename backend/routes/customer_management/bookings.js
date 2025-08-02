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
router.post('/create', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      cart_items, // Array of items from cart
      scheduled_time,
      address_id, // Customer address ID
      notes,
      payment_method = 'online'
    } = req.body;

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

    // Validate scheduled time is not in the past
    const scheduledDateTime = new Date(scheduled_time);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
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

    // Start transaction
    await pool.query('START TRANSACTION');

    try {
      const bookingIds = [];
      let totalAmount = 0;

      // Create a booking for each cart item
      for (const item of cart_items) {
        const { subcategory_id, quantity = 1, price } = item;

        if (!subcategory_id || !price) {
          throw new Error('Invalid cart item: subcategory_id and price are required');
        }

        // Get subcategory details
        const [subcategoryResult] = await pool.query(
          'SELECT * FROM subcategories WHERE id = ?',
          [subcategory_id]
        );

        if (subcategoryResult.length === 0) {
          throw new Error(`Subcategory not found: ${subcategory_id}`);
        }

        const subcategory = subcategoryResult[0];

        // Find an available provider for this subcategory
        // For now, we'll leave provider_id as null and assign later
        const provider_id = null;

        // Calculate prices
        const itemPrice = price * quantity;
        const gst = Math.round(itemPrice * 0.18); // 18% GST
        const totalPrice = itemPrice + gst;

        totalAmount += totalPrice;

        // Create booking
        const [bookingResult] = await pool.query(
          `INSERT INTO bookings 
           (user_id, provider_id, subcategory_id, scheduled_time, address, gst, price, 
            service_status, payment_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())`,
          [
            customerId,
            provider_id,
            subcategory_id,
            scheduled_time,
            `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.state} - ${customerAddress.pin_code}, ${customerAddress.country}`,
            gst,
            totalPrice
          ]
        );

        const bookingId = bookingResult.insertId;
        bookingIds.push(bookingId);

        // Create booking requests for available workers
        // Get customer address coordinates (you might need to add geocoding here)
        // For now, we'll use a default location or get from customer address
        const customerLat = 17.23170000; // Default - you should get this from customer address
        const customerLon = 80.18260000; // Default - you should get this from customer address

        // Find providers who offer this service and are within service radius
        const [providers] = await pool.query(`
          SELECT 
            p.id as provider_id,
            p.service_radius_km,
            p.location_lat,
            p.location_lng
          FROM providers p
          INNER JOIN provider_services ps ON p.id = ps.provider_id
          WHERE ps.subcategory_id = ? 
            AND p.active = 1 
            AND p.verified = 1
            AND p.location_lat IS NOT NULL 
            AND p.location_lng IS NOT NULL
        `, [subcategory_id]);

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

        // Create booking requests for available providers
        for (const providerId of availableProviderIds) {
          await pool.query(
            `INSERT INTO booking_requests (booking_id, provider_id, status, requested_at)
             VALUES (?, ?, 'pending', NOW())`,
            [bookingId, providerId]
          );
        }

        console.log(`Created ${availableProviderIds.length} booking requests for booking ${bookingId}`);
      }

      // Clear the cart after successful booking
      await pool.query('DELETE FROM carts WHERE customer_id = ?', [customerId]);

      // Commit transaction
      await pool.query('COMMIT');

      // Fetch created bookings with subcategory details
      const [bookings] = await pool.query(
        `SELECT b.*, s.name as service_name, s.description as service_description
         FROM bookings b
         JOIN subcategories s ON s.id = b.subcategory_id
         WHERE b.id IN (${bookingIds.map(() => '?').join(',')})`,
        bookingIds
      );

      res.status(201).json({
        message: 'Booking created successfully',
        bookings: bookings,
        total_amount: totalAmount,
        booking_ids: bookingIds
      });

    } catch (error) {
      // Rollback transaction
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /history - Get booking history for customer
router.get('/history', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE b.user_id = ?';
    let queryParams = [customerId];

    if (status) {
      whereClause += ' AND b.service_status = ?';
      queryParams.push(status);
    }

    const [bookings] = await pool.query(
      `SELECT b.*, 
              COALESCE(s.name, 'Ride Service') as service_name, 
              COALESCE(s.description, 'Driver transportation service') as service_description,
              CASE WHEN b.provider_id IS NOT NULL THEN 
                (SELECT u.name FROM users u WHERE u.id = (SELECT user_id FROM providers WHERE id = b.provider_id))
              ELSE 'Not Assigned' END as provider_name,
              CASE 
                WHEN b.booking_type = 'ride' THEN 
                  CONCAT(b.pickup_address, ' → ', b.drop_address)
                ELSE b.address 
              END as display_address,
              CASE 
                WHEN b.booking_type = 'ride' THEN b.estimated_cost
                ELSE b.price 
              END as display_price
       FROM bookings b
       LEFT JOIN subcategories s ON s.id = b.subcategory_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b ${whereClause}`,
      queryParams
    );

    res.json({
      bookings,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (err) {
    console.error('Error fetching booking history:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /:id - Get specific booking details
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
                  CONCAT(b.pickup_address, ' → ', b.drop_address)
                ELSE b.address 
              END as display_address,
              CASE 
                WHEN b.booking_type = 'ride' THEN b.estimated_cost
                ELSE b.price 
              END as display_price
       FROM bookings b
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
    const scheduledTime = new Date(booking.scheduled_time);
    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 2) {
      return res.status(400).json({ 
        message: 'Cannot cancel booking within 2 hours of scheduled time' 
      });
    }

    // Cancel the booking
    await pool.query(
      `UPDATE bookings 
       SET service_status = 'cancelled', payment_status = 'refunded'
       WHERE id = ?`,
      [bookingId]
    );

    res.json({ message: 'Booking cancelled successfully' });

  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 