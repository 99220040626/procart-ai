// 🚀 This imports the app asynchronously so Micro-Frontends have time to load!
import('./bootstrap');
// Register the Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('🚀 Service Worker Registered!', reg.scope))
      .catch(err => console.log('❌ Service Worker Failed!', err));
  });
}