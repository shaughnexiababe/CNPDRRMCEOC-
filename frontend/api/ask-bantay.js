import {
  getAdminDb, verifyRequester, corsHeaders, readJsonBody, sendError, FieldValue,
} from './_lib/firebase-admin.js';

const SYSTEM_INSTRUCTION = [
  'You are "Super Batang Kalasag", the AI wingman for the CN-PDRRMO EOC app.',
  'Help citizens of Camarines Norte with weather updates, disaster protocols, and emergency contacts.',
  'Be brief, use Bicolano-friendly Tagalog, and prioritize safety.',
  'If the user is in immediate danger, include the keyword [TRIGGER_SOS] in your text.',
  'If the user wants the map, include [NAVIGATE_MAP]; for alerts, include [NAVIGATE_ALERTS].',
].join(' ');

function sanitizeText(str) {
  return String(str || '').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 2000);
}

/**
 * POST /api/ask-bantay { message, context }
 * Server-side Gemini AI gateway with per-uid rate limiting.
 */
export default async function handler(req, res) {
  corsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI gateway not configured (missing GEMINI_API_KEY env).' });
  }

  try {
    const requester = await verifyRequester(req);
    const body = await readJsonBody(req);
    const userText = sanitizeText(body.message);
    const contextText = sanitizeText(body.context);
    if (!userText) return res.status(400).json({ error: 'Empty message' });

    // Per-uid rate limiting via Firestore transaction
    const maxPerHour = Number(process.env.AI_RATE_PER_HOUR) || 20;
    const dateHour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, ''); // YYYYMMDDHH
    const rateLimitRef = getAdminDb().collection('rate_limits').doc(`${requester.uid}_${dateHour}`);

    await getAdminDb().runTransaction(async (transaction) => {
      const snap = await transaction.get(rateLimitRef);
      const count = snap.exists ? snap.data().count || 0 : 0;
      if (count >= maxPerHour) {
        const err = new Error(`Rate limit exceeded (${maxPerHour} AI requests per hour limit). Please try again later.`);
        err.status = 429;
        throw err;
      }
      transaction.set(rateLimitRef, {
        count: count + 1,
        uid: requester.uid,
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [{
            parts: [{ text: `Context: ${contextText}\nUser: ${userText}` }],
          }],
          generationConfig: { temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!resp.ok) {
      console.error('Gemini error', resp.status, await resp.text().catch(() => ''));
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Pasensya na, may problema sa pagsagot ko ngayon.';
    return res.status(200).json({ text });
  } catch (err) {
    return sendError(res, err);
  }
}
