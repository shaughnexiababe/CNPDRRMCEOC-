const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

const db = admin.firestore();

// Default region for callables. The web app calls getFunctions() without a
// region (defaults to us-central1) — if you change this, update the web and
// Android clients to match.
const REGION = 'us-central1';

/**
 * Invites a staff member (EOC Personnel or Admin).
 * Creates an Auth user and a Firestore user document with the assigned role.
 * Returns a password reset link for the admin to share.
 */
exports.inviteStaff = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const callerDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can invite staff');
  }

  const { email, fullName, role } = data;
  if (!email || !fullName || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
  }

  if (!['admin', 'eoc_personnel'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid staff role');
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      displayName: fullName,
      password: Math.random().toString(36).slice(-10) + 'A1!', // random temp password
    });

    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      full_name: fullName,
      role: role,
      municipality: 'PROVINCIAL_EOC',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const actionCodeSettings = {
      url: 'https://cnpdrrmceoc.vercel.app/login',
    };
    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    await db.collection('audit_logs').add({
      action: 'STAFF_INVITE',
      target_uid: userRecord.uid,
      target_email: email,
      role: role,
      performed_by: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, inviteLink: link };
  } catch (error) {
    console.error('Error inviting staff:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Triggers when a new hazard alert is created.
 * Sends an FCM push notification to the affected municipality's topic.
 */
exports.onHazardAlertCreated = functions.region(REGION).firestore
  .document('hazard_alerts/{alertId}')
  .onCreate(async (snapshot, context) => {
    const alert = snapshot.data();
    const muni = alert.affected_municipality;

    // Slugify municipality name for topic: "Jose Panganiban" -> "jose_panganiban"
    // (MUST match the client-side slug in AuthRepository.subscribeToAlerts)
    const topicSlug = muni
      ? muni.toLowerCase().replace(/[^a-z0-9]/g, '_')
      : 'province';

    const topicName = `alerts_${topicSlug}`;

    const message = {
      notification: {
        title: `HAZARD ALERT: ${alert.title}`,
        body: alert.description || `New ${alert.type} alert for ${muni || 'the province'}.`,
      },
      data: {
        alertId: context.params.alertId,
        type: alert.type || '',
        severity: alert.severity || '',
        // Strong hint for the app to open the alerts screen
        navigate_to: 'alerts',
      },
      android: {
        priority: 'high',
        notification: { channelId: 'hazard_alerts', color: '#D32F2F' },
      },
      topic: topicName,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`FCM alert sent to ${topicName}:`, response);
    } catch (error) {
      console.error(`Error sending FCM alert to ${topicName}:`, error);
    }
  });

/**
 * Notifies EOC staff devices when a critical incident (e.g. SOS) is
 * reported. Staff clients subscribe to the "dispatch_staff" topic.
 */
exports.onCriticalIncident = functions.region(REGION).firestore
  .document('incidents/{incidentId}')
  .onCreate(async (snapshot, context) => {
    const incident = snapshot.data();
    const critical =
      incident.priority === 'critical' ||
      incident.type === 'sos' ||
      (incident.type === 'Emergency');

    if (!critical) return;

    const message = {
      notification: {
        title: `🚨 ${incident.type === 'sos' ? 'SOS SIGNAL' : 'CRITICAL INCIDENT'} — ${incident.municipality || 'CamNorte'}`,
        body: incident.title || 'New critical incident reported',
      },
      data: {
        incidentId: context.params.incidentId,
        navigate_to: 'operations',
        priority: 'critical',
      },
      android: {
        priority: 'high',
        notification: { channelId: 'dispatch_staff', color: '#D32F2F' },
      },
      topic: 'dispatch_staff',
    };

    try {
      await admin.messaging().send(message);
      console.log('Dispatch notification sent for incident', context.params.incidentId);
    } catch (error) {
      console.error('Dispatch notification failed:', error);
    }
  });

/**
 * Hourly sweep: marks hazard alerts whose expires_at has passed as
 * "expired", so they disappear from citizen/staff clients that filter on
 * status == 'active'. (Previously expiry was only enforced if a human
 * remembered to close the alert.)
 */
exports.expireHazardAlerts = functions.region(REGION).pubsub
  .schedule('every 60 minutes')
  .timeZone('Asia/Manila')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection('hazard_alerts')
      .where('status', 'in', ['active', 'monitoring'])
      .where('expires_at', '<', now)
      .get();

    if (snap.empty) return null;

    const batch = db.batch();
    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        status: 'expired',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    console.log(`Expired ${snap.size} hazard alert(s)`);
    return null;
  });

/**
 * Optional secure gateway for the "Boy Kalasag / Bantay" AI assistant.
 * Keeps the Gemini API key server-side instead of in the web bundle.
 * Configure with:  firebase functions:secrets:set GEMINI_API_KEY
 * Web/Android clients can switch to this callable instead of calling the
 * Gemini REST API directly.
 */
exports.askBantayGateway = functions
  .region(REGION)
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'AI gateway not configured');
    }

    const userText = (data.message || '').toString().slice(0, 2000);
    const contextText = (data.context || '').toString().slice(0, 2000);
    if (!userText.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Empty message');
    }

    const systemInstruction = [
      'You are "Bantay" (web twin: "Boy Kalasag"), the AI wingman for the CN-PDRRMO EOC app.',
      'Help citizens of Camarines Norte with weather updates, disaster protocols, and emergency contacts.',
      'Be brief, use Bicolano-friendly Tagalog, and prioritize safety.',
      'If the user is in immediate danger, include the keyword [TRIGGER_SOS] in your text.',
      'If the user wants the map, include [NAVIGATE_MAP]; for alerts, include [NAVIGATE_ALERTS].',
    ].join(' ');

    try {
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{ text: `${systemInstruction}\nContext: ${contextText}\nUser: ${userText}` }],
          }],
        },
        { timeout: 20000 }
      );
      const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text
        || 'Pasensya na, may problema sa pagsagot ko ngayon.';
      return { text };
    } catch (error) {
      console.error('Gemini gateway error:', error.message);
      throw new functions.https.HttpsError('unavailable', 'AI service temporarily unavailable');
    }
  });
