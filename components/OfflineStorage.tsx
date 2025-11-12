import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface OfflineStorageContextType {
  isOnline: boolean;
  isStorageReady: boolean;
  saveProcessedImage: (imageData: ProcessedImageData) => Promise<void>;
  getProcessedImages: () => Promise<ProcessedImageData[]>;
  deleteProcessedImage: (id: string) => Promise<void>;
  saveOfflineAction: (action: OfflineAction) => Promise<void>;
  getOfflineActions: () => Promise<OfflineAction[]>;
  clearOfflineActions: () => Promise<void>;
  syncOfflineActions: () => Promise<void>;
}

interface ProcessedImageData {
  id: string;
  dataUrl: string;
  size: any;
  timestamp: number;
  metadata?: any;
}

interface OfflineAction {
  id: string;
  type: 'process_image' | 'save_layout' | 'export_pdf';
  data: any;
  timestamp: number;
  retryCount: number;
}

const OfflineStorageContext = createContext<OfflineStorageContextType | null>(null);

const DB_NAME = 'ImageToPrintDB';
const DB_VERSION = 1;
const PROCESSED_IMAGES_STORE = 'processedImages';
const OFFLINE_ACTIONS_STORE = 'offlineActions';

class OfflineStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (!indexedDB || typeof indexedDB.open !== 'function') {
        console.warn('IndexedDB not available, skipping offline storage initialization');
        resolve();
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('IndexedDB open failed, skipping offline storage initialization');
          resolve(); // Resolve instead of reject to not break the app
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Processed images store
          if (!db.objectStoreNames.contains(PROCESSED_IMAGES_STORE)) {
            const processedImagesStore = db.createObjectStore(PROCESSED_IMAGES_STORE, { keyPath: 'id' });
            processedImagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Offline actions store
          if (!db.objectStoreNames.contains(OFFLINE_ACTIONS_STORE)) {
            const offlineActionsStore = db.createObjectStore(OFFLINE_ACTIONS_STORE, { keyPath: 'id' });
            offlineActionsStore.createIndex('timestamp', 'timestamp', { unique: false });
            offlineActionsStore.createIndex('type', 'type', { unique: false });
          }
        };
      } catch (error) {
        console.warn('Error initializing IndexedDB:', error);
        resolve(); // Resolve instead of reject to not break the app
      }
    });
  }

  async saveProcessedImage(imageData: ProcessedImageData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROCESSED_IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(PROCESSED_IMAGES_STORE);
      const request = store.put(imageData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getProcessedImages(): Promise<ProcessedImageData[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROCESSED_IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(PROCESSED_IMAGES_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const images = request.result.sort((a: ProcessedImageData, b: ProcessedImageData) =>
          b.timestamp - a.timestamp
        );
        resolve(images);
      };
    });
  }

  async deleteProcessedImage(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROCESSED_IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(PROCESSED_IMAGES_STORE);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OFFLINE_ACTIONS_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_ACTIONS_STORE);
      const request = store.put(action);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OFFLINE_ACTIONS_STORE], 'readonly');
      const store = transaction.objectStore(OFFLINE_ACTIONS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const actions = request.result.sort((a: OfflineAction, b: OfflineAction) =>
          a.timestamp - b.timestamp
        );
        resolve(actions);
      };
    });
  }

  async clearOfflineActions(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OFFLINE_ACTIONS_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_ACTIONS_STORE);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const storageManager = new OfflineStorageManager();

interface OfflineStorageProviderProps {
  children: ReactNode;
}

export const OfflineStorageProvider: React.FC<OfflineStorageProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize IndexedDB
    storageManager.init()
      .then(() => setIsStorageReady(true))
      .catch((error) => {
        console.error('Failed to initialize offline storage:', error);
        setIsStorageReady(false);
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveProcessedImage = async (imageData: ProcessedImageData): Promise<void> => {
    if (!isStorageReady) throw new Error('Storage not ready');
    await storageManager.saveProcessedImage(imageData);
  };

  const getProcessedImages = async (): Promise<ProcessedImageData[]> => {
    if (!isStorageReady) return [];
    return storageManager.getProcessedImages();
  };

  const deleteProcessedImage = async (id: string): Promise<void> => {
    if (!isStorageReady) throw new Error('Storage not ready');
    await storageManager.deleteProcessedImage(id);
  };

  const saveOfflineAction = async (action: OfflineAction): Promise<void> => {
    if (!isStorageReady) throw new Error('Storage not ready');
    await storageManager.saveOfflineAction(action);
  };

  const getOfflineActions = async (): Promise<OfflineAction[]> => {
    if (!isStorageReady) return [];
    return storageManager.getOfflineActions();
  };

  const clearOfflineActions = async (): Promise<void> => {
    if (!isStorageReady) throw new Error('Storage not ready');
    await storageManager.clearOfflineActions();
  };

  const syncOfflineActions = async (): Promise<void> => {
    if (!isOnline || !isStorageReady) return;

    const actions = await storageManager.getOfflineActions();
    if (actions.length === 0) return;

    // Process offline actions when back online
    for (const action of actions) {
      try {
        // Here you would implement the actual sync logic based on action type
        console.log('Syncing offline action:', action);

        // For now, just remove the action after "processing"
        await storageManager.clearOfflineActions();
        break; // Clear all actions after successful sync
      } catch (error) {
        console.error('Failed to sync offline action:', error);
        // Increment retry count and keep for later retry
        action.retryCount++;
        if (action.retryCount < 3) {
          await storageManager.saveOfflineAction(action);
        }
      }
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isStorageReady) {
      syncOfflineActions();
    }
  }, [isOnline, isStorageReady]);

  const value: OfflineStorageContextType = {
    isOnline,
    isStorageReady,
    saveProcessedImage,
    getProcessedImages,
    deleteProcessedImage,
    saveOfflineAction,
    getOfflineActions,
    clearOfflineActions,
    syncOfflineActions,
  };

  return (
    <OfflineStorageContext.Provider value={value}>
      {children}
    </OfflineStorageContext.Provider>
  );
};

export const useOfflineStorage = (): OfflineStorageContextType => {
  const context = useContext(OfflineStorageContext);
  if (!context) {
    throw new Error('useOfflineStorage must be used within an OfflineStorageProvider');
  }
  return context;
};

export default OfflineStorageProvider;