import {
  getAdminDb, getAdminMessaging, verifyRequester, corsHeaders, readJsonBody, sendError, FieldValue,
} from './_lib/firebase-admin.js';

/**
 * POST /api/notify-critical-incident { incidentId }
 * Notifies staff devices via FCM multicast. Idempotent and owner/staff restricted.
 */
export default async function handler(req, res) {
  corsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const requester = await verifyRequester(req);
    const body = await readJsonBody(req);
    const { incidentId } = body;
    if (!incidentId) return res.status(400).json({ error: 'Missing incidentId' });

    const db = getAdminDb();
    const incidentRef = db.collection('incidents').doc(incidentId);

    // Idempotent check via Firestore transaction
    let shouldNotify = false;
    let municipality = 'CamNorte';
    let incidentType = 'incident';

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(incidentRef);
      if (!snap.exists) {
        const err = new Error('Incident not found');
        err.status = 404;
        throw err;
      }
      const incident = snap.data();

      // Authorization check: reporter or staff
      const isOwner = incident.reported_by_id === requester.uid;
      const isStaff = requester.role === 'admin' || requester.role === 'eoc_personnel';
      if (!isOwner && !isStaff) {
        const err = new Error('Access denied: Only incident owner or staff may send notifications');
        err.status = 403;
        throw err;
      }

      // Check if already notified (idempotent)
      if (incident.notified_at) {
        shouldNotify = false;
        return;
      }

      const critical = incident.priority === 'critical' || incident.type === 'sos';
      if (!critical) {
        shouldNotify = false;
        return;
      }

      shouldNotify = true;
      municipality = incident.municipality || 'CamNorte';
      incidentType = incident.type === 'sos' ? 'SOS SIGNAL' : 'CRITICAL INCIDENT';

      transaction.update(incidentRef, {
        notified_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    if (!shouldNotify) {
      return res.status(200).json({ success: true, skipped: true });
    }

    // Query staff user tokens
    const staffUsersSnap = await db.collection('users')
      .where('role', 'in', ['admin', 'eoc_personnel', 'ADMIN', 'EOC_PERSONNEL'])
      .get();

    const tokenDocs = [];
    for (const staffDoc of staffUsersSnap.docs) {
      const devicesSnap = await staffDoc.ref.collection('devices').get();
      devicesSnap.forEach((deviceDoc) => {
        tokenDocs.push({ ref: deviceDoc.ref, token: deviceDoc.id });
      });
    }

    if (tokenDocs.length === 0) {
      return res.status(200).json({ success: true, sentCount: 0 });
    }

    const messaging = getAdminMessaging();
    const tokens = tokenDocs.map((t) => t.token);

    // Multicast in chunks of 500
    let totalSent = 0;
    const CHUNK_SIZE = 500;
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunkTokens = tokens.slice(i, i + CHUNK_SIZE);
      const chunkDocs = tokenDocs.slice(i, i + CHUNK_SIZE);

      const response = await messaging.sendEachForMulticast({
        tokens: chunkTokens,
        notification: {
          title: `🚨 ${incidentType} — ${municipality}`,
          body: 'New critical incident reported',
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
      });

      totalSent += response.successCount;

      // Clean up stale or unregistered tokens
      const batch = db.batch();
      let deleteCount = 0;
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            batch.delete(chunkDocs[idx].ref);
            deleteCount++;
          }
        }
      });
      if (deleteCount > 0) {
        await batch.commit();
      }
    }

    return res.status(200).json({ success: true, sentCount: totalSent });
  } catch (err) {
    return sendError(res, err);
  }
}
