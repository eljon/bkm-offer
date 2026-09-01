/* Data layer for Offer Maker.
   Uses Cloud Firestore when firebase-config.js is configured (and the
   Firebase SDK loaded); otherwise falls back to on-device IndexedDB so
   the app always works. Both backends expose the same async API:
     put(store, value) · get(store, key) · all(store) · del(store, key) · clear(store)
   Stores: 'products', 'offers', 'settings'.
   Doc id = value.id (products/offers) or value.key (settings). */
const DB = (() => {
  // ---------- IndexedDB backend ----------
  const IDB = (() => {
    const NAME = 'offerMakerDB', VERSION = 1;
    let _db = null;
    function open() {
      return new Promise((resolve, reject) => {
        if (_db) return resolve(_db);
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('offers')) db.createObjectStore('offers', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onerror = () => reject(req.error);
      });
    }
    async function os(store, mode) { return (await open()).transaction(store, mode).objectStore(store); }
    function p(request) { return new Promise((res, rej) => { request.onsuccess = () => res(request.result); request.onerror = () => rej(request.error); }); }
    return {
      kind: 'local',
      async put(s, v) { return p((await os(s, 'readwrite')).put(v)); },
      async get(s, k) { return p((await os(s, 'readonly')).get(k)); },
      async all(s) { return p((await os(s, 'readonly')).getAll()); },
      async del(s, k) { return p((await os(s, 'readwrite')).delete(k)); },
      async clear(s) { return p((await os(s, 'readwrite')).clear()); },
    };
  })();

  // ---------- Firestore backend ----------
  function makeFirestore() {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    const fs = firebase.firestore();
    // Don't throw when a field is undefined (e.g. a product without a description
    // or image) — just omit it, so a single missing field can't fail a write.
    try { fs.settings({ ignoreUndefinedProperties: true }); } catch (e) { /* already started */ }
    const idOf = (v) => v.id || v.key;
    return {
      kind: 'firestore',
      async put(s, v) { await fs.collection(s).doc(String(idOf(v))).set(v); return v; },
      async get(s, k) { const d = await fs.collection(s).doc(String(k)).get(); return d.exists ? d.data() : undefined; },
      async all(s) { const q = await fs.collection(s).get(); return q.docs.map(d => d.data()); },
      async del(s, k) { await fs.collection(s).doc(String(k)).delete(); },
      async clear(s) {
        const q = await fs.collection(s).get();
        const batch = fs.batch();
        q.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      },
    };
  }

  // ---------- Pick backend ----------
  let backend = IDB;
  try {
    if (window.isFirebaseConfigured && window.isFirebaseConfigured()
        && typeof firebase !== 'undefined' && firebase.firestore) {
      backend = makeFirestore();
    }
  } catch (e) {
    console.warn('Firestore init failed — using on-device storage.', e);
    backend = IDB;
  }

  return {
    backend: backend.kind,
    put: (s, v) => backend.put(s, v),
    get: (s, k) => backend.get(s, k),
    all: (s) => backend.all(s),
    del: (s, k) => backend.del(s, k),
    clear: (s) => backend.clear(s),
  };
})();
