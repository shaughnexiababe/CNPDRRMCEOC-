import { verifyRequester, corsHeaders, readJsonBody, sendError } from './_lib/firebase-admin.js';

const SYSTEM_INSTRUCTION = [
  'You are "Boy Kalasag" (Android twin: "Bantay"), the AI wingman for the CN-PDRRMO EOC app.',
  'Help citizens of Camarines Norte with weather updates, disaster protocols, and emergency contacts.',
  'Be brief, use Bicolano-friendly Tagalog, and prioritize safety.',
  'If the user is in immediate danger, include the keyword [TRIGGER_SOS] in your text.',
  'If the user wants the map, include [NAVIGATE_MAP]; for alerts, include [NAVIGATE_ALERTS].',
].join(' ');

/**
 * POST /api/ask-bantay { message, context }
 * Port of askBantayGateway — keeps the Gemini key server-side (Vercel env
 * GEMINI_API_KEY) so nothing needs to ship in the web bundle or APK.
 * Any signed-in user may call it.
 */
export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI gateway not configured (missing GEMINI_API_KEY env).' });
  }

  try {
    await verifyRequester(req);
    const body = await readJsonBody(req);
    const userText = String(body.message || '').slice(0, 2000);
    const contextText = String(body.context || '').slice(0, 2000);
    if (!userText.trim()) return res.status(400).json({ error: 'Empty message' });

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\nContext: ${contextText}\nUser: ${userText}` }] }],
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
