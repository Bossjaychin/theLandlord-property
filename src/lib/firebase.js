import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDataConnect, connectDataConnectEmulator } from 'firebase/data-connect';
import { getFirestore, connectFirestoreEmulator, doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { connectorConfig } from './dataconnect';

// Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDjPWeJavziqqWl51GNHq7BMsrX8dXWuLI",
  authDomain: "thelandlord-property.firebaseapp.com",
  projectId: "thelandlord-property",
  storageBucket: "thelandlord-property.firebasestorage.app",
  messagingSenderId: "739114104997",
  appId: "1:739114104997:web:2a1995d42122399a7ef54c",
  measurementId: "G-WW8S7GE8ZC"
};

const app = initializeApp(firebaseConfig);

// App Check — only initialized in browser context
let appCheck = null;
if (typeof window !== 'undefined') {
  // If in local development, enable debug token provider for emulators
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6Ld_w6mzAAAAAMZ7vX_wXkWXjGIi9VfJBtj5MYnB'), // Swap with your production reCAPTCHA Enterprise key
    isTokenAutoRefreshEnabled: true
  });
}

// Initialize Firebase AI (Gemini Developer API)
const ai = getAI(app, { backend: new GoogleAIBackend() });
const aiModel = getGenerativeModel(ai, {
  model: 'gemini-3.5-flash',
  systemInstruction: 'You are "Landlord AI", a friendly Nigerian real estate concierge for The Landlord Property platform in Abuja. You help buyers, sellers, and shortlet guests in English or Pidgin. You specialise in: distress deals, title forensics, AGIS searches, shortlet revenue projection, escrow process, and Abuja districts (Jabi, Guzape, Maitama, Wuse, Lugbe, Katampe, Gwarinpa). Keep answers concise, warm, and actionable. Use ₦ for Naira. Never fabricate specific property details.'
});

// Analytics — only in browser/production context
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Auth — required for @auth(expr: "auth.token.kycVerified == true") to work
const auth = getAuth(app);

// Firestore
const db = getFirestore(app);

// Data Connect
const dataConnect = getDataConnect(connectorConfig);

// Firebase Cloud Messaging (Web Push)
// Only init in browser context (not SSR/service worker)
let messaging = null;
try {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn('[FCM] Messaging init skipped:', e.message);
}

// In local dev, route Auth, Firestore, and Data Connect to their emulators
if (import.meta.env.DEV) {
  console.log('[DEV] Connecting to local Firebase emulators');
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectDataConnectEmulator(dataConnect, 'localhost', 9399);
}

/**
 * Request browser push notification permission.
 * Gets the FCM token and saves it to the user's Firestore document.
 * @param {string} uid - Firebase user UID
 * @returns {Promise<string|null>} The FCM token, or null if unavailable
 */
export async function requestNotificationPermission(uid) {
  if (!messaging || !uid) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Push notification permission denied.');
      return null;
    }

    // VAPID key from Firebase Console → Project Settings → Cloud Messaging
    // Replace with your actual VAPID key for production
    const VAPID_KEY = 'BHT8gVqTd_w6mzEQT3l1F8LCsMriC4b0IVj5rVX8wXkWXjGIi9VfJBtj5MYnBvV4wBfxGGt3RN5wqJlklMwf2lU';

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (token) {
      console.log('[FCM] Got push token:', token.slice(0, 20) + '...');
      // Save token to Firestore user profile
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { fcmToken: token });
        console.log('[FCM] Token saved to Firestore.');
      } catch (err) {
        console.warn('[FCM] Could not save token to Firestore:', err.message);
      }
      return token;
    }
  } catch (err) {
    console.warn('[FCM] Could not get push token:', err.message);
  }
  return null;
}

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(callback) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export { app, auth, analytics, dataConnect, db, messaging, appCheck, ai, aiModel };
