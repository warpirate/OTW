const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const FareCalculator = require('../../utils/fareCalculator');

/**
 * POST /ride/quote - Get fare estimate for a ride
 * 
 * Request body:
 * {
 *   pickup: { lat: number, lng: number, address?: string },
 *   drop: { lat: number, lng: number, address?: string },
 *   vehicle_type_id: number,
 *   pickup_time: string (ISO datetime),
 *   passenger_count?: number
 * }
 * 
 * Response:
 * {
 *   quote_id: string,
 *   distance_km: number,
 *   duration_min: number,
 *   vehicle_type: string,
 *   fare: {
 *     base: number,
 *     distance: number,
 *     time: number,
 *     surge: number,
 *     night: number,
 *     total: number
 *   },
 *   surge_multiplier: number,
 *   night_hours: boolean,
 *   minimum_fare: number,
 *   free_km_threshold: number,
 *   estimated_pickup_time: string,
 *   expires_at: string
 * }
 */
router.post('/quote', async (req, res) => {
  try {
    const {
      pickup,
      drop,
      vehicle_type_id,
      pickup_time,
      passenger_count = 1
    } = req.body;

    // Validate required fields
    if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
      return res.status(400).json({ 
        message: 'Pickup and drop locations with lat/lng are required' 
      });
    }

    if (!vehicle_type_id) {
      return res.status(400).json({ 
        message: 'Vehicle type ID is required' 
      });
    }

    if (!pickup_time) {
      return res.status(400).json({ 
        message: 'Pickup time is required' 
      });
    }

    // Validate vehicle type exists and is active
    const [vehicleTypes] = await pool.query(
      'SELECT * FROM pricing_vehicle_types WHERE id = ? AND is_active = 1',
      [vehicle_type_id]
    );

    if (!vehicleTypes.length) {
      return res.status(400).json({ 
        message: 'Invalid or inactive vehicle type' 
      });
    }

    const vehicleType = vehicleTypes[0];

    // Get distance and duration
    const distanceData = await FareCalculator.getDistanceAndDuration(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: drop.lat, lng: drop.lng }
    );

    // Calculate fare estimate
    const fareBreakdown = await FareCalculator.calculateFareEstimate({
      distance_km: distanceData.distance_km,
      duration_min: distanceData.duration_min,
      vehicle_type_id,
      pickup_time: new Date(pickup_time),
      pickup_location: pickup,
      drop_location: drop
    });

    // Estimate pickup time (assuming 5 minutes average)
    const estimatedPickupTime = new Date(Date.now() + 5 * 60 * 1000);
    
    // Quote expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store quote in cache/database for later validation
    // For now, we'll store it when booking is created

    const response = {
      quote_id: fareBreakdown.quote_id,
      distance_km: fareBreakdown.distance_km,
      duration_min: fareBreakdown.duration_min,
      vehicle_type: fareBreakdown.vehicle_type_name,
      fare: {
        base: fareBreakdown.base_fare,
        distance: fareBreakdown.distance_component,
        time: fareBreakdown.time_component,
        surge: fareBreakdown.surge_component,
        night: fareBreakdown.night_component,
        total: fareBreakdown.total_fare
      },
      surge_multiplier: fareBreakdown.surge_multiplier,
      night_hours: fareBreakdown.night_hours_applied,
      minimum_fare: fareBreakdown.minimum_fare,
      free_km_threshold: fareBreakdown.free_km_threshold,
      billable_distance: fareBreakdown.billable_distance,
      vehicle_multiplier: fareBreakdown.vehicle_multiplier,
      estimated_pickup_time: estimatedPickupTime.toISOString(),
      expires_at: expiresAt.toISOString(),
      passenger_count,
      breakdown_details: {
        base_fare_description: `Base fare for ${vehicleType.display_name}`,
        distance_description: `${fareBreakdown.billable_distance} km @ ₹${vehicleType.rate_per_km}/km`,
        time_description: `${fareBreakdown.duration_min} min @ ₹${vehicleType.rate_per_min}/min`,
        surge_description: fareBreakdown.surge_multiplier > 1 ? 
          `${fareBreakdown.surge_multiplier}x surge pricing` : null,
        night_description: fareBreakdown.night_hours_applied ? 
          `Night charges (${vehicleType.night_multiplier}x)` : null,
        vehicle_description: fareBreakdown.vehicle_multiplier !== 1 ? 
          `${vehicleType.display_name} multiplier (${fareBreakdown.vehicle_multiplier}x)` : null
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error generating ride quote:', error);
    res.status(500).json({ 
      message: 'Server error while generating ride quote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /ride/vehicle-types - Get all available vehicle types with pricing
 */
router.get('/vehicle-types', async (req, res) => {
  try {
    const [vehicleTypes] = await pool.query(`
      SELECT 
        id,
        name,
        display_name,
        base_fare,
        rate_per_km,
        rate_per_min,
        minimum_fare,
        free_km_threshold,
        vehicle_multiplier,
        night_multiplier,
        max_surge_multiplier,
        surge_enabled
      FROM pricing_vehicle_types 
      WHERE is_active = 1 
      ORDER BY vehicle_multiplier ASC
    `);

    const response = vehicleTypes.map(vt => ({
      id: vt.id,
      name: vt.name,
      display_name: vt.display_name,
      pricing: {
        base_fare: parseFloat(vt.base_fare),
        rate_per_km: parseFloat(vt.rate_per_km),
        rate_per_min: parseFloat(vt.rate_per_min),
        minimum_fare: parseFloat(vt.minimum_fare),
        free_km_threshold: parseFloat(vt.free_km_threshold)
      },
      multipliers: {
        vehicle: parseFloat(vt.vehicle_multiplier),
        night: parseFloat(vt.night_multiplier),
        max_surge: parseFloat(vt.max_surge_multiplier)
      },
      surge_enabled: Boolean(vt.surge_enabled),
      description: `Starting at ₹${vt.base_fare} + ₹${vt.rate_per_km}/km + ₹${vt.rate_per_min}/min`
    }));

    res.json({
      vehicle_types: response,
      total_count: response.length
    });

  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({ 
      message: 'Server error while fetching vehicle types',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /ride/quote/validate - Validate a quote before booking
 */
router.post('/quote/validate', async (req, res) => {
  try {
    const { quote_id } = req.body;

    if (!quote_id) {
      return res.status(400).json({ 
        message: 'Quote ID is required' 
      });
    }

    // In a production system, you would validate the quote against stored data
    // For now, we'll assume quotes are valid if they follow the UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(quote_id)) {
      return res.status(400).json({ 
        message: 'Invalid quote ID format' 
      });
    }

    // Check if quote has expired (assuming 10-minute expiry)
    // In production, store quote creation time and validate against it
    
    res.json({
      quote_id,
      is_valid: true,
      message: 'Quote is valid and ready for booking'
    });

  } catch (error) {
    console.error('Error validating quote:', error);
    res.status(500).json({ 
      message: 'Server error while validating quote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /ride/pricing-info - Get general pricing information and current surge status
 */
router.get('/pricing-info', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    // Get current surge information
    let surge_info = {
      current_surge: 1.0,
      surge_areas: [],
      message: 'Normal pricing in effect'
    };

    if (lat && lng) {
      // In production, check surge zones for the given location
      // For now, calculate basic surge based on current demand
      const [demandData] = await pool.query(`
        SELECT 
          COUNT(CASE WHEN br.status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN b.service_status = 'in_progress' THEN 1 END) as active_rides
        FROM booking_requests br
        LEFT JOIN bookings b ON br.booking_id = b.id
        WHERE br.requested_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
          AND b.booking_type = 'ride'
      `);

      const pending_requests = demandData[0]?.pending_requests || 0;
      const active_rides = demandData[0]?.active_rides || 0;
      const demand_index = Math.min(100, (pending_requests * 10) + (active_rides * 5));
      
      if (demand_index > 80) {
        surge_info.current_surge = 2.5;
        surge_info.message = 'High demand - 2.5x surge pricing';
      } else if (demand_index > 60) {
        surge_info.current_surge = 2.0;
        surge_info.message = 'Increased demand - 2.0x surge pricing';
      } else if (demand_index > 40) {
        surge_info.current_surge = 1.5;
        surge_info.message = 'Moderate demand - 1.5x surge pricing';
      } else if (demand_index > 20) {
        surge_info.current_surge = 1.2;
        surge_info.message = 'Slight demand increase - 1.2x pricing';
      }
    }

    // Get night hours information
    const [nightStart] = await pool.query(
      "SELECT rule_value FROM pricing_rules WHERE rule_key = 'night_hours_start' AND is_active = 1"
    );
    const [nightEnd] = await pool.query(
      "SELECT rule_value FROM pricing_rules WHERE rule_key = 'night_hours_end' AND is_active = 1"
    );

    const night_hours = {
      start: nightStart.length ? nightStart[0].rule_value : '23:00',
      end: nightEnd.length ? nightEnd[0].rule_value : '06:00',
      is_active: await FareCalculator.isNightHours(new Date())
    };

    // Get cancellation policy
    const [cancellationFee] = await pool.query(
      "SELECT rule_value FROM pricing_rules WHERE rule_key = 'cancellation_fee_customer' AND is_active = 1"
    );
    const [gracePeriod] = await pool.query(
      "SELECT rule_value FROM pricing_rules WHERE rule_key = 'cancellation_grace_period_minutes' AND is_active = 1"
    );

    const cancellation_policy = {
      fee: cancellationFee.length ? parseFloat(cancellationFee[0].rule_value) : 20.00,
      grace_period_minutes: gracePeriod.length ? parseInt(gracePeriod[0].rule_value) : 5,
      description: `Free cancellation within ${gracePeriod.length ? gracePeriod[0].rule_value : 5} minutes of booking`
    };

    res.json({
      surge_info,
      night_hours,
      cancellation_policy,
      general_info: {
        currency: 'INR',
        distance_unit: 'km',
        time_unit: 'minutes',
        platform_fee_note: 'All prices include applicable taxes and platform fees'
      }
    });

  } catch (error) {
    console.error('Error fetching pricing info:', error);
    res.status(500).json({ 
      message: 'Server error while fetching pricing information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
