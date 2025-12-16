const express = require('express');
const router = express.Router();
const db = require('../../config/db');

let OpenAI = null;
let QdrantClient = null;
let useVectorSearch = false;

if (process.env.OPENAI_API_KEY && process.env.QDRANT_URL) {
  try {
    // Lazy require so the app still runs without these deps
    OpenAI = require('openai');
    QdrantClient = require('@qdrant/js-client-rest').QdrantClient;
    useVectorSearch = true;
  } catch (e) {
    useVectorSearch = false;
  }
}

function buildSystemPrompt() {
  return [
    'You are the OMW in-app assistant for customers.',
    'Answer only using the provided Context. If the answer is not in the context, say: "I don\'t know based on the available OMW documentation."',
    'Do not answer unrelated questions. Do not browse the web. Do not invent facts.',
    '',
    'Tone and style:',
    '- Be friendly, calm, and conversational, like a helpful human support agent.',
    '- Start with one short sentence that directly answers the main question in plain language.',
    '- Then, when relevant, explain in clear steps using numbered or bulleted lists instead of long paragraphs.',
    '- Keep each step short and scannable; use simple sentences and avoid large blocks of text.',
    '- Where it helps, group information under short headings such as "Booking steps", "Cancellation rules", or "Refund process".',
    '- Stay focused on what the user actually asked; do not add unrelated details.',
    '- When you do not know, say so briefly and suggest what the customer can do next (for example: check the app, contact support, or read the mentioned policy page).',
    '- When asked about services or categories, first list all service categories (with type), then for each category list its subcategories with typical base prices; keep it concise and complete.',
    'Cite the titles or ids from sources when relevant.'
  ].join('\n');
}

function combineContext(chunks) {
  const parts = [];
  for (const c of chunks) {
    const title = c.title || c.page_title || c.source || 'source';
    const text = c.text || c.page_content_plain || c.answer || '';
    parts.push(`- [${title}]\n${text}`);
  }
  let ctx = parts.join('\n\n');
  if (ctx.length > 12000) ctx = ctx.slice(0, 12000);
  return ctx;
}

async function retrieveFromQdrant(query) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddingRes = await openai.embeddings.create({
    model: process.env.OMW_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: query
  });
  const vector = embeddingRes.data[0].embedding;

  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });

  // Collection name can be configured via env, default to 'omw_kb'
  const collectionName = process.env.QDRANT_COLLECTION || 'omw_kb';

  const res = await client.search(collectionName, {
    vector,
    limit: 10,
    with_payload: true,
    filter: undefined
  });

  return res.map(r => ({
    title: r.payload?.title || r.payload?.page_title || r.payload?.source,
    text: r.payload?.text || r.payload?.page_content_plain || r.payload?.answer,
    source: r.payload?.source || 'kb'
  }));
}

router.post('/chat', async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const query = (lastUser?.content || '').trim();

    if (!query) return res.status(400).json({ message: 'Missing user query' });

    const lowerQuery = query.toLowerCase().trim();
    const cleaned = lowerQuery.replace(/[^a-z\s]/gi, '');
    const isGreeting = cleaned.length <= 40 && (
      /^(hi+\b|hello\b|hey\b|hii+\b|good\s+(morning|evening|afternoon))/i.test(cleaned) ||
      /\bhow\s+are\s+you\b/i.test(cleaned)
    );

    // If it's a greeting, respond immediately without needing context
    if (isGreeting) {
      return res.json({
        answer: "Hi! I'm the OMW assistant. Ask me anything about OMW services, booking, payments, or policies and I'll answer from the available documentation.",
        sources: []
      });
    }

    let chunks = [];
    if (useVectorSearch) {
      try {
        chunks = await retrieveFromQdrant(query);
      } catch (e) {
        chunks = [];
      }
    }

    if (!chunks || chunks.length === 0) {
      if (isGreeting) {
        return res.json({
          answer: "Hi! I'm the OMW assistant. Ask me anything about OMW services, booking, payments, or policies and I'll answer from the available documentation.",
          sources: []
        });
      }
      return res.json({
        answer: "I can help with OMW-related information only, but I don't have this in the available documentation.",
        sources: []
      });
    }

    const context = combineContext(chunks);

    if (OpenAI && process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OMW_ASSISTANT_MODEL || process.env.OTW_ASSISTANT_MODEL || 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: `Context:\n${context}\n\nQuestion:\n${query}\n\nAnswer only from the context. If not present, say you don\'t know.` }
        ]
      });
      const answer = completion.choices?.[0]?.message?.content?.trim() || '';
      return res.json({
        answer: answer || "I don\'t know based on the available OMW documentation.",
        sources: chunks.slice(0, 5).map(c => ({ title: c.title || c.page_title || c.source }))
      });
    }

    const answer = 'Here are relevant OMW resources that may help:\n' +
      chunks.slice(0, 5).map((c, i) => `${i + 1}. ${c.title || c.page_title || c.source}`).join('\n');

    return res.json({ answer, sources: chunks.slice(0, 5).map(c => ({ title: c.title || c.page_title || c.source })) });
  } catch (err) {
    return res.status(500).json({ message: 'Assistant error' });
  }
});

module.exports = router;
