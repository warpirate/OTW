const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
//  const verifyToken = require('../middlewares/verify_token');

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


module.exports = router;