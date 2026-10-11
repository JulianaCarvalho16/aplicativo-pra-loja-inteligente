import { Product, Sale, CashSession, User, OnlineOrder, CloudBackupSnapshot } from '../types';

const DB_NAME = 'PDV_PRO_OFFLINE_DB';
const DB_VERSION = 2;

export interface OfflineSaleItem extends Sale {
  pendingSync: boolean;
  syncAttempts?: number;
  lastSyncError?: string;
}

// IndexedDB Helper with LocalStorage fallback
class LocalDB {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('products')) {
            db.createObjectStore('products', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sales_queue')) {
            db.createObjectStore('sales_queue', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('synced_sales')) {
            db.createObjectStore('synced_sales', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('cash_session')) {
            db.createObjectStore('cash_session', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('online_orders')) {
            db.createObjectStore('online_orders', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB failed to open, using LocalStorage fallback');
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  // Fallback storage helpers
  private getFallback<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`pdv_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setFallback(key: string, value: unknown) {
    try {
      localStorage.setItem(`pdv_${key}`, JSON.stringify(value));
    } catch {
      // quota exceeded or storage disabled
    }
  }

  // Products Cache
  async getProducts(): Promise<Product[]> {
    const db = await this.dbPromise;
    if (!db) return this.getFallback<Product[]>('products', []);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.getFallback<Product[]>('products', []));
      } catch {
        resolve(this.getFallback<Product[]>('products', []));
      }
    });
  }

  async saveProducts(products: Product[]): Promise<void> {
    this.setFallback('products', products);
    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        store.clear();
        products.forEach((p) => store.put(p));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Deduct local stock for offline continuity
  async deductLocalStock(items: { productId: string; quantity: number }[]): Promise<Product[]> {
    const products = await this.getProducts();
    const updated = products.map((prod) => {
      const soldItem = items.find((i) => i.productId === prod.id);
      if (soldItem && prod.type === 'product') {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - soldItem.quantity),
        };
      }
      return prod;
    });

    await this.saveProducts(updated);
    return updated;
  }

  // Offline Sales Queue
  async getOfflineQueue(): Promise<OfflineSaleItem[]> {
    const db = await this.dbPromise;
    if (!db) return this.getFallback<OfflineSaleItem[]>('sales_queue', []);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('sales_queue', 'readonly');
        const store = tx.objectStore('sales_queue');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.getFallback<OfflineSaleItem[]>('sales_queue', []));
      } catch {
        resolve(this.getFallback<OfflineSaleItem[]>('sales_queue', []));
      }
    });
  }

  async enqueueSale(sale: Sale): Promise<void> {
    const offlineItem: OfflineSaleItem = {
      ...sale,
      pendingSync: true,
      syncAttempts: 0,
    };

    // Save fallback
    const currentQueue = this.getFallback<OfflineSaleItem[]>('sales_queue', []);
    currentQueue.push(offlineItem);
    this.setFallback('sales_queue', currentQueue);

    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('sales_queue', 'readwrite');
        const store = tx.objectStore('sales_queue');
        store.put(offlineItem);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async removeSalesFromQueue(saleIds: string[]): Promise<void> {
    // Remove from fallback
    const currentQueue = this.getFallback<OfflineSaleItem[]>('sales_queue', []);
    const filtered = currentQueue.filter((s) => !saleIds.includes(s.id));
    this.setFallback('sales_queue', filtered);

    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(['sales_queue', 'synced_sales'], 'readwrite');
        const queueStore = tx.objectStore('sales_queue');
        const syncedStore = tx.objectStore('synced_sales');

        saleIds.forEach((id) => {
          queueStore.delete(id);
          // Mark as synced locally
          const item = currentQueue.find((s) => s.id === id);
          if (item) {
            syncedStore.put({ ...item, pendingSync: false, syncedOffline: true });
          }
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Online Orders cache
  async getOnlineOrders(): Promise<OnlineOrder[]> {
    const db = await this.dbPromise;
    if (!db) return this.getFallback<OnlineOrder[]>('online_orders', []);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('online_orders', 'readonly');
        const store = tx.objectStore('online_orders');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.getFallback<OnlineOrder[]>('online_orders', []));
      } catch {
        resolve(this.getFallback<OnlineOrder[]>('online_orders', []));
      }
    });
  }

  async saveOnlineOrders(orders: OnlineOrder[]): Promise<void> {
    this.setFallback('online_orders', orders);
    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('online_orders', 'readwrite');
        const store = tx.objectStore('online_orders');
        store.clear();
        orders.forEach((o) => store.put(o));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Local Complete Backup Snapshot
  saveLocalBackup(snapshot: CloudBackupSnapshot): void {
    this.setFallback('cloud_backup_snapshot', snapshot);
    this.setFallback('last_backup_timestamp', snapshot.timestamp);
  }

  getLocalBackup(): CloudBackupSnapshot | null {
    return this.getFallback<CloudBackupSnapshot | null>('cloud_backup_snapshot', null);
  }

  getLastBackupTimestamp(): string | null {
    return this.getFallback<string | null>('last_backup_timestamp', null);
  }

  // Active User session in local storage
  getCurrentUser(): User | null {
    return this.getFallback<User | null>('current_user', null);
  }

  setCurrentUser(user: User | null): void {
    this.setFallback('current_user', user);
  }

  // Active Cash Session in local storage
  getCashSession(): CashSession | null {
    return this.getFallback<CashSession | null>('cash_session', null);
  }

  setCashSession(session: CashSession | null): void {
    this.setFallback('cash_session', session);
  }
}

export const localDB = new LocalDB();

