import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";

// Firebase configuration using environment variables for security
// These should be set in .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-messaging-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Subscribes to new incidents in real-time.
 * Filters for Camarines Norte province by default.
 */
export const subscribeToRealtimeIncidents = (onNewIncident) => {
  // Query to listen for new incidents
  // We order by timestamp to get the latest ones
  const q = query(
    collection(db, "incidents"),
    where("province", "==", "Camarines Norte"),
    orderBy("timestamp", "desc"),
    limit(5)
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      // Only trigger for newly added documents to avoid pop-ups for historical data on first load
      // We check if it's not from the initial load using metadata.hasPendingWrites or
      // by comparing timestamps if needed.
      // For a "pop-up" behavior, we usually only want items added AFTER the listener is attached.
      if (change.type === "added" && !snapshot.metadata.fromCache) {
        const incident = { id: change.doc.id, ...change.doc.data() };
        onNewIncident(incident);
      }
    });
  });
};
