const DB_NAME = "segundo-cerebro-db";
const DB_VERSION = 1;
const META_STORE = "meta";
const RECORDS_STORE = "records";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }

      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, work) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let result;

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    Promise.resolve(work(store))
      .then(value => {
        result = value;
      })
      .catch(error => {
        db.close();
        reject(error);
      });
  });
}

export function getMeta(key) {
  return withStore(META_STORE, "readonly", store => requestToPromise(store.get(key)));
}

export function setMeta(key, value) {
  return withStore(META_STORE, "readwrite", store => requestToPromise(store.put(value, key)));
}

export function getRecord(key) {
  return withStore(RECORDS_STORE, "readonly", store => requestToPromise(store.get(key)));
}

export function setRecord(key, value) {
  return withStore(RECORDS_STORE, "readwrite", store => requestToPromise(store.put(value, key)));
}

export function deleteRecord(key) {
  return withStore(RECORDS_STORE, "readwrite", store => requestToPromise(store.delete(key)));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
