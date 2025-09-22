const pool = require('../config/db');
const { createPayout } = require('../config/razorpay');

class WalletService {
  
  /**
   * Create or get worker wallet
   */
  static async getOrCreateWallet(workerId, providerId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if wallet exists
      const [existingWallet] = await connection.query(
        'SELECT * FROM worker_wallets WHERE worker_id = ?',
        [workerId]
      );

      if (existingWallet.length > 0) {
        await connection.commit();
        return existingWallet[0];
      }

      // Create new wallet
      const [result] = await connection.query(
        `INSERT INTO worker_wallets (worker_id, provider_id, current_balance, total_earned, total_withdrawn, total_settled, is_active) 
         VALUES (?, ?, 0.00, 0.00, 0.00, 0.00, TRUE)`,
        [workerId, providerId]
      );

      const [newWallet] = await connection.query(
        'SELECT * FROM worker_wallets WHERE id = ?',
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
   * Credit amount to worker wallet (for cash payments)
   */
  static async creditWallet(workerId, amount, bookingId, description = 'Cash payment received') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get or create wallet
      const wallet = await this.getOrCreateWallet(workerId, null);
      
      const balanceBefore = parseFloat(wallet.current_balance);
      const balanceAfter = balanceBefore + parseFloat(amount);

      // Update wallet balance
      await connection.query(
        `UPDATE worker_wallets 
         SET current_balance = ?, total_earned = total_earned + ?, updated_at = NOW() 
         WHERE id = ?`,
        [balanceAfter, amount, wallet.id]
      );

      // Create transaction record
      await connection.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, booking_id, transaction_type, amount, balance_before, balance_after, description, status) 
         VALUES (?, ?, 'credit', ?, ?, ?, ?, 'completed')`,
        [wallet.id, bookingId, amount, balanceBefore, balanceAfter, description]
      );

      await connection.commit();
      return { success: true, newBalance: balanceAfter };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Debit amount from worker wallet
   */
  static async debitWallet(workerId, amount, description, referenceId = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [wallet] = await connection.query(
        'SELECT * FROM worker_wallets WHERE worker_id = ? AND is_active = TRUE',
        [workerId]
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
        `UPDATE worker_wallets 
         SET current_balance = ?, updated_at = NOW() 
         WHERE id = ?`,
        [balanceAfter, walletData.id]
      );

      // Create transaction record
      await connection.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, transaction_type, amount, balance_before, balance_after, description, reference_id, status) 
         VALUES (?, 'debit', ?, ?, ?, ?, ?, 'completed')`,
        [walletData.id, amount, balanceBefore, balanceAfter, description, referenceId]
      );

      await connection.commit();
      return { success: true, newBalance: balanceAfter };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get wallet balance and transaction history
   */
  static async getWalletDetails(workerId) {
    try {
      const [wallet] = await pool.query(
        `SELECT ww.*, u.name as worker_name, p.business_name as provider_name
         FROM worker_wallets ww
         JOIN users u ON ww.worker_id = u.id
         JOIN providers p ON ww.provider_id = p.id
         WHERE ww.worker_id = ?`,
        [workerId]
      );

      if (wallet.length === 0) {
        return null;
      }

      const [transactions] = await pool.query(
        `SELECT wt.*, b.id as booking_id, b.service_name
         FROM wallet_transactions wt
         LEFT JOIN bookings b ON wt.booking_id = b.id
         WHERE wt.wallet_id = ?
         ORDER BY wt.created_at DESC
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
   * Calculate withdrawal charges
   */
  static async calculateWithdrawalCharges(amount) {
    try {
      const [charges] = await pool.query(
        `SELECT * FROM system_charges 
         WHERE charge_type = 'withdrawal_fee' 
         AND is_active = TRUE 
         AND effective_from <= CURDATE() 
         AND (effective_to IS NULL OR effective_to >= CURDATE())
         ORDER BY effective_from DESC 
         LIMIT 1`
      );

      if (charges.length === 0) {
        return { charges: 0, netAmount: amount };
      }

      const chargeConfig = charges[0];
      const percentageCharge = (parseFloat(amount) * parseFloat(chargeConfig.charge_percentage)) / 100;
      const fixedCharge = parseFloat(chargeConfig.fixed_charge);
      
      let totalCharges = Math.max(percentageCharge, fixedCharge);
      
      // Apply minimum and maximum limits
      if (chargeConfig.minimum_charge && totalCharges < parseFloat(chargeConfig.minimum_charge)) {
        totalCharges = parseFloat(chargeConfig.minimum_charge);
      }
      if (chargeConfig.maximum_charge && totalCharges > parseFloat(chargeConfig.maximum_charge)) {
        totalCharges = parseFloat(chargeConfig.maximum_charge);
      }

      const netAmount = parseFloat(amount) - totalCharges;

      return {
        charges: totalCharges,
        netAmount: netAmount,
        chargeBreakdown: {
          percentage: chargeConfig.charge_percentage,
          fixed: chargeConfig.fixed_charge,
          minimum: chargeConfig.minimum_charge,
          maximum: chargeConfig.maximum_charge
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create withdrawal request
   */
  static async createWithdrawalRequest(workerId, amount, upiId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get wallet
      const [wallet] = await connection.query(
        'SELECT * FROM worker_wallets WHERE worker_id = ? AND is_active = TRUE',
        [workerId]
      );

      if (wallet.length === 0) {
        throw new Error('Wallet not found or inactive');
      }

      const walletData = wallet[0];

      // Check balance
      if (parseFloat(walletData.current_balance) < parseFloat(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      // Calculate charges
      const chargeDetails = await this.calculateWithdrawalCharges(amount);

      // Create withdrawal request
      const [result] = await connection.query(
        `INSERT INTO withdrawal_requests 
         (worker_id, provider_id, wallet_id, amount, withdrawal_charges, net_amount, upi_id, request_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          workerId,
          walletData.provider_id,
          walletData.id,
          amount,
          chargeDetails.charges,
          chargeDetails.netAmount,
          upiId
        ]
      );

      await connection.commit();
      return {
        success: true,
        withdrawalId: result.insertId,
        charges: chargeDetails.charges,
        netAmount: chargeDetails.netAmount
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Process daily settlement
   */
  static async processDailySettlement(workerId, upiId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [wallet] = await connection.query(
        'SELECT * FROM worker_wallets WHERE worker_id = ? AND is_active = TRUE',
        [workerId]
      );

      if (wallet.length === 0) {
        throw new Error('Wallet not found or inactive');
      }

      const walletData = wallet[0];
      const currentBalance = parseFloat(walletData.current_balance);

      if (currentBalance <= 0) {
        throw new Error('No balance available for settlement');
      }

      // Calculate settlement charges
      const [charges] = await pool.query(
        `SELECT * FROM system_charges 
         WHERE charge_type = 'settlement_fee' 
         AND is_active = TRUE 
         AND effective_from <= CURDATE() 
         AND (effective_to IS NULL OR effective_to >= CURDATE())
         ORDER BY effective_from DESC 
         LIMIT 1`
      );

      let settlementCharges = 0;
      if (charges.length > 0) {
        const chargeConfig = charges[0];
        const percentageCharge = (currentBalance * parseFloat(chargeConfig.charge_percentage)) / 100;
        const fixedCharge = parseFloat(chargeConfig.fixed_charge);
        settlementCharges = Math.max(percentageCharge, fixedCharge);
        
        if (chargeConfig.minimum_charge && settlementCharges < parseFloat(chargeConfig.minimum_charge)) {
          settlementCharges = parseFloat(chargeConfig.minimum_charge);
        }
        if (chargeConfig.maximum_charge && settlementCharges > parseFloat(chargeConfig.maximum_charge)) {
          settlementCharges = parseFloat(chargeConfig.maximum_charge);
        }
      }

      const netAmount = currentBalance - settlementCharges;

      // Create settlement record
      const [settlementResult] = await connection.query(
        `INSERT INTO daily_settlements 
         (worker_id, provider_id, settlement_date, total_amount, transaction_count, upi_id, settlement_status) 
         VALUES (?, ?, CURDATE(), ?, 1, ?, 'pending')`,
        [workerId, walletData.provider_id, netAmount, upiId]
      );

      // Update wallet balance
      await connection.query(
        `UPDATE worker_wallets 
         SET current_balance = 0.00, total_settled = total_settled + ?, updated_at = NOW() 
         WHERE id = ?`,
        [netAmount, walletData.id]
      );

      // Create transaction record
      await connection.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, transaction_type, amount, balance_before, balance_after, description, reference_id, status) 
         VALUES (?, 'settlement', ?, ?, 0.00, 'Daily settlement', ?, 'completed')`,
        [walletData.id, netAmount, currentBalance, settlementResult.insertId]
      );

      await connection.commit();
      return {
        success: true,
        settlementId: settlementResult.insertId,
        amount: netAmount,
        charges: settlementCharges
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get withdrawal requests for admin
   */
  static async getWithdrawalRequests(status = null, limit = 50, offset = 0) {
    try {
      let query = `
        SELECT wr.*, u.name as worker_name, u.phone_number as worker_phone, 
               p.business_name as provider_name, ww.current_balance
        FROM withdrawal_requests wr
        JOIN users u ON wr.worker_id = u.id
        JOIN providers p ON wr.provider_id = p.id
        JOIN worker_wallets ww ON wr.wallet_id = ww.id
      `;
      
      const params = [];
      if (status) {
        query += ' WHERE wr.request_status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY wr.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [requests] = await pool.query(query, params);
      return requests;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get daily settlements for admin
   */
  static async getDailySettlements(status = null, limit = 50, offset = 0) {
    try {
      let query = `
        SELECT ds.*, u.name as worker_name, u.phone_number as worker_phone, 
               p.business_name as provider_name
        FROM daily_settlements ds
        JOIN users u ON ds.worker_id = u.id
        JOIN providers p ON ds.provider_id = p.id
      `;
      
      const params = [];
      if (status) {
        query += ' WHERE ds.settlement_status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY ds.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [settlements] = await pool.query(query, params);
      return settlements;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = WalletService;

