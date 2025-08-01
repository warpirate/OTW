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
      `SELECT c.*, u.name, u.email, u.phone_number, u.gender, ca.address, ca.city, ca.state, ca.country, ca.pin_code, ca.location_lat, ca.location_lng FROM customers c
       JOIN users u ON c.id = u.id 
       JOIN customer_addresses ca ON c.id = ca.customer_id
       WHERE c.id = ? AND ca.is_default = 1
       LIMIT 1`,
      [id]
    );
     
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


module.exports = router;