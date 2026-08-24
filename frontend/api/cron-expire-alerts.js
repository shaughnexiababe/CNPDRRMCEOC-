import {
  getAdminDb, corsHeaders, sendError, FieldValue, Timestamp,
} from './_lib/firebase-admin.js';

/**
 * GET /api/cron-expire-alerts
 * Port of the expireHazardAlerts scheduler. Invoked daily by Vercel Cron
 * (see vercel.json). If CRON_SECRET is set, Vercel automatically sends it
 * as `Authorization: Bearer <CRON_SECRET>` on cron runs; manual triggers
 * must present the same secret. Hourly expiry also happens client-side —
 * this sweep is the durable cleanup.
 */
export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.authorization || '';
    if (header !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
