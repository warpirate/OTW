-- ============================================================================
-- Real-Time Chat System Migration
-- Creates tables for service-based chat between customers and providers
-- ============================================================================

-- Table 1: Chat Sessions (one per accepted booking)
CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `session_status` enum('active','ended','deleted') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `message_count` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_chat` (`booking_id`),
  KEY `idx_customer_sessions` (`customer_id`, `session_status`),
  KEY `idx_provider_sessions` (`provider_id`, `session_status`),
  KEY `idx_session_status` (`session_status`),
  KEY `idx_last_message` (`last_message_at`),
  CONSTRAINT `fk_chat_session_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_session_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_session_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 2: Chat Messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `sender_type` enum('customer','provider') NOT NULL,
  `message_type` enum('text','image','file','system') NOT NULL DEFAULT 'text',
  `content` text NOT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session_messages` (`session_id`, `created_at`),
  KEY `idx_sender_messages` (`sender_id`, `created_at`),
  KEY `idx_message_type` (`message_type`),
  KEY `idx_unread_messages` (`is_read`, `created_at`),
  CONSTRAINT `fk_message_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 3: Chat Participants (for tracking online status)
CREATE TABLE IF NOT EXISTS `chat_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `user_type` enum('customer','provider') NOT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT 0,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_user` (`session_id`, `user_id`),
  KEY `idx_user_sessions` (`user_id`, `is_online`),
  KEY `idx_online_users` (`is_online`, `last_seen_at`),
  CONSTRAINT `fk_participant_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_participant_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 4: Chat Notifications (for push notifications)
CREATE TABLE IF NOT EXISTS `chat_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `message_id` int NOT NULL,
  `notification_type` enum('new_message','typing','user_online','user_offline') NOT NULL,
  `is_sent` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient_notifications` (`recipient_id`, `is_sent`),
  KEY `idx_session_notifications` (`session_id`, `created_at`),
  KEY `idx_unsent_notifications` (`is_sent`, `created_at`),
  CONSTRAINT `fk_notification_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- TRIGGERS for data consistency
-- ============================================================================

-- Trigger to update session message count and last message time
DELIMITER $$
CREATE TRIGGER `tr_update_session_stats` 
AFTER INSERT ON `chat_messages`
FOR EACH ROW
BEGIN
    UPDATE chat_sessions 
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
END$$
DELIMITER ;

-- Trigger to create participants when session is created
DELIMITER $$
CREATE TRIGGER `tr_create_chat_participants` 
AFTER INSERT ON `chat_sessions`
FOR EACH ROW
BEGIN
    INSERT INTO chat_participants (session_id, user_id, user_type) VALUES
    (NEW.id, NEW.customer_id, 'customer'),
    (NEW.id, NEW.provider_id, 'provider');
END$$
DELIMITER ;

-- Trigger to create notification when message is sent
DELIMITER $$
CREATE TRIGGER `tr_create_message_notification` 
AFTER INSERT ON `chat_messages`
FOR EACH ROW
BEGIN
    DECLARE recipient_id INT;
    DECLARE recipient_type ENUM('customer','provider');
    
    -- Get the recipient (opposite of sender)
    SELECT 
        CASE 
            WHEN NEW.sender_type = 'customer' THEN provider_id
            ELSE customer_id
        END,
        CASE 
            WHEN NEW.sender_type = 'customer' THEN 'provider'
            ELSE 'customer'
        END
    INTO recipient_id, recipient_type
    FROM chat_sessions 
    WHERE id = NEW.session_id;
    
    -- Create notification for recipient
    INSERT INTO chat_notifications (session_id, recipient_id, message_id, notification_type)
    VALUES (NEW.session_id, recipient_id, NEW.id, 'new_message');
END$$
DELIMITER ;

-- ============================================================================
-- STORED PROCEDURES for common operations
-- ============================================================================

-- Procedure to create chat session when booking is accepted
DELIMITER $$
CREATE PROCEDURE `sp_create_chat_session`(
    IN p_booking_id INT
)
BEGIN
    DECLARE v_customer_id INT;
    DECLARE v_provider_id INT;
    DECLARE v_session_exists INT DEFAULT 0;
    
    -- Check if session already exists
    SELECT COUNT(*) INTO v_session_exists 
    FROM chat_sessions 
    WHERE booking_id = p_booking_id;
    
    IF v_session_exists = 0 THEN
        -- Get customer and provider IDs
        SELECT user_id, provider_id 
        INTO v_customer_id, v_provider_id
        FROM bookings 
        WHERE id = p_booking_id;
        
        -- Create chat session
        INSERT INTO chat_sessions (booking_id, customer_id, provider_id)
        VALUES (p_booking_id, v_customer_id, v_provider_id);
        
        SELECT LAST_INSERT_ID() as session_id;
    ELSE
        SELECT id as session_id FROM chat_sessions WHERE booking_id = p_booking_id;
    END IF;
END$$
DELIMITER ;

-- Procedure to end chat session when service is completed
DELIMITER $$
CREATE PROCEDURE `sp_end_chat_session`(
    IN p_booking_id INT
)
BEGIN
    UPDATE chat_sessions 
    SET session_status = 'ended',
        ended_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id 
      AND session_status = 'active';
      
    -- Mark all participants as offline
    UPDATE chat_participants cp
    JOIN chat_sessions cs ON cp.session_id = cs.id
    SET cp.is_online = 0,
        cp.left_at = CURRENT_TIMESTAMP
    WHERE cs.booking_id = p_booking_id;
END$$
DELIMITER ;

-- Procedure to delete chat data when service is completed
DELIMITER $$
CREATE PROCEDURE `sp_delete_chat_data`(
    IN p_booking_id INT
)
BEGIN
    -- Delete notifications first (due to foreign key constraints)
    DELETE cn FROM chat_notifications cn
    JOIN chat_sessions cs ON cn.session_id = cs.id
    WHERE cs.booking_id = p_booking_id;
    
    -- Delete messages
    DELETE cm FROM chat_messages cm
    JOIN chat_sessions cs ON cm.session_id = cs.id
    WHERE cs.booking_id = p_booking_id;
    
    -- Delete participants
    DELETE cp FROM chat_participants cp
    JOIN chat_sessions cs ON cp.session_id = cs.id
    WHERE cs.booking_id = p_booking_id;
    
    -- Delete session
    DELETE FROM chat_sessions 
    WHERE booking_id = p_booking_id;
END$$
DELIMITER ;

-- Procedure to get chat history
DELIMITER $$
CREATE PROCEDURE `sp_get_chat_history`(
    IN p_session_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT 
        cm.id,
        cm.sender_id,
        cm.sender_type,
        cm.message_type,
        cm.content,
        cm.file_url,
        cm.file_name,
        cm.file_size,
        cm.is_read,
        cm.read_at,
        cm.created_at,
        u.name as sender_name,
        u.phone_number as sender_phone
    FROM chat_messages cm
    JOIN users u ON cm.sender_id = u.id
    WHERE cm.session_id = p_session_id
    ORDER BY cm.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;

-- ============================================================================
-- VIEWS for easier data access
-- ============================================================================

-- View for active chat sessions with user details
CREATE OR REPLACE VIEW `v_active_chat_sessions` AS
SELECT 
    cs.id as session_id,
    cs.booking_id,
    cs.customer_id,
    cs.provider_id,
    cs.message_count,
    cs.last_message_at,
    cs.created_at,
    cu.name as customer_name,
    cu.phone_number as customer_phone,
    pu.name as provider_name,
    pu.phone_number as provider_phone,
    b.service_status,
    b.booking_type,
    sc.name as service_name
FROM chat_sessions cs
JOIN users cu ON cs.customer_id = cu.id
JOIN users pu ON cs.provider_id = pu.id
JOIN bookings b ON cs.booking_id = b.id
LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
WHERE cs.session_status = 'active'
ORDER BY cs.last_message_at DESC;

-- View for unread message counts per user
CREATE OR REPLACE VIEW `v_user_unread_counts` AS
SELECT 
    cp.user_id,
    cp.user_type,
    COUNT(cm.id) as unread_count,
    MAX(cm.created_at) as last_unread_at
FROM chat_participants cp
JOIN chat_sessions cs ON cp.session_id = cs.id
LEFT JOIN chat_messages cm ON cs.id = cm.session_id 
    AND cm.sender_id != cp.user_id 
    AND cm.is_read = 0
WHERE cs.session_status = 'active'
GROUP BY cp.user_id, cp.user_type;

-- ============================================================================
-- INDEXES for performance optimization
-- ============================================================================

-- Additional indexes for better performance
CREATE INDEX `idx_chat_messages_session_created` ON `chat_messages` (`session_id`, `created_at` DESC);
CREATE INDEX `idx_chat_sessions_booking_status` ON `chat_sessions` (`booking_id`, `session_status`);
CREATE INDEX `idx_chat_participants_user_online` ON `chat_participants` (`user_id`, `is_online`, `last_seen_at`);

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
