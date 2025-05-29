// A super basic service worker
self.addEventListener("install", (event) => {
    console.log("[SW] Installed");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("[SW] Activated");
});
