
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration (Hardcoded)
const firebaseConfig = {
    apiKey: "AIzaSyC0QKRPin4w1PucR_rgeoQUS8_ULIXiEAA",
    authDomain: "evergreenrehber.firebaseapp.com",
    projectId: "evergreenrehber",
    storageBucket: "evergreenrehber.firebasestorage.app",
    messagingSenderId: "573065507920",
    appId: "1:573065507920:web:6984b872b963737be58d55",
    measurementId: "G-NXJ1CYGE57"
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
    console.log("Firebase not configured properly.");
}

export const app = shouldEnable ? initializeApp(firebaseConfig) : null;
export const db = shouldEnable && app ? getFirestore(app) : null;
export const isFirebaseEnabled = shouldEnable;
