const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');

/**
 * Admin routes for pricing management
 * Requires admin role authentication
 */

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * GET /admin/pricing/vehicle-types - Get all vehicle types for admin
 */
router.get('/vehicle-types', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [vehicleTypes] = await pool.query(`
      SELECT 
        id, name, display_name, base_fare, rate_per_km, rate_per_min,
        minimum_fare, free_km_threshold, vehicle_multiplier, night_multiplier,
        surge_enabled, max_surge_multiplier, is_active, created_at, updated_at
      FROM pricing_vehicle_types 
      ORDER BY vehicle_multiplier ASC
    `);

    res.json({
      success: true,
      vehicle_types: vehicleTypes,
      total_count: vehicleTypes.length
    });

  } catch (error) {
    console.error('Error fetching vehicle types for admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching vehicle types' 
    });
  }
});

/**
 * POST /admin/pricing/vehicle-types - Create new vehicle type
 */
router.post('/vehicle-types', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      display_name,
      base_fare,
      rate_per_km,
      rate_per_min,
      minimum_fare,
      free_km_threshold,
      vehicle_multiplier,
      night_multiplier,
      surge_enabled,
      max_surge_multiplier
    } = req.body;

    // Validate required fields
    if (!name || !display_name || !base_fare || !rate_per_km || !rate_per_min) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const [result] = await pool.query(`
      INSERT INTO pricing_vehicle_types (
        name, display_name, base_fare, rate_per_km, rate_per_min,
        minimum_fare, free_km_threshold, vehicle_multiplier, night_multiplier,
        surge_enabled, max_surge_multiplier, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      name, display_name, base_fare, rate_per_km, rate_per_min,
      minimum_fare || 50.00, free_km_threshold || 2.00, 
      vehicle_multiplier || 1.00, night_multiplier || 1.25,
      surge_enabled || true, max_surge_multiplier || 3.00
    ]);

    res.status(201).json({
      success: true,
      message: 'Vehicle type created successfully',
      vehicle_type_id: result.insertId
    });

  } catch (error) {
    console.error('Error creating vehicle type:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating vehicle type' 
    });
  }
});

/**
 * PUT /admin/pricing/vehicle-types/:id - Update vehicle type
 */
router.put('/vehicle-types/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Remove id and timestamps from update fields
    delete updateFields.id;
    delete updateFields.created_at;
    delete updateFields.updated_at;

    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateFields);

    const [result] = await pool.query(`
      UPDATE pricing_vehicle_types 
      SET ${setClause}, updated_at = NOW()
      WHERE id = ?
    `, [...values, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle type updated successfully'
    });

  } catch (error) {
    console.error('Error updating vehicle type:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating vehicle type' 
    });
  }
});

/**
 * DELETE /admin/pricing/vehicle-types/:id - Delete vehicle type
 */
router.delete('/vehicle-types/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle type is being used in any bookings
    const [usageCheck] = await pool.query(`
      SELECT COUNT(*) as usage_count 
      FROM ride_fare_breakdowns 
      WHERE vehicle_type_id = ?
    `, [id]);

    if (usageCheck[0].usage_count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle type that has been used in bookings. Consider deactivating instead.'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM pricing_vehicle_types WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle type deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting vehicle type' 
    });
  }
});

/**
 * GET /admin/pricing/rules - Get all pricing rules
 */
router.get('/rules', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rules] = await pool.query(`
      SELECT id, rule_key, rule_value, rule_type, description, category, is_active
      FROM pricing_rules 
      ORDER BY category, rule_key
    `);

    // Group rules by category
    const groupedRules = rules.reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push(rule);
      return acc;
    }, {});

    res.json({
      success: true,
      rules: rules,
      grouped_rules: groupedRules,
      total_count: rules.length
    });

  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching pricing rules' 
    });
  }
});

/**
 * PUT /admin/pricing/rules/:id - Update pricing rule
 */
router.put('/rules/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_value } = req.body;

    if (rule_value === undefined || rule_value === null) {
      return res.status(400).json({
        success: false,
        message: 'rule_value is required'
      });
    }

    const [result] = await pool.query(`
      UPDATE pricing_rules 
      SET rule_value = ?, updated_at = NOW()
      WHERE id = ?
    `, [rule_value, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Pricing rule updated successfully'
    });

  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating pricing rule' 
    });
  }
});

/**
 * GET /admin/surge/current - Get current surge information
 */
router.get('/surge/current', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get current demand metrics
    const [demandData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN br.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN b.service_status = 'in_progress' THEN 1 END) as active_rides,
        COUNT(CASE WHEN p.active = 1 AND p.verified = 1 THEN 1 END) as available_drivers
      FROM booking_requests br
      LEFT JOIN bookings b ON br.booking_id = b.id
      CROSS JOIN providers p
      WHERE br.requested_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        AND b.booking_type = 'ride'
    `);

    const demand = demandData[0];
    const demand_index = Math.min(100, (demand.pending_requests * 10) + (demand.active_rides * 5));
    
    let current_surge = 1.0;
    if (demand_index > 80) current_surge = 2.5;
    else if (demand_index > 60) current_surge = 2.0;
    else if (demand_index > 40) current_surge = 1.5;
    else if (demand_index > 20) current_surge = 1.2;

    res.json({
      success: true,
      current_surge,
      demand_index,
      active_rides: demand.active_rides,
      pending_requests: demand.pending_requests,
      available_drivers: demand.available_drivers,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching current surge data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching surge data' 
    });
  }
});

/**
 * GET /admin/surge/history - Get surge pricing history
 */
router.get('/surge/history', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    // Generate mock surge history for demonstration
    // In production, this would come from a surge_history table
    const history = [];
    const now = new Date();
    
    for (let i = parseInt(hours); i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const surge_multiplier = 1.0 + Math.random() * 2; // Random surge between 1.0 and 3.0
      
      history.push({
        timestamp: timestamp.toISOString(),
        surge_multiplier: Math.round(surge_multiplier * 10) / 10
      });
    }

    res.json({
      success: true,
      history,
      total_points: history.length
    });

  } catch (error) {
    console.error('Error fetching surge history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching surge history' 
    });
  }
});

/**
 * GET /admin/surge/zones - Get surge zones
 */
router.get('/surge/zones', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [zones] = await pool.query(`
      SELECT 
        id, zone_name, current_surge_multiplier, demand_index,
        active_drivers_count, pending_requests_count, last_updated, is_active
      FROM surge_zones 
      WHERE is_active = 1
      ORDER BY zone_name
    `);

    res.json({
      success: true,
      zones,
      total_count: zones.length
    });

  } catch (error) {
    console.error('Error fetching surge zones:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching surge zones' 
    });
  }
});

/**
 * PUT /admin/surge/zones/:id - Update surge zone multiplier
 */
router.put('/surge/zones/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { surge_multiplier } = req.body;

    if (!surge_multiplier || surge_multiplier < 1.0 || surge_multiplier > 5.0) {
      return res.status(400).json({
        success: false,
        message: 'Surge multiplier must be between 1.0 and 5.0'
      });
    }

    const [result] = await pool.query(`
      UPDATE surge_zones 
      SET current_surge_multiplier = ?, last_updated = NOW()
      WHERE id = ?
    `, [surge_multiplier, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Surge zone not found'
      });
    }

    res.json({
      success: true,
      message: 'Surge zone updated successfully'
    });

  } catch (error) {
    console.error('Error updating surge zone:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating surge zone' 
    });
  }
});

module.exports = router;
