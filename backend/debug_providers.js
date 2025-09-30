require('dotenv').config();
const pool = require('./config/db');

async function checkProviders() {
  try {
    const [providers] = await pool.query(`
      SELECT p.id, p.service_radius_km, p.location_lat, p.location_lng, 
             u.name, u.phone_number, p.active, p.verified
      FROM providers p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.active = 1 AND p.verified = 1
    `);
    
    console.log('=== Active & Verified Providers ===');
    providers.forEach(provider => {
      console.log(`Provider ${provider.id}: ${provider.name}`);
      console.log(`  Location: (${provider.location_lat}, ${provider.location_lng})`);
      console.log(`  Service Radius: ${provider.service_radius_km} km`);
      console.log(`  Phone: ${provider.phone_number}`);
      console.log('');
    });
    
    // Check customer address
    const [addresses] = await pool.query(`
      SELECT address_id, customer_id, location_lat, location_lng, 
             address, city, state, pin_code
      FROM customer_addresses 
      WHERE address_id = 8
    `);
    
    console.log('=== Customer Address (ID: 8) ===');
    if (addresses.length > 0) {
      const addr = addresses[0];
      console.log(`Address: ${addr.address}, ${addr.city}, ${addr.state} - ${addr.pin_code}`);
      console.log(`Location: (${addr.location_lat}, ${addr.location_lng})`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProviders();
