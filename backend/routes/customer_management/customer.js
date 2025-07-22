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

router.put('/customers/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    address,
    pin_code,
    city,
    state,
    country,
    location_lat,
    location_lng
  } = req.body;

  try {
    const fields = [];
    const values = [];

    if (address) { fields.push('address = ?'); values.push(address); }
    if (pin_code) { fields.push('pin_code = ?'); values.push(pin_code); }
    if (city) { fields.push('city = ?'); values.push(city); }
    if (state) { fields.push('state = ?'); values.push(state); }
    if (country) { fields.push('country = ?'); values.push(country); }
    if (location_lat) { fields.push('location_lat = ?'); values.push(location_lat); }
    if (location_lng) { fields.push('location_lng = ?'); values.push(location_lng); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    values.push(id); // Add ID for WHERE clause

    await pool.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Customer profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// create get profile from customers table and users table also
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { id, customer_id } = req.user;
    // Use customer_id if available, otherwise use id
    const customerId = customer_id || id;
    
    const [rows] = await pool.query(
      `SELECT c.*, u.name, u.email, u.phone_number FROM customers c
       JOIN users u ON c.id = u.customer_id WHERE c.id = ?`,
      [customerId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;