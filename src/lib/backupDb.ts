import { BackupRecord } from '../types/backup';

const DB_NAME = 'ApexMR_BackupVault_DB';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB is not supported in this browser environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open backup database.'));
    };
  });
}

export const backupDb = {
  /**
   * Save a backup snapshot to IndexedDB
   */
  async saveBackup(record: BackupRecord): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn('Fallback: IndexedDB write failed, using localStorage cache', err);
      try {
        const key = `mr_backup_cache_${record.id}`;
        localStorage.setItem(key, JSON.stringify(record));
      } catch (localErr) {
        console.error('Failed to store backup in localStorage as well:', localErr);
      }
    }
  },

  /**
   * Fetch all saved backup records, sorted newest first
   */
  async getAllBackups(): Promise<BackupRecord[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const list = (req.result || []) as BackupRecord[];
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn('IndexedDB read failed, checking localStorage cache', err);
      const items: BackupRecord[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('mr_backup_cache_')) {
            const raw = localStorage.getItem(k);
            if (raw) items.push(JSON.parse(raw));
          }
        }
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (e) {
        console.error('Failed parsing localStorage backup fallback', e);
      }
      return items;
    }
  },

  /**
   * Retrieve a single backup by ID
   */
  async getBackupById(id: string): Promise<BackupRecord | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      const raw = localStorage.getItem(`mr_backup_cache_${id}`);
      return raw ? JSON.parse(raw) : null;
    }
  },

  /**
   * Delete a backup by ID
   */
  async deleteBackup(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      localStorage.removeItem(`mr_backup_cache_${id}`);
    }
  },

  /**
   * Prune older backups if count exceeds maxCount
   */
  async pruneOldBackups(maxCount: number = 30): Promise<void> {
    try {
      const all = await this.getAllBackups();
      if (all.length > maxCount) {
        const toDelete = all.slice(maxCount);
        for (const item of toDelete) {
          await this.deleteBackup(item.id);
        }
      }
    } catch (err) {
      console.warn('Prune backups error:', err);
    }
  },
};
