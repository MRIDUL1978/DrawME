import type { AnnotationDocument, ToolState } from '../shared/types';

const DB_NAME = 'drawme';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'urlDigest' });
      if (!db.objectStoreNames.contains('corrupt')) db.createObjectStore('corrupt', { autoIncrement: true });
      if (!db.objectStoreNames.contains('preferences')) db.createObjectStore('preferences');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export const database = {
  getDocument: (digest: string) => transact<AnnotationDocument | undefined>('documents', 'readonly', (store) => store.get(digest)),
  putDocument: (document: AnnotationDocument) => transact<IDBValidKey>('documents', 'readwrite', (store) => store.put(document)),
  deleteDocument: (digest: string) => transact<undefined>('documents', 'readwrite', (store) => store.delete(digest)),
  preserveCorrupt: (value: unknown) => transact<IDBValidKey>('corrupt', 'readwrite', (store) => store.add({ value, preservedAt: Date.now() })),
  getPreferences: () => transact<ToolState | undefined>('preferences', 'readonly', (store) => store.get('tool-state')),
  putPreferences: (preferences: ToolState) => transact<IDBValidKey>('preferences', 'readwrite', (store) => store.put(preferences, 'tool-state')),
};

