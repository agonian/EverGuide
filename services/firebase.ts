
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Güvenli erişim için process.env kullanıyoruz (Vite config ile tanımlandı)
// Typescript hatalarını önlemek için 'as any' kullanıyoruz.
const getEnv = () => (process as any).env || {};
const env = getEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Quota Lock Check Logic
const QUOTA_LOCK_KEY = 'evergreen_quota_exceeded_ts';
const QUOTA_LOCK_DURATION = 1000 * 60 * 60 * 24; // 24 Hours

const isQuotaExceeded = () => {
    if (typeof window === 'undefined') return false;
    try {
        const ts = localStorage.getItem(QUOTA_LOCK_KEY);
        if (ts) {
            const diff = Date.now() - parseInt(ts);
            if (diff < QUOTA_LOCK_DURATION) return true;
        }
        return false;
    } catch { return false; }
};

// Config kontrolü: API Key tanımlı mı?
const isConfigured = !!firebaseConfig.apiKey;
const shouldEnable = isConfigured && !isQuotaExceeded();

if (!isConfigured) {
    console.warn("Firebase config is missing. App running in local/offline mode.");
}

export const app = shouldEnable ? initializeApp(firebaseConfig) : null;
export const db = shouldEnable && app ? getFirestore(app) : null;
export const isFirebaseEnabled = shouldEnable;
