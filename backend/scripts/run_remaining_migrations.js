const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async function run() {
  const dbName = process.env.DB_NAME || 'omw_db';
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true
  };

  const sqlFile = path.join(__dirname, '../database_updates/run_migrations.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('Migration SQL file not found at', sqlFile);
    process.exit(1);
  }

  let sqlContent = fs.readFileSync(sqlFile, 'utf8');

  // Normalize to target database: replace any existing USE statements with the .env DB_NAME
  if (/\bUSE\s+\w+;?/i.test(sqlContent)) {
    sqlContent = sqlContent.replace(/\bUSE\s+\w+;?/gi, `USE ${dbName};`);
  } else {
    sqlContent = `USE ${dbName};\n` + sqlContent;
  }

  // Parse SQL with support for custom DELIMITER sections (e.g., $$)
  function parseStatements(sql) {
    const lines = sql.split(/\r?\n/);
    let delimiter = ';';
    let buf = '';
    const stmts = [];
    for (let rawLine of lines) {
      const line = rawLine; // preserve as-is for accurate SQL
      const trimmed = line.trim();
      // Handle delimiter change lines
      if (/^DELIMITER\s+/i.test(trimmed)) {
        // Flush any pending buffer before changing delimiter
        if (buf.trim()) {
          // If buffer ends with the old delimiter, remove it
          if (buf.trimEnd().endsWith(delimiter)) {
            buf = buf.trimEnd().slice(0, -delimiter.length);
            if (buf.trim()) stmts.push(buf);
            buf = '';
          } else {
            stmts.push(buf);
            buf = '';
          }
        }
        delimiter = trimmed.replace(/^DELIMITER\s+/i, '');
        continue;
      }
      // Skip full-line comments starting with --
      if (trimmed.startsWith('--')) continue;
      // Accumulate
      buf += line + '\n';
      // If buffer ends with current delimiter, cut and push
      if (buf.trimEnd().endsWith(delimiter)) {
        const cut = buf.trimEnd().slice(0, -delimiter.length);
        if (cut.trim()) stmts.push(cut);
        buf = '';
      }
    }
    if (buf.trim()) stmts.push(buf);
    return stmts;
  }

  let conn;
  try {
    console.log('Starting remaining migrations against DB:', dbName);
    conn = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL');

    // Ensure DB exists
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`);

    // Safety check: ensure base schema appears to be present in target DB
    console.log('Checking base schema presence in target DB...');
    const [baseCheck] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('users','bookings','providers')`,
      [dbName]
    );
    const present = new Set(baseCheck.map(r => r.TABLE_NAME));
    const missingBase = ['users','bookings','providers'].filter(t => !present.has(t));
    if (missingBase.length) {
      console.error(
        `Base schema tables missing in database "${dbName}": ${missingBase.join(', ')}.\n` +
        'Aborting to avoid applying migrations to the wrong database.\n' +
        'Please either: (1) set DB_NAME in backend/.env to the DB that already has omw_4.0 base schema, or (2) apply omw_4.0.sql to this DB and re-run.'
      );
      process.exit(2);
    }

    console.log('Executing run_migrations.sql ... this may take a moment');
    const statements = parseStatements(sqlContent);
    console.log(`Parsed ${statements.length} statements with delimiter handling.`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.trim().slice(0, 80).replace(/\s+/g, ' ');
      try {
        await conn.query(stmt);
      } catch (e) {
        console.error(`Error on statement ${i + 1}: ${preview}`);
        throw e;
      }
    }
    console.log('Migrations executed. Verifying...');

    const checks = [
      "SHOW TABLES LIKE 'upi_payment_methods'",
      "SHOW TABLES LIKE 'upi_transactions'",
      "SHOW TABLES LIKE 'cash_payments'",
      "SHOW TABLES LIKE 'pricing_vehicle_types'",
      "SHOW TABLES LIKE 'pricing_rules'",
      "SHOW TABLES LIKE 'ride_fare_breakdowns'",
      "SHOW TABLES LIKE 'user_wallets'",
      "SHOW TABLES LIKE 'wallet_transactions'",
      "SHOW TABLES LIKE 'provider_earnings'",
      "SHOW TABLES LIKE 'payment_links'",
      "SHOW TABLES LIKE 'payout_batches'",
      "SHOW TABLES LIKE 'payout_details'",
      "SHOW TABLES LIKE 'fare_disputes'"
    ];

    for (const q of checks) {
      const [rows] = await conn.query(q);
      const tableName = q.match(/'([^']+)'/)[1];
      console.log(`${tableName}: ${rows.length > 0 ? 'OK' : 'MISSING'}`);
    }

    const [vehicleTypes] = await conn.query('SELECT COUNT(*) as cnt FROM pricing_vehicle_types');
    const [pricingRules] = await conn.query('SELECT COUNT(*) as cnt FROM pricing_rules');
    console.log('pricing_vehicle_types count:', vehicleTypes?.[0]?.cnt ?? 0);
    console.log('pricing_rules count:', pricingRules?.[0]?.cnt ?? 0);

    console.log('All done!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
