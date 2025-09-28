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

// POST /check-worker-availability - Check worker availability for a specific date/time and services
router.post('/check-worker-availability', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { date, time, address_id, services } = req.body || {};

    // Basic validation
    if (!date || !time || !address_id || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ message: 'date, time, address_id, and services[] are required' });
    }

    // Validate formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (!timeRegex.test(time)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24h)' });
    }

    const scheduledTime = `${date} ${time}:00`;
    const scheduledUtc = new Date((scheduledTime + 'Z').replace(' ', 'T'));
    if (isNaN(scheduledUtc.getTime())) {
      return res.status(400).json({ message: 'Invalid date/time provided' });
    }
    const nowUtc = new Date();
    if (scheduledUtc <= nowUtc) {
      return res.json({
        date,
        time,
        male_available: false,
        female_available: false,
        any_available: false,
        slot_available: false,
        reason: 'Selected time is in the past'
      });
    }

    // Verify the address belongs to the customer and get coordinates
    const [addrRows] = await pool.query(
      'SELECT address_id, customer_id, location_lat, location_lng FROM customer_addresses WHERE address_id = ? AND customer_id = ? AND is_active = 1',
      [address_id, customerId]
    );
    if (addrRows.length === 0) {
      return res.status(400).json({ message: 'Invalid address' });
    }
    const customerLat = addrRows[0].location_lat;
    const customerLng = addrRows[0].location_lng;

    // Enforce per-slot capacity (match logic from /available-slots)
    const [slotCntRows] = await pool.query(
      `SELECT COUNT(*) AS booking_count
       FROM bookings
       WHERE scheduled_time = ?
         AND service_status NOT IN ('cancelled','completed')`,
      [scheduledTime]
    );
    const maxConcurrentBookings = 3;
    const currentCount = slotCntRows[0]?.booking_count ? parseInt(slotCntRows[0].booking_count) : 0;
    const slotAvailable = currentCount < maxConcurrentBookings;
    if (!slotAvailable) {
      return res.json({
        date,
        time,
        male_available: false,
        female_available: false,
        any_available: false,
        slot_available: false,
        reason: 'Time slot is fully booked'
      });
    }

    // Collect subcategory IDs from services
    const subcategoryIds = services
      .map(s => (typeof s === 'object' ? (s.subcategory_id || s.id) : s))
      .filter(id => id !== undefined && id !== null)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
    if (subcategoryIds.length === 0) {
      return res.status(400).json({ message: 'services must include valid subcategory_id values' });
    }

    // Find candidate providers by service and active/verified status
    const placeholders = subcategoryIds.map(() => '?').join(',');
    const [providers] = await pool.query(
      `SELECT DISTINCT p.id AS provider_id, p.service_radius_km, p.location_lat, p.location_lng, u.gender
       FROM providers p
       INNER JOIN provider_services ps ON p.id = ps.provider_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE ps.subcategory_id IN (${placeholders})
         AND p.active = 1
         AND p.verified = 1
         AND p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL`,
      subcategoryIds
    );

    // Filter by radius from customer address (if coords exist)
    let inRadius = providers;
    if (customerLat !== null && customerLat !== undefined && customerLng !== null && customerLng !== undefined) {
      inRadius = providers.filter(p => {
        try {
          const dist = haversineDistance(
            parseFloat(customerLat),
            parseFloat(customerLng),
            parseFloat(p.location_lat),
            parseFloat(p.location_lng)
          );
          return dist <= parseFloat(p.service_radius_km || 0);
        } catch (e) {
          return false;
        }
      });
    }

    if (inRadius.length === 0) {
      return res.json({
        date,
        time,
        male_available: false,
        female_available: false,
        any_available: false,
        slot_available: true,
        reason: 'No providers found within service radius'
      });
    }

    // Exclude providers already busy at that scheduled_time
    const [busyRows] = await pool.query(
      `SELECT DISTINCT provider_id
       FROM bookings
       WHERE scheduled_time = ?
         AND provider_id IS NOT NULL
         AND service_status IN ('assigned','accepted','in_progress')`,
      [scheduledTime]
    );
    const busySet = new Set(busyRows.map(r => r.provider_id));
    const availableProviders = inRadius.filter(p => !busySet.has(p.provider_id));

    const maleCount = availableProviders.filter(p => (p.gender || '').toLowerCase() === 'male').length;
    const femaleCount = availableProviders.filter(p => (p.gender || '').toLowerCase() === 'female').length;

    return res.json({
      date,
      time,
      male_available: maleCount > 0,
      female_available: femaleCount > 0,
      any_available: maleCount + femaleCount > 0,
      slot_available: true,
      counts: {
        male: maleCount,
        female: femaleCount,
        total: maleCount + femaleCount
      }
    });
  } catch (err) {
    console.error('Error checking worker availability:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /create - Create a new booking
router.post('/create', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      cart_items,
      scheduled_time,
      address_id,
      notes,
      payment_method = 'online',
      worker_preference = 'any'
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

    // Fetch customer's discount percentage from customer_types
    let discountPercentage = 0;
    try {
      const [[discRow]] = await pool.query(
        `SELECT COALESCE(ct.discount_percentage, 0) AS discount_percentage
         FROM customers c
         LEFT JOIN customer_types ct ON ct.id = c.customer_type_id
         WHERE c.id = ?
         LIMIT 1`,
        [customerId]
      );
      discountPercentage = parseFloat(discRow?.discount_percentage || 0) || 0;
    } catch (e) {
      discountPercentage = 0;
    }

    // UTC timestamp for created_at in MySQL format
    const createdAtUTC = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // Normalize and validate worker preference
    const prefRaw = (worker_preference || 'any').toString().toLowerCase();
    const preference = ['any', 'male', 'female'].includes(prefRaw) ? prefRaw : 'any';

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

        // Calculate prices with customer-type discount before GST
        const itemPrice = price * quantity;
        const discountAmount = Math.round((itemPrice * discountPercentage) / 100);
        const discountedPrice = Math.max(itemPrice - discountAmount, 0);
        const gst = Math.round(discountedPrice * 0.18); // 18% GST
        const totalPrice = discountedPrice + gst;
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
          SELECT p.id as provider_id, p.service_radius_km, p.location_lat, p.location_lng, u.gender
          FROM providers p
          INNER JOIN provider_services ps ON p.id = ps.provider_id
          INNER JOIN users u ON u.id = p.user_id
          WHERE ps.subcategory_id = ? 
            AND p.active = 1 
            AND p.verified = 1
            AND p.location_lat IS NOT NULL 
            AND p.location_lng IS NOT NULL
        `, [subcategory_id]);
        console.log("providers", providers);
        // Exclude providers already busy at this scheduled_time
        const [busyRows] = await pool.query(`
          SELECT DISTINCT provider_id
          FROM bookings
          WHERE scheduled_time = ?
            AND provider_id IS NOT NULL
            AND service_status IN ('assigned','accepted','in_progress')
        `, [scheduled_time]);
        const busySet = new Set(busyRows.map(r => r.provider_id));

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
              // Gender filter
              const gender = (provider.gender || '').toLowerCase();
              if (preference !== 'any' && gender !== preference) {
                continue;
              }
              // Busy filter
              if (busySet.has(provider.provider_id)) {
                continue;
              }
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
            END as display_price,
            -- Get payment info from payments table
            p.id as payment_id,
            p.razorpay_payment_id,
            p.razorpay_order_id,
            p.amount_paid,
            CASE 
              WHEN p.status = 'captured' THEN 'paid'
              WHEN p.status = 'authorized' THEN 'authorized'  
              WHEN p.status = 'created' THEN 'pending'
              WHEN p.status = 'failed' THEN 'failed'
              WHEN b.cash_payment_id IS NOT NULL THEN 'paid'
              ELSE 'pending'
            END as payment_status,
            CASE 
              WHEN p.payment_type = 'razorpay' THEN 'Razorpay'
              WHEN p.payment_type = 'upi' THEN 'UPI Payment'
              WHEN b.cash_payment_id IS NOT NULL THEN 'pay_after_service'
              WHEN b.upi_payment_method_id IS NOT NULL THEN 'UPI Payment'
              ELSE 'pay_after_service'
            END as payment_method,
            p.captured_at as payment_completed_at
     FROM bookings b
     LEFT JOIN ride_bookings rb ON rb.booking_id = b.id
     LEFT JOIN service_bookings sb ON sb.booking_id = b.id
     LEFT JOIN subcategories s ON s.id = b.subcategory_id
     LEFT JOIN payments p ON b.id = p.booking_id AND p.status IN ('created', 'authorized', 'captured')
     WHERE b.id = ? AND b.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT 1`,
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

    // Allow cancellation at any time - no time restrictions

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

// GET /:id/otp-status - Check OTP status for a booking (customer side)
router.get('/:id/otp-status', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const bookingId = req.params.id;

    // Check if booking exists and belongs to customer
    const [bookings] = await pool.query(
      'SELECT id, service_status, otp_code, otp_expires_at FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, customerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookings[0];
    const now = new Date();
    const hasOtp = !!booking.otp_code;
    const isValidOtp = hasOtp && booking.otp_expires_at && new Date(booking.otp_expires_at) > now;

    res.json({
      has_otp: hasOtp,
      otp_valid: isValidOtp,
      expires_at: booking.otp_expires_at,
      service_status: booking.service_status,
      message: hasOtp ? 
        (isValidOtp ? 'OTP is valid and active' : 'OTP has expired') : 
        'No OTP generated yet'
    });

  } catch (err) {
    console.error('Error checking OTP status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /:id/generate-otp - Generate OTP for service booking (customer side)
router.post('/:id/generate-otp', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const bookingId = req.params.id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get booking details with customer and worker information
      const [bookingDetails] = await connection.query(`
        SELECT 
          b.id, b.user_id AS customer_id, b.service_status, b.otp_code, b.otp_expires_at,
          u.name as customer_name, u.email as customer_email,
          wu.name as worker_name,
          sc.name as service_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN providers p ON b.provider_id = p.id
        LEFT JOIN users wu ON p.user_id = wu.id
        LEFT JOIN booking_items bi ON b.id = bi.booking_id
        LEFT JOIN subcategories sc ON bi.subcategory_id = sc.id
        WHERE b.id = ? AND b.user_id = ?
        LIMIT 1
      `, [bookingId, customerId]);

      if (bookingDetails.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Booking not found' });
      }

      const booking = bookingDetails[0];

      // Check if booking is in appropriate status (arrived or in_progress)
      if (!['arrived', 'in_progress'].includes(booking.service_status)) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'OTP can only be generated when service provider has arrived or service is in progress' 
        });
      }

      // Check if OTP was generated recently (prevent spam)
      const now = new Date();
      if (booking.otp_expires_at && new Date(booking.otp_expires_at) > now) {
        const timeLeft = Math.ceil((new Date(booking.otp_expires_at) - now) / 60000);
        await connection.rollback();
        return res.status(429).json({ 
          message: `OTP is still valid. Please wait ${timeLeft} minutes before requesting a new OTP` 
        });
      }

      // Generate new OTP (6-digit number)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      
      await connection.query(
        'UPDATE bookings SET otp_code = ?, otp_expires_at = ?, updated_at = NOW() WHERE id = ?',
        [otp, expiresAt, bookingId]
      );

      await connection.commit();

      res.json({ 
        success: true, 
        message: 'OTP generated successfully',
        otp: otp, // Return OTP to customer so they can share with worker
        expires_at: expiresAt.toISOString(),
        customer_email: booking.customer_email
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Error generating OTP:', err);
    res.status(500).json({ message: 'Server error while generating OTP' });
  }
});

// POST /:id/verify-otp - Verify OTP (customer side - for customer verification if needed)
router.post('/:id/verify-otp', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const bookingId = req.params.id;
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ message: 'Please provide a valid 6-digit OTP' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get booking details with OTP information
      const [bookingDetails] = await connection.query(`
        SELECT id, service_status, otp_code, otp_expires_at
        FROM bookings 
        WHERE id = ? AND user_id = ?
      `, [bookingId, customerId]);

      if (bookingDetails.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Booking not found' });
      }

      const booking = bookingDetails[0];

      if (!booking.otp_code) {
        await connection.rollback();
        return res.status(400).json({ message: 'No OTP has been generated for this booking' });
      }

      // Check if OTP has expired
      const now = new Date();
      if (new Date(booking.otp_expires_at) <= now) {
        await connection.rollback();
        return res.status(400).json({ message: 'OTP has expired. Please generate a new one.' });
      }

      // Verify OTP
      if (booking.otp_code !== otp) {
        await connection.rollback();
        return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
      }

      // OTP is valid - for customer verification, we just confirm but don't change booking status
      // (The worker will verify and complete the service from their end)
      
      await connection.commit();

      res.json({
        success: true,
        message: 'OTP verified successfully',
        service_status: booking.service_status
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Error verifying OTP (customer):', err);
    res.status(500).json({ message: 'Server error while verifying OTP' });
  }
});

module.exports = router;