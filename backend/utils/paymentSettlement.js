const pool = require('../config/db');
const Razorpay = require('razorpay');

/**
 * Payment Settlement Manager for Dynamic Fare System
 * Handles pre-authorization, partial capture, refunds, and wallet adjustments
 */
class PaymentSettlement {
  
  constructor() {
    // Initialize Razorpay instance
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create pre-authorization payment for estimated fare
   * @param {Object} params - Payment parameters
   * @param {number} params.booking_id - Booking ID
   * @param {number} params.user_id - Customer user ID
   * @param {number} params.estimated_amount - Estimated fare amount (in paise)
   * @param {string} params.currency - Currency code (default: INR)
   * @param {Object} params.customer_details - Customer details
   * @returns {Object} Razorpay order details
   */
  async createPreAuthPayment(params) {
    const {
      booking_id,
      user_id,
      estimated_amount,
      currency = 'INR',
      customer_details
    } = params;

    try {
      // Create Razorpay order with pre-authorization
      const orderOptions = {
        amount: Math.round(estimated_amount * 100), // Convert to paise
        currency,
        receipt: `booking_${booking_id}_${Date.now()}`,
        payment_capture: 0, // Pre-authorization (don't capture immediately)
        notes: {
          booking_id: booking_id.toString(),
          user_id: user_id.toString(),
          payment_type: 'ride_fare_preauth'
        }
      };

      const razorpayOrder = await this.razorpay.orders.create(orderOptions);

      // Store payment record in database
      const [paymentResult] = await pool.query(`
        INSERT INTO payments (
          booking_id, user_id, razorpay_order_id, method, status, 
          amount_paid, currency, email, contact, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        booking_id,
        user_id,
        razorpayOrder.id,
        'razorpay',
        'created',
        estimated_amount,
        currency,
        customer_details.email,
        customer_details.contact
      ]);

      return {
        payment_id: paymentResult.insertId,
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: 'created',
        message: 'Pre-authorization payment created successfully'
      };

    } catch (error) {
      console.error('Error creating pre-auth payment:', error);
      throw new Error('Failed to create pre-authorization payment');
    }
  }

  /**
   * Capture authorized payment after trip completion
   * @param {Object} params - Capture parameters
   * @param {number} params.booking_id - Booking ID
   * @param {string} params.razorpay_payment_id - Razorpay payment ID
   * @param {number} params.final_amount - Final fare amount
   * @param {number} params.authorized_amount - Originally authorized amount
   * @returns {Object} Capture result
   */
  async capturePayment(params) {
    const {
      booking_id,
      razorpay_payment_id,
      final_amount,
      authorized_amount
    } = params;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get payment record
      const [payments] = await connection.query(
        'SELECT * FROM payments WHERE booking_id = ? AND razorpay_payment_id = ?',
        [booking_id, razorpay_payment_id]
      );

      if (!payments.length) {
        throw new Error('Payment record not found');
      }

      const payment = payments[0];
      const final_amount_paise = Math.round(final_amount * 100);
      const authorized_amount_paise = Math.round(authorized_amount * 100);

      let capture_result = null;
      let refund_result = null;
      let additional_payment_needed = false;

      if (final_amount_paise <= authorized_amount_paise) {
        // Capture the required amount (partial or full)
        capture_result = await this.razorpay.payments.capture(
          razorpay_payment_id,
          final_amount_paise
        );

        // Update payment status
        await connection.query(`
          UPDATE payments 
          SET status = 'captured', amount_paid = ?, captured_at = NOW() 
          WHERE id = ?
        `, [final_amount, payment.id]);

        // If captured less than authorized, the remaining is automatically released by Razorpay

      } else {
        // Final amount exceeds pre-authorized amount
        // Capture full authorized amount first
        capture_result = await this.razorpay.payments.capture(
          razorpay_payment_id,
          authorized_amount_paise
        );

        await connection.query(`
          UPDATE payments 
          SET status = 'captured', amount_paid = ?, captured_at = NOW() 
          WHERE id = ?
        `, [authorized_amount, payment.id]);

        // Mark that additional payment is needed
        additional_payment_needed = true;
        const additional_amount = final_amount - authorized_amount;

        // Create additional payment record for the difference
        await connection.query(`
          INSERT INTO payments (
            booking_id, user_id, method, status, amount_paid, currency, 
            email, contact, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          booking_id,
          payment.user_id,
          'wallet_deduction', // Deduct from wallet or create payment link
          'pending',
          additional_amount,
          payment.currency,
          payment.email,
          payment.contact
        ]);
      }

      await connection.commit();

      return {
        booking_id,
        capture_status: 'success',
        captured_amount: final_amount_paise <= authorized_amount_paise ? final_amount : authorized_amount,
        additional_payment_needed,
        additional_amount: additional_payment_needed ? final_amount - authorized_amount : 0,
        razorpay_capture_id: capture_result.id,
        message: additional_payment_needed ? 
          'Payment captured. Additional amount will be charged.' :
          'Payment captured successfully'
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error capturing payment:', error);
      throw new Error('Failed to capture payment');
    } finally {
      connection.release();
    }
  }

  /**
   * Process refund for cancelled or overpaid bookings
   * @param {Object} params - Refund parameters
   * @param {number} params.booking_id - Booking ID
   * @param {string} params.razorpay_payment_id - Razorpay payment ID
   * @param {number} params.refund_amount - Amount to refund
   * @param {string} params.reason - Refund reason
   * @returns {Object} Refund result
   */
  async processRefund(params) {
    const {
      booking_id,
      razorpay_payment_id,
      refund_amount,
      reason
    } = params;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get payment record
      const [payments] = await connection.query(
        'SELECT * FROM payments WHERE booking_id = ? AND razorpay_payment_id = ?',
        [booking_id, razorpay_payment_id]
      );

      if (!payments.length) {
        throw new Error('Payment record not found');
      }

      const payment = payments[0];
      const refund_amount_paise = Math.round(refund_amount * 100);

      // Create refund with Razorpay
      const refund_result = await this.razorpay.payments.refund(razorpay_payment_id, {
        amount: refund_amount_paise,
        notes: {
          booking_id: booking_id.toString(),
          reason: reason
        }
      });

      // Store refund record
      await connection.query(`
        INSERT INTO payment_refunds (
          payment_id, refund_id, amount, reason, status, refunded_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        payment.id,
        refund_result.id,
        refund_amount,
        reason,
        'processed'
      ]);

      // Update payment status if fully refunded
      if (refund_amount >= payment.amount_paid) {
        await connection.query(
          'UPDATE payments SET status = ? WHERE id = ?',
          ['refunded', payment.id]
        );
      }

      await connection.commit();

      return {
        booking_id,
        refund_status: 'success',
        refund_amount,
        razorpay_refund_id: refund_result.id,
        estimated_settlement_time: '5-7 business days',
        message: 'Refund processed successfully'
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    } finally {
      connection.release();
    }
  }

  /**
   * Handle wallet adjustments for fare differences
   * @param {Object} params - Wallet adjustment parameters
   * @param {number} params.user_id - User ID
   * @param {number} params.booking_id - Booking ID
   * @param {number} params.amount - Amount to adjust (positive for credit, negative for debit)
   * @param {string} params.type - Transaction type
   * @param {string} params.description - Transaction description
   * @returns {Object} Wallet adjustment result
   */
  async adjustWallet(params) {
    const {
      user_id,
      booking_id,
      amount,
      type,
      description
    } = params;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current wallet balance (assuming wallet table exists)
      const [walletData] = await connection.query(
        'SELECT balance FROM user_wallets WHERE user_id = ?',
        [user_id]
      );

      let current_balance = 0;
      if (walletData.length) {
        current_balance = parseFloat(walletData[0].balance);
      } else {
        // Create wallet if doesn't exist
        await connection.query(
          'INSERT INTO user_wallets (user_id, balance, created_at) VALUES (?, 0, NOW())',
          [user_id]
        );
      }

      const new_balance = current_balance + amount;

      // Check if sufficient balance for debit
      if (amount < 0 && new_balance < 0) {
        throw new Error('Insufficient wallet balance');
      }

      // Update wallet balance
      await connection.query(
        'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?',
        [new_balance, user_id]
      );

      // Log wallet transaction
      await connection.query(`
        INSERT INTO wallet_transactions (
          user_id, booking_id, amount, transaction_type, description, 
          balance_before, balance_after, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        user_id, booking_id, amount, type, description, 
        current_balance, new_balance
      ]);

      await connection.commit();

      return {
        user_id,
        booking_id,
        transaction_amount: amount,
        balance_before: current_balance,
        balance_after: new_balance,
        transaction_type: type,
        message: amount > 0 ? 'Wallet credited successfully' : 'Wallet debited successfully'
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error adjusting wallet:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Calculate and distribute earnings to provider
   * @param {Object} params - Earnings parameters
   * @param {number} params.booking_id - Booking ID
   * @param {number} params.provider_id - Provider ID
   * @param {number} params.final_fare - Final fare amount
   * @returns {Object} Earnings calculation result
   */
  async calculateProviderEarnings(params) {
    const {
      booking_id,
      provider_id,
      final_fare
    } = params;

    try {
      // Get commission percentage from pricing rules
      const [commissionRule] = await pool.query(
        "SELECT rule_value FROM pricing_rules WHERE rule_key = 'platform_commission_percentage' AND is_active = 1"
      );

      const commission_percentage = commissionRule.length ? 
        parseFloat(commissionRule[0].rule_value) : 20;

      // Get GST percentage
      const [gstRule] = await pool.query(
        "SELECT rule_value FROM pricing_rules WHERE rule_key = 'gst_percentage' AND is_active = 1"
      );

      const gst_percentage = gstRule.length ? 
        parseFloat(gstRule[0].rule_value) : 18;

      // Calculate earnings breakdown
      const platform_commission = (final_fare * commission_percentage) / 100;
      const gst_amount = (platform_commission * gst_percentage) / 100;
      const provider_earnings = final_fare - platform_commission - gst_amount;

      // Store earnings record
      await pool.query(`
        INSERT INTO provider_earnings (
          provider_id, booking_id, final_fare, platform_commission, 
          gst_amount, provider_earnings, commission_percentage, 
          gst_percentage, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        provider_id, booking_id, final_fare, platform_commission,
        gst_amount, provider_earnings, commission_percentage, gst_percentage
      ]);

      return {
        booking_id,
        provider_id,
        final_fare,
        platform_commission,
        gst_amount,
        provider_earnings: Math.round(provider_earnings * 100) / 100,
        commission_percentage,
        gst_percentage,
        earnings_breakdown: {
          gross_fare: final_fare,
          platform_fee: platform_commission,
          gst_on_commission: gst_amount,
          net_earnings: Math.round(provider_earnings * 100) / 100
        }
      };

    } catch (error) {
      console.error('Error calculating provider earnings:', error);
      throw new Error('Failed to calculate provider earnings');
    }
  }

  /**
   * Handle complete payment settlement after trip completion
   * @param {Object} params - Settlement parameters
   * @param {number} params.booking_id - Booking ID
   * @param {number} params.final_fare - Final calculated fare
   * @returns {Object} Complete settlement result
   */
  async settlePayment(params) {
    const { booking_id, final_fare } = params;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get booking and payment details
      const [bookingData] = await connection.query(`
        SELECT b.*, p.razorpay_payment_id, p.amount_paid as authorized_amount, p.user_id
        FROM bookings b
        LEFT JOIN payments p ON b.id = p.booking_id AND p.status IN ('authorized', 'captured')
        WHERE b.id = ?
      `, [booking_id]);

      if (!bookingData.length) {
        throw new Error('Booking not found');
      }

      const booking = bookingData[0];
      let settlement_result = {};

      if (booking.razorpay_payment_id) {
        // Handle Razorpay payment settlement
        settlement_result = await this.capturePayment({
          booking_id,
          razorpay_payment_id: booking.razorpay_payment_id,
          final_amount: final_fare,
          authorized_amount: booking.authorized_amount
        });

        // Handle additional payment if needed
        if (settlement_result.additional_payment_needed) {
          const additional_amount = settlement_result.additional_amount;
          
          try {
            // Try to deduct from wallet first
            await this.adjustWallet({
              user_id: booking.user_id,
              booking_id,
              amount: -additional_amount,
              type: 'fare_adjustment',
              description: `Additional fare charge for booking ${booking_id}`
            });

            settlement_result.additional_payment_method = 'wallet';
            settlement_result.message += ' Additional amount charged to wallet.';

          } catch (walletError) {
            // Wallet insufficient, create payment link for additional amount
            settlement_result.additional_payment_method = 'payment_link';
            settlement_result.message += ' Payment link will be sent for additional amount.';
            
            // TODO: Implement payment link creation
            // This would create a Razorpay payment link for the additional amount
          }
        }

      } else {
        // Handle cash payment or other methods
        settlement_result = {
          booking_id,
          payment_method: 'cash',
          final_amount: final_fare,
          message: 'Cash payment settlement recorded'
        };
      }

      // Calculate provider earnings
      const earnings_result = await this.calculateProviderEarnings({
        booking_id,
        provider_id: booking.provider_id,
        final_fare
      });

      // Update booking payment status
      await connection.query(
        'UPDATE bookings SET payment_status = ? WHERE id = ?',
        ['completed', booking_id]
      );

      await connection.commit();

      return {
        settlement_result,
        earnings_result,
        booking_id,
        final_fare,
        settlement_status: 'completed',
        message: 'Payment settlement completed successfully'
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error settling payment:', error);
      throw new Error('Failed to settle payment');
    } finally {
      connection.release();
    }
  }
}

module.exports = PaymentSettlement;
