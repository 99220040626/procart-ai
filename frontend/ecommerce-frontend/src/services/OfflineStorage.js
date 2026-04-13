import { openDB } from 'idb';

const DB_NAME = 'ProCart_Offline';
const STORE_NAME = 'sync_queue';

// Initialize the browser database
const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
  },
});

export const OfflineStorage = {
  // Save an action (like ADD_TO_CART) to sync later
  async saveForSync(actionType, data) {
    const db = await dbPromise;
    await db.add(STORE_NAME, { 
      type: actionType, 
      payload: data, 
      timestamp: Date.now() 
    });
    console.log("📁 Saved to local storage. Will sync when online.");
  },

  // Get all pending actions
  async getPendingActions() {
    const db = await dbPromise;
    return await db.getAll(STORE_NAME);
  },

  // Clear the queue after successful sync
  async clearQueue() {
    const db = await dbPromise;
    await db.clear(STORE_NAME);
  }
};