
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ÖNEMLİ: Kendi Firebase projenizin ayarlarını buraya girin.
// https://console.firebase.google.com/ adresinden yeni proje oluşturup "Web App" ekleyerek bu bilgileri alabilirsiniz.
// Eğer bu alanlar boş bırakılırsa, uygulama "Yerel Depolama (Mock)" modunda çalışır.

const firebaseConfig = {
  apiKey: "AIzaSyC0QKRPin4w1PucR_rgeoQUS8_ULIXiEAA",
  authDomain: "evergreenrehber.firebaseapp.com",
  projectId: "evergreenrehber",
  storageBucket: "evergreenrehber.firebasestorage.app",
  messagingSenderId: "573065507920",
  appId: "1:573065507920:web:ee5a4096ee6f1e0fe58d55",
  measurementId: "G-SK76XFL81D"
};

// Quota Lock Check Logic (Duplicated from db.ts to prevent circular deps and init early)
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

// Check if config is filled AND quota is not exceeded
const isConfigured = firebaseConfig.apiKey !== "";
const shouldEnable = isConfigured && !isQuotaExceeded();

export const app = shouldEnable ? initializeApp(firebaseConfig) : null;
export const db = shouldEnable && app ? getFirestore(app) : null;
export const isFirebaseEnabled = shouldEnable;
