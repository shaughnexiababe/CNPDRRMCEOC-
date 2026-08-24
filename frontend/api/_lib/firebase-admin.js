import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Shared Firebase Admin singleton for the Vercel API routes.
 *
 * Required env var (Vercel → Project Settings → Environment Variables):
 *   FIREBASE_SERVICE_ACCOUNT_JSON — the full service-account key JSON,
 *   pasted as a ONE-LINE string. Generate it at:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key.
 */
let _app = null;

export function getAdminApp() {
  if (_app) return _app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  }
  const serviceAccount = JSON.parse(raw);
  _app = getApps().length ? getApp() : initializeApp({
    credential: cert(serviceAccount),
  });
  return _app;
}

export function getAdminDb() { return getFirestore(getAdminApp()); }
export function getAdminAuth() { return getAuth(getAdminApp()); }
export function getAdminMessaging() { return getMessaging(getAdminApp()); }
export { FieldValue, Timestamp };

/**
 * Verifies the Firebase ID token from the Authorization: Bearer header.
 * Returns { uid, role, email }. Throws Error with .status on failure.
 */
export async function verifyRequester(req, { staffOnly = false, adminOnly = false } = {}) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    const err = new Error('Missing ID token');
    err.status = 401;
    throw err;
  }
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (e) {
    const err = new Error('Invalid ID token');
    err.status = 401;
    throw err;
  }

  const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
  const role = userSnap.exists && userSnap.data().role ? userSnap.data().role : 'citizen';
  const isStaff = role === 'eoc_personnel' || role === 'admin';

  if (adminOnly && role !== 'admin') {
    const err = new Error('Admin only');
    err.status = 403;
    throw err;
  }
  if (staffOnly && !isStaff) {
    const err = new Error('Staff only');
    err.status = 403;
    throw err;
  }
  return { uid: decoded.uid, email: decoded.email || '', role };
}

/** Minimal CORS/CORB friendliness for cross-origin callers (Android app). */
export function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function sendError(res, err) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal error' });
}
