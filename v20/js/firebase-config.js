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
  apiKey: "AIzaSyDGtNKfV2HGKqKX5ymdOu6WfmsnVP_sBAY",
  authDomain: "bkm-offers.firebaseapp.com",
  projectId: "bkm-offers",
  storageBucket: "bkm-offers.firebasestorage.app",
  messagingSenderId: "448979566657",
  appId: "1:448979566657:web:2f4e70d35ac5413ae346c0",
};

// Configured only when projectId has been replaced with a real value.
window.isFirebaseConfigured = function () {
  var c = window.FIREBASE_CONFIG || {};
  return !!c.projectId && c.projectId !== "YOUR_PROJECT_ID";
};
