const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

/**
 * Invites a staff member (EOC Personnel or Admin).
 * Creates an Auth user and a Firestore user document with the assigned role.
 * Returns a password reset link for the admin to share.
 */
exports.inviteStaff = functions.https.onCall(async (data, context) => {
  // 1. Verify caller is an Admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const callerDoc = await db.collection('users').document(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can invite staff');
  }

  const { email, fullName, role } = data;
  if (!email || !fullName || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  if (!['admin', 'eoc_personnel'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid staff role');
  }

  try {
    // 2. Create Auth User
    const userRecord = await admin.auth().createUser({
      email: email,
      displayName: fullName,
      password: Math.random().toString(36).slice(-10), // Random temp password
    });

    // 3. Create Firestore User Doc
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      full_name: fullName,
      role: role,
      municipality: 'PROVINCIAL_EOC',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Generate Password Reset Link
    const actionCodeSettings = {
      url: 'https://cnpdrrmceoc.vercel.app/login',
    };
    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // 5. Audit Log
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
exports.onHazardAlertCreated = functions.firestore
  .document('hazard_alerts/{alertId}')
  .onCreate(async (snapshot, context) => {
    const alert = snapshot.data();
    const muni = alert.affected_municipality;

    // Slugify municipality name for topic: "Jose Panganiban" -> "jose_panganiban"
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
        type: alert.type,
        severity: alert.severity,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Legacy but still useful for some SDKs
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
