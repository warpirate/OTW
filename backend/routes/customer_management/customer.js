const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');

 router.get('/get-categories', async (req, res) => {
  try {

    // Pagination implementation
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM service_categories');

    // Fetch paginated results
    const [rows] = await pool.query(
      'SELECT id, name, category_type FROM service_categories WHERE is_active = 1 LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({
      category_data: rows,
      pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/sub-categories', async (req, res) => {
    try {
        const { categoryId } = req.query;
        console.log("categoryId from query:", categoryId);
        const sql = 'SELECT * FROM subcategories WHERE category_id = ?';
        const [rows] = await pool.query(sql, [categoryId]);
        res.json(rows);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    address,
    pin_code,
    city,
    state,
    country,
    location_lat,
    location_lng,
    phone_number,
    gender // <-- add gender
  } = req.body;
  console.log("updated customer", req.body);
  try {
    // Update customer address fields
    const customerFields = [];
    const customerValues = [];

    if (address) { customerFields.push('address = ?'); customerValues.push(address); }
    if (pin_code) { customerFields.push('pin_code = ?'); customerValues.push(pin_code); }
    if (city) { customerFields.push('city = ?'); customerValues.push(city); }
    if (state) { customerFields.push('state = ?'); customerValues.push(state); }
    if (country) { customerFields.push('country = ?'); customerValues.push(country); }
    if (location_lat) { customerFields.push('location_lat = ?'); customerValues.push(location_lat); }
    if (location_lng) { customerFields.push('location_lng = ?'); customerValues.push(location_lng); }

    // Update customer address if there are fields to update
    if (customerFields.length > 0) {
      customerValues.push(id); // Add ID for WHERE clause
      await pool.query(
        `UPDATE customer_addresses SET ${customerFields.join(', ')} WHERE customer_id = ? AND is_default = 1`,
        customerValues
      );
    }

    // Update phone number in users table if provided
    if (phone_number) {
      await pool.query(
        'UPDATE users SET phone_number = ? WHERE id = ?',
        [phone_number, id]
      );
    }

    // Update gender in users table if provided
    if (gender) {
      await pool.query(
        'UPDATE users SET gender = ? WHERE id = ?',
        [gender, id]
      );
    }

    if (customerFields.length === 0 && !phone_number) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    res.json({ message: 'Customer profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get profile from customers table and users table also
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { id } = req.user;
    const [rows] = await pool.query(
      `SELECT 
          c.*, 
          u.name, u.email, u.phone_number, u.gender, 
          ca.address, ca.city, ca.state, ca.country, ca.pin_code, 
          ca.location_lat, ca.location_lng
       FROM customers c
       LEFT JOIN users u 
         ON c.id = u.id 
       LEFT JOIN customer_addresses ca 
         ON c.id = ca.customer_id 
         AND ca.is_default = 1
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );
    console.log("rows",rows);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
 
router.get('/search-services', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

      // If no query term provided, return empty results
    if (!q || q.trim().length === 0) {
      return res.json({ categories: [], subcategories: [] });
    }

    const searchTerm = `%${q}%`;
    const resultLimit = parseInt(limit, 10) || 10;

    // Search active categories by name
    const [categories] = await pool.query(
      `SELECT id, name, category_type FROM service_categories 
       WHERE is_active = 1 AND name LIKE ? 
       LIMIT ?`,
      [searchTerm, resultLimit]
    );

    // Search subcategories by name and join parent category for easier navigation
    const [subcategories] = await pool.query(
      `SELECT s.id, s.name, s.category_id, c.name AS category_name
       FROM subcategories s 
       JOIN service_categories c ON c.id = s.category_id
       WHERE s.name LIKE ? 
       LIMIT ?`,
      [searchTerm, resultLimit]
    );

    res.json({ categories, subcategories });
  } catch (err) {
    console.error('Error searching services:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /bookings/:bookingId/generate-otp - Generate OTP for customer
 */
router.post('/bookings/:bookingId/generate-otp', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { id: user_id, role } = req.user;

  if (role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can generate OTP' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the customer owns this booking
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.customer_id, b.service_status, b.provider_id
      FROM bookings b
      WHERE b.id = ? AND b.booking_type != 'ride'
    `, [bookingId]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Service booking not found' });
    }

    const booking = bookingCheck[0];

    // Check if customer owns this booking
    if (booking.customer_id !== user_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to access this booking' });
    }

    // Check if booking is in arrived status
    if (booking.service_status !== 'arrived') {
      await connection.rollback();
      return res.status(400).json({ message: 'Booking must be in arrived status to generate OTP' });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await connection.query(
      'UPDATE bookings SET otp_code = ?, updated_at = NOW() WHERE id = ?',
      [otp, bookingId]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      otp: otp,
      message: 'OTP generated successfully. Share this code with your service provider.'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error generating OTP:', error);
    res.status(500).json({ message: 'Server error while generating OTP' });
  } finally {
    connection.release();
  }
});

/**
 * POST /bookings/:bookingId/process-payment - Process payment for completed service using Razorpay
 */
router.post('/bookings/:bookingId/process-payment', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { amount, payment_method, upi_id } = req.body;
  const { id: user_id, role } = req.user;

  if (role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can process payments' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the customer owns this booking
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.customer_id, b.service_status, b.total_amount, b.payment_status, b.payment_method
      FROM bookings b
      WHERE b.id = ? AND b.booking_type != 'ride'
    `, [bookingId]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Service booking not found' });
    }

    const booking = bookingCheck[0];

    // Check if customer owns this booking
    if (booking.customer_id !== user_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to access this booking' });
    }

    // Check if booking is in payment_required status
    if (booking.service_status !== 'payment_required') {
      await connection.rollback();
      return res.status(400).json({ message: 'Service must be in payment_required status' });
    }

    // Check if already paid
    if (booking.payment_status === 'paid') {
      await connection.rollback();
      return res.status(400).json({ message: 'Payment already processed for this booking' });
    }

    // Verify amount matches
    if (parseFloat(amount) !== parseFloat(booking.total_amount)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Payment amount does not match booking total' });
    }

    // For UPI payments, use Razorpay integration
    if (payment_method === 'upi' && upi_id) {
      // Import Razorpay functions
      const { createUPIOrder, createUPIPaymentRequest } = require('../../config/razorpay');
      
      // Generate transaction ID
      const transactionId = `TXN_${bookingId}_${Date.now()}`;
      
      // Create Razorpay order
      const orderResult = await createUPIOrder(amount, 'INR', transactionId);
      
      if (!orderResult.success) {
        await connection.rollback();
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create payment order',
          error: orderResult.error 
        });
      }

      // Create UPI payment request
      const paymentResult = await createUPIPaymentRequest(
        orderResult.order.id,
        upi_id,
        amount,
        `Payment for booking #${bookingId}`
      );

      if (!paymentResult.success) {
        await connection.rollback();
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create payment request',
          error: paymentResult.error 
        });
      }

      // Store payment details in database for webhook processing
      await connection.query(
        `INSERT INTO upi_transactions 
         (user_id, booking_id, transaction_id, amount, status, upi_transaction_id, payment_gateway_response) 
         VALUES (?, ?, ?, ?, 'processing', ?, ?)`,
        [
          user_id,
          bookingId,
          transactionId,
          amount,
          paymentResult.payment.id,
          JSON.stringify({
            razorpay_order_id: orderResult.order.id,
            razorpay_payment_id: paymentResult.payment.id,
            status: paymentResult.payment.status,
            upi_id: upi_id
          })
        ]
      );

      await connection.commit();

      // Return payment details for client
      res.json({
        success: true,
        payment_id: transactionId,
        razorpay_order_id: orderResult.order.id,
        razorpay_payment_id: paymentResult.payment.id,
        upi_id: upi_id,
        amount: amount,
        currency: 'INR',
        status: 'processing',
        message: 'Payment request created successfully. Please complete payment in your UPI app.'
      });

    } else {
      // For cash payments, credit worker wallet and mark as paid
      const WalletService = require('../../services/walletService');
      
      // Get provider details for the booking
      const [providerData] = await connection.query(
        'SELECT provider_id FROM bookings WHERE id = ?',
        [bookingId]
      );

      if (providerData.length > 0 && providerData[0].provider_id) {
        // Get worker user_id from provider_id
        const [workerData] = await connection.query(
          'SELECT user_id FROM providers WHERE id = ?',
          [providerData[0].provider_id]
        );

        if (workerData.length > 0) {
          // Credit worker wallet
          await WalletService.creditWallet(
            workerData[0].user_id,
            amount,
            bookingId,
            `Cash payment for booking #${bookingId}`
          );
        }
      }

      // Update booking status
      await connection.query(
        'UPDATE bookings SET payment_status = ?, payment_method = ?, payment_completed_at = NOW(), service_status = ?, updated_at = NOW() WHERE id = ?',
        ['paid', payment_method || 'cash', 'completed', bookingId]
      );

      await connection.commit();

      // Emit Socket.IO event to notify worker that service is completed
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`booking_${bookingId}`).emit('status_update', {
            booking_id: bookingId,
            status: 'completed',
            message: 'Service completed after payment'
          });
        }
      } catch (socketError) {
        console.error('Socket error in payment processing:', socketError);
      }

      res.json({ 
        success: true, 
        message: 'Payment processed successfully. Amount credited to worker wallet.',
        payment_id: `PAY_${bookingId}_${Date.now()}`
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Server error while processing payment' });
  } finally {
    connection.release();
  }
});

/**
 * POST /bookings/:bookingId/rate - Submit rating for completed service
 */
router.post('/bookings/:bookingId/rate', verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const { rating, review } = req.body;
  const { id: user_id, role } = req.user;

  if (role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can submit ratings' });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify the customer owns this booking
    const [bookingCheck] = await connection.query(`
      SELECT b.id, b.customer_id, b.service_status, b.provider_id, b.rating
      FROM bookings b
      WHERE b.id = ? AND b.booking_type != 'ride'
    `, [bookingId]);

    if (!bookingCheck.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Service booking not found' });
    }

    const booking = bookingCheck[0];

    // Check if customer owns this booking
    if (booking.customer_id !== user_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to rate this booking' });
    }

    // Check if booking is completed
    if (booking.service_status !== 'completed') {
      await connection.rollback();
      return res.status(400).json({ message: 'Service must be completed before rating' });
    }

    // Check if already rated
    if (booking.rating) {
      await connection.rollback();
      return res.status(400).json({ message: 'Service has already been rated' });
    }

    // Update booking with rating
    await connection.query(
      'UPDATE bookings SET rating = ?, review = ?, rating_submitted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [rating, review || null, bookingId]
    );

    // Update provider rating if provider exists
    if (booking.provider_id) {
      // Get current provider stats
      const [providerStats] = await connection.query(`
        SELECT 
          AVG(rating) as avg_rating,
          COUNT(rating) as total_ratings
        FROM bookings 
        WHERE provider_id = ? AND rating IS NOT NULL
      `, [booking.provider_id]);

      const avgRating = providerStats[0]?.avg_rating || 0;
      const totalRatings = providerStats[0]?.total_ratings || 0;

      // Update provider table with new rating stats
      await connection.query(
        'UPDATE providers SET average_rating = ?, total_ratings = ?, updated_at = NOW() WHERE id = ?',
        [avgRating, totalRatings, booking.provider_id]
      );
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Rating submitted successfully.',
      rating: rating,
      review: review
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: 'Server error while submitting rating' });
  } finally {
    connection.release();
  }
});


module.exports = router;