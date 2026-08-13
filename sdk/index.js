import { initializeApp } from 'firebase/app';
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
  serverTimestamp
} from 'firebase/firestore';
import axios from 'axios';

/**
 * Legacy Axios client creator for backward compatibility with
 * certain app-level checks (e.g. public settings)
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

export const createClient = ({ firebaseConfig }) => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const getEntityCollection = (name) => {
    // Map common entity names to Firestore collection names
    const mapping = {
      'User': 'users',
      'Facility': 'facilities',
      'Unit': 'units',
      'Incident': 'incidents',
      'Assignment': 'assignments',
      'HazardAlert': 'hazard_alerts',
      'CheckIn': 'checkins'
    };
    return mapping[name] || name.toLowerCase() + 's';
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
            // New filter-based API: filtersOrOrder = [{ field, op, value }]
            filtersOrOrder.forEach(f => {
              q = query(q, where(f.field, f.op || '==', f.value));
            });
          } else if (typeof filtersOrOrder === 'string') {
            // Legacy order/limit API
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
          if (entityName !== 'Incident') throw new Error('Dispatch only available for Incidents');

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

            // Update Unit status
            transaction.update(unitRef, { status: 'dispatched', updated_at: serverTimestamp() });

            // Update Incident status
            transaction.update(incidentRef, { status: 'dispatched', updated_at: serverTimestamp() });

            // Create Assignment
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

            return { id: assignmentRef.id, ...assignmentData };
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
        const { email, password, full_name, ...rest } = data;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
          email,
          full_name,
          role: 'citizen',
          created_at: serverTimestamp(),
          ...rest
        };

        await setDoc(doc(db, 'users', user.uid), userData);
        return { id: user.uid, ...userData };
      },
      logout: async (url) => {
        await signOut(auth);
        if (url) window.location.href = url; else window.location.reload();
      }
    },
    entities: new Proxy({}, entityHandler)
  };
};
