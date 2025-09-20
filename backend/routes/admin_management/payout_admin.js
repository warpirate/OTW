const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const verifyToken = require('../middlewares/verify_token');

/**
 * Admin routes for payout management
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
 * GET /admin/payouts/stats - Get payout statistics
 */
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN pe.payout_status = 'pending' THEN pe.net_earnings ELSE 0 END) as total_pending,
        COUNT(DISTINCT CASE WHEN pe.payout_status = 'pending' THEN pe.provider_id END) as total_providers,
        SUM(CASE WHEN MONTH(pe.calculated_at) = MONTH(NOW()) AND YEAR(pe.calculated_at) = YEAR(NOW()) 
                 AND pe.payout_status = 'paid' THEN pe.net_earnings ELSE 0 END) as this_month_payouts,
        AVG(CASE WHEN pe.payout_status = 'pending' THEN pe.net_earnings END) as avg_payout
      FROM provider_earnings pe
    `);

    res.json({
      success: true,
      stats: stats[0] || {
        total_pending: 0,
        total_providers: 0,
        this_month_payouts: 0,
        avg_payout: 0
      }
    });

  } catch (error) {
    console.error('Error fetching payout stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching payout stats' 
    });
  }
});

/**
 * GET /admin/payouts/provider-earnings - Get provider earnings summary
 */
router.get('/provider-earnings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { date_range = 'this_month' } = req.query;
    
    let dateCondition = '';
    switch (date_range) {
      case 'this_week':
        dateCondition = 'AND pe.calculated_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      case 'this_month':
        dateCondition = 'AND MONTH(pe.calculated_at) = MONTH(NOW()) AND YEAR(pe.calculated_at) = YEAR(NOW())';
        break;
      case 'last_month':
        dateCondition = 'AND MONTH(pe.calculated_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(pe.calculated_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))';
        break;
      case 'last_3_months':
        dateCondition = 'AND pe.calculated_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
        break;
    }

    const [earnings] = await pool.query(`
      SELECT 
        p.id as provider_id,
        u.name as provider_name,
        u.email as provider_email,
        u.phone_number as provider_phone,
        COUNT(pe.id) as total_rides,
        SUM(pe.final_fare) as total_gross_fare,
        SUM(pe.platform_commission) as total_commission,
        SUM(pe.gst_amount) as total_gst,
        SUM(pe.net_earnings) as total_net_earnings,
        AVG(pe.provider_earnings) as avg_earnings_per_ride,
        SUM(CASE WHEN pe.payout_status = 'pending' THEN pe.net_earnings ELSE 0 END) as pending_payout,
        SUM(CASE WHEN pe.payout_status = 'paid' THEN pe.net_earnings ELSE 0 END) as paid_earnings,
        MIN(pe.calculated_at) as first_earning_date,
        MAX(pe.calculated_at) as last_earning_date
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN provider_earnings pe ON p.id = pe.provider_id
      WHERE 1=1 ${dateCondition}
      GROUP BY p.id, u.name, u.email, u.phone_number
      HAVING total_rides > 0
      ORDER BY total_net_earnings DESC
    `);

    res.json({
      success: true,
      earnings,
      total_count: earnings.length,
      date_range
    });

  } catch (error) {
    console.error('Error fetching provider earnings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching provider earnings' 
    });
  }
});

/**
 * GET /admin/payouts/pending - Get pending payouts
 */
router.get('/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [pending] = await pool.query(`
      SELECT 
        pe.provider_id,
        u.name as provider_name,
        COUNT(pe.id) as pending_rides,
        SUM(pe.net_earnings) as total_pending_amount,
        MIN(pe.calculated_at) as oldest_earning,
        MAX(pe.calculated_at) as latest_earning,
        pbd.account_holder_name,
        pbd.account_number,
        pbd.ifsc_code,
        pbd.bank_name
      FROM provider_earnings pe
      JOIN providers p ON pe.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN provider_banking_details pbd ON p.id = pbd.provider_id AND pbd.is_primary = 1
      WHERE pe.payout_status = 'pending'
      GROUP BY pe.provider_id, u.name, pbd.account_holder_name, pbd.account_number, pbd.ifsc_code, pbd.bank_name
      ORDER BY total_pending_amount DESC
    `);

    res.json({
      success: true,
      pending,
      total_count: pending.length,
      total_amount: pending.reduce((sum, p) => sum + parseFloat(p.total_pending_amount), 0)
    });

  } catch (error) {
    console.error('Error fetching pending payouts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching pending payouts' 
    });
  }
});

/**
 * GET /admin/payouts/batches - Get payout batches
 */
router.get('/batches', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { date_range = 'this_month', status = 'all' } = req.query;
    
    let dateCondition = '';
    switch (date_range) {
      case 'this_week':
        dateCondition = 'AND pb.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      case 'this_month':
        dateCondition = 'AND MONTH(pb.created_at) = MONTH(NOW()) AND YEAR(pb.created_at) = YEAR(NOW())';
        break;
      case 'last_month':
        dateCondition = 'AND MONTH(pb.created_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(pb.created_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))';
        break;
      case 'last_3_months':
        dateCondition = 'AND pb.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
        break;
    }

    let statusCondition = '';
    if (status !== 'all') {
      statusCondition = `AND pb.status = '${status}'`;
    }

    const [batches] = await pool.query(`
      SELECT 
        pb.*,
        u.name as created_by_name
      FROM payout_batches pb
      JOIN users u ON pb.created_by = u.id
      WHERE 1=1 ${dateCondition} ${statusCondition}
      ORDER BY pb.created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      batches,
      total_count: batches.length
    });

  } catch (error) {
    console.error('Error fetching payout batches:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching payout batches' 
    });
  }
});

/**
 * POST /admin/payouts/batches - Create new payout batch
 */
router.post('/batches', verifyToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { provider_ids = [], date_range = 'this_month', notes = '' } = req.body;
    const { id: admin_user_id } = req.user;

    // If no specific providers, get all with pending payouts
    let finalProviderIds = provider_ids;
    if (provider_ids.length === 0) {
      const [pendingProviders] = await connection.query(`
        SELECT DISTINCT provider_id 
        FROM provider_earnings 
        WHERE payout_status = 'pending'
      `);
      finalProviderIds = pendingProviders.map(p => p.provider_id);
    }

    if (finalProviderIds.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No providers with pending payouts found'
      });
    }

    // Calculate total amount and provider count
    const [totals] = await connection.query(`
      SELECT 
        COUNT(DISTINCT provider_id) as total_providers,
        SUM(net_earnings) as total_amount
      FROM provider_earnings 
      WHERE provider_id IN (${finalProviderIds.map(() => '?').join(',')}) 
        AND payout_status = 'pending'
    `, finalProviderIds);

    const { total_providers, total_amount } = totals[0];

    if (total_amount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No pending earnings found for selected providers'
      });
    }

    // Create payout batch
    const batch_reference = `BATCH_${Date.now()}`;
    const [batchResult] = await connection.query(`
      INSERT INTO payout_batches (
        batch_reference, total_amount, total_providers, payout_method,
        status, created_by, notes
      ) VALUES (?, ?, ?, 'bank_transfer', 'created', ?, ?)
    `, [batch_reference, total_amount, total_providers, admin_user_id, notes]);

    const batch_id = batchResult.insertId;

    // Create individual payout details for each provider
    for (const provider_id of finalProviderIds) {
      const [providerEarnings] = await connection.query(`
        SELECT 
          COUNT(*) as earnings_count,
          SUM(net_earnings) as amount,
          MIN(calculated_at) as from_date,
          MAX(calculated_at) as to_date
        FROM provider_earnings 
        WHERE provider_id = ? AND payout_status = 'pending'
      `, [provider_id]);

      const earnings = providerEarnings[0];
      
      if (earnings.amount > 0) {
        // Get primary bank account
        const [bankAccount] = await connection.query(`
          SELECT id FROM provider_banking_details 
          WHERE provider_id = ? AND is_primary = 1 AND status = 'verified'
          LIMIT 1
        `, [provider_id]);

        await connection.query(`
          INSERT INTO payout_details (
            batch_id, provider_id, amount, earnings_count,
            from_date, to_date, bank_account_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
          batch_id, provider_id, earnings.amount, earnings.earnings_count,
          earnings.from_date, earnings.to_date, 
          bankAccount.length ? bankAccount[0].id : null
        ]);
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Payout batch created successfully',
      batch_id,
      batch_reference,
      total_amount,
      total_providers
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating payout batch:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating payout batch' 
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /admin/payouts/batches/:id/process - Process payout batch
 */
router.post('/batches/:id/process', verifyToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: batch_id } = req.params;

    // Get batch details
    const [batches] = await connection.query(
      'SELECT * FROM payout_batches WHERE id = ? AND status = ?',
      [batch_id, 'created']
    );

    if (!batches.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payout batch not found or already processed'
      });
    }

    // Update batch status to processing
    await connection.query(
      'UPDATE payout_batches SET status = ?, processed_at = NOW() WHERE id = ?',
      ['processing', batch_id]
    );

    // Update payout details status
    await connection.query(
      'UPDATE payout_details SET status = ?, processed_at = NOW() WHERE batch_id = ?',
      ['processing', batch_id]
    );

    // In a real implementation, here you would:
    // 1. Integrate with bank API for bulk transfers
    // 2. Generate payment files for manual processing
    // 3. Update individual payout statuses based on bank responses

    // For demo purposes, we'll simulate successful processing after a delay
    setTimeout(async () => {
      try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        // Mark batch as completed
        await conn.query(
          'UPDATE payout_batches SET status = ? WHERE id = ?',
          ['completed', batch_id]
        );

        // Mark individual payouts as paid
        await conn.query(
          'UPDATE payout_details SET status = ? WHERE batch_id = ?',
          ['paid', batch_id]
        );

        // Update provider earnings status
        await conn.query(`
          UPDATE provider_earnings pe
          JOIN payout_details pd ON pe.provider_id = pd.provider_id
          SET pe.payout_status = 'paid', pe.payout_date = CURDATE()
          WHERE pd.batch_id = ? AND pe.payout_status = 'pending'
        `, [batch_id]);

        await conn.commit();
        conn.release();
      } catch (error) {
        console.error('Error in simulated payout processing:', error);
      }
    }, 5000); // Simulate 5 second processing time

    await connection.commit();

    res.json({
      success: true,
      message: 'Payout batch processing initiated',
      batch_id
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error processing payout batch:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while processing payout batch' 
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /admin/payouts/batches/:id/report - Download payout batch report
 */
router.get('/batches/:id/report', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id: batch_id } = req.params;

    // Get batch details with payout information
    const [batchDetails] = await pool.query(`
      SELECT 
        pb.*,
        pd.provider_id,
        u.name as provider_name,
        u.email as provider_email,
        pd.amount,
        pd.earnings_count,
        pd.status as payout_status,
        pbd.account_holder_name,
        pbd.account_number,
        pbd.ifsc_code,
        pbd.bank_name
      FROM payout_batches pb
      JOIN payout_details pd ON pb.id = pd.batch_id
      JOIN providers p ON pd.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN provider_banking_details pbd ON pd.bank_account_id = pbd.id
      WHERE pb.id = ?
      ORDER BY pd.amount DESC
    `, [batch_id]);

    if (!batchDetails.length) {
      return res.status(404).json({
        success: false,
        message: 'Payout batch not found'
      });
    }

    // Generate CSV report
    const csvHeader = 'Provider ID,Provider Name,Email,Amount,Earnings Count,Status,Account Holder,Account Number,IFSC Code,Bank Name\n';
    const csvRows = batchDetails.map(row => 
      `${row.provider_id},"${row.provider_name}","${row.provider_email}",${row.amount},${row.earnings_count},"${row.payout_status}","${row.account_holder_name || ''}","${row.account_number || ''}","${row.ifsc_code || ''}","${row.bank_name || ''}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payout-batch-${batch_id}-report.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating payout report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while generating payout report' 
    });
  }
});

module.exports = router;
