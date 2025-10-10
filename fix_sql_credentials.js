const fs = require('fs');
const path = require('path');

// Script to remove hardcoded AWS credentials from SQL file
const sqlFilePath = path.join(__dirname, 'backend', 'omw_db_4.6.1 (1).sql');
const backupFilePath = path.join(__dirname, 'backend', 'omw_db_4.6.1_backup.sql');

console.log('Fixing SQL file credentials...');

try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Create backup
    fs.writeFileSync(backupFilePath, sqlContent);
    console.log('Backup created:', backupFilePath);
    
    // Replace AWS credentials with placeholder values
    let fixedContent = sqlContent;
    
    // Replace AWS Access Key ID patterns
    fixedContent = fixedContent.replace(/AKIA[0-9A-Z]{16}/g, 'YOUR_AWS_ACCESS_KEY_ID');
    
    // Replace AWS Secret Access Key patterns (base64-like strings that could be secrets)
    fixedContent = fixedContent.replace(/[A-Za-z0-9+/]{40}[A-Za-z0-9+/=]{0,4}/g, (match) => {
        // Only replace if it looks like an AWS secret (contains mixed case and special chars)
        if (match.includes('+') || match.includes('/') || match.includes('=')) {
            return 'YOUR_AWS_SECRET_ACCESS_KEY';
        }
        return match;
    });
    
    // More specific replacements for system_settings table
    fixedContent = fixedContent.replace(
        /('AWS_ACCESS_KEY_ID','[^']*')/g, 
        "'AWS_ACCESS_KEY_ID','YOUR_AWS_ACCESS_KEY_ID'"
    );
    
    fixedContent = fixedContent.replace(
        /('AWS_SECRET_ACCESS_KEY','[^']*')/g, 
        "'AWS_SECRET_ACCESS_KEY','YOUR_AWS_SECRET_ACCESS_KEY'"
    );
    
    // Write the fixed content
    fs.writeFileSync(sqlFilePath, fixedContent);
    console.log('SQL file fixed successfully!');
    console.log('Hardcoded AWS credentials have been replaced with placeholders.');
    console.log('Make sure to update your .env file with actual credentials.');
    
} catch (error) {
    console.error('Error fixing SQL file:', error.message);
}
