const mysql = require('mysql2/promise');
require('dotenv').config();

async function populateSystemSettings() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    console.log('Populating system settings from environment variables...');

    const settings = [
        {
            key: 'JWT_SECRET',
            value: process.env.JWT_SECRET,
            type: 'string',
            category: 'security',
            is_sensitive: 1,
            description: 'JWT Secret Key'
        },
        {
            key: 'JWT_EXPIRATION',
            value: process.env.JWT_EXPIRATION || '15h',
            type: 'string',
            category: 'security',
            is_sensitive: 0,
            description: 'JWT Token Expiration Time'
        },
        {
            key: 'AWS_ACCESS_KEY_ID',
            value: process.env.AWS_ACCESS_KEY_ID,
            type: 'string',
            category: 'aws',
            is_sensitive: 1,
            description: 'AWS Access Key ID'
        },
        {
            key: 'AWS_SECRET_ACCESS_KEY',
            value: process.env.AWS_SECRET_ACCESS_KEY,
            type: 'string',
            category: 'aws',
            is_sensitive: 1,
            description: 'AWS Secret Access Key'
        },
        {
            key: 'AWS_REGION',
            value: process.env.AWS_REGION || 'ap-south-1',
            type: 'string',
            category: 'aws',
            is_sensitive: 0,
            description: 'AWS Region'
        },
        {
            key: 'AWS_BUCKET_NAME',
            value: process.env.AWS_BUCKET_NAME,
            type: 'string',
            category: 'aws',
            is_sensitive: 0,
            description: 'AWS S3 Bucket Name'
        },
        {
            key: 'USER_GMAIL',
            value: process.env.USER_GMAIL,
            type: 'string',
            category: 'email',
            is_sensitive: 1,
            description: 'SMTP Email Address'
        },
        {
            key: 'USER_PASSWORD',
            value: process.env.USER_PASSWORD,
            type: 'string',
            category: 'email',
            is_sensitive: 1,
            description: 'SMTP Email Password'
        },
        {
            key: 'RAZORPAY_KEY_ID',
            value: process.env.RAZORPAY_KEY_ID,
            type: 'string',
            category: 'payment',
            is_sensitive: 1,
            description: 'Razorpay Key ID'
        },
        {
            key: 'RAZORPAY_KEY_SECRET',
            value: process.env.RAZORPAY_KEY_SECRET,
            type: 'string',
            category: 'payment',
            is_sensitive: 1,
            description: 'Razorpay Key Secret'
        },
        {
            key: 'GOOGLE_MAPS_API_KEY',
            value: process.env.GOOGLE_MAPS_API_KEY,
            type: 'string',
            category: 'general',
            is_sensitive: 1,
            description: 'Google Maps API Key'
        }
    ];

    try {
        for (const setting of settings) {
            if (!setting.value) {
                console.warn(`Warning: ${setting.key} is not set in environment variables`);
                continue;
            }

            // Insert or update setting
            const query = `
                INSERT INTO system_settings (setting_key, setting_value, setting_type, category, is_sensitive, description, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                setting_type = VALUES(setting_type),
                category = VALUES(category),
                is_sensitive = VALUES(is_sensitive),
                description = VALUES(description),
                updated_at = NOW()
            `;

            await connection.execute(query, [
                setting.key,
                setting.value,
                setting.type,
                setting.category,
                setting.is_sensitive,
                setting.description
            ]);

            console.log(`✓ Updated ${setting.key}`);
        }

        console.log('System settings populated successfully!');
    } catch (error) {
        console.error('Error populating system settings:', error);
    } finally {
        await connection.end();
    }
}

// Run if called directly
if (require.main === module) {
    populateSystemSettings();
}

module.exports = { populateSystemSettings };
