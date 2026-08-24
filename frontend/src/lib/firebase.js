import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

// IMPORTANT: never initializeApp() a second time here.
// src/lib/sdk-shim.js owns the Firebase app instance. Re-initializing the
// default app throws "Firebase App named '[DEFAULT]' already exists" and
// white-screens the entire SPA (both modules run at startup because
// StrategicDashboard is imported eagerly). Guard with getApps() so module
// evaluation order no longer matters.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Subscribes to new incidents in real-time.
 * The canonical collection is "incidents" (shared with the Android app),
 * ordered by "created_at". The previous version queried the fields
 * "province"/"timestamp", which do not exist on incident documents, so the
 * query permanently returned zero documents.
 */
export const subscribeToRealtimeIncidents = (onNewIncident) => {
  const q = query(
    collection(db, "incidents"),
    orderBy("created_at", "desc"),
    limit(10)
  );

  // The first snapshot contains historical documents. Only surface
  // documents that arrive AFTER the listener is attached, otherwise the
  // user gets a burst of toast pop-ups for old incidents on page load.
  let isInitialSnapshot = true;

  return onSnapshot(q, (snapshot) => {
    if (isInitialSnapshot) {
      isInitialSnapshot = false;
      return;
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const incident = { id: change.doc.id, ...change.doc.data() };
        onNewIncident(incident);
      }
    });
  });
};
