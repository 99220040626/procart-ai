import API from './api'; // 🚀 THE FIX: Use your configured API to include JWT & IP!
import { OfflineStorage } from './OfflineStorage';

export const SyncManager = {
  async syncCart() {
    if (!navigator.onLine) return; // Still offline? Do nothing.

    const pendingActions = await OfflineStorage.getPendingActions();
    if (pendingActions.length === 0) return;

    console.log("⚡ Internet is back! Syncing " + pendingActions.length + " actions...");

    for (const action of pendingActions) {
      try {
        if (action.type === 'ADD_TO_CART') {
          // 🚀 THE FIX: Use API.post so it properly routes and authenticates
          await API.post('/cart/add', action.payload.product);
        }
        // Add other sync types here (e.g., WISHLIST)
      } catch (error) {
        console.error("Failed to sync item:", error);
      }
    }

    await OfflineStorage.clearQueue();
    alert("✅ Your cart has been synced with the server!");
  }
};

// Listen for the browser going back online
window.addEventListener('online', () => SyncManager.syncCart());