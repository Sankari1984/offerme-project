// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDnmeJiICl_j7UJ0d1xfKsA7KmizVe_QxA",
  authDomain: "offer-me-c0c4b.firebaseapp.com",
  projectId: "offer-me-c0c4b",
  storageBucket: "offer-me-c0c4b.firebasestorage.app",
  messagingSenderId: "413164622012",
  appId: "1:413164622012:web:91cd8b7c24e9a0353100b9",
  measurementId: "G-N37ZR1W8GD"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] 📩 رسالة خلفية:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/static/icons/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
