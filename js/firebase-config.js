// Firebase SDK — Modular API (v9+)
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Firebase configuration using environment variables from Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase app instance
const app = initializeApp(firebaseConfig);

// Initialize services using Modular SDK functions
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
let analytics = null;

// Optional: connect to local emulators when developing locally.
// Detection supports hostname localhost / 127.0.0.1, a localStorage override, or Vite env flag `VITE_USE_EMULATOR=true`.
try {
    const isBrowser = (typeof window !== 'undefined' && typeof window.location !== 'undefined');
    const host = isBrowser ? window.location.hostname : null;
    const envFlag = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_EMULATOR);
    const appCheckSiteKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPCHECK_SITE_KEY) || '';
    const appCheckDebug = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPCHECK_DEBUG === 'true');
    const localOverride = isBrowser ? localStorage.getItem('useEmulator') : null;
    const localForceOn = localOverride === 'true';
    const localForceOff = localOverride === 'false';
    const hostnameMatch = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    
    // 預設如果是在 localhost 或是 env 設定 true 就開啟 Emulator
    let useEmulator = isBrowser && (hostnameMatch || envFlag === 'true');
    if (localForceOn) useEmulator = true;
    if (localForceOff) useEmulator = false;
    
    // 但是如果 .env 裡面明確寫了 false，就強制連上雲端，無視 localhost
    if (!localForceOn && !localForceOff && envFlag === 'false') {
        useEmulator = false;
    }

    if (isBrowser && appCheckSiteKey) {
        if (appCheckDebug && typeof self !== 'undefined') {
            self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        try {
            initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(appCheckSiteKey),
                isTokenAutoRefreshEnabled: true
            });
            console.info('[firebase-config] app check enabled');
        } catch (err) {
            console.warn('[firebase-config] app check init skipped:', err && err.message ? err.message : err);
        }
    } else if (isBrowser) {
        console.info('[firebase-config] app check not configured');
    }

    if (useEmulator) {
        // Firestore emulator port 8081, Auth emulator port 9099 (matches firebase.json)
        connectFirestoreEmulator(db, '127.0.0.1', 8081);
        connectAuthEmulator(auth, 'http://127.0.0.1:9099');
        // Keep local emulator logs clean and avoid invalid API-key analytics calls.
        analytics = null;
        console.info('[firebase-config] connected to local emulators (firestore@8081, auth@9099)');
    } else {
        isSupported()
            .then((supported) => {
                if (supported) analytics = getAnalytics(app);
            })
            .catch((err) => {
                console.warn('[firebase-config] analytics init skipped:', err && err.message ? err.message : err);
            });
        console.info('[firebase-config] not connecting to emulators', { host, envFlag, localOverride });
    }
} catch (e) {
    console.warn('[firebase-config] emulator connect skipped:', e && e.message ? e.message : e);
}

export { app, db, auth, storage, analytics };
