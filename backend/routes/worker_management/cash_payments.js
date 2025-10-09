const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');

// GET /cash-payments - Get cash payments for worker's bookings
router.get('/cash-payments', verifyToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE b.provider_id = ?';
    let queryParams = [workerId];

    if (status) {
      whereClause += ' AND cp.status = ?';
      queryParams.push(status);
    }

    const query = `
      SELECT 
        cp.*,
        b.id as booking_id,
        b.scheduled_time,
        b.service_status,
        b.price as total_amount,
        b.notes as booking_notes,
        u.first_name,
        u.last_name,
        u.phone as customer_phone,
        sc.name as service_name
      FROM cash_payments cp
      JOIN bookings b ON cp.booking_id = b.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
      ${whereClause}
      ORDER BY cp.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);

    const [payments] = await pool.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM cash_payments cp
      JOIN bookings b ON cp.booking_id = b.id
      ${whereClause}
    `;
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      success: true,
      payments: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cash payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash payments'
    });
  }
});

// POST /cash-payments/:bookingId/mark-received - Mark cash payment as received
router.post('/cash-payments/:bookingId/mark-received', verifyToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    const bookingId = req.params.bookingId;
    const { payment_method = 'cash', notes } = req.body;

    // Verify the booking belongs to this worker
    const [bookings] = await pool.query(
      'SELECT id, provider_id, price as total_amount, payment_method FROM bookings WHERE id = ? AND provider_id = ?',
      [bookingId, workerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not assigned to you'
      });
    }

    const booking = bookings[0];

    // Check if booking is for pay after service
    if (booking.payment_method !== 'pay_after_service') {
      return res.status(400).json({
        success: false,
        message: 'This booking is not for pay after service'
      });
    }

    // Check if cash payment record already exists
    const [existingPayments] = await pool.query(
      'SELECT id, status FROM cash_payments WHERE booking_id = ?',
      [bookingId]
    );

    if (existingPayments.length > 0) {
      const existingPayment = existingPayments[0];
      if (existingPayment.status === 'received') {
        return res.status(400).json({
          success: false,
          message: 'Payment already marked as received'
        });
      }

      // Update existing payment record
      await pool.query(
        `UPDATE cash_payments 
         SET status = 'received', 
             received_at = NOW(), 
             payment_method = ?, 
             notes = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [payment_method, notes, existingPayment.id]
      );
    } else {
      // Create new cash payment record
      const [result] = await pool.query(
        `INSERT INTO cash_payments 
         (booking_id, worker_id, amount, status, received_at, payment_method, notes) 
         VALUES (?, ?, ?, 'received', NOW(), ?, ?)`,
        [bookingId, workerId, booking.total_amount ?? booking.price ?? 0, payment_method, notes]
      );

      // Update booking to link with cash payment
      await pool.query(
        'UPDATE bookings SET cash_payment_id = ? WHERE id = ?',
        [result.insertId, bookingId]
      );

      // Create payment record in main payments table
      await pool.query(
        `INSERT INTO payments 
         (booking_id, amount, currency, method, status, cash_payment_id, created_at) 
         VALUES (?, ?, 'INR', 'cash', 'completed', ?, NOW())`,
        [bookingId, booking.total_amount ?? booking.price ?? 0, result.insertId]
      );
    }

    // Update booking payment status
    await pool.query(
      'UPDATE bookings SET payment_status = ? WHERE id = ?',
      ['completed', bookingId]
    );

    res.json({
      success: true,
      message: 'Payment marked as received successfully'
    });
  } catch (error) {
    console.error('Error marking payment as received:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payment as received'
    });
  }
});

// GET /cash-payments/:bookingId - Get specific cash payment details
router.get('/cash-payments/:bookingId', verifyToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    const bookingId = req.params.bookingId;

    const [payments] = await pool.query(
      `SELECT 
        cp.*,
        b.id as booking_id,
        b.scheduled_time,
        b.service_status,
        b.price as total_amount,
        b.notes as booking_notes,
        u.first_name,
        u.last_name,
        u.phone as customer_phone,
        sc.name as service_name
      FROM cash_payments cp
      JOIN bookings b ON cp.booking_id = b.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
      WHERE cp.booking_id = ? AND b.provider_id = ?`,
      [bookingId, workerId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cash payment not found'
      });
    }

    res.json({
      success: true,
      payment: payments[0]
    });
  } catch (error) {
    console.error('Error fetching cash payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash payment details'
    });
  }
});

// PUT /cash-payments/:bookingId/dispute - Mark payment as disputed
router.put('/cash-payments/:bookingId/dispute', verifyToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    const bookingId = req.params.bookingId;
    const { reason } = req.body;

    // Verify the booking belongs to this worker
    const [bookings] = await pool.query(
      'SELECT id, provider_id FROM bookings WHERE id = ? AND provider_id = ?',
      [bookingId, workerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not assigned to you'
      });
    }

    // Update cash payment status to disputed
    await pool.query(
      `UPDATE cash_payments 
       SET status = 'disputed', 
           notes = CONCAT(COALESCE(notes, ''), '\nDispute: ', ?),
           updated_at = NOW()
       WHERE booking_id = ?`,
      [reason || 'Payment dispute raised', bookingId]
    );

    res.json({
      success: true,
      message: 'Payment dispute raised successfully'
    });
  } catch (error) {
    console.error('Error raising payment dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to raise payment dispute'
    });
  }
});

module.exports = router;
