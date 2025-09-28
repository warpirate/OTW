const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');
const WalletService = require('../../services/walletService');

// Middleware to check admin role
const verifyAdmin = (req, res, next) => {
  const { role } = req.user;
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * GET /admin/wallets - Get all worker wallets
 */
router.get('/admin/wallets', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '' } = req.query;

    let query = `
      SELECT ww.*, u.name as worker_name, u.phone_number as worker_phone, 
             p.business_name as provider_name, p.business_type
      FROM worker_wallets ww
      JOIN users u ON ww.worker_id = u.id
      JOIN providers p ON ww.provider_id = p.id
    `;
    
    const params = [];
    if (search) {
      query += ' WHERE u.name LIKE ? OR u.phone_number LIKE ? OR p.business_name LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY ww.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [wallets] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM worker_wallets ww
      JOIN users u ON ww.worker_id = u.id
      JOIN providers p ON ww.provider_id = p.id
    `;
    
    const countParams = [];
    if (search) {
      countQuery += ' WHERE u.name LIKE ? OR u.phone_number LIKE ? OR p.business_name LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: wallets,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ message: 'Server error while fetching wallets' });
  }
});

/**
 * GET /admin/wallets/:workerId - Get specific worker wallet details
 */
router.get('/admin/wallets/:workerId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { workerId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const walletDetails = await WalletService.getWalletDetails(workerId);
    
    if (!walletDetails) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Get more detailed transaction history
    const [transactions] = await pool.query(
      `SELECT wt.*, b.id as booking_id, b.service_name, b.price as total_amount
       FROM wallet_transactions wt
       LEFT JOIN bookings b ON wt.booking_id = b.id
       WHERE wt.wallet_id = ?
       ORDER BY wt.created_at DESC
       LIMIT ? OFFSET ?`,
      [walletDetails.wallet.id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        ...walletDetails,
        detailedTransactions: transactions
      }
    });
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    res.status(500).json({ message: 'Server error while fetching wallet details' });
  }
});

/**
 * GET /admin/withdrawals - Get all withdrawal requests
 */
router.get('/admin/withdrawals', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status = null, limit = 50, offset = 0 } = req.query;

    const withdrawals = await WalletService.getWithdrawalRequests(status, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({ message: 'Server error while fetching withdrawal requests' });
  }
});

/**
 * PUT /admin/withdrawals/:id/approve - Approve withdrawal request
 */
router.put('/admin/withdrawals/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes = '' } = req.body;
    const { id: adminId } = req.user;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get withdrawal request details
      const [withdrawal] = await connection.query(
        `SELECT wr.*, u.name as worker_name, p.business_name as provider_name
         FROM withdrawal_requests wr
         JOIN users u ON wr.worker_id = u.id
         JOIN providers p ON wr.provider_id = p.id
         WHERE wr.id = ?`,
        [id]
      );

      if (withdrawal.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Withdrawal request not found' });
      }

      const withdrawalData = withdrawal[0];

      if (withdrawalData.request_status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({ message: 'Withdrawal request is not in pending status' });
      }

      // Update withdrawal status
      await connection.query(
        `UPDATE withdrawal_requests 
         SET request_status = 'approved', admin_notes = ?, updated_at = NOW() 
         WHERE id = ?`,
        [admin_notes, id]
      );

      // Log admin action
      await connection.query(
        `INSERT INTO admin_transaction_logs 
         (admin_id, transaction_type, target_worker_id, target_provider_id, amount, description, ip_address) 
         VALUES (?, 'withdrawal_approval', ?, ?, ?, ?, ?)`,
        [
          adminId,
          withdrawalData.worker_id,
          withdrawalData.provider_id,
          withdrawalData.net_amount,
          `Approved withdrawal request #${id}`,
          req.ip || req.connection.remoteAddress
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Withdrawal request approved successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ message: 'Server error while approving withdrawal' });
  }
});

/**
 * PUT /admin/withdrawals/:id/reject - Reject withdrawal request
 */
router.put('/admin/withdrawals/:id/reject', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes = '', reason = 'Request rejected by admin' } = req.body;
    const { id: adminId } = req.user;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get withdrawal request details
      const [withdrawal] = await connection.query(
        'SELECT * FROM withdrawal_requests WHERE id = ?',
        [id]
      );

      if (withdrawal.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Withdrawal request not found' });
      }

      const withdrawalData = withdrawal[0];

      if (withdrawalData.request_status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({ message: 'Withdrawal request is not in pending status' });
      }

      // Update withdrawal status
      await connection.query(
        `UPDATE withdrawal_requests 
         SET request_status = 'rejected', admin_notes = ?, failure_reason = ?, updated_at = NOW() 
         WHERE id = ?`,
        [admin_notes, reason, id]
      );

      // Log admin action
      await connection.query(
        `INSERT INTO admin_transaction_logs 
         (admin_id, transaction_type, target_worker_id, target_provider_id, amount, description, ip_address) 
         VALUES (?, 'withdrawal_approval', ?, ?, ?, ?, ?)`,
        [
          adminId,
          withdrawalData.worker_id,
          withdrawalData.provider_id,
          withdrawalData.amount,
          `Rejected withdrawal request #${id}: ${reason}`,
          req.ip || req.connection.remoteAddress
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Withdrawal request rejected successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ message: 'Server error while rejecting withdrawal' });
  }
});

/**
 * GET /admin/settlements - Get all daily settlements
 */
router.get('/admin/settlements', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status = null, limit = 50, offset = 0 } = req.query;

    const settlements = await WalletService.getDailySettlements(status, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ message: 'Server error while fetching settlements' });
  }
});

/**
 * GET /admin/transactions - Get all wallet transactions
 */
router.get('/admin/transactions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      transaction_type = null, 
      worker_id = null,
      date_from = null,
      date_to = null
    } = req.query;

    let query = `
      SELECT wt.*, u.name as worker_name, u.phone_number as worker_phone,
             p.business_name as provider_name, b.service_name
      FROM wallet_transactions wt
      JOIN worker_wallets ww ON wt.wallet_id = ww.id
      JOIN users u ON ww.worker_id = u.id
      JOIN providers p ON ww.provider_id = p.id
      LEFT JOIN bookings b ON wt.booking_id = b.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (transaction_type) {
      query += ' AND wt.transaction_type = ?';
      params.push(transaction_type);
    }
    
    if (worker_id) {
      query += ' AND ww.worker_id = ?';
      params.push(worker_id);
    }
    
    if (date_from) {
      query += ' AND DATE(wt.created_at) >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND DATE(wt.created_at) <= ?';
      params.push(date_to);
    }
    
    query += ' ORDER BY wt.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [transactions] = await pool.query(query, params);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});

/**
 * GET /admin/dashboard/stats - Get wallet system statistics
 */
router.get('/admin/dashboard/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT ww.id) as total_wallets,
        SUM(ww.current_balance) as total_balance,
        SUM(ww.total_earned) as total_earned,
        SUM(ww.total_withdrawn) as total_withdrawn,
        SUM(ww.total_settled) as total_settled,
        COUNT(CASE WHEN wr.request_status = 'pending' THEN 1 END) as pending_withdrawals,
        COUNT(CASE WHEN ds.settlement_status = 'pending' THEN 1 END) as pending_settlements,
        SUM(CASE WHEN wr.request_status = 'pending' THEN wr.amount ELSE 0 END) as pending_withdrawal_amount,
        SUM(CASE WHEN ds.settlement_status = 'pending' THEN ds.total_amount ELSE 0 END) as pending_settlement_amount
      FROM worker_wallets ww
      LEFT JOIN withdrawal_requests wr ON ww.worker_id = wr.worker_id AND wr.request_status = 'pending'
      LEFT JOIN daily_settlements ds ON ww.worker_id = ds.worker_id AND ds.settlement_status = 'pending'
    `);

    const [recentTransactions] = await pool.query(`
      SELECT wt.*, u.name as worker_name, p.business_name as provider_name
      FROM wallet_transactions wt
      JOIN worker_wallets ww ON wt.wallet_id = ww.id
      JOIN users u ON ww.worker_id = u.id
      JOIN providers p ON ww.provider_id = p.id
      ORDER BY wt.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        stats: stats[0],
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard stats' });
  }
});

module.exports = router;

