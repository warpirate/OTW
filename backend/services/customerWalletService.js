const pool = require('../config/db');
const { createUPIOrder, createUPIPaymentRequest } = require('../config/razorpay');

class CustomerWalletService {
  
  /**
   * Create or get customer wallet
   */
  static async getOrCreateWallet(customerId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if wallet exists
      const [existingWallet] = await connection.query(
        'SELECT * FROM customer_wallets WHERE customer_id = ?',
        [customerId]
      );

      if (existingWallet.length > 0) {
        await connection.commit();
        return existingWallet[0];
      }

      // Create new wallet
      const [result] = await connection.query(
        `INSERT INTO customer_wallets (customer_id, current_balance, total_added, total_spent, total_refunded, is_active) 
         VALUES (?, 0.00, 0.00, 0.00, 0.00, TRUE)`,
        [customerId]
      );

      const [newWallet] = await connection.query(
        'SELECT * FROM customer_wallets WHERE id = ?',
        [result.insertId]
      );

      await connection.commit();
      return newWallet[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Credit amount to customer wallet (for top-ups, refunds, bonuses)
   */
  static async creditWallet(customerId, amount, transactionType = 'credit', description = '', referenceId = null, paymentMethod = 'wallet') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get or create wallet
      const wallet = await this.getOrCreateWallet(customerId);
      
      const balanceBefore = parseFloat(wallet.current_balance);
      const balanceAfter = balanceBefore + parseFloat(amount);

      // Update wallet balance
      let updateQuery = `UPDATE customer_wallets SET current_balance = ?, updated_at = NOW()`;
      let updateParams = [balanceAfter];

      if (transactionType === 'topup') {
        updateQuery += `, total_added = total_added + ?`;
        updateParams.push(amount);
      } else if (transactionType === 'refund') {
        updateQuery += `, total_refunded = total_refunded + ?`;
        updateParams.push(amount);
      }

      updateQuery += ` WHERE id = ?`;
      updateParams.push(wallet.id);

      await connection.query(updateQuery, updateParams);

      // Create transaction record
      await connection.query(
        `INSERT INTO customer_wallet_transactions 
         (wallet_id, transaction_type, amount, balance_before, balance_after, description, reference_id, payment_method, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [wallet.id, transactionType, amount, balanceBefore, balanceAfter, description, referenceId, paymentMethod]
      );

      await connection.commit();
      return { success: true, newBalance: balanceAfter, transactionId: null };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Debit amount from customer wallet (for payments)
   */
  static async debitWallet(customerId, amount, description, bookingId = null, paymentMethod = 'wallet') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [wallet] = await connection.query(
        'SELECT * FROM customer_wallets WHERE customer_id = ? AND is_active = TRUE',
        [customerId]
      );

      if (wallet.length === 0) {
        throw new Error('Wallet not found or inactive');
      }

      const walletData = wallet[0];
      const balanceBefore = parseFloat(walletData.current_balance);
      
      if (balanceBefore < parseFloat(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - parseFloat(amount);

      // Update wallet balance
      await connection.query(
        `UPDATE customer_wallets 
         SET current_balance = ?, total_spent = total_spent + ?, updated_at = NOW() 
         WHERE id = ?`,
        [balanceAfter, amount, walletData.id]
      );

      // Create transaction record
      const [transactionResult] = await connection.query(
        `INSERT INTO customer_wallet_transactions 
         (wallet_id, booking_id, transaction_type, amount, balance_before, balance_after, description, payment_method, status) 
         VALUES (?, ?, 'debit', ?, ?, ?, ?, ?, 'completed')`,
        [walletData.id, bookingId, amount, balanceBefore, balanceAfter, description, paymentMethod]
      );

      await connection.commit();
      return { 
        success: true, 
        newBalance: balanceAfter, 
        transactionId: transactionResult.insertId 
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get wallet details and transaction history
   */
  static async getWalletDetails(customerId) {
    try {
      const [wallet] = await pool.query(
        `SELECT cw.*, u.name as customer_name, u.phone_number as customer_phone, u.email as customer_email
         FROM customer_wallets cw
         JOIN customers c ON cw.customer_id = c.id
         JOIN users u ON c.id = u.id
         WHERE cw.customer_id = ?`,
        [customerId]
      );

      if (wallet.length === 0) {
        return null;
      }

      const [transactions] = await pool.query(
        `SELECT cwt.*, b.id as booking_id, b.service_name
         FROM customer_wallet_transactions cwt
         LEFT JOIN bookings b ON cwt.booking_id = b.id
         WHERE cwt.wallet_id = ?
         ORDER BY cwt.created_at DESC
         LIMIT 50`,
        [wallet[0].id]
      );

      return {
        wallet: wallet[0],
        recentTransactions: transactions
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create wallet top-up request
   */
  static async createTopupRequest(customerId, amount, paymentMethod = 'upi') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get wallet settings
      const [settings] = await pool.query(
        'SELECT setting_value FROM wallet_settings WHERE setting_key = ? AND is_active = TRUE',
        ['min_topup_amount']
      );
      const minAmount = settings.length > 0 ? parseFloat(settings[0].setting_value) : 100;

      if (parseFloat(amount) < minAmount) {
        throw new Error(`Minimum top-up amount is ₹${minAmount}`);
      }

      // Get or create wallet
      const wallet = await this.getOrCreateWallet(customerId);

      // Generate transaction ID
      const transactionId = `TOPUP_${customerId}_${Date.now()}`;

      // Create top-up request
      const [result] = await connection.query(
        `INSERT INTO wallet_topup_requests 
         (customer_id, wallet_id, amount, payment_method, topup_status) 
         VALUES (?, ?, ?, ?, 'pending')`,
        [customerId, wallet.id, amount, paymentMethod]
      );

      // For UPI payments, create Razorpay order
      if (paymentMethod === 'upi') {
        const orderResult = await createUPIOrder(amount, 'INR', transactionId);
        
        if (!orderResult.success) {
          await connection.rollback();
          throw new Error('Failed to create payment order');
        }

        // Update top-up request with Razorpay order ID
        await connection.query(
          'UPDATE wallet_topup_requests SET razorpay_order_id = ?, topup_status = ? WHERE id = ?',
          [orderResult.order.id, 'processing', result.insertId]
        );

        await connection.commit();
        return {
          success: true,
          topupId: result.insertId,
          razorpayOrderId: orderResult.order.id,
          amount: amount,
          status: 'processing'
        };
      } else {
        await connection.commit();
        return {
          success: true,
          topupId: result.insertId,
          amount: amount,
          status: 'pending'
        };
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Process successful top-up payment
   */
  static async processTopupPayment(topupId, razorpayPaymentId = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get top-up request
      const [topupRequest] = await connection.query(
        'SELECT * FROM wallet_topup_requests WHERE id = ?',
        [topupId]
      );

      if (topupRequest.length === 0) {
        throw new Error('Top-up request not found');
      }

      const topup = topupRequest[0];

      if (topup.topup_status !== 'processing') {
        throw new Error('Top-up request is not in processing status');
      }

      // Update top-up status
      await connection.query(
        `UPDATE wallet_topup_requests 
         SET topup_status = 'completed', razorpay_payment_id = ?, processed_at = NOW() 
         WHERE id = ?`,
        [razorpayPaymentId, topupId]
      );

      // Credit wallet
      const creditResult = await this.creditWallet(
        topup.customer_id,
        topup.amount,
        'topup',
        `Wallet top-up via ${topup.payment_method}`,
        topupId.toString(),
        topup.payment_method
      );

      await connection.commit();
      return {
        success: true,
        newBalance: creditResult.newBalance,
        amount: topup.amount
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Process wallet payment for booking
   */
  static async processWalletPayment(customerId, amount, bookingId, description = 'Booking payment') {
    try {
      const result = await this.debitWallet(customerId, amount, description, bookingId, 'wallet');
      
      // Update booking with wallet transaction ID
      await pool.query(
        'UPDATE bookings SET wallet_transaction_id = ? WHERE id = ?',
        [result.transactionId, bookingId]
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process refund to wallet
   */
  static async processRefund(customerId, amount, bookingId, reason = 'Booking cancellation') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create refund record
      const [refundResult] = await connection.query(
        `INSERT INTO wallet_refunds 
         (customer_id, wallet_id, booking_id, refund_amount, refund_reason, refund_status) 
         VALUES (?, (SELECT id FROM customer_wallets WHERE customer_id = ?), ?, ?, ?, 'completed')`,
        [customerId, customerId, bookingId, amount, reason]
      );

      // Credit wallet
      const creditResult = await this.creditWallet(
        customerId,
        amount,
        'refund',
        `Refund for booking #${bookingId}: ${reason}`,
        refundResult.insertId.toString(),
        'refund'
      );

      await connection.commit();
      return {
        success: true,
        refundId: refundResult.insertId,
        newBalance: creditResult.newBalance
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get wallet settings
   */
  static async getWalletSettings() {
    try {
      const [settings] = await pool.query(
        'SELECT setting_key, setting_value, description FROM wallet_settings WHERE is_active = TRUE'
      );

      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.setting_key] = {
          value: setting.setting_value,
          description: setting.description
        };
      });

      return settingsObj;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if wallet payment is enabled
   */
  static async isWalletPaymentEnabled() {
    try {
      const [settings] = await pool.query(
        'SELECT setting_value FROM wallet_settings WHERE setting_key = ? AND is_active = TRUE',
        ['wallet_payment_enabled']
      );

      return settings.length > 0 ? settings[0].setting_value === 'true' : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get top-up history
   */
  static async getTopupHistory(customerId, limit = 20, offset = 0) {
    try {
      const [topups] = await pool.query(
        `SELECT * FROM wallet_topup_requests 
         WHERE customer_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [customerId, limit, offset]
      );

      return topups;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get refund history
   */
  static async getRefundHistory(customerId, limit = 20, offset = 0) {
    try {
      const [refunds] = await pool.query(
        `SELECT wr.*, b.service_name, u.name as processed_by_name
         FROM wallet_refunds wr
         LEFT JOIN bookings b ON wr.booking_id = b.id
         LEFT JOIN users u ON wr.processed_by = u.id
         WHERE wr.customer_id = ? 
         ORDER BY wr.created_at DESC 
         LIMIT ? OFFSET ?`,
        [customerId, limit, offset]
      );

      return refunds;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CustomerWalletService;
