export const dynamic = "force-static";
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const script = ` const BUILD = ${JSON.stringify(BUILD)}; const CACHE = "ahara-offline-" + BUILD;  self.addEventListener("install", (event) => {   event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request("/offline.html", { cache: "reload" }))));    });  self.addEventListener("activate", (event) => {   event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))); });  self.addEventListener("message", (event) => {   if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting(); });   self.addEventListener("fetch", (event) => {   if (event.request.mode !== "navigate") return;   event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html"))); }); `;
export function GET() {
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
