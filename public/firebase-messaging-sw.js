// Firebase Cloud Messaging Service Worker
// Handles background push notifications for The Landlord Property app

importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

const APP_URL = 'https://thelandlord-property.web.app';
const CACHE_NAME = 'landlord-shell-v1';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png'];

firebase.initializeApp({
  apiKey: "AIzaSyDjPWeJavziqqWl51GNHq7BMsrX8dXWuLI",
  authDomain: "thelandlord-property.firebaseapp.com",
  projectId: "thelandlord-property",
  storageBucket: "thelandlord-property.firebasestorage.app",
  messagingSenderId: "739114104997",
  appId: "1:739114104997:web:d2bde4aa29fcf6ec7ef54c",
});

const messaging = firebase.messaging();

// ── Offline shell cache ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Serve shell from cache while offline (network-first for everything else)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Only cache-first for same-origin HTML navigation
  if (url.origin === self.location.origin && event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then((r) => r || fetch(event.request))
      )
    );
  }
});

// ── Background FCM messages ──────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background FCM message received:', payload);

  const { title, body, icon } = payload.notification || {};
  const notifTitle = title || '\uD83C\uDFE1 The Landlord Property';
  const notifOptions = {
    body: body || 'You have a new notification.',
    icon: icon || '/icon-192.png',
    badge: '/favicon-32.png',
    tag: 'landlord-property-notif',
    data: { url: APP_URL, ...payload.data },
    actions: [
      { action: 'view', title: '\uD83D\uDCCB View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
  };

  self.registration.showNotification(notifTitle, notifOptions);
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || APP_URL;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
