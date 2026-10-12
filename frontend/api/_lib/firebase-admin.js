import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Shared Firebase Admin singleton for the Vercel API routes.
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
 * Verifies the Firebase ID token from the Authorization: Bearer header with checkRevoked = true.
 * Returns { uid, role, email }. Throws Error with .status on failure.
 */
export async function verifyRequester(req, { staffOnly = false, adminOnly = false } = {}) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    const err = new Error('Missing ID token');
    err.status = 401;
    throw err;
  }
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch (e) {
    const err = new Error('Invalid or revoked ID token');
    err.status = 401;
    throw err;
  }

  const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
  const role = userSnap.exists && userSnap.data().role ? userSnap.data().role : 'citizen';
  const isStaff = role === 'eoc_personnel' || role === 'admin' || role === 'EOC_PERSONNEL' || role === 'ADMIN';

  if (adminOnly && role !== 'admin' && role !== 'ADMIN') {
    const err = new Error('Admin access required');
    err.status = 403;
    throw err;
  }
  if (staffOnly && !isStaff) {
    const err = new Error('Staff access required');
    err.status = 403;
    throw err;
  }
  return { uid: decoded.uid, email: decoded.email || '', role };
}

/** Configurable CORS headers based on ALLOWED_ORIGINS environment variable. */
export function corsHeaders(res, req = null) {
  const allowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const origin = req?.headers?.origin;
  if (allowed.length > 0 && origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowed.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function readJsonBody(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body);
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (parseErr) {
    const err = new Error('Invalid JSON payload');
    err.status = 400;
    throw err;
  }
}

export function sendError(res, err) {
  console.error('[API Error]:', err);
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) {
    res.status(status).json({ error: 'Internal error' });
  } else {
    res.status(status).json({ error: err.message || 'Bad request' });
  }
}
