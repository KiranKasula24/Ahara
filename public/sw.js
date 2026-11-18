// Ahara service worker (P1): lets Chrome treat Ahara as an installable app.
// Offline caching and the "update available" notice arrive in P10.
self.addEventListener("install", () => {});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
