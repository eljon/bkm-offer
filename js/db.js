/* Lightweight IndexedDB wrapper for Offer Maker */
const DB = (() => {
  const NAME = 'offerMakerDB';
  const VERSION = 1;
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offers')) {
          db.createObjectStore('offers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(store, mode) {
    const db = await open();
    return db.transaction(store, mode).objectStore(store);
  }

  function reqP(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async put(store, value) { return reqP((await tx(store, 'readwrite')).put(value)); },
    async get(store, key) { return reqP((await tx(store, 'readonly')).get(key)); },
    async all(store) { return reqP((await tx(store, 'readonly')).getAll()); },
    async del(store, key) { return reqP((await tx(store, 'readwrite')).delete(key)); },
    async clear(store) { return reqP((await tx(store, 'readwrite')).clear()); },
  };
})();
