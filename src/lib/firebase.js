import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDataConnect, connectDataConnectEmulator } from 'firebase/data-connect';
import { connectorConfig } from './dataconnect';

// Real Firebase project — thelandlord-property
const firebaseConfig = {
  apiKey: "AIzaSyDjPWeJavziqqWl51GNHq7BMsrX8dXWuLI",
  authDomain: "thelandlord-property.firebaseapp.com",
  projectId: "thelandlord-property",
  storageBucket: "thelandlord-property.firebasestorage.app",
  messagingSenderId: "739114104997",
  appId: "1:739114104997:web:d2bde4aa29fcf6ec7ef54c",
  measurementId: "G-DZK6KJEW2F"
};

const app = initializeApp(firebaseConfig);

// Analytics — only in production (requires window / browser context)
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Auth — required for @auth(expr: "auth.token.kycVerified == true") to work
const auth = getAuth(app);

// Data Connect
const dataConnect = getDataConnect(connectorConfig);

// In local dev, route both Auth and Data Connect to their emulators
if (import.meta.env.DEV) {
  console.log('[DEV] Connecting to local Firebase emulators');
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectDataConnectEmulator(dataConnect, 'localhost', 9399);
}

export { app, auth, analytics, dataConnect };

