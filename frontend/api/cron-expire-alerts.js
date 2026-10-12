import {
  getAdminDb, corsHeaders, sendError, FieldValue, Timestamp,
} from './_lib/firebase-admin.js';

/**
 * GET /api/cron-expire-alerts
 * Invoked by Vercel Cron. Fails CLOSED if CRON_SECRET is not configured.
 */
export default async function handler(req, res) {
  corsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Cron secret not configured' });
  }

  const header = req.headers.authorization || req.headers.Authorization || '';
  if (header !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('hazard_alerts')
      .where('status', 'in', ['active', 'monitoring'])
      .where('expires_at', '<', Timestamp.now())
      .limit(300)
      .get();

    if (snap.empty) return res.status(200).json({ success: true, expired: 0 });

    const batch = db.batch();
    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        status: 'expired',
        updated_at: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    return res.status(200).json({ success: true, expired: snap.size });
  } catch (err) {
    return sendError(res, err);
  }
}
