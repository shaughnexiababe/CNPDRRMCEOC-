import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { cnpdrrmceoc } from "@/lib/cnpdrrmceoc";

// The SDK shim owns the single Firebase app + Firestore instance (with the
// offline cache enabled). Re-use it here instead of initialising Firebase a
// second time, so module load order can never matter.
export const db = cnpdrrmceoc._db;

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
