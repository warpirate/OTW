const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
 
router.post('/create-category', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const sql = 'INSERT INTO service_categories (name) VALUES (?)';
    const [result] = await pool.query(sql, [name]);

    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.get('/get-categories', async (req, res) => {
  try {
    const sql = 'SELECT id, name FROM service_categories';
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.get('/get-category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT id, name FROM service_categories WHERE id = ?';
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// edit category name
router.put('/edit-category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const sql = 'UPDATE service_categories SET name = ? WHERE id = ?';
    const [result] = await pool.query(sql, [name, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ id, name });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/delete-category/:id', async (req, res) => {
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