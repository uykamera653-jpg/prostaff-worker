// env.js — PROSTAFF (PROD)

// Bu obyektni app.js ichida import qilamiz: window.__ENV__
window.__ENV__ = {
  env: "prod",

  // Firebase Web config (PROD)
  apiKey: "AIzaSyBUOLvqsw7SS0qL8fjLRRelpey65otHhsg",
  authDomain: "prostaff-prod.firebaseapp.com",
  projectId: "prostaff-prod",
  storageBucket: "prostaff-prod.firebasestorage.app",
  messagingSenderId: "468406236145",
  appId: "1:468406236145:web:ecfebea79ac0077b704a50",
  measurementId: "G-MQPQLKGJB3",

  // Web Push (FCM) VAPID public key — PROD
  vapidKey: "BGjiRHadFPFMmOZDa1g-GI609vAyDapiMvUN9JEsz4qN_nNGbnVePivaGHWBesydr4wPpx4v69roZMozH2RrPdk",
};
