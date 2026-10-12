import {
  getAdminDb, getAdminMessaging, verifyRequester, corsHeaders, readJsonBody, sendError,
} from './_lib/firebase-admin.js';

export const toTopicSlug = (str) => String(str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * POST /api/notify-hazard-alert { alertId }
 * Staff only. Sends FCM notification to the affected municipality topic.
 */
export default async function handler(req, res) {
  corsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyRequester(req, { staffOnly: true });
    const { alertId } = await readJsonBody(req);
    if (!alertId || typeof alertId !== 'string') {
      return res.status(400).json({ error: 'Valid alertId is required' });
    }

    const snap = await getAdminDb().collection('hazard_alerts').doc(alertId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Alert not found' });
    const alert = snap.data();

    const muni = alert.affected_municipality;
    const topicSlug = muni ? toTopicSlug(muni) : 'province';
    const topicName = `alerts_${topicSlug}`;

    await getAdminMessaging().send({
      notification: {
        title: `HAZARD ALERT: ${alert.title || alert.type || 'Notice'}`,
        body: alert.description || `New ${alert.type || 'hazard'} alert for ${muni || 'the province'}.`,
      },
      data: {
        alertId,
        type: alert.type || '',
        severity: alert.severity || '',
        navigate_to: 'alerts',
      },
      android: {
        priority: 'high',
        notification: { channelId: 'hazard_alerts', color: '#D32F2F' },
      },
      topic: topicName,
    });

    return res.status(200).json({ success: true, topic: topicName });
  } catch (err) {
    return sendError(res, err);
  }
}
