const pool = require('../config/db');

async function createCustomerWalletTables() {
  try {
    console.log('Creating customer wallet system tables...');

    // 1. Customer Wallets Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_wallets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        current_balance DECIMAL(10,2) DEFAULT 0.00,
        total_added DECIMAL(10,2) DEFAULT 0.00,
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        total_refunded DECIMAL(10,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_customer_wallet (customer_id),
        INDEX idx_customer_wallet_active (is_active)
      )
    `);
    console.log('✅ Customer wallets table created');

    // 2. Customer Wallet Transactions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_wallet_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        wallet_id INT NOT NULL,
        booking_id INT,
        transaction_type ENUM('credit', 'debit', 'refund', 'topup', 'charge', 'bonus') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_id VARCHAR(100),
        payment_method VARCHAR(50),
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (wallet_id) REFERENCES customer_wallets(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        INDEX idx_customer_wallet_transactions_wallet (wallet_id),
        INDEX idx_customer_wallet_transactions_type (transaction_type),
        INDEX idx_customer_wallet_transactions_status (status)
      )
    `);
    console.log('✅ Customer wallet transactions table created');

    // 3. Wallet Top-up Requests Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_topup_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        wallet_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        topup_status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        failure_reason TEXT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (wallet_id) REFERENCES customer_wallets(id) ON DELETE CASCADE,
        INDEX idx_topup_customer (customer_id),
        INDEX idx_topup_status (topup_status)
      )
    `);
    console.log('✅ Wallet top-up requests table created');

    // 4. Wallet Refunds Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_refunds (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        wallet_id INT NOT NULL,
        booking_id INT NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        refund_reason TEXT,
        refund_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        admin_notes TEXT,
        processed_by INT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (wallet_id) REFERENCES customer_wallets(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_refund_customer (customer_id),
        INDEX idx_refund_booking (booking_id),
        INDEX idx_refund_status (refund_status)
      )
    `);
    console.log('✅ Wallet refunds table created');

    // 5. Wallet Promotions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_promotions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        promotion_name VARCHAR(100) NOT NULL,
        promotion_type ENUM('cashback', 'bonus', 'discount') NOT NULL,
        min_topup_amount DECIMAL(10,2) DEFAULT 0.00,
        bonus_percentage DECIMAL(5,2) DEFAULT 0.00,
        bonus_amount DECIMAL(10,2) DEFAULT 0.00,
        max_bonus_amount DECIMAL(10,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        valid_from DATE NOT NULL,
        valid_to DATE NOT NULL,
        usage_limit INT DEFAULT 0,
        used_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_promotions_active (is_active),
        INDEX idx_promotions_validity (valid_from, valid_to),
        INDEX idx_promotions_type (promotion_type)
      )
    `);
    console.log('✅ Wallet promotions table created');

    // 6. Customer Wallet Promotions Usage Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_wallet_promotions_usage (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        promotion_id INT NOT NULL,
        topup_request_id INT NOT NULL,
        bonus_amount DECIMAL(10,2) NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (promotion_id) REFERENCES wallet_promotions(id) ON DELETE CASCADE,
        FOREIGN KEY (topup_request_id) REFERENCES wallet_topup_requests(id) ON DELETE CASCADE,
        UNIQUE KEY unique_customer_promotion_topup (customer_id, promotion_id, topup_request_id),
        INDEX idx_promotion_usage_customer (customer_id),
        INDEX idx_promotion_usage_promotion (promotion_id)
      )
    `);
    console.log('✅ Customer wallet promotions usage table created');

    // 7. Wallet Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(50) NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_setting_key (setting_key),
        INDEX idx_wallet_settings_active (is_active)
      )
    `);
    console.log('✅ Wallet settings table created');

    // 8. Insert default wallet settings
    await pool.query(`
      INSERT IGNORE INTO wallet_settings (setting_key, setting_value, description) VALUES
      ('min_topup_amount', '100.00', 'Minimum amount for wallet top-up'),
      ('max_topup_amount', '50000.00', 'Maximum amount for wallet top-up'),
      ('min_wallet_balance', '0.00', 'Minimum wallet balance allowed'),
      ('max_wallet_balance', '100000.00', 'Maximum wallet balance allowed'),
      ('wallet_payment_enabled', 'true', 'Enable wallet payments for bookings'),
      ('auto_refund_to_wallet', 'true', 'Automatically refund to wallet for cancellations'),
      ('wallet_expiry_days', '365', 'Wallet balance expiry in days (0 for no expiry)')
    `);
    console.log('✅ Default wallet settings inserted');

    // 9. Add wallet_transaction_id to bookings table
    try {
      await pool.query('ALTER TABLE bookings ADD COLUMN wallet_transaction_id INT NULL');
      console.log('✅ Added wallet_transaction_id to bookings table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  wallet_transaction_id column already exists in bookings table');
      } else {
        throw error;
      }
    }

    // 10. Create views for reporting
    await pool.query(`
      CREATE OR REPLACE VIEW customer_wallet_summary AS
      SELECT 
        cw.id as wallet_id,
        cw.customer_id,
        u.name as customer_name,
        u.phone_number as customer_phone,
        u.email as customer_email,
        cw.current_balance,
        cw.total_added,
        cw.total_spent,
        cw.total_refunded,
        cw.is_active,
        cw.created_at,
        cw.updated_at
      FROM customer_wallets cw
      JOIN customers c ON cw.customer_id = c.id
      JOIN users u ON c.id = u.id
    `);
    console.log('✅ Customer wallet summary view created');

    console.log('\n🎉 All customer wallet system tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating customer wallet tables:', error);
    throw error;
  }
}

// Run the migration
createCustomerWalletTables()
  .then(() => {
    console.log('Customer wallet migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Customer wallet migration failed:', error);
    process.exit(1);
  });
