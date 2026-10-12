import { verifyRequester, corsHeaders, readJsonBody, sendError } from './_lib/firebase-admin.js';

const SYSTEM_INSTRUCTION = [
  'You are an editor for the Provincial Disaster Risk Reduction and Management Office (PDRRMO) of Camarines Norte, Philippines.',
  'Rewrite the DRAFT situational report below into clear, formal, concise English suitable for the Provincial DRRM Council.',
  'STRICT RULES: use ONLY facts and numbers present in the draft. Never add, remove, round or change a number, place name or date.',
  'Do not speculate or give recommendations that are not in the draft. Keep the paragraph order. Plain text only, no markdown.',
].join(' ');

/**
 * POST /api/summarize-sitrep { operation, reportNo, asOf, draft }
 * EOC staff only. Rewords the deterministic draft produced client-side.
 * Uses the same GEMINI_API_KEY as /api/ask-bantay (kept server-side).
 */
export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI gateway not configured (missing GEMINI_API_KEY env).' });

  try {
    await verifyRequester(req, { staffOnly: true });
    const body = await readJsonBody(req);
    const draft = String(body.draft || '').slice(0, 8000);
    if (!draft.trim()) return res.status(400).json({ error: 'Empty draft' });

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nOperation: ${String(body.operation || '').slice(0, 200)}\nReport No.: ${Number(body.reportNo) || ''}\nAs of: ${String(body.asOf || '').slice(0, 60)}\n\nDRAFT:\n${draft}` }] }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!resp.ok) {
      console.error('Gemini error', resp.status, await resp.text().catch(() => ''));
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(502).json({ error: 'AI returned no text' });
    return res.status(200).json({ text: text.trim() });
  } catch (err) {
    return sendError(res, err);
  }
}
