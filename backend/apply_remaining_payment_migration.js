const mysql = require('mysql2/promise');
require('dotenv').config();

async function applyRemainingMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ Connected to database:', process.env.DB_NAME);
    
    // Step 2: Populate total_amount with existing price data
    console.log('\n📊 Step 2: Populating total_amount with existing price data...');
    const [updateResult] = await connection.query(`
      UPDATE \`bookings\`
      SET \`total_amount\` = COALESCE(\`price\`, \`estimated_cost\`, 0)
      WHERE \`total_amount\` IS NULL
    `);
    console.log(`   ✅ Updated ${updateResult.affectedRows} bookings with total_amount`);
    
    // Step 3: Update payment_status values to be consistent
    console.log('\n📊 Step 3: Updating payment_status from "unpaid" to "pending"...');
    const [statusResult] = await connection.query(`
      UPDATE \`bookings\`
      SET \`payment_status\` = 'pending'
      WHERE \`payment_status\` = 'unpaid'
    `);
    console.log(`   ✅ Updated ${statusResult.affectedRows} bookings with payment_status`);
    
    // Step 4: Add indexes for faster payment queries
    console.log('\n📊 Step 4: Adding indexes for faster payment queries...');
    try {
      await connection.query(`
        ALTER TABLE \`bookings\`
        ADD INDEX \`idx_payment_status\` (\`payment_status\`)
      `);
      console.log('   ✅ Created index: idx_payment_status');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  Index idx_payment_status already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE \`bookings\`
        ADD INDEX \`idx_payment_completed\` (\`payment_completed_at\`)
      `);
      console.log('   ✅ Created index: idx_payment_completed');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  Index idx_payment_completed already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    // Step 5: Update bookings where payment was completed but status not updated
    console.log('\n📊 Step 5: Syncing payment status with payments table...');
    const [syncResult] = await connection.query(`
      UPDATE \`bookings\` b
      INNER JOIN \`payments\` p ON b.id = p.booking_id
      SET b.payment_status = 'paid',
          b.payment_method = CASE
              WHEN p.payment_type = 'razorpay' THEN 'Razorpay'
              WHEN p.payment_type = 'upi' THEN 'UPI Payment'
              ELSE 'Online Payment'
          END,
          b.payment_completed_at = p.captured_at
      WHERE p.status = 'captured'
        AND b.payment_status != 'paid'
    `);
    console.log(`   ✅ Synced ${syncResult.affectedRows} bookings with payment data`);
    
    // Verification
    console.log('\n🔍 Verifying changes...');
    
    const [statusCount] = await connection.query(`
      SELECT payment_status, COUNT(*) as count
      FROM bookings
      GROUP BY payment_status
    `);
    
    console.log('\n📊 Payment status distribution:');
    statusCount.forEach(row => {
      console.log(`   - ${row.payment_status || 'NULL'}: ${row.count} bookings`);
    });
    
    const [nullAmounts] = await connection.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE total_amount IS NULL
    `);
    
    console.log(`\n📊 Bookings with NULL total_amount: ${nullAmounts[0].count}`);
    
    const [syncedPayments] = await connection.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE payment_method IS NOT NULL
    `);
    
    console.log(`📊 Bookings with payment_method set: ${syncedPayments[0].count}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
console.log('═══════════════════════════════════════════════════════');
console.log('  Payment Flow Migration - Remaining Steps (2-5)');
console.log('═══════════════════════════════════════════════════════\n');

applyRemainingMigration()
  .then(() => {
    console.log('\n✅ All done! Payment flow migration completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
