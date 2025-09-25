const mysql = require('mysql2/promise');
require('dotenv').config();

async function testChatDatabase() {
    let connection;
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'omw_db',
            charset: 'utf8mb4'
        });

        console.log('✅ Database connection established');

        // Test chat_messages table structure
        console.log('\n📋 Testing chat_messages table structure...');
        const [columns] = await connection.execute('DESCRIBE chat_messages');
        console.log('Columns:', columns.map(col => `${col.Field} (${col.Type})`));

        // Test chat_sessions table
        console.log('\n📋 Testing chat_sessions table...');
        const [sessions] = await connection.execute('SELECT * FROM chat_sessions LIMIT 5');
        console.log('Sessions found:', sessions.length);
        if (sessions.length > 0) {
            console.log('Sample session:', sessions[0]);
        }

        // Test insert into chat_messages
        console.log('\n💾 Testing message insert...');
        const testSessionId = sessions.length > 0 ? sessions[0].id : 1;
        const testUserId = 1; // Assuming user ID 1 exists
        
        const [result] = await connection.execute(
            `INSERT INTO chat_messages (session_id, sender_id, sender_type, message_type, content) 
             VALUES (?, ?, ?, ?, ?)`,
            [testSessionId, testUserId, 'customer', 'text', 'Test message from script']
        );

        console.log('✅ Test message inserted with ID:', result.insertId);

        // Verify the insert
        const [messages] = await connection.execute(
            'SELECT * FROM chat_messages WHERE id = ?',
            [result.insertId]
        );

        if (messages.length > 0) {
            console.log('✅ Message verified in database:', messages[0]);
        } else {
            console.log('❌ Message not found after insert');
        }

        // Clean up test message
        await connection.execute('DELETE FROM chat_messages WHERE id = ?', [result.insertId]);
        console.log('🧹 Test message cleaned up');

    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

testChatDatabase();
