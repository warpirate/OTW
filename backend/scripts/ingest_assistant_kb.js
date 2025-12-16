/*
 * Ingest OMW knowledge base into Qdrant for the assistant.
 *
 * Usage (from backend folder):
 *   1) Install deps:  npm install openai @qdrant/js-client-rest
 *   2) Set env:      OPENAI_API_KEY, QDRANT_URL, (optional) QDRANT_API_KEY,
 *                    OMW_EMBEDDING_MODEL, QDRANT_COLLECTION
 *   3) Run:          node scripts/ingest_assistant_kb.js
 */

require('dotenv').config();

const db = require('../config/db');
const { randomUUID } = require('crypto');
let QdrantClient;

try {
  QdrantClient = require('@qdrant/js-client-rest').QdrantClient;
} catch (err) {
  console.error('Missing dependency. Please run: npm install @qdrant/js-client-rest');
  process.exit(1);
}

const COLLECTION = process.env.QDRANT_COLLECTION || 'omw_kb';
const EMBEDDING_MODEL = process.env.OMW_EMBEDDING_MODEL || 'text-embedding-3-small';
const VECTOR_SIZE = 1536; // text-embedding-3-small dimension

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

function chunkText(text, maxChars = 1200, overlap = 200) {
  if (!text) return [];
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + maxChars, cleaned.length);
    let chunk = cleaned.slice(start, end);

    if (end < cleaned.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      if (lastPeriod > maxChars * 0.5) {
        chunk = chunk.slice(0, lastPeriod + 1);
      }
    }

    chunks.push(chunk.trim());
    if (end === cleaned.length) break;
    start += maxChars - overlap;
  }
  return chunks;
}

async function ensureCollection() {
  try {
    const shouldReset = /^(1|true|yes)$/i.test(String(process.env.QDRANT_RESET || '').trim());
    const exists = await qdrant.getCollection(COLLECTION).then(() => true).catch(() => false);
    if (exists && shouldReset) {
      console.log(`Reset requested: deleting collection '${COLLECTION}'...`);
      await qdrant.deleteCollection(COLLECTION);
    }
    if (!exists || shouldReset) {
      console.log(`Creating collection '${COLLECTION}'...`);
      await qdrant.createCollection(COLLECTION, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`Collection '${COLLECTION}' created.`);
    } else {
      console.log(`Collection '${COLLECTION}' already exists.`);
    }
  } catch (err) {
    console.log(`Creating collection '${COLLECTION}' (not found)...`);
    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    });
    console.log(`Collection '${COLLECTION}' created.`);
  }
}

async function fetchContent() {
  const [pages] = await db.query(
    `SELECT id, page_title, page_content_plain
     FROM content_pages
     WHERE page_status = 'published'
       AND page_content_plain IS NOT NULL
       AND page_content_plain <> ''`
  );

  const [faqs] = await db.query(
    `SELECT id, category, question, answer
     FROM faqs
     WHERE is_active = 1
       AND answer IS NOT NULL
       AND answer <> ''`
  );

  const [categories] = await db.query(
    `SELECT id, name, category_type
     FROM service_categories
     WHERE is_active = 1`
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
     JOIN service_categories c ON s.category_id = c.id
     WHERE s.is_active = 1 AND c.is_active = 1`
  );

  console.log(`Fetched ${pages.length} published pages, ${faqs.length} active FAQs, ${categories.length} service categories, ${subcategories.length} subcategories.`);
  return { pages, faqs, categories, subcategories };
}

function buildChunks(pages, faqs, categories, subcategories) {
  const docs = [];

  // Precompute subcategories by category for richer summaries
  const subsByCategory = new Map();
  for (const sub of subcategories) {
    if (!subsByCategory.has(sub.category_id)) subsByCategory.set(sub.category_id, []);
    subsByCategory.get(sub.category_id).push(sub);
  }

  // Content pages
  for (const page of pages) {
    const base = `${page.page_title || ''}. ${page.page_content_plain || ''}`;
    const segments = chunkText(base);
    segments.forEach((segment, idx) => {
      docs.push({
        id: `page-${page.id}-c${idx}`,
        type: 'content_page',
        title: page.page_title,
        text: segment,
        page_id: page.id,
        source: 'content_page',
      });
    });
  }

  // FAQs
  for (const faq of faqs) {
    const base = `${faq.question || ''}. ${faq.answer || ''}`;
    const segments = chunkText(base);
    segments.forEach((segment, idx) => {
      docs.push({
        id: `faq-${faq.id}-c${idx}`,
        type: 'faq',
        title: faq.question,
        text: segment,
        faq_id: faq.id,
        category: faq.category,
        source: 'faq',
      });
    });
  }

  // Service categories
  for (const cat of categories) {
    const lines = [];
    const typeText = cat.category_type ? ` (type: ${cat.category_type})` : '';
    lines.push(`Category: ${cat.name}${typeText}`);

    const subs = subsByCategory.get(cat.id) || [];
    if (subs.length) {
      lines.push('Subcategories:');
      subs.forEach((s, idx) => {
        const priceText = s.base_price != null ? ` - Base price: ₹${s.base_price}` : '';
        const descText = s.description ? ` — ${s.description}` : '';
        lines.push(`  ${idx + 1}) ${s.name}${priceText}${descText}`);
      });
    } else {
      lines.push('No active subcategories listed.');
    }

    const base = lines.join('\n');
    const segments = chunkText(base, 1400, 200);
    segments.forEach((segment, idx) => {
      docs.push({
        id: `category-${cat.id}-c${idx}`,
        type: 'service_category',
        title: cat.name,
        text: segment,
        category_id: cat.id,
        category_type: cat.category_type,
        source: 'service_category',
      });
    });
  }

  // Service subcategories
  for (const sub of subcategories) {
    const priceText = sub.base_price != null ? ` Typical base price: ₹${sub.base_price}.` : '';
    const base = `Service: ${sub.name} in category ${sub.category_name}${sub.category_type ? ` (${sub.category_type})` : ''}. ${sub.description || ''}${priceText}`;
    const segments = chunkText(base);
    segments.forEach((segment, idx) => {
      docs.push({
        id: `subcategory-${sub.id}-c${idx}`,
        type: 'service_subcategory',
        title: `${sub.name} (${sub.category_name})`,
        text: segment,
        category_id: sub.category_id,
        subcategory_id: sub.id,
        category_type: sub.category_type,
        source: 'service_subcategory',
      });
    });
  }

  // High-level OMW services overview (summary across all categories & services)
  try {
    const categoryMap = new Map();
    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, services: [] });
    }
    for (const sub of subcategories) {
      const entry = categoryMap.get(sub.category_id);
      if (entry) entry.services.push(sub);
    }

    const overviewParts = [];
    overviewParts.push('OMW services overview: categories first, then subcategories with base prices. Use this to answer: "What services are available?" or "List services by category."');
    overviewParts.push('');

    overviewParts.push('Service categories:');
    for (const entry of categoryMap.values()) {
      const typeLabel = entry.category_type ? ` (type: ${entry.category_type})` : '';
      overviewParts.push(`- ${entry.name}${typeLabel}`);
    }
    overviewParts.push('');

    for (const entry of categoryMap.values()) {
      const typeLabel = entry.category_type ? ` (type: ${entry.category_type})` : '';
      overviewParts.push(`Category: ${entry.name}${typeLabel}`);
      if (entry.services.length > 0) {
        overviewParts.push('Subcategories:');
        entry.services.forEach((s, idx) => {
          const price = s.base_price != null ? ` - Base price: ₹${s.base_price}` : '';
          const desc = s.description ? ` — ${s.description}` : '';
          overviewParts.push(`  ${idx + 1}) ${s.name}${price}${desc}`);
        });
      } else {
        overviewParts.push('Subcategories: (none)');
      }
      overviewParts.push('');
    }

    const overviewText = overviewParts.join('\n');
    const overviewChunks = chunkText(overviewText, 1500, 200);
    overviewChunks.forEach((segment, idx) => {
      docs.push({
        id: `services-overview-c${idx}`,
        type: 'services_overview',
        title: 'OMW services overview',
        text: segment,
        source: 'services_overview',
      });
    });
  } catch (e) {
    console.warn('Failed to build services overview chunk:', e);
  }

  // Synthetic documentation: customer login & signup flow
  const authDocLines = [
    'Customer login and signup flow on OMW (On My Way):',
    '',
    '1) Accessing the customer site:',
    '- Open the OMW customer website or app.',
    '- Browse services on the landing page (categories, subcategories, driver services).',
    '',
    '2) Creating a new customer account (Sign Up):',
    '- Click the Sign Up / Register option in the header (customer navigation).',
    '- Choose the customer role if multiple roles are shown.',
    '- Fill required details: name, email, phone number, and password or OTP (as shown in the UI).',
    '- Submit to create the account.',
    '- Complete OTP / email / phone verification if prompted.',
    '- After successful signup you are logged in as customer and can start booking services.',
    '',
    '3) Logging in as an existing customer (Sign In):',
    '- Click the Login / Sign In option in the header.',
    '- Ensure the customer role is selected.',
    '- Enter registered email/phone and password or OTP.',
    '- On success the customer token is stored and customer-only pages unlock.',
    '',
    '4) Pages that require customer login:',
    '- Booking (home services).',
    '- Driver booking / ride booking.',
    '- Customer Profile (edit details, upload verification documents).',
    '- Bookings list and booking tracking pages.',
    '- Wallet, payments, and discount verification pages.',
    '',
    '5) If not logged in:',
    '- Protected pages check AuthService.isLoggedIn("customer").',
    '- If not logged in, OMW shows a message like "Please login to continue" and redirects to /login.',
    '',
    '6) Short answer for the assistant:',
    '- To sign up: use the Sign Up / Register in the header, enter details, verify if asked, then you can book.',
    '- To log in: use the Login / Sign In in the header, choose customer role, enter credentials, then access booking, driver booking, profile, and bookings pages.'
  ];

  const authDoc = authDocLines.join('\n');
  const authChunks = chunkText(authDoc, 1200, 200);
  authChunks.forEach((segment, idx) => {
    docs.push({
      id: `customer-auth-flow-c${idx}`,
      type: 'customer_auth_flow',
      title: 'Customer login and signup flow on OMW',
      text: segment,
      source: 'customer_auth_flow',
    });
  });

  // Synthetic policy and professionals documents (drafts)
  const extraDocs = [
    {
      id: 'payments-overview',
      title: 'Payments on OMW',
      lines: [
        'Payments on OMW:',
        '',
        'Accepted payment methods:',
        '- Cash on delivery (COD).',
        '- Card (credit/debit).',
        '- UPI.',
        '- Net Banking.',
        '',
        'How to pay:',
        '1) Choose a service and proceed to booking checkout.',
        '2) Select your preferred payment method (Cash, Card, UPI, or Net Banking).',
        '3) Complete payment; for cash, pay the provider on service completion if shown.',
        '',
        'Notes:',
        '- Digital wallets are not offered in the current payment methods.',
        '- For any payment issues, contact support.',
        '',
        'Short answer for the assistant:',
        '- We accept Cash, Cards, UPI, and Net Banking. Digital wallets are not supported.'
      ]
    },
    {
      id: 'policies-overview',
      title: 'OMW Policies Overview',
      lines: [
        'OMW Policies Overview:',
        '',
        '- Privacy Policy: how we collect, use, and protect your data.',
        '- Terms & Conditions: usage terms for booking and using services.',
        '- Cancellation Policy: when and how you can cancel a booking.',
        '- Refund Policy: when refunds apply and how they are processed.',
        '- Payments & Security: payment options and security measures.',
        '',
        'Keywords: policy, policies, refund policy, refunds policy, cancellation policy, cancelation policy, cancelllation policy, privacy policy, terms, terms & conditions.',
        '',
        'Note: This is a concise overview to help the assistant route user questions. Refer to the detailed pages when available.'
      ]
    },
    {
      id: 'cancellation-policy',
      title: 'Cancellation Policy (Draft)',
      lines: [
        'Cancellation Policy (Draft):',
        '',
        '- You can cancel a booking from the Bookings screen before the provider starts the job.',
        '- If a provider has already been assigned or is en route, a nominal cancellation fee may apply.',
        '- For time-sensitive services (e.g., ride/driver bookings), late cancellations can incur higher fees.',
        '- No-shows may be charged a partial fee to compensate provider time and travel.',
        '- For specific fees and timing windows, refer to the detailed policy page once published or contact support.',
        '',
        'Keywords: cancellation policy, cancelation policy, cancelllation policy, cancel booking, fees, late cancellation.'
      ]
    },
    {
      id: 'refund-policy',
      title: 'Refund Policy (Draft)',
      lines: [
        'Refund Policy (Draft):',
        '',
        '- Prepaid amounts are refundable when a booking is cancelled within the free-cancellation window.',
        '- If work quality is unsatisfactory, raise a ticket within 24–48 hours for review.',
        '- Approved refunds are processed back to the original payment method within 5–7 business days.',
        '- Certain fees (e.g., late cancellation) may be non-refundable.',
        '- For exact timelines/fees, see the detailed policy page once published or contact support.',
        '',
        'Keywords: refund policy, refunds policy, refunds, reimbursement, chargeback.'
      ]
    },
    {
      id: 'service-professionals-overview',
      title: 'Who are OMW service professionals',
      lines: [
        'OMW Service Professionals:',
        '',
        '- Background-verified professionals onboarded by OMW.',
        '- Both male and female professionals are available depending on location and service.',
        '- For home services, customers can set a worker preference (male/female/any) during booking.',
        '- Professionals are rated by customers; performance is continuously tracked for quality.',
        '- Safety, punctuality, and professionalism are expected standards.'
      ]
    },
    {
      id: 'become-worker',
      title: 'How to become a working professional on OMW',
      lines: [
        'Become a Working Professional on OMW:',
        '',
        '- Step 1: Open the OMW Partner/Provider onboarding link or app (as available for your city).',
        '- Step 2: Register with your name, phone, and email; choose your primary service category.',
        '- Step 3: Upload required documents (ID, address proof, skill certificates if applicable).',
        '- Step 4: Complete verification and onboarding call/training.',
        '- Step 5: Start receiving jobs once approved.',
        '',
        'For assistance, contact support at the address listed on the OMW website.'
      ]
    }
  ];

  extraDocs.forEach(docDef => {
    const body = docDef.lines.join('\n');
    const segs = chunkText(body, 1200, 200);
    segs.forEach((segment, idx) => {
      docs.push({
        id: `${docDef.id}-c${idx}`,
        type: docDef.id,
        title: docDef.title,
        text: segment,
        source: docDef.id,
      });
    });
  });

  console.log(`Built ${docs.length} chunks from pages + faqs + service categories + subcategories.`);
  return docs;
}

async function embedBatch(openai, texts) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

async function upsertChunks(openai, chunks, batchSize = 64) {
  console.log(`Upserting ${chunks.length} chunks into Qdrant (${COLLECTION})...`);

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await embedBatch(openai, batch.map((c) => c.text));

    const points = batch.map((chunk, idx) => ({
      id: randomUUID(),
      vector: embeddings[idx],
      payload: {
        chunk_id: chunk.id,
        type: chunk.type,
        title: chunk.title,
        text: chunk.text,
        source: chunk.source,
        page_id: chunk.page_id || null,
        faq_id: chunk.faq_id || null,
        category: chunk.category || null,
        category_id: chunk.category_id || null,
        subcategory_id: chunk.subcategory_id || null,
        category_type: chunk.category_type || null,
      },
    }));

    await qdrant.upsert(COLLECTION, {
      wait: true,
      points,
    });

    console.log(`Upserted ${i + batch.length}/${chunks.length} chunks...`);
  }

  console.log('Ingestion complete.');
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Aborting.');
    process.exit(1);
  }
  if (!process.env.QDRANT_URL) {
    console.error('QDRANT_URL is not set. Aborting.');
    process.exit(1);
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    await ensureCollection();
    const { pages, faqs, categories, subcategories } = await fetchContent();
    const chunks = buildChunks(pages, faqs, categories, subcategories);

    if (!chunks.length) {
      console.log('No chunks to ingest (no published pages or active FAQs with text).');
      process.exit(0);
    }

    await upsertChunks(openai, chunks);
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  } finally {
    if (db && db.end) {
      await db.end();
    }
  }
}

main();
