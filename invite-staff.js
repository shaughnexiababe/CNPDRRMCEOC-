import {
  getAdminAuth, getAdminDb, verifyRequester, corsHeaders, readJsonBody, sendError, FieldValue,
} from './_lib/firebase-admin.js';

const MUNICIPALITIES = [
  'Basud', 'Capalonga', 'Daet', 'Jose Panganiban', 'Labo', 'Mercedes',
  'Paracale', 'San Lorenzo Ruiz', 'San Vicente', 'Santa Elena', 'Talisay', 'Vinzons',
];

/**
 * POST /api/invite-staff
 * Port of the inviteStaff Cloud Function (free-route version).
 * Admins only. Creates an Auth user + Firestore profile, returns a
 * password-reset link to share with the invitee.
 */
export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const caller = await verifyRequester(req, { adminOnly: true });
    const body = await readJsonBody(req);
    const { email, fullName, role, municipality } = body;

    if (!email || !fullName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!['admin', 'eoc_personnel', 'mdrrmo'].includes(role)) {
      return res.status(400).json({ error: 'Invalid staff role' });
    }
    // MDRRMO accounts are scoped to exactly one municipality (enforced by Firestore rules).
    if (role === 'mdrrmo' && !MUNICIPALITIES.includes(municipality)) {
      return res.status(400).json({ error: 'A valid municipality is required for MDRRMO accounts' });
    }
    const assignedMunicipality = role === 'mdrrmo' ? municipality : 'PROVINCIAL_EOC';

    const userRecord = await getAdminAuth().createUser({
      email,
      displayName: fullName,
      password: Math.random().toString(36).slice(-10) + 'A1!',
    });

    await getAdminDb().collection('users').doc(userRecord.uid).set({
      email,
      full_name: fullName,
      role,
      municipality: assignedMunicipality,
      created_at: FieldValue.serverTimestamp(),
    });

    const link = await getAdminAuth().generatePasswordResetLink(email, {
      url: 'https://cnpdrrmceoc.vercel.app/login',
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
