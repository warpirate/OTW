const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
 const verifyToken = require('../middlewares/verify_token');

router.post('/create-category', verifyToken, async (req, res) => {
  try {
    const { name, category_type } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!category_type) return res.status(400).json({ message: 'Category type is required' });

    const sql = 'INSERT INTO service_categories (name , category_type, is_active) VALUES (?, ?, ?)';
    const [result] = await pool.query(sql, [name, category_type, 1]);

    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/get-categories', verifyToken, async (req, res) => {
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
      'SELECT id, name, is_active, category_type FROM service_categories LIMIT ? OFFSET ?',
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
// router.get('/get-category/:id', verifyToken, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const sql = 'SELECT id, name,  FROM service_categories WHERE id = ?';
//     const [rows] = await pool.query(sql, [id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ message: 'Category not found' });
//     }
//     res.json(rows[0]);
//   } catch (err) {
//     console.error('Error:', err);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });
// edit category name
router.put('/edit-category/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active, category_type } = req.body;
    if (!id) return res.status(400).json({ message: 'ID is required' });
    console.log("EDIT CATEGORY ", req.body);
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const sql = 'UPDATE service_categories SET name = ?, is_active = ?, category_type = ? WHERE id = ?';
    const [result] = await pool.query(sql, [name, is_active, category_type, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ id, name });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/delete-category/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const sql = 'DELETE FROM service_categories WHERE id = ?';
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;