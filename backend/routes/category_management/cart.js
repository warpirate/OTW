const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');

/**
 * Helper: fetch cart for a customer_id
 */
async function fetchCart(customerId) {
  const [rows] = await pool.query(
    `SELECT c.id AS cart_id, c.subcategory_id, c.quantity, s.name, s.description, s.base_price AS price
     FROM carts c
     JOIN subcategories s ON s.id = c.subcategory_id
     WHERE c.customer_id = ?`,
    [customerId]
  );

  const items = rows.map((row) => ({
    id: row.cart_id,
    subcategory_id: row.subcategory_id,
    name: row.name,
    description: row.description,
    price: row.price,
    quantity: row.quantity,
    total_price: row.price * row.quantity,
  }));

  const total = items.reduce((sum, item) => sum + item.total_price, 0);

  return { items, total };
}

// GET /cart  -> fetch cart for logged-in customer
router.get('/', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const cart = await fetchCart(customerId);
    return res.json(cart);
  } catch (err) {
    console.error('Error fetching cart:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /cart/add  -> add item to cart { subcategory_id, quantity }
router.post('/add', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    let { subcategory_id, id, quantity = 1 } = req.body;
    // Allow 'id' as alias for subcategory_id coming from frontend service object
    if (!subcategory_id && id) subcategory_id = id;
    if (!subcategory_id) return res.status(400).json({ message: 'subcategory_id is required' });

    // Check if already exists
    const [existingRows] = await pool.query(
      'SELECT id, quantity FROM carts WHERE customer_id = ? AND subcategory_id = ?',
      [customerId, subcategory_id]
    );

    if (existingRows.length > 0) {
      const newQty = existingRows[0].quantity + quantity;
      await pool.query('UPDATE carts SET quantity = ? WHERE id = ?', [newQty, existingRows[0].id]);
    } else {
      await pool.query(
        'INSERT INTO carts (customer_id, subcategory_id, quantity, added_at) VALUES (?,?,?, NOW())',
        [customerId, subcategory_id, quantity]
      );
    }

    const cart = await fetchCart(customerId);
    return res.status(201).json(cart);
  } catch (err) {
    console.error('Error adding to cart:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /cart/update/:cartId  -> update quantity
router.put('/update/:cartId', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { cartId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 1) {
      return res.status(400).json({ message: 'Valid quantity required' });
    }

    const [result] = await pool.query(
      'UPDATE carts SET quantity = ? WHERE id = ? AND customer_id = ?',
      [quantity, cartId, customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    const cart = await fetchCart(customerId);
    return res.json(cart);
  } catch (err) {
    console.error('Error updating cart:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /cart/remove/:cartId  -> remove item
router.delete('/remove/:cartId', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { cartId } = req.params;

    const [result] = await pool.query('DELETE FROM carts WHERE id = ? AND customer_id = ?', [cartId, customerId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    const cart = await fetchCart(customerId);
    return res.json(cart);
  } catch (err) {
    console.error('Error removing cart item:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /cart/clear  -> clear cart
router.delete('/clear', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    await pool.query('DELETE FROM carts WHERE customer_id = ?', [customerId]);
    return res.json({ items: [], total: 0 });
  } catch (err) {
    console.error('Error clearing cart:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /cart/sync -> sync local cart after login { items:[{subcategory_id, quantity}] }
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { items } = req.body;

    if (!Array.isArray(items)) return res.status(400).json({ message: 'items array required' });

    // For simplicity, clear existing cart and re-insert
    await pool.query('DELETE FROM carts WHERE customer_id = ?', [customerId]);

    for (const item of items) {
      let { subcategory_id, id, quantity = 1 } = item;
      if (!subcategory_id && id) subcategory_id = id;
      if (!subcategory_id) continue;
      await pool.query(
        'INSERT INTO carts (customer_id, subcategory_id, quantity, added_at) VALUES (?,?,?, NOW())',
        [customerId, subcategory_id, quantity]
      );
    }

    const cart = await fetchCart(customerId);
    return res.json(cart);
  } catch (err) {
    console.error('Error syncing cart:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
