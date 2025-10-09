const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');

// GET /addresses - Get all addresses for logged-in customer
router.get('/', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT * FROM customer_addresses 
       WHERE customer_id = ? AND is_active = 1 
       ORDER BY is_default DESC, created_at DESC`,
      [customerId]
    );
    
    res.json({
      addresses: rows,
      total: rows.length
    });
  } catch (err) {
    console.error('Error fetching addresses:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /addresses - Add new address
router.post('/', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      address,
      pin_code,
      city,
      state,
      country,
      location_lat,
      location_lng,
      address_type = 'home',
      address_label,
      is_default = false
    } = req.body;

    // Validate required fields
    if (!address || !pin_code || !city || !state || !country) {
      return res.status(400).json({ 
        message: 'Address, pin code, city, state, and country are required' 
      });
    }

    // If this is set as default, unset other default addresses
    if (is_default) {
      await pool.query(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?',
        [customerId]
      );
    }

    // Create location point - use default coordinates (0,0) if not provided
    const lat = location_lat || 0;
    const lng = location_lng || 0;
    const locationPoint = `POINT(${lng} ${lat})`;

    const [result] = await pool.query(
      `INSERT INTO customer_addresses 
       (customer_id, address, pin_code, city, state, country, location_lat, location_lng, 
        location, address_type, address_label, is_default, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?), ?, ?, ?, 1, NOW(), NOW())`,
      [customerId, address, pin_code, city, state, country, lat, lng, locationPoint, address_type, address_label, is_default]
    );

    // Fetch the created address
    const [newAddress] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Address added successfully',
      address: newAddress[0]
    });
  } catch (err) {
    console.error('Error adding address:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /addresses/:id - Update address
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const addressId = req.params.id;
    const {
      address,
      pin_code,
      city,
      state,
      country,
      location_lat,
      location_lng,
      address_type,
      address_label,
      is_default
    } = req.body;

    // Check if address belongs to the customer
    const [existingAddress] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ? AND customer_id = ?',
      [addressId, customerId]
    );

    if (existingAddress.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If this is set as default, unset other default addresses
    if (is_default) {
      await pool.query(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND address_id != ?',
        [customerId, addressId]
      );
    }

    // Build update query dynamically
    const fields = [];
    const values = [];

    if (address !== undefined) { fields.push('address = ?'); values.push(address); }
    if (pin_code !== undefined) { fields.push('pin_code = ?'); values.push(pin_code); }
    if (city !== undefined) { fields.push('city = ?'); values.push(city); }
    if (state !== undefined) { fields.push('state = ?'); values.push(state); }
    if (country !== undefined) { fields.push('country = ?'); values.push(country); }
    if (location_lat !== undefined) { fields.push('location_lat = ?'); values.push(location_lat); }
    if (location_lng !== undefined) { fields.push('location_lng = ?'); values.push(location_lng); }
    if (address_type !== undefined) { fields.push('address_type = ?'); values.push(address_type); }
    if (address_label !== undefined) { fields.push('address_label = ?'); values.push(address_label); }
    if (is_default !== undefined) { fields.push('is_default = ?'); values.push(is_default); }

    // Update location point if lat/lng provided
    if (location_lat !== undefined && location_lng !== undefined) {
      fields.push('location = ST_GeomFromText(?)');
      values.push(`POINT(${location_lng} ${location_lat})`);
    } else if (location_lat !== undefined || location_lng !== undefined) {
      // If only one coordinate is provided, use 0 for the missing one
      const lat = location_lat !== undefined ? location_lat : 0;
      const lng = location_lng !== undefined ? location_lng : 0;
      fields.push('location = ST_GeomFromText(?)');
      values.push(`POINT(${lng} ${lat})`);
    }

    fields.push('updated_at = NOW()');
    values.push(addressId, customerId);

    if (fields.length > 1) { // More than just updated_at
      await pool.query(
        `UPDATE customer_addresses SET ${fields.join(', ')} WHERE address_id = ? AND customer_id = ?`,
        values
      );
    }

    // Fetch updated address
    const [updatedAddress] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ?',
      [addressId]
    );

    res.json({
      message: 'Address updated successfully',
      address: updatedAddress[0]
    });
  } catch (err) {
    console.error('Error updating address:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /addresses/:id - Delete address
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const addressId = req.params.id;

    console.log(`Delete request - Customer ID: ${customerId}, Address ID: ${addressId}`);

    // Check if address belongs to the customer
    const [existingAddress] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ? AND customer_id = ?',
      [addressId, customerId]
    );

    console.log('Existing address found:', existingAddress.length > 0);

    if (existingAddress.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Delete address
    const [deleteResult] = await pool.query(
      'DELETE FROM customer_addresses WHERE address_id = ? AND customer_id = ?',
      [addressId, customerId]
    );

    console.log('Delete result - affected rows:', deleteResult.affectedRows);

    // If this was the default address, set another address as default
    if (existingAddress[0].is_default) {
      const [otherAddresses] = await pool.query(
        'SELECT address_id FROM customer_addresses WHERE customer_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
        [customerId]
      );

      if (otherAddresses.length > 0) {
        await pool.query(
          'UPDATE customer_addresses SET is_default = 1 WHERE address_id = ?',
          [otherAddresses[0].address_id]
        );
      }
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /addresses/:id/default - Set address as default
router.put('/:id/default', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const addressId = req.params.id;

    // Check if address belongs to the customer
    const [existingAddress] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ? AND customer_id = ? AND is_active = 1',
      [addressId, customerId]
    );

    if (existingAddress.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Unset all default addresses for this customer
    await pool.query(
      'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?',
      [customerId]
    );

    // Set this address as default
    await pool.query(
      'UPDATE customer_addresses SET is_default = 1, updated_at = NOW() WHERE address_id = ?',
      [addressId]
    );

    // Fetch updated address
    const [updatedAddress] = await pool.query(
      'SELECT * FROM customer_addresses WHERE address_id = ?',
      [addressId]
    );

    res.json({
      message: 'Default address updated successfully',
      address: updatedAddress[0]
    });
  } catch (err) {
    console.error('Error setting default address:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 