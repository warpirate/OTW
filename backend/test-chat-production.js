const mysql = require('mysql2/promise');
require('dotenv').config();

async function testChatDatabase() {
    console.log('🔍 Testing Chat Database Connection and Tables...\n');
    
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

        console.log('✅ Database connection successful');

        // Test 1: Check if chat tables exist
        console.log('\n📋 Checking chat tables...');
        const tables = ['chat_sessions', 'chat_messages', 'chat_participants', 'chat_notifications'];
        
        for (const table of tables) {
            try {
                const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
                if (rows.length > 0) {
                    console.log(`✅ Table '${table}' exists`);
                    
                    // Get table structure
                    const [structure] = await connection.execute(`DESCRIBE ${table}`);
                    console.log(`   Columns: ${structure.map(col => col.Field).join(', ')}`);
                } else {
                    console.log(`❌ Table '${table}' does NOT exist`);
                }
            } catch (error) {
                console.log(`❌ Error checking table '${table}':`, error.message);
            }
        }

        // Test 2: Check if there are any chat sessions
        console.log('\n📊 Checking chat data...');
        try {
            const [sessions] = await connection.execute('SELECT COUNT(*) as count FROM chat_sessions');
            console.log(`✅ Chat sessions count: ${sessions[0].count}`);
            
            if (sessions[0].count > 0) {
                const [recentSessions] = await connection.execute(`
                    SELECT id, booking_id, customer_id, provider_id, session_status, created_at 
                    FROM chat_sessions 
                    ORDER BY created_at DESC 
                    LIMIT 5
                `);
                console.log('📋 Recent chat sessions:');
                recentSessions.forEach(session => {
                    console.log(`   Session ${session.id}: Booking ${session.booking_id}, Status: ${session.session_status}`);
                });
            }
        } catch (error) {
            console.log('❌ Error checking chat sessions:', error.message);
        }

        // Test 3: Check if there are any messages for session 7 (from the error)
        console.log('\n💬 Checking messages for session 7...');
        try {
            const [messages] = await connection.execute(`
                SELECT cm.id, cm.sender_id, cm.content, cm.created_at, u.name as sender_name
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.session_id = 7
                ORDER BY cm.created_at DESC
                LIMIT 5
            `);
            console.log(`✅ Messages in session 7: ${messages.length}`);
            messages.forEach(msg => {
                console.log(`   Message ${msg.id}: ${msg.sender_name} - "${msg.content.substring(0, 50)}..."`);
            });
        } catch (error) {
            console.log('❌ Error checking messages for session 7:', error.message);
        }

        // Test 4: Test the exact query that was failing (with LIMIT/OFFSET as parameters)
        console.log('\n🔍 Testing the old failing query (with LIMIT/OFFSET as parameters)...');
        try {
            const [messages] = await connection.execute(`
                SELECT 
                    cm.id, cm.sender_id, cm.sender_type, cm.message_type, 
                    cm.content, cm.file_url, cm.file_name, cm.file_size,
                    cm.is_read, cm.read_at, cm.created_at,
                    u.name as sender_name, u.phone_number as sender_phone
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.session_id = ?
                ORDER BY cm.created_at DESC
                LIMIT ? OFFSET ?
            `, [7, 50, 0]);
            
            console.log(`✅ Old query executed successfully, returned ${messages.length} messages`);
        } catch (error) {
            console.log('❌ The old failing query error (expected):', error.message);
        }

        // Test 5: Test the fixed query (with LIMIT/OFFSET as string interpolation)
        console.log('\n🔍 Testing the FIXED query (with LIMIT/OFFSET as string interpolation)...');
        try {
            const limitInt = 50;
            const offsetInt = 0;
            const [messages] = await connection.execute(`
                SELECT 
                    cm.id, cm.sender_id, cm.sender_type, cm.message_type, 
                    cm.content, cm.file_url, cm.file_name, cm.file_size,
                    cm.is_read, cm.read_at, cm.created_at,
                    u.name as sender_name, u.phone_number as sender_phone
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.session_id = ?
                ORDER BY cm.created_at DESC
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `, [7]);
            
            console.log(`✅ FIXED query executed successfully, returned ${messages.length} messages`);
            if (messages.length > 0) {
                console.log('📋 Sample message:');
                console.log(`   ID: ${messages[0].id}, Sender: ${messages[0].sender_name}, Content: "${messages[0].content.substring(0, 50)}..."`);
            }
        } catch (error) {
            console.log('❌ The FIXED query error:', error.message);
            console.log('❌ Error details:', error);
        }

    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        console.log('❌ Error details:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the test
testChatDatabase().catch(console.error);
