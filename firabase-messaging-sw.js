/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

const cfg = self.__ENV || {
  apiKey: "<same-as-env.js>",
  authDomain: "<same>",
  projectId: "<same>",
  storageBucket: "<same>",
  messagingSenderId: "<same>",
  appId: "<same>"
};
firebase.initializeApp(cfg);
const messaging = firebase.messaging();

// background push
messaging.onBackgroundMessage(({notification})=>{
  self.registration.showNotification(notification?.title||'Prostaff', {
    body: notification?.body || '',
    icon: notification?.icon || undefined,
  });
});
