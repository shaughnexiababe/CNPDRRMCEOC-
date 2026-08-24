import {
  getAdminDb, getAdminMessaging, verifyRequester, corsHeaders, readJsonBody, sendError,
} from './_lib/firebase-admin.js';

/**
 * POST /api/notify-critical-incident { incidentId }
 * Port of the onCriticalIncident trigger. Any signed-in user may call it
 * (e.g. right after filing an SOS report); the incident itself must be
 * critical/SOS in Firestore or the request is ignored.
 */
export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyRequester(req);
    const { incidentId } = await readJsonBody(req);
    if (!incidentId) return res.status(400).json({ error: 'Missing incidentId' });

    const snap = await getAdminDb().collection('incidents').doc(incidentId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Incident not found' });
    const incident = snap.data();

    const critical = incident.priority === 'critical' || incident.type === 'sos';
    if (!critical) {
      return res.status(200).json({ success: true, skipped: 'not critical' });
    }

    await getAdminMessaging().send({
      notification: {
        title: `🚨 ${incident.type === 'sos' ? 'SOS SIGNAL' : 'CRITICAL INCIDENT'} — ${incident.municipality || 'CamNorte'}`,
        body: incident.title || 'New critical incident reported',
      },
      data: {
        incidentId,
        navigate_to: 'operations',
        priority: 'critical',
      },
      android: {
        priority: 'high',
        notification: { channelId: 'dispatch_staff', color: '#D32F2F' },
      },
      topic: 'dispatch_staff',
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
}
