const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
router.post('/create-sub-category', async (req, res) => {
    try {
        
        console.log(req.body);
        const { name,category_id, description, base_price } = req.body;
        if (!name || !category_id) {
            return res.status(400).json({ message: 'Name and category_id are required' });
        }
        const sql = `INSERT INTO subcategories (name, category_id, description, base_price)
         VALUES (?, ?, ?, ?)`;
        const [result] = await pool.query(sql, [name, category_id, description || null, base_price || null]);
        res.status(201).json({ id: result.insertId, name, category_id, description, base_price });
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


router.get('/sub-categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'SELECT * FROM subcategories WHERE id = ?';
        const [rows] = await pool.query(sql, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.put('/:category_id/subcategories/:id', async (req, res) => {
    try {
        const { category_id, id } = req.params;
        console.log("Updating subcategory with ID:", id, "in category:", category_id);
        const { name, description, base_price } = req.body;
        const sql = `UPDATE subcategories SET name = ?, category_id = ?, description = ?, base_price = ? 
                    WHERE id = ? AND category_id = ?`;
        const [result] = await pool.query(sql, [name, category_id, description, base_price, id, category_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.json({ id, name, category_id, description, base_price });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
router.delete('/delete-sub-category/:categoryId/:subcategoryId', async (req, res) => {
    try {
        const { categoryId, subcategoryId } = req.params;
        const sql = 'DELETE FROM subcategories WHERE id = ? AND category_id = ?';
        const [result] = await pool.query(sql, [subcategoryId, categoryId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.json({ message: 'Subcategory deleted successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
 

module.exports = router;