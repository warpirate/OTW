const pool = require('../config/db');

async function createWalletTables() {
  try {
    console.log('Creating worker wallet system tables...');

    // 1. Wallet Transactions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        wallet_id INT NOT NULL,
        booking_id INT,
        transaction_type ENUM('credit', 'debit', 'settlement', 'withdrawal', 'refund', 'charge') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_id VARCHAR(100),
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (wallet_id) REFERENCES worker_wallets(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        INDEX idx_wallet_transactions_wallet (wallet_id),
        INDEX idx_wallet_transactions_type (transaction_type),
        INDEX idx_wallet_transactions_status (status)
      )
    `);
    console.log('✅ Wallet transactions table created');

    // 2. Daily Settlements Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_settlements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        worker_id INT NOT NULL,
        provider_id INT NOT NULL,
        settlement_date DATE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        transaction_count INT DEFAULT 0,
        upi_id VARCHAR(100) NOT NULL,
        settlement_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        razorpay_payout_id VARCHAR(100),
        failure_reason TEXT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_daily_settlement (worker_id, settlement_date),
        INDEX idx_settlements_date (settlement_date),
        INDEX idx_settlements_status (settlement_status)
      )
    `);
    console.log('✅ Daily settlements table created');

    // 3. Withdrawal Requests Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        worker_id INT NOT NULL,
        provider_id INT NOT NULL,
        wallet_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        withdrawal_charges DECIMAL(10,2) DEFAULT 0.00,
        net_amount DECIMAL(10,2) NOT NULL,
        upi_id VARCHAR(100) NOT NULL,
        request_status ENUM('pending', 'approved', 'processing', 'completed', 'rejected', 'failed') DEFAULT 'pending',
        admin_notes TEXT,
        razorpay_payout_id VARCHAR(100),
        failure_reason TEXT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
        FOREIGN KEY (wallet_id) REFERENCES worker_wallets(id) ON DELETE CASCADE,
        INDEX idx_withdrawal_worker (worker_id),
        INDEX idx_withdrawal_status (request_status)
      )
    `);
    console.log('✅ Withdrawal requests table created');

    // 4. Worker UPI Details Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_upi_details (
        id INT PRIMARY KEY AUTO_INCREMENT,
        worker_id INT NOT NULL,
        provider_id INT NOT NULL,
        upi_id VARCHAR(100) NOT NULL,
        upi_provider VARCHAR(50),
        is_primary BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_worker_upi (worker_id, upi_id),
        INDEX idx_worker_upi_primary (worker_id, is_primary)
      )
    `);
    console.log('✅ Worker UPI details table created');

    // 5. System Charges Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_charges (
        id INT PRIMARY KEY AUTO_INCREMENT,
        charge_type ENUM('withdrawal_fee', 'settlement_fee', 'platform_fee') NOT NULL,
        charge_percentage DECIMAL(5,2) DEFAULT 0.00,
        fixed_charge DECIMAL(10,2) DEFAULT 0.00,
        minimum_charge DECIMAL(10,2) DEFAULT 0.00,
        maximum_charge DECIMAL(10,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_charge_type_date (charge_type, effective_from),
        INDEX idx_charges_type (charge_type)
      )
    `);
    console.log('✅ System charges table created');

    // 6. Insert default system charges
    await pool.query(`
      INSERT IGNORE INTO system_charges (charge_type, charge_percentage, fixed_charge, minimum_charge, maximum_charge, effective_from) VALUES
      ('withdrawal_fee', 2.00, 5.00, 5.00, 50.00, CURDATE()),
      ('settlement_fee', 1.00, 2.00, 2.00, 25.00, CURDATE()),
      ('platform_fee', 5.00, 0.00, 0.00, 0.00, CURDATE())
    `);
    console.log('✅ Default system charges inserted');

    // 7. Admin Transaction Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_transaction_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id INT,
        transaction_type ENUM('settlement_approval', 'withdrawal_approval', 'charge_adjustment', 'wallet_adjustment') NOT NULL,
        target_worker_id INT,
        target_provider_id INT,
        amount DECIMAL(10,2),
        description TEXT,
        old_value JSON,
        new_value JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (target_worker_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (target_provider_id) REFERENCES providers(id) ON DELETE SET NULL,
        INDEX idx_admin_logs_admin (admin_id),
        INDEX idx_admin_logs_type (transaction_type)
      )
    `);
    console.log('✅ Admin transaction logs table created');

    console.log('\n🎉 All worker wallet system tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating wallet tables:', error);
    throw error;
  }
}

// Run the migration
createWalletTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

