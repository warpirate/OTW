# OTW Database Migration Instructions 🚀

## Overview
This guide will help you migrate all 4 additional SQL files to your AWS cloud database after deploying `omw_4.0.sql`.

## Migration Order (CRITICAL!)
The files **MUST** be executed in this specific order due to foreign key dependencies:

1. ✅ `payment_tables.sql` - UPI support (creates base columns)
2. ✅ `cash_payment_tracking.sql` - Cash payments (depends on UPI columns)
3. ✅ `dynamic_fare_engine_migration.sql` - Fare engine (independent)
4. ✅ `payment_settlement_tables.sql` - Wallet & earnings (uses all above)

## Option 1: Single Migration File (RECOMMENDED)

### Step 1: Execute the Combined Migration
```bash
# Connect to your AWS RDS MySQL database
mysql -h your-aws-rds-endpoint -u your_username -p omw_db

# Or using MySQL Workbench, phpMyAdmin, etc.
```

### Step 2: Run the Migration Script
```sql
-- Execute the complete migration file
SOURCE /path/to/run_migrations.sql;

-- OR copy/paste the entire contents of run_migrations.sql
```

## Option 2: Individual Files (Alternative)

If you prefer to run each file individually:

### Step 1: UPI Payment Support
```sql
USE omw_db;
SOURCE payment_tables.sql;
```

### Step 2: Cash Payment Tracking
```sql
USE omw_db;
SOURCE cash_payment_tracking.sql;
```

### Step 3: Dynamic Fare Engine
```sql
USE omw_db;
SOURCE dynamic_fare_engine_migration.sql;
```

### Step 4: Payment Settlement System
```sql
USE omw_db;
SOURCE payment_settlement_tables.sql;
```

## Validation Commands

After migration, run these queries to verify success:

### Check New Tables Created
```sql
-- Should show all new tables
SHOW TABLES LIKE '%upi%';
SHOW TABLES LIKE '%cash%';
SHOW TABLES LIKE '%pricing%';
SHOW TABLES LIKE '%wallet%';
SHOW TABLES LIKE '%payout%';

-- Count total tables (should be significantly more than before)
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'omw_db';
```

### Check New Columns Added
```sql
-- Check bookings table has new foreign keys
DESCRIBE bookings;

-- Check payments table has new columns
DESCRIBE payments;
```

### Check Sample Data Inserted
```sql
-- Should show 5 vehicle types
SELECT COUNT(*) as vehicle_types FROM pricing_vehicle_types;

-- Should show pricing rules
SELECT COUNT(*) as pricing_rules FROM pricing_rules;
```

### Check Triggers Created
```sql
-- Should show new triggers
SHOW TRIGGERS LIKE '%booking%';
```

### Check Stored Procedures
```sql
-- Should show new procedures
SHOW PROCEDURE STATUS WHERE Db = 'omw_db';
```

## What You'll Get After Migration 🎯

### New Payment Features
- ✅ **UPI Payment Methods** - Store customer UPI IDs
- ✅ **UPI Transactions** - Track UPI payment flows
- ✅ **Cash Payments** - Handle cash-on-delivery scenarios
- ✅ **Payment Links** - Generate additional payment requests

### Advanced Pricing Engine
- ✅ **Dynamic Vehicle Pricing** - Bike, car, SUV rates
- ✅ **Surge Pricing Zones** - Location-based price multipliers
- ✅ **Fare Breakdowns** - Detailed pricing components
- ✅ **Night Charges** - Automatic time-based pricing
- ✅ **Trip Tracking** - GPS logs for distance calculation

### Wallet & Earnings System
- ✅ **User Wallets** - Digital wallet for customers
- ✅ **Wallet Transactions** - Credit/debit transaction logs
- ✅ **Provider Earnings** - Automatic commission calculation
- ✅ **Payout Batches** - Bulk payment processing
- ✅ **Fare Disputes** - Dispute resolution system

### Business Intelligence
- ✅ **Pricing Rules Engine** - Configurable business rules
- ✅ **Performance Indexes** - Optimized query performance
- ✅ **Data Consistency Triggers** - Automatic data validation
- ✅ **Ready-made Views** - Pre-built reporting queries

## Troubleshooting 🛠️

### If You Get Foreign Key Errors:
```sql
-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Run your migration
SOURCE run_migrations.sql;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
```

### If You Get "Table Already Exists" Errors:
The migration uses `CREATE TABLE IF NOT EXISTS` so this should be safe. If you get errors, check if tables were partially created from previous attempts.

### If Migration Fails Halfway:
1. Drop the partially created tables
2. Start fresh with the full `run_migrations.sql`
3. Check MySQL error logs for specific issues

## Post-Migration Tasks 📋

1. **Update Backend APIs** - Modify your Node.js services to use new tables
2. **Test Payment Flows** - Verify UPI, cash, and wallet payments work
3. **Configure Pricing Rules** - Set your business-specific rates and rules
4. **Set Up Monitoring** - Monitor wallet balances and payout processing
5. **Train Support Team** - Familiarize team with new dispute resolution tools

## Database Size Impact 📊

Expect your database to grow by:
- **~20 new tables** (from 15 to ~35 tables)
- **~30 new indexes** for performance
- **~10 new triggers** for data consistency  
- **~5 new stored procedures** for common operations
- **~3 new views** for easier reporting

Your OTW platform will now have **enterprise-grade payment processing** comparable to Uber/Ola! 🎉

---

**Need Help?** 
- Check MySQL error logs if issues occur
- Ensure you have sufficient database permissions
- Verify AWS RDS has enough storage space
- Test on a development database first if possible
