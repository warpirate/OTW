const pool = require('../config/db');

async function migrateChatTables() {
  try {
    const dbName = process.env.DB_NAME || 'omw_db';
    console.log(`\n➡️  Starting chat system migration on database: ${dbName}`);

    // Drop objects if they exist (idempotent)
    await pool.query(`
      DROP TRIGGER IF EXISTS tr_update_session_stats;
      DROP TRIGGER IF EXISTS tr_create_chat_participants;
      DROP TRIGGER IF EXISTS tr_create_message_notification;
      DROP PROCEDURE IF EXISTS sp_create_chat_session;
      DROP PROCEDURE IF EXISTS sp_end_chat_session;
      DROP PROCEDURE IF EXISTS sp_delete_chat_data;
      DROP PROCEDURE IF EXISTS sp_get_chat_history;
      DROP VIEW IF EXISTS v_active_chat_sessions;
      DROP VIEW IF EXISTS v_user_unread_counts;
    `);
    console.log('ℹ️  Dropped existing chat triggers/procedures/views if present');

    // Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INT NOT NULL AUTO_INCREMENT,
        booking_id INT NOT NULL,
        customer_id INT NOT NULL,
        provider_id INT NOT NULL,
        session_status ENUM('active','ended','deleted') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL DEFAULT NULL,
        last_message_at TIMESTAMP NULL DEFAULT NULL,
        message_count INT NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY unique_booking_chat (booking_id),
        KEY idx_customer_sessions (customer_id, session_status),
        KEY idx_provider_sessions (provider_id, session_status),
        KEY idx_session_status (session_status),
        KEY idx_last_message (last_message_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT NOT NULL AUTO_INCREMENT,
        session_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_type ENUM('customer','provider') NOT NULL,
        message_type ENUM('text','image','file','system') NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        file_url VARCHAR(500) DEFAULT NULL,
        file_name VARCHAR(255) DEFAULT NULL,
        file_size INT DEFAULT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        read_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_session_messages (session_id, created_at),
        KEY idx_sender_messages (sender_id, created_at),
        KEY idx_message_type (message_type),
        KEY idx_unread_messages (is_read, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        id INT NOT NULL AUTO_INCREMENT,
        session_id INT NOT NULL,
        user_id INT NOT NULL,
        user_type ENUM('customer','provider') NOT NULL,
        is_online TINYINT(1) NOT NULL DEFAULT 0,
        last_seen_at TIMESTAMP NULL DEFAULT NULL,
        joined_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY unique_session_user (session_id, user_id),
        KEY idx_user_sessions (user_id, is_online),
        KEY idx_online_users (is_online, last_seen_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_notifications (
        id INT NOT NULL AUTO_INCREMENT,
        session_id INT NOT NULL,
        recipient_id INT NOT NULL,
        message_id INT NOT NULL,
        notification_type ENUM('new_message','typing','user_online','user_offline') NOT NULL,
        is_sent TINYINT(1) NOT NULL DEFAULT 0,
        sent_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_recipient_notifications (recipient_id, is_sent),
        KEY idx_session_notifications (session_id, created_at),
        KEY idx_unsent_notifications (is_sent, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // FKs
    await pool.query(`
      ALTER TABLE chat_sessions
        ADD CONSTRAINT fk_chat_session_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_chat_session_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_chat_session_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE;
    `).catch(() => {});

    await pool.query(`
      ALTER TABLE chat_messages
        ADD CONSTRAINT fk_message_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
    `).catch(() => {});

    await pool.query(`
      ALTER TABLE chat_participants
        ADD CONSTRAINT fk_participant_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_participant_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `).catch(() => {});

    await pool.query(`
      ALTER TABLE chat_notifications
        ADD CONSTRAINT fk_notification_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_notification_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
    `).catch(() => {});

    // Triggers (each as a single statement; no DELIMITER needed)
    await pool.query(`
      CREATE TRIGGER tr_update_session_stats
      AFTER INSERT ON chat_messages
      FOR EACH ROW
      BEGIN
        UPDATE chat_sessions
          SET message_count = message_count + 1,
              last_message_at = NEW.created_at
        WHERE id = NEW.session_id;
      END;
    `);

    await pool.query(`
      CREATE TRIGGER tr_create_chat_participants
      AFTER INSERT ON chat_sessions
      FOR EACH ROW
      BEGIN
        INSERT INTO chat_participants (session_id, user_id, user_type)
        VALUES (NEW.id, NEW.customer_id, 'customer'),
               (NEW.id, NEW.provider_id, 'provider');
      END;
    `);

    await pool.query(`
      CREATE TRIGGER tr_create_message_notification
      AFTER INSERT ON chat_messages
      FOR EACH ROW
      BEGIN
        DECLARE recipient_id INT;
        DECLARE recipient_type ENUM('customer','provider');
        SELECT CASE WHEN NEW.sender_type = 'customer' THEN provider_id ELSE customer_id END,
               CASE WHEN NEW.sender_type = 'customer' THEN 'provider' ELSE 'customer' END
          INTO recipient_id, recipient_type
          FROM chat_sessions WHERE id = NEW.session_id;
        INSERT INTO chat_notifications (session_id, recipient_id, message_id, notification_type)
        VALUES (NEW.session_id, recipient_id, NEW.id, 'new_message');
      END;
    `);

    // Procedures
    await pool.query(`
      CREATE PROCEDURE sp_create_chat_session(IN p_booking_id INT)
      BEGIN
        DECLARE v_customer_id INT;
        DECLARE v_provider_id INT;
        DECLARE v_session_exists INT DEFAULT 0;
        SELECT COUNT(*) INTO v_session_exists FROM chat_sessions WHERE booking_id = p_booking_id;
        IF v_session_exists = 0 THEN
          SELECT user_id, provider_id INTO v_customer_id, v_provider_id FROM bookings WHERE id = p_booking_id;
          INSERT INTO chat_sessions (booking_id, customer_id, provider_id) VALUES (p_booking_id, v_customer_id, v_provider_id);
          SELECT LAST_INSERT_ID() as session_id;
        ELSE
          SELECT id as session_id FROM chat_sessions WHERE booking_id = p_booking_id;
        END IF;
      END;
    `);

    await pool.query(`
      CREATE PROCEDURE sp_end_chat_session(IN p_booking_id INT)
      BEGIN
        UPDATE chat_sessions
          SET session_status = 'ended', ended_at = CURRENT_TIMESTAMP
          WHERE booking_id = p_booking_id AND session_status = 'active';
        UPDATE chat_participants cp
          JOIN chat_sessions cs ON cp.session_id = cs.id
          SET cp.is_online = 0, cp.left_at = CURRENT_TIMESTAMP
          WHERE cs.booking_id = p_booking_id;
      END;
    `);

    await pool.query(`
      CREATE PROCEDURE sp_delete_chat_data(IN p_booking_id INT)
      BEGIN
        DELETE cn FROM chat_notifications cn JOIN chat_sessions cs ON cn.session_id = cs.id WHERE cs.booking_id = p_booking_id;
        DELETE cm FROM chat_messages cm JOIN chat_sessions cs ON cm.session_id = cs.id WHERE cs.booking_id = p_booking_id;
        DELETE cp FROM chat_participants cp JOIN chat_sessions cs ON cp.session_id = cs.id WHERE cs.booking_id = p_booking_id;
        DELETE FROM chat_sessions WHERE booking_id = p_booking_id;
      END;
    `);

    await pool.query(`
      CREATE PROCEDURE sp_get_chat_history(IN p_session_id INT, IN p_limit INT, IN p_offset INT)
      BEGIN
        SELECT cm.id, cm.sender_id, cm.sender_type, cm.message_type, cm.content,
               cm.file_url, cm.file_name, cm.file_size, cm.is_read, cm.read_at, cm.created_at,
               u.name as sender_name, u.phone_number as sender_phone
          FROM chat_messages cm
          JOIN users u ON cm.sender_id = u.id
         WHERE cm.session_id = p_session_id
         ORDER BY cm.created_at DESC
         LIMIT p_limit OFFSET p_offset;
      END;
    `);

    // Views
    await pool.query(`
      CREATE OR REPLACE VIEW v_active_chat_sessions AS
      SELECT cs.id as session_id, cs.booking_id, cs.customer_id, cs.provider_id, cs.message_count,
             cs.last_message_at, cs.created_at,
             cu.name as customer_name, cu.phone_number as customer_phone,
             pu.name as provider_name, pu.phone_number as provider_phone,
             b.service_status, b.booking_type, sc.name as service_name
        FROM chat_sessions cs
        JOIN users cu ON cs.customer_id = cu.id
        JOIN users pu ON cs.provider_id = pu.id
        JOIN bookings b ON cs.booking_id = b.id
        LEFT JOIN subcategories sc ON b.subcategory_id = sc.id
       WHERE cs.session_status = 'active'
       ORDER BY cs.last_message_at DESC;
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW v_user_unread_counts AS
      SELECT cp.user_id, cp.user_type,
             COUNT(cm.id) as unread_count,
             MAX(cm.created_at) as last_unread_at
        FROM chat_participants cp
        JOIN chat_sessions cs ON cp.session_id = cs.id
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id AND cm.sender_id != cp.user_id AND cm.is_read = 0
       WHERE cs.session_status = 'active'
       GROUP BY cp.user_id, cp.user_type;
    `);

    // Verify
    const [rows] = await pool.query("SHOW TABLES LIKE 'chat_sessions'");
    if (rows.length === 0) throw new Error('chat_sessions table not found after migration');
    console.log('✅ Chat system migration applied successfully');
  } catch (error) {
    console.error('❌ Chat migration failed:', error);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

migrateChatTables().then(() => process.exit(0));


