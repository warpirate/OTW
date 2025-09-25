const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { retryDatabaseOperation } = require('./databaseRetry');

/**
 * Dynamic Fare Calculator for OMW Ride Booking System
 * Handles fare estimation, surge pricing, and final fare reconciliation
 */
class FareCalculator {
  
  /**
   * Calculate fare estimate for a ride quote
   * @param {Object} params - Quote parameters
   * @param {number} params.distance_km - Distance in kilometers
   * @param {number} params.duration_min - Duration in minutes
   * @param {number} params.vehicle_type_id - Vehicle type ID
   * @param {Date} params.pickup_time - Pickup time
   * @param {Object} params.pickup_location - {lat, lng}
   * @param {Object} params.drop_location - {lat, lng}
   * @returns {Object} Fare breakdown with quote_id
   */
  static async calculateFareEstimate(params) {
    const {
      distance_km,
      duration_min,
      vehicle_type_id,
      pickup_time,
      pickup_location,
      drop_location
    } = params;

    try {
      // Get vehicle type pricing
      const [vehicleTypes] = await pool.query(
        'SELECT * FROM pricing_vehicle_types WHERE id = ? AND is_active = 1',
        [vehicle_type_id]
      );

      if (!vehicleTypes.length) {
        throw new Error('Invalid or inactive vehicle type');
      }

      const vehicleType = vehicleTypes[0];
      const quote_id = uuidv4();

      // Calculate base components
      const base_fare = parseFloat(vehicleType.base_fare);
      const free_km = parseFloat(vehicleType.free_km_threshold);
      const billable_distance = Math.max(0, distance_km - free_km);
      
      const distance_component = billable_distance * parseFloat(vehicleType.rate_per_km);
      const time_component = duration_min * parseFloat(vehicleType.rate_per_min);
      
      // Apply vehicle multiplier
      const vehicle_multiplier = parseFloat(vehicleType.vehicle_multiplier);
      
      // Check for night hours
      const is_night_hours = await this.isNightHours(pickup_time);
      const night_multiplier = is_night_hours ? parseFloat(vehicleType.night_multiplier) : 1.0;
      const night_component = is_night_hours ? 
        (base_fare + distance_component + time_component) * (night_multiplier - 1) : 0;

      // Calculate surge multiplier
      const surge_multiplier = await this.calculateSurgeMultiplier(
        pickup_location, 
        vehicleType, 
        pickup_time
      );
      const surge_component = surge_multiplier > 1 ? 
        (base_fare + distance_component + time_component) * (surge_multiplier - 1) : 0;

      // Calculate subtotal and apply minimum fare
      let subtotal = (base_fare + distance_component + time_component + night_component + surge_component) * vehicle_multiplier;
      const minimum_fare = parseFloat(vehicleType.minimum_fare);
      const total_fare = Math.max(subtotal, minimum_fare);

      const fareBreakdown = {
        quote_id,
        vehicle_type_id,
        distance_km,
        duration_min,
        base_fare,
        distance_component: Math.round(distance_component * 100) / 100,
        time_component: Math.round(time_component * 100) / 100,
        night_component: Math.round(night_component * 100) / 100,
        surge_component: Math.round(surge_component * 100) / 100,
        vehicle_multiplier,
        surge_multiplier,
        night_hours_applied: is_night_hours,
        minimum_fare,
        total_fare: Math.round(total_fare * 100) / 100,
        vehicle_type_name: vehicleType.display_name,
        free_km_threshold: free_km,
        billable_distance: Math.round(billable_distance * 100) / 100
      };

      return fareBreakdown;

    } catch (error) {
      console.error('Error calculating fare estimate:', error);
      throw error;
    }
  }

  /**
   * Calculate final fare after trip completion
   * @param {number} booking_id - Booking ID
   * @param {number} actual_distance_km - Actual distance traveled
   * @param {number} actual_duration_min - Actual trip duration
   * @param {Object} additional_charges - {tip, waiting_charges, toll_charges}
   * @returns {Object} Final fare breakdown
   */
  static async calculateFinalFare(booking_id, actual_distance_km, actual_duration_min, additional_charges = {}) {
    try {
      // Get existing fare breakdown
      const [fareBreakdowns] = await pool.query(
        `SELECT rfb.*, pvt.* FROM ride_fare_breakdowns rfb 
         JOIN pricing_vehicle_types pvt ON rfb.vehicle_type_id = pvt.id 
         WHERE rfb.booking_id = ?`,
        [booking_id]
      );

      if (!fareBreakdowns.length) {
        throw new Error('Fare breakdown not found for booking');
      }

      const fareData = fareBreakdowns[0];
      const vehicleType = fareData;

      // Recalculate fare with actual values
      const base_fare = parseFloat(vehicleType.base_fare);
      const free_km = parseFloat(vehicleType.free_km_threshold);
      const billable_distance = Math.max(0, actual_distance_km - free_km);
      
      const distance_component = billable_distance * parseFloat(vehicleType.rate_per_km);
      const time_component = actual_duration_min * parseFloat(vehicleType.rate_per_min);
      
      const vehicle_multiplier = parseFloat(vehicleType.vehicle_multiplier);
      const night_multiplier = fareData.night_hours_applied ? parseFloat(vehicleType.night_multiplier) : 1.0;
      const surge_multiplier = parseFloat(fareData.surge_multiplier_applied);

      const night_component = fareData.night_hours_applied ? 
        (base_fare + distance_component + time_component) * (night_multiplier - 1) : 0;
      
      const surge_component = surge_multiplier > 1 ? 
        (base_fare + distance_component + time_component) * (surge_multiplier - 1) : 0;

      // Calculate subtotal and apply minimum fare
      let subtotal = (base_fare + distance_component + time_component + night_component + surge_component) * vehicle_multiplier;
      const minimum_fare = parseFloat(vehicleType.minimum_fare);
      let total_fare = Math.max(subtotal, minimum_fare);

      // Add additional charges
      const tip_amount = parseFloat(additional_charges.tip || 0);
      const waiting_charges = parseFloat(additional_charges.waiting_charges || 0);
      const toll_charges = parseFloat(additional_charges.toll_charges || 0);
      const promo_discount = parseFloat(additional_charges.promo_discount || 0);

      const final_fare = total_fare + tip_amount + waiting_charges + toll_charges - promo_discount;

      // Update fare breakdown with actual values
      await pool.query(
        `UPDATE ride_fare_breakdowns SET 
         distance_km_act = ?, time_min_act = ?, 
         base_fare_act = ?, distance_component_act = ?, time_component_act = ?,
         surge_component_act = ?, night_component_act = ?, total_fare_act = ?,
         tip_amount = ?, waiting_charges = ?, toll_charges = ?, promo_discount = ?,
         final_fare = ?, fare_calculated_at = NOW(), trip_ended_at = NOW()
         WHERE booking_id = ?`,
        [
          actual_distance_km, actual_duration_min,
          base_fare, distance_component, time_component,
          surge_component, night_component, total_fare,
          tip_amount, waiting_charges, toll_charges, promo_discount,
          final_fare, booking_id
        ]
      );

      return {
        booking_id,
        actual_distance_km,
        actual_duration_min,
        base_fare,
        distance_component: Math.round(distance_component * 100) / 100,
        time_component: Math.round(time_component * 100) / 100,
        night_component: Math.round(night_component * 100) / 100,
        surge_component: Math.round(surge_component * 100) / 100,
        total_fare: Math.round(total_fare * 100) / 100,
        tip_amount,
        waiting_charges,
        toll_charges,
        promo_discount,
        final_fare: Math.round(final_fare * 100) / 100,
        fare_deviation_percentage: Math.round(((final_fare - fareData.total_fare_est) / fareData.total_fare_est) * 100 * 100) / 100
      };

    } catch (error) {
      console.error('Error calculating final fare:', error);
      throw error;
    }
  }

  /**
   * Check if given time falls in night hours
   * @param {Date} datetime - Date/time to check
   * @returns {boolean} True if night hours
   */
  static async isNightHours(datetime) {
    try {
      // Get night hours configuration from pricing rules
      const [nightStart] = await pool.query(
        "SELECT rule_value FROM pricing_rules WHERE rule_key = 'night_hours_start' AND is_active = 1"
      );
      const [nightEnd] = await pool.query(
        "SELECT rule_value FROM pricing_rules WHERE rule_key = 'night_hours_end' AND is_active = 1"
      );

      const startHour = nightStart.length ? parseInt(nightStart[0].rule_value.split(':')[0]) : 23;
      const endHour = nightEnd.length ? parseInt(nightEnd[0].rule_value.split(':')[0]) : 6;
      
      const hour = new Date(datetime).getHours();
      
      // Night hours span midnight (e.g., 23:00 to 06:00)
      if (startHour > endHour) {
        return hour >= startHour || hour < endHour;
      } else {
        return hour >= startHour && hour < endHour;
      }
    } catch (error) {
      console.error('Error checking night hours:', error);
      // Default night hours: 11 PM to 6 AM
      const hour = new Date(datetime).getHours();
      return hour >= 23 || hour < 6;
    }
  }

  /**
   * Calculate surge multiplier based on demand
   * @param {Object} location - {lat, lng}
   * @param {Object} vehicleType - Vehicle type data
   * @param {Date} pickup_time - Pickup time
   * @returns {number} Surge multiplier
   */
  static async calculateSurgeMultiplier(location, vehicleType, pickup_time) {
    try {
      if (!vehicleType.surge_enabled) {
        return 1.0;
      }

      // Simple demand-based surge calculation
      // In production, this would use real-time data from surge_zones table
      
      // Get current demand metrics (simplified)
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
      
      // Simple surge algorithm
      const demand_index = Math.min(100, (pending_requests * 10) + (active_rides * 5));
      
      let surge_multiplier = 1.0;
      if (demand_index > 80) {
        surge_multiplier = 2.5;
      } else if (demand_index > 60) {
        surge_multiplier = 2.0;
      } else if (demand_index > 40) {
        surge_multiplier = 1.5;
      } else if (demand_index > 20) {
        surge_multiplier = 1.2;
      }

      // Apply max surge limit
      const max_surge = parseFloat(vehicleType.max_surge_multiplier);
      surge_multiplier = Math.min(surge_multiplier, max_surge);

      return surge_multiplier;

    } catch (error) {
      console.error('Error calculating surge multiplier:', error);
      return 1.0; // Default to no surge on error
    }
  }

  /**
   * Get distance and duration using Google Distance Matrix API
   * @param {Object} origin - {lat, lng}
   * @param {Object} destination - {lat, lng}
   * @returns {Object} {distance_km, duration_min}
   */
  static async getDistanceAndDuration(origin, destination) {
    try {
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (googleApiKey) {
        // Use Google Distance Matrix API for accurate road distance
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${googleApiKey}&units=metric&mode=driving`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
          const element = data.rows[0].elements[0];
          return {
            distance_km: Math.round((element.distance.value / 1000) * 100) / 100,
            duration_min: Math.ceil(element.duration.value / 60)
          };
        } else {
          console.warn('Google Distance Matrix API error, falling back to Haversine:', data.error_message || 'Unknown error');
        }
      }
      
      // Fallback to Haversine distance if Google API fails or is not configured
      const distance_km = this.haversineDistance(
        origin.lat, origin.lng, 
        destination.lat, destination.lng
      );
      
      // Estimate duration based on average speed (30 km/h in city)
      const duration_min = Math.ceil((distance_km / 30) * 60);

      return {
        distance_km: Math.round(distance_km * 100) / 100,
        duration_min
      };

    } catch (error) {
      console.error('Error getting distance and duration:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Store fare quote in database
   * @param {Object} fareBreakdown - Fare breakdown from calculateFareEstimate
   * @param {number} booking_id - Booking ID (optional, for pre-booking)
   * @returns {string} Quote ID
   */
  static async storeFareQuote(fareBreakdown, booking_id = null) {
    try {
      if (booking_id) {
        // Store as part of booking process
        // Ensure all required fields have default values and resolve any promises
        const surgeMultiplier = fareBreakdown.surge_multiplier !== undefined ? fareBreakdown.surge_multiplier : 1.0;
        const nightHoursApplied = fareBreakdown.night_hours_applied !== undefined ? 
          (fareBreakdown.night_hours_applied instanceof Promise ? 
            await fareBreakdown.night_hours_applied : fareBreakdown.night_hours_applied) : 0;
        
        console.log('Fare breakdown data:', {
          surge_multiplier: fareBreakdown.surge_multiplier,
          night_hours_applied: fareBreakdown.night_hours_applied,
          surgeMultiplier,
          nightHoursApplied
        });

        // Use retry mechanism for database operation
        await retryDatabaseOperation(async () => {
          const connection = await pool.getConnection();
          try {
            // Set connection timeout
            await connection.query('SET SESSION innodb_lock_wait_timeout = 5');
            
            await connection.query(
              `INSERT INTO ride_fare_breakdowns (
                booking_id, quote_id, vehicle_type_id, distance_km_est, time_min_est,
                base_fare_est, distance_component_est, time_component_est, 
                surge_component_est, night_component_est, total_fare_est,
                surge_multiplier_applied, night_hours_applied, quote_created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                booking_id, fareBreakdown.quote_id, fareBreakdown.vehicle_type_id,
                fareBreakdown.distance_km, fareBreakdown.duration_min,
                fareBreakdown.base_fare, fareBreakdown.distance_component, fareBreakdown.time_component,
                fareBreakdown.surge_component, fareBreakdown.night_component, fareBreakdown.total_fare,
                surgeMultiplier, nightHoursApplied
              ]
            );
          } finally {
            connection.release();
          }
        }, {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 5000
        });
      }

      return fareBreakdown.quote_id;
    } catch (error) {
      console.error('Error storing fare quote:', error);
      throw error;
    }
  }

  /**
   * Validate fare deviation is within acceptable limits
   * @param {number} estimated_fare - Original estimated fare
   * @param {number} actual_fare - Calculated actual fare
   * @returns {Object} {is_valid, deviation_percentage, requires_review}
   */
  static async validateFareDeviation(estimated_fare, actual_fare) {
    try {
      const [maxDeviationRule] = await pool.query(
        "SELECT rule_value FROM pricing_rules WHERE rule_key = 'max_fare_deviation_percentage' AND is_active = 1"
      );
      
      const max_deviation = maxDeviationRule.length ? parseFloat(maxDeviationRule[0].rule_value) : 20;
      const deviation_percentage = Math.abs(((actual_fare - estimated_fare) / estimated_fare) * 100);
      
      return {
        is_valid: deviation_percentage <= max_deviation,
        deviation_percentage: Math.round(deviation_percentage * 100) / 100,
        requires_review: deviation_percentage > max_deviation,
        max_allowed_deviation: max_deviation
      };
    } catch (error) {
      console.error('Error validating fare deviation:', error);
      return {
        is_valid: false,
        deviation_percentage: 0,
        requires_review: true,
        max_allowed_deviation: 20
      };
    }
  }
}

module.exports = FareCalculator;
