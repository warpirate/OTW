#!/usr/bin/env node

/**
 * OMW Backend Setup Script
 * Helps configure the environment for development/production
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setup() {
  console.log('🚀 OMW Backend Setup');
  console.log('===================\n');

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    const overwrite = await ask('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Your existing .env file is preserved.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Configuration Setup\n');

  const config = {
    NODE_ENV: await ask('Environment (development/production): ') || 'development',
    PORT: await ask('Server port (5001): ') || '5001',
    DB_HOST: await ask('Database host (localhost): ') || 'localhost',
    DB_USER: await ask('Database user (root): ') || 'root',
    DB_PASSWORD: await ask('Database password: '),
    DB_NAME: await ask('Database name (omw_db): ') || 'omw_db',
    DB_PORT: await ask('Database port (3306): ') || '3306',
    JWT_SECRET: await ask('JWT Secret (generate random 32+ chars): ') || 'your_super_secret_jwt_key_min_32_chars',
    RAZORPAY_KEY_ID: await ask('Razorpay Key ID (leave empty for mock): '),
    RAZORPAY_KEY_SECRET: await ask('Razorpay Secret (leave empty for mock): '),
    GOOGLE_MAPS_API_KEY: await ask('Google Maps API Key (leave empty for Haversine): ')
  };

  // Generate .env content
  let envContent = '# OMW Backend Configuration\n';
  envContent += `# Generated on ${new Date().toISOString()}\n\n`;

  Object.entries(config).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });

  // Write .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Configuration saved to .env file');
  console.log('\n🔧 Next Steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Start the server: npm run dev');
  console.log('3. Check API: curl http://localhost:5001/api/health');

  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
    console.log('\n⚠️  Payment Processing: Mock mode enabled');
    console.log('   - Add Razorpay keys to .env for live payments');
    console.log('   - All payment functions will work with mock data');
  }

  console.log('\n🎉 Setup complete!');

  rl.close();
}

setup().catch(console.error);

