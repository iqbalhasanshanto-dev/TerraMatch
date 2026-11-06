// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Check if valid Firebase configuration is provided via environment variables
const isConfigured = Boolean(
  import.meta.env.VITE_apiKey && import.meta.env.VITE_apiKey.trim() !== ""
);

// Safe fallback default values for Firebase configuration
// Prevents initializeApp from throwing an unhandled error when .env is unpopulated
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_apiKey && import.meta.env.VITE_apiKey.trim()) || "mock-api-key",
  authDomain: (import.meta.env.VITE_authDomain && import.meta.env.VITE_authDomain.trim()) || "terramatch.firebaseapp.com",
  projectId: (import.meta.env.VITE_projectId && import.meta.env.VITE_projectId.trim()) || "terramatch-default",
  storageBucket: (import.meta.env.VITE_storageBucket && import.meta.env.VITE_storageBucket.trim()) || "terramatch-default.appspot.com",
  messagingSenderId: (import.meta.env.VITE_messagingSenderId && import.meta.env.VITE_messagingSenderId.trim()) || "123456789012",
  appId: (import.meta.env.VITE_appId && import.meta.env.VITE_appId.trim()) || "1:123456789012:web:terramatch123"
};

// Safe fallback auth object so the entire React tree mounts cleanly
const fallbackAuth = {
  currentUser: null,
  isFallback: true,
  app: null,
  onAuthStateChanged: (callback) => {
    if (typeof callback === "function") {
      callback(null);
    }
    return () => {};
  },
  signOut: () => Promise.resolve(),
};

let app = null;
let authInstance;

try {
  // Initialize or reuse existing Firebase app
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  if (isConfigured) {
    authInstance = getAuth(app);
  } else {
    // If environment variables are unpopulated, export the safe fallback auth object
    authInstance = fallbackAuth;
  }
} catch (error) {
  console.warn("Firebase initialization failed, using safe fallback auth object:", error);
  authInstance = fallbackAuth;
}

export const auth = authInstance || fallbackAuth;
export { app };
export default app;
