// CN-PDRRMO App SDK — Firebase-backed client (self-contained).
// This module must NOT import from ../../sdk/index.js: that folder is outside
// the frontend's node_modules tree, so Rollup cannot resolve `firebase`/`axios`
// from it during `vite build`. Keep this file self-contained and in sync with
// /sdk/index.js (the publishable reference copy).
//
// Version: 1.2.0 - Free-route: photos compress to inline base64 (no Cloud Storage needed)
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import axios from 'axios';

// Firebase configuration from environment variables.
// Copy .env.example to .env (local) or set these in Vercel Environment Variables.
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || "").trim()
};

/**
 * Legacy Axios client creator kept for backward compatibility.
 */
export const createAxiosClient = ({ baseURL, headers, token }) => {
  const instance = axios.create({
    baseURL,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  instance.interceptors.response.use(
    response => response.data,
    error => Promise.reject(error.response || error)
  );

  return instance;
};

export const createClient = ({ firebaseConfig } = {}) => {
  // Reuse an already-initialized default app if present. Importing both this
  // module and src/lib/firebase.js previously each called initializeApp(),
  // which throws "Firebase App named '[DEFAULT]' already exists".
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const getEntityCollection = (name) => {
    // Map entity names to Firestore collection names.
    // Must stay in sync with the Android app's collection names.
    const mapping = {
      'User': 'users',
      'Facility': 'facilities',
      'Unit': 'units',
      'Incident': 'incidents',
      // Legacy alias: older pages used "IncidentReport". The canonical
      // collection (shared with Android) is "incidents".
      'IncidentReport': 'incidents',
      'Assignment': 'assignments',
      'HazardAlert': 'hazard_alerts',
      'HazardLayer': 'hazard_layers',
      'BarangayAssessment': 'barangay_assessments',
      'ShiftNote': 'shift_notes',
      'CheckIn': 'checkins',
      'AuditLog': 'audit_logs'
    };
    // Fallback: PascalCase/camelCase -> snake_case plural
    return mapping[name] || name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() + 's';
  };

  const entityHandler = {
    get: (target, entityName) => {
      const collectionName = getEntityCollection(entityName);
      const colRef = collection(db, collectionName);

      return {
        /**
         * List items from Firestore
         * Supports both array-based filters and legacy order/limit args
         */
        list: async (filtersOrOrder, limitVal) => {
          let q = query(colRef);

          if (Array.isArray(filtersOrOrder)) {
            // Filter-based API: filtersOrOrder = [{ field, op, value }]
            filtersOrOrder.forEach(f => {
              q = query(q, where(f.field, f.op || '==', f.value));
            });
          } else if (typeof filtersOrOrder === 'string') {
            // Legacy order/limit API: '-created_at' = descending
            const orderField = filtersOrOrder.startsWith('-') ? filtersOrOrder.substring(1) : filtersOrOrder;
            const direction = filtersOrOrder.startsWith('-') ? 'desc' : 'asc';
            q = query(q, orderBy(orderField, direction));
          }

          if (limitVal) {
            q = query(q, limit(limitVal));
          }

          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        get: async (id) => {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        },
        create: async (data) => {
          const docRef = await addDoc(colRef, {
            ...data,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          return { id: docRef.id, ...data };
        },
        /**
         * Batch create (e.g. bulk GeoJSON facility import).
         * Firestore hard limit is 500 writes per batch.
         */
        createMany: async (dataArray) => {
          if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
          const results = [];
          const CHUNK = 450;
          for (let i = 0; i < dataArray.length; i += CHUNK) {
            const batch = writeBatch(db);
            const chunk = dataArray.slice(i, i + CHUNK);
            chunk.forEach(item => {
              const ref = doc(colRef);
              batch.set(ref, {
                ...item,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
              });
              results.push({ id: ref.id, ...item });
            });
            await batch.commit();
          }
          return results;
        },
        update: async (id, data) => {
          const docRef = doc(db, collectionName, id);
          await updateDoc(docRef, {
            ...data,
            updated_at: serverTimestamp()
          });
          return { id, ...data };
        },
        delete: async (id) => {
          const docRef = doc(db, collectionName, id);
          await deleteDoc(docRef);
          return { id };
        },
        // Specialized Dispatch Action
        dispatch: async (incidentId, { unitId, etaMinutes, notes }) => {
          if (entityName !== 'Incident' && entityName !== 'IncidentReport') {
            throw new Error('Dispatch only available for Incidents');
          }

          const currentUser = auth.currentUser;
          if (!currentUser) throw new Error("Authentication required for dispatch");

          return await runTransaction(db, async (transaction) => {
            const unitRef = doc(db, 'units', unitId);
            const incidentRef = doc(db, 'incidents', incidentId);
            const assignmentRef = doc(collection(db, 'assignments'));

            const unitSnap = await transaction.get(unitRef);
            if (!unitSnap.exists()) throw new Error("Unit not found");
            if (unitSnap.data().status !== 'available') {
              throw new Error(`Unit is ${unitSnap.data().status} and cannot be dispatched.`);
            }

            transaction.update(unitRef, { status: 'dispatched', updated_at: serverTimestamp() });
            transaction.update(incidentRef, { status: 'dispatched', updated_at: serverTimestamp() });

            const assignmentData = {
              incident_id: incidentId,
              unit_id: unitId,
              dispatcher_id: currentUser.uid,
              status: 'assigned',
              eta_minutes: etaMinutes,
              notes: notes || '',
              assigned_at: serverTimestamp()
            };
            transaction.set(assignmentRef, assignmentData);

            return { id: assignmentRef.id };
          });
        }
      };
    }
  };

  return {
    auth: {
      me: async () => {
        return new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              resolve(userDoc.exists() ? { id: user.uid, ...userDoc.data() } : { id: user.uid, email: user.email });
            } else {
              resolve(null);
            }
          });
        });
      },
      login: async (email, password) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        return {
          user: userDoc.exists() ? { id: user.uid, ...userDoc.data() } : { id: user.uid, email: user.email },
          token: await user.getIdToken()
        };
      },
      register: async (data) => {
        const { email, password, full_name, name, ...rest } = data;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
          email,
          full_name: full_name || name || '',
          role: 'citizen',
          created_at: serverTimestamp(),
          ...rest
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userData);
        } catch (e) {
          // Roll back the orphaned Auth account so the email can be reused.
          try { await user.delete(); } catch (cleanupErr) { /* best effort */ }
          throw e;
        }
        return { id: user.uid, ...userData };
      },
      logout: async (url) => {
        await signOut(auth);
        if (url) window.location.href = url; else window.location.reload();
      }
    },
    entities: new Proxy({}, entityHandler),

    /**
     * Compress an image and return it as an inline data URL
     * ("data:image/jpeg;base64,...").
     *
     * Free-route storage strategy: Cloud Storage for Firebase requires the
     * Blaze plan, so incident photos live INSIDE the Firestore document
     * (photo_urls[]). Data URLs also work with plain <img src> tags — no
     * special decoding needed anywhere (web or Android).
     *
     * Sizing: max dimension 1024px, JPEG ~0.7 quality. A typical result is
     * 80–180KB, so two photos stay well below Firestore's 1MiB doc limit.
     */
    uploadFile: async (file, folder = 'uploads') => {
      if (!file.type.startsWith('image/')) {
        // Non-image payloads (GeoJSON/KML layers): embed small files inline
        // as data URLs; the DataLayers page knows how to decode them.
        if (file.size > 700 * 1024) {
          throw new Error('File too large to store inline (max 700KB). Bundle large datasets as app assets instead (see DATA_GUIDE.md).');
        }
        const file_url = await readFileAsDataURL(file);
        return { file_url };
      }
      const file_url = await compressImageToDataURL(file, 1024, 0.7);
      if (file_url.length > 400_000) {
        throw new Error('Compressed image is still too large (>300KB). Please crop or downscale it.');
      }
      return { file_url };
    },

    // Direct handle for code that needs the live Firestore instance
    // (e.g. real-time onSnapshot listeners in lib/firebase.js)
    _db: db
  };
};

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImageToDataURL(file, maxDim, quality) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

// The frontend uses this to initialize the SDK.
export const createAppClient = () => {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
    console.warn("Firebase API Key is missing. Check your .env file or Vercel Environment Variables.");
  }
  return createClient({ firebaseConfig });
};
