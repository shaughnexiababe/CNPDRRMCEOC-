// Version: 1.0.1 - Firebase Pivot
import { createClient as createRealClient, createAxiosClient } from '../../../sdk/index.js';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// The frontend uses this to initialize the SDK
export const createClient = () => {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
    console.warn("Firebase API Key is missing. The SDK may not function correctly. Check your .env file or Vercel Environment Variables.");
  }

  console.log(`Initializing CN-PDRRMO SDK with Firebase project: ${firebaseConfig.projectId}`);
  return createRealClient({ firebaseConfig });
};

// Export axios client creator for backward compatibility with legacy app checks
export { createAxiosClient };
