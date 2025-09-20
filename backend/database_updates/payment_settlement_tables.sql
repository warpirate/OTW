-- ============================================================================
-- Payment Settlement System Tables
-- Additional tables for wallet, earnings, and transaction management
-- ============================================================================

-- Table 1: User Wallets
CREATE TABLE IF NOT EXISTS `user_wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wallet` (`user_id`, `currency`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 2: Wallet Transactions
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL COMMENT 'Positive for credit, negative for debit',
  `transaction_type` enum('credit','debit','refund','fare_adjustment','bonus','penalty','withdrawal') NOT NULL,
  `description` text,
  `balance_before` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL COMMENT 'External reference (Razorpay, bank, etc.)',
  `status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_transactions` (`user_id`, `created_at`),
  KEY `idx_booking_transactions` (`booking_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  CONSTRAINT `fk_wallet_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transaction_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 3: Provider Earnings
CREATE TABLE IF NOT EXISTS `provider_earnings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `booking_id` int NOT NULL,
  `final_fare` decimal(10,2) NOT NULL,
  `platform_commission` decimal(10,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `provider_earnings` decimal(10,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `gst_percentage` decimal(5,2) NOT NULL,
  `bonus_amount` decimal(10,2) DEFAULT 0.00,
  `penalty_amount` decimal(10,2) DEFAULT 0.00,
  `net_earnings` decimal(10,2) GENERATED ALWAYS AS (provider_earnings + bonus_amount - penalty_amount) STORED,
  `payout_status` enum('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  `payout_date` date DEFAULT NULL,
  `payout_reference` varchar(100) DEFAULT NULL,
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_provider_booking_earnings` (`provider_id`, `booking_id`),
  KEY `idx_provider_earnings` (`provider_id`, `calculated_at`),
  KEY `idx_payout_status` (`payout_status`),
  CONSTRAINT `fk_earnings_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_earnings_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 4: Payment Links (for additional charges)
CREATE TABLE IF NOT EXISTS `payment_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `purpose` varchar(100) NOT NULL COMMENT 'e.g., additional_fare, cancellation_fee, etc.',
  `razorpay_link_id` varchar(100) DEFAULT NULL,
  `razorpay_link_url` text,
  `status` enum('created','sent','paid','expired','cancelled') NOT NULL DEFAULT 'created',
  `expires_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_payment_links` (`booking_id`),
  KEY `idx_user_payment_links` (`user_id`, `status`),
  CONSTRAINT `fk_payment_link_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_link_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 5: Payout Batches (for provider payouts)
CREATE TABLE IF NOT EXISTS `payout_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_reference` varchar(100) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `total_providers` int NOT NULL,
  `payout_method` enum('bank_transfer','upi','wallet') NOT NULL DEFAULT 'bank_transfer',
  `status` enum('created','processing','completed','failed','cancelled') NOT NULL DEFAULT 'created',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_by` int NOT NULL COMMENT 'Admin user who created the batch',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_batch_reference` (`batch_reference`),
  KEY `idx_payout_status` (`status`, `created_at`),
  CONSTRAINT `fk_payout_batch_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 6: Payout Details (individual payouts within a batch)
CREATE TABLE IF NOT EXISTS `payout_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `earnings_count` int NOT NULL COMMENT 'Number of earnings records included',
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `bank_account_id` int DEFAULT NULL,
  `status` enum('pending','processing','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
  `failure_reason` text,
  `external_reference` varchar(100) DEFAULT NULL COMMENT 'Bank/UPI transaction reference',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch_payouts` (`batch_id`),
  KEY `idx_provider_payouts` (`provider_id`, `status`),
  CONSTRAINT `fk_payout_detail_batch` FOREIGN KEY (`batch_id`) REFERENCES `payout_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payout_detail_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payout_detail_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `provider_banking_details` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 7: Fare Dispute Records
CREATE TABLE IF NOT EXISTS `fare_disputes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `raised_by` enum('customer','provider','system') NOT NULL,
  `dispute_type` enum('fare_deviation','overcharge','service_issue','payment_issue') NOT NULL,
  `estimated_fare` decimal(10,2) NOT NULL,
  `actual_fare` decimal(10,2) NOT NULL,
  `disputed_amount` decimal(10,2) NOT NULL,
  `description` text,
  `status` enum('open','under_review','resolved','rejected','escalated') NOT NULL DEFAULT 'open',
  `resolution` text,
  `resolved_amount` decimal(10,2) DEFAULT NULL,
  `resolved_by` int DEFAULT NULL COMMENT 'Admin user who resolved',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_disputes` (`booking_id`),
  KEY `idx_dispute_status` (`status`, `created_at`),
  CONSTRAINT `fk_dispute_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispute_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- INDEXES for performance optimization
-- ============================================================================

-- Wallet transaction indexes
CREATE INDEX `idx_wallet_transactions_date_range` ON `wallet_transactions` (`user_id`, `created_at`, `transaction_type`);
CREATE INDEX `idx_wallet_transactions_amount` ON `wallet_transactions` (`amount`, `transaction_type`);

-- Provider earnings indexes
CREATE INDEX `idx_provider_earnings_date_range` ON `provider_earnings` (`provider_id`, `calculated_at`, `payout_status`);
CREATE INDEX `idx_provider_earnings_amount` ON `provider_earnings` (`provider_earnings`, `payout_status`);

-- Payment links indexes
CREATE INDEX `idx_payment_links_status_expiry` ON `payment_links` (`status`, `expires_at`);

-- ============================================================================
-- VIEWS for easier data access
-- ============================================================================

-- View for provider earnings summary
CREATE OR REPLACE VIEW `v_provider_earnings_summary` AS
SELECT 
    p.id as provider_id,
    u.name as provider_name,
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
GROUP BY p.id, u.name;

-- View for wallet balance summary
CREATE OR REPLACE VIEW `v_user_wallet_summary` AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    uw.balance as current_balance,
    COUNT(wt.id) as total_transactions,
    SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN wt.amount < 0 THEN ABS(wt.amount) ELSE 0 END) as total_debits,
    MAX(wt.created_at) as last_transaction_date
FROM users u
LEFT JOIN user_wallets uw ON u.id = uw.user_id
LEFT JOIN wallet_transactions wt ON u.id = wt.user_id
GROUP BY u.id, u.name, u.email, uw.balance;

-- View for payment settlement summary
CREATE OR REPLACE VIEW `v_payment_settlement_summary` AS
SELECT 
    b.id as booking_id,
    b.user_id,
    b.provider_id,
    b.estimated_cost,
    b.actual_cost,
    b.payment_status,
    rfb.total_fare_est,
    rfb.final_fare,
    rfb.fare_calculated_at,
    pe.provider_earnings,
    pe.platform_commission,
    pe.payout_status,
    p.status as payment_gateway_status,
    p.amount_paid as gateway_amount,
    CASE 
        WHEN rfb.final_fare > rfb.total_fare_est THEN 'overcharged'
        WHEN rfb.final_fare < rfb.total_fare_est THEN 'undercharged'
        ELSE 'accurate'
    END as fare_accuracy,
    ABS(rfb.final_fare - rfb.total_fare_est) as fare_deviation_amount,
    ROUND(ABS((rfb.final_fare - rfb.total_fare_est) / rfb.total_fare_est) * 100, 2) as fare_deviation_percentage
FROM bookings b
LEFT JOIN ride_fare_breakdowns rfb ON b.id = rfb.booking_id
LEFT JOIN provider_earnings pe ON b.id = pe.booking_id
LEFT JOIN payments p ON b.id = p.booking_id AND p.status IN ('captured', 'authorized')
WHERE b.booking_type = 'ride';

-- ============================================================================
-- TRIGGERS for data consistency
-- ============================================================================

-- Trigger to update provider earnings payout status when payout is processed
DELIMITER $$
CREATE TRIGGER `tr_update_earnings_payout_status` 
AFTER UPDATE ON `payout_details`
FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE provider_earnings 
        SET payout_status = 'paid', payout_date = CURDATE(), payout_reference = NEW.external_reference
        WHERE provider_id = NEW.provider_id 
          AND calculated_at BETWEEN NEW.from_date AND NEW.to_date
          AND payout_status = 'pending';
    END IF;
END$$
DELIMITER ;

-- Trigger to validate wallet balance before debit transactions
DELIMITER $$
CREATE TRIGGER `tr_validate_wallet_balance` 
BEFORE INSERT ON `wallet_transactions`
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(10,2);
    
    IF NEW.amount < 0 THEN
        SELECT balance INTO current_balance 
        FROM user_wallets 
        WHERE user_id = NEW.user_id;
        
        IF current_balance + NEW.amount < 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Insufficient wallet balance for this transaction';
        END IF;
    END IF;
END$$
DELIMITER ;

-- ============================================================================
-- STORED PROCEDURES for common operations
-- ============================================================================

-- Procedure to calculate provider payout for a date range
DELIMITER $$
CREATE PROCEDURE `sp_calculate_provider_payout`(
    IN p_provider_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        p_provider_id as provider_id,
        COUNT(*) as total_rides,
        SUM(net_earnings) as total_earnings,
        MIN(calculated_at) as from_date,
        MAX(calculated_at) as to_date,
        AVG(net_earnings) as avg_earnings_per_ride
    FROM provider_earnings
    WHERE provider_id = p_provider_id
      AND DATE(calculated_at) BETWEEN p_from_date AND p_to_date
      AND payout_status = 'pending';
END$$
DELIMITER ;

-- Procedure to get wallet transaction history
DELIMITER $$
CREATE PROCEDURE `sp_get_wallet_transactions`(
    IN p_user_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT 
        wt.*,
        b.id as booking_reference
    FROM wallet_transactions wt
    LEFT JOIN bookings b ON wt.booking_id = b.id
    WHERE wt.user_id = p_user_id
    ORDER BY wt.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
