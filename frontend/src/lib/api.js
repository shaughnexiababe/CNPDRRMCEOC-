import { getAuth } from 'firebase/auth';

/**
 * Client helper for the Vercel API routes in /api (the free-route
 * replacement for Firebase Cloud Functions).
 *
 * All routes require a Firebase ID token in the Authorization header; this
 * helper attaches it transparently.
 */
async function getIdToken() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  return user.getIdToken();
}

export async function apiPost(path, body) {
  const token = await getIdToken();
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || `Request failed (${resp.status})`);
  }
  return data;
}

/**
 * Fire-and-forget notification helper. Never throws, never blocks the UI —
 * notifications are best-effort because Firestore listeners remain the
 * primary channel for in-app awareness.
 */
export function notifyBestEffort(path, body) {
  try {
    return apiPost(path, body).catch((err) => console.warn(`notify ${path} failed:`, err));
  } catch (err) {
    console.warn(`notify ${path} failed:`, err);
    return Promise.resolve();
  }
}
