/*
 * Export OMW services (categories and subcategories) to a formatted text file.
 *
 * Usage (from backend folder):
 *   node scripts/export_services_text.js [optional_output_path]
 *
 * If output path is not provided, a default will be used:
 *   backend/exports/services_export.txt
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function fetchServices() {
  const [categories] = await db.query(
    `SELECT id, name, category_type
     FROM service_categories
     WHERE is_active = 1
     ORDER BY name`
  );

  const [subcategories] = await db.query(
    `SELECT 
        s.id,
        s.name,
        s.description,
        s.base_price,
        s.category_id,
        c.name AS category_name,
        c.category_type
     FROM subcategories s
     JOIN service_categories c ON c.id = s.category_id
     WHERE s.is_active = 1 AND c.is_active = 1
     ORDER BY c.name, s.name`
  );

  return { categories, subcategories };
}

function toCurrency(value) {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (!isFinite(num)) return '';
  return num.toString();
}

function buildText({ categories, subcategories }) {
  const now = new Date().toISOString();
  const lines = [];

  lines.push('OMW Services Export');
  lines.push(`Generated: ${now}`);
  lines.push('');

  for (const cat of categories) {
    const typeSuffix = cat.category_type ? ` (${cat.category_type})` : '';
    lines.push(`Category: ${cat.name}${typeSuffix}`);

    const subs = subcategories.filter((s) => s.category_id === cat.id);
    if (subs.length === 0) {
      lines.push('  (No active subcategories)');
      lines.push('');
      continue;
    }

    subs.forEach((s, i) => {
      const price = toCurrency(s.base_price);
      const priceText = price ? ` - Base price: ${price}` : '';
      lines.push(`  ${i + 1}) ${s.name}${priceText}`);
      if (s.description && s.description.trim()) {
        lines.push(`     Description: ${s.description.trim()}`);
      }
    });

    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  try {
    const outArg = process.argv[2];
    const outPath = outArg
      ? path.resolve(outArg)
      : path.resolve(__dirname, '../exports/services_export.txt');

    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const data = await fetchServices();
    const text = buildText(data);
    fs.writeFileSync(outPath, text, 'utf8');

    // Attempt to end pool if available (mysql2/promise pool)
    if (typeof db.end === 'function') {
      try { await db.end(); } catch (_) {}
    }

    console.log(`Services exported to: ${outPath}`);
  } catch (err) {
    console.error('Failed to export services:', err.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
