/* ============================================================
   Firebase / Cloud Firestore configuration
   ------------------------------------------------------------
   1. Create a project at https://console.firebase.google.com
   2. Add a Web app (</> icon) and copy its config values below.
   3. In the console: Build → Firestore Database → Create database.
   4. Paste the security rules (see firestore.rules / README) into
      Firestore → Rules and Publish.

   Until you fill this in with a real projectId, the app automatically
   falls back to on-device storage (IndexedDB) so it keeps working.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Configured only when projectId has been replaced with a real value.
window.isFirebaseConfigured = function () {
  var c = window.FIREBASE_CONFIG || {};
  return !!c.projectId && c.projectId !== "YOUR_PROJECT_ID";
};
