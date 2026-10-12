import crypto from 'crypto';
import {
  getAdminAuth, getAdminDb, verifyRequester, corsHeaders, readJsonBody, sendError, FieldValue,
} from './_lib/firebase-admin.js';

/**
 * POST /api/invite-staff
 * Admins only. Creates Auth user + Firestore profile, writes audit log, returns password reset link.
 */
export default async function handler(req, res) {
  corsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const caller = await verifyRequester(req, { adminOnly: true });
    const body = await readJsonBody(req);
    const { email: rawEmail, fullName, role, municipality } = body;

    if (!rawEmail || !fullName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const email = String(rawEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!['admin', 'eoc_personnel', 'mdrrmo'].includes(role)) {
      return res.status(400).json({ error: 'Invalid staff role' });
    }
    if (role === 'mdrrmo' && !municipality) {
      return res.status(400).json({ error: 'Municipality is required for MDRRMO role' });
    }

    const assignedMunicipality = role === 'mdrrmo' ? municipality : 'PROVINCIAL_EOC';
    const tempPassword = crypto.randomBytes(16).toString('hex') + 'A1!';

    let userRecord;
    try {
      userRecord = await getAdminAuth().createUser({
        email,
        displayName: fullName.trim(),
        password: tempPassword,
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Email address already registered' });
      }
      console.error('Auth createUser error:', authErr);
      return res.status(400).json({ error: 'Failed to create user account' });
    }

    try {
      await getAdminDb().collection('users').doc(userRecord.uid).set({
        email,
        full_name: fullName.trim(),
        role,
        municipality: assignedMunicipality,
        created_at: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.error('Firestore user set error, rolling back Auth user:', dbErr);
      try { await getAdminAuth().deleteUser(userRecord.uid); } catch (_) { /* best effort */ }
      return res.status(500).json({ error: 'Failed to initialize user profile' });
    }

    const appUrl = process.env.APP_URL || 'https://cnpdrrmceoc.vercel.app';
    const link = await getAdminAuth().generatePasswordResetLink(email, {
      url: `${appUrl}/login`,
    });

    await getAdminDb().collection('audit_logs').add({
      action: 'STAFF_INVITE',
      target_uid: userRecord.uid,
      target_email: email,
      role,
      municipality: assignedMunicipality,
      performed_by: caller.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, inviteLink: link });
  } catch (err) {
    return sendError(res, err);
  }
}
