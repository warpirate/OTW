-- Worker Wallet System Database Schema
-- This migration creates tables for worker wallet management, settlements, and withdrawals

-- 1. Worker Wallets Table
CREATE TABLE IF NOT EXISTS worker_wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    worker_id INT NOT NULL,
    provider_id INT NOT NULL,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
    total_settled DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_worker_wallet (worker_id),
    INDEX idx_worker_wallet_provider (provider_id),
    INDEX idx_worker_wallet_active (is_active)
);

-- 2. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wallet_id INT NOT NULL,
    booking_id INT,
    transaction_type ENUM('credit', 'debit', 'settlement', 'withdrawal', 'refund', 'charge') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(100), -- For linking to settlements, withdrawals, etc.
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES worker_wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_wallet_transactions_wallet (wallet_id),
    INDEX idx_wallet_transactions_type (transaction_type),
    INDEX idx_wallet_transactions_status (status),
    INDEX idx_wallet_transactions_created (created_at)
);

-- 3. Daily Settlements Table
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
    INDEX idx_settlements_status (settlement_status),
    INDEX idx_settlements_worker (worker_id)
);

-- 4. Withdrawal Requests Table
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
    INDEX idx_withdrawal_status (request_status),
    INDEX idx_withdrawal_created (created_at)
);

-- 5. Worker UPI Details Table
CREATE TABLE IF NOT EXISTS worker_upi_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    worker_id INT NOT NULL,
    provider_id INT NOT NULL,
    upi_id VARCHAR(100) NOT NULL,
    upi_provider VARCHAR(50), -- paytm, gpay, phonepe, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_worker_upi (worker_id, upi_id),
    INDEX idx_worker_upi_primary (worker_id, is_primary),
    INDEX idx_worker_upi_active (is_active)
);

-- 6. System Configuration Table for Charges
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
    INDEX idx_charges_type (charge_type),
    INDEX idx_charges_active (is_active)
);

-- Insert default system charges
INSERT INTO system_charges (charge_type, charge_percentage, fixed_charge, minimum_charge, maximum_charge, effective_from) VALUES
('withdrawal_fee', 2.00, 5.00, 5.00, 50.00, CURDATE()),
('settlement_fee', 1.00, 2.00, 2.00, 25.00, CURDATE()),
('platform_fee', 5.00, 0.00, 0.00, 0.00, CURDATE());

-- 7. Admin Transaction Logs Table
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
    INDEX idx_admin_logs_type (transaction_type),
    INDEX idx_admin_logs_target (target_worker_id),
    INDEX idx_admin_logs_created (created_at)
);

-- 8. Create indexes for better performance
CREATE INDEX idx_bookings_payment_method ON bookings(payment_method);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_service_status ON bookings(service_status);

-- 9. Add wallet_id to existing cash_payments table if it exists
ALTER TABLE cash_payments ADD COLUMN wallet_id INT NULL;
ALTER TABLE cash_payments ADD FOREIGN KEY (wallet_id) REFERENCES worker_wallets(id) ON DELETE SET NULL;

-- 10. Create views for reporting
CREATE VIEW worker_wallet_summary AS
SELECT 
    ww.id as wallet_id,
    ww.worker_id,
    u.name as worker_name,
    u.phone_number as worker_phone,
    ww.provider_id,
    p.business_name as provider_name,
    ww.current_balance,
    ww.total_earned,
    ww.total_withdrawn,
    ww.total_settled,
    ww.is_active,
    ww.created_at,
    ww.updated_at
FROM worker_wallets ww
JOIN users u ON ww.worker_id = u.id
JOIN providers p ON ww.provider_id = p.id;

CREATE VIEW daily_transaction_summary AS
SELECT 
    DATE(wt.created_at) as transaction_date,
    wt.wallet_id,
    ww.worker_id,
    u.name as worker_name,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN wt.transaction_type = 'credit' THEN wt.amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN wt.transaction_type = 'debit' THEN wt.amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN wt.transaction_type = 'withdrawal' THEN wt.amount ELSE 0 END) as total_withdrawals
FROM wallet_transactions wt
JOIN worker_wallets ww ON wt.wallet_id = ww.id
JOIN users u ON ww.worker_id = u.id
GROUP BY DATE(wt.created_at), wt.wallet_id, ww.worker_id, u.name;
