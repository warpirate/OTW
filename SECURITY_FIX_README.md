# Security Fix: AWS Credentials Removal

## Issue
GitHub detected hardcoded AWS credentials in the SQL file `backend/omw_db_4.6.1 (1).sql` and is blocking pushes.

## Solution Applied

### 1. Immediate Fix
- Removed the SQL file from git tracking: `git rm --cached "backend/omw_db_4.6.1 (1).sql"`
- Added the file to `.gitignore` to prevent future commits
- Created a template SQL file without sensitive data

### 2. Proper Environment Variable Usage
- Created `backend/scripts/populate_system_settings.js` to populate database from `.env` file
- All credentials now properly use environment variables
- No more hardcoded secrets in codebase

### 3. Files Created/Modified
- `.gitignore` - Added to prevent credential leaks
- `backend/omw_db_template.sql` - Clean template without secrets
- `backend/scripts/populate_system_settings.js` - Script to populate from .env
- `fix_sql_credentials.js` - Utility to clean existing SQL files

### 4. To Complete the Fix
Since the credentials are in git history, you have two options:

#### Option A: Use GitHub's Allow Secret Feature (Temporary)
1. Go to the GitHub repository
2. Click on the security alert links provided in the push error
3. Temporarily allow the secrets to complete this push
4. The secrets are now removed from future commits

#### Option B: Rewrite Git History (Complete Removal)
```bash
# Install git-filter-repo (more modern than filter-branch)
pip install git-filter-repo

# Remove the file from entire history
git filter-repo --path "backend/omw_db_4.6.1 (1).sql" --invert-paths

# Force push to update remote history
git push --force-with-lease origin main
```

### 5. Best Practices Going Forward
- Never commit `.env` files
- Use template files for database schemas
- Always use environment variables for secrets
- Regular security scans with tools like `git-secrets`

### 6. Current Environment Variables Used
All sensitive data is now properly stored in `.env`:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `JWT_SECRET`
- `USER_GMAIL`
- `USER_PASSWORD`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `GOOGLE_MAPS_API_KEY`

## Next Steps
1. Choose Option A or B above to complete the fix
2. Run `node backend/scripts/populate_system_settings.js` to populate database from .env
3. Verify all services work with environment variables
4. Consider rotating the exposed AWS credentials as a security precaution
