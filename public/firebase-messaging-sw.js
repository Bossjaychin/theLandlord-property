// Firebase Cloud Messaging Service Worker
// Handles background push notifications for The Landlord Property app

importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDjPWeJavziqqWl51GNHq7BMsrX8dXWuLI",
  authDomain: "thelandlord-property.firebaseapp.com",
  projectId: "thelandlord-property",
  storageBucket: "thelandlord-property.firebasestorage.app",
  messagingSenderId: "739114104997",
  appId: "1:739114104997:web:d2bde4aa29fcf6ec7ef54c",
});

const messaging = firebase.messaging();

// Handle background messages — shown when app is not in foreground
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background FCM message received:', payload);

  const { title, body, icon } = payload.notification || {};
  const notifTitle = title || '🏡 The Landlord Property';
  const notifOptions = {
    body: body || 'You have a new notification.',
    icon: icon || '/logo_mark.png',
    badge: '/logo_mark.png',
    tag: 'landlord-property-notif',
    data: payload.data || {},
    actions: [
      { action: 'view', title: '📋 View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
  };

  self.registration.showNotification(notifTitle, notifOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('https://thelandlordproperty.com/dashboard')
    );
  }
});
