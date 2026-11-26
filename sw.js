// Primero la red y, si falla o tarda, la copia guardada: así las versiones nuevas llegan solas.
// Todas las webs de iaadileli.github.io comparten las cachés: aquí solo se tocan las que empiezan por "cata-te-".
const PRE = "cata-te-", CACHE = PRE + "v3";
const FILES = ["./", "index.html", "manifest.json", "icon.svg", "apple-touch-icon.png", "nube.js", "sincro.js", "vendor/firebase.js"];
const load = () => caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "no-cache" }))));

self.addEventListener("install", e => e.waitUntil(load().then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith(PRE) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

self.addEventListener("fetch", e => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin) return;
  const nav = r.mode === "navigate";
  const saved = () => caches.open(CACHE).then(c => c.match(nav ? "./" : r, { ignoreSearch: true }));
  const net = fetch(r);
  // Al abrir la página con red se rehace la copia entera (por si otra web del mismo dominio la ha borrado).
  if (nav) e.waitUntil(net.then(() => load()).catch(() => {}));
  const slow = new Promise(ok => setTimeout(ok, 3000)).then(saved).then(m => m || net);
  e.respondWith(Promise.race([net, slow]).catch(() => saved().then(m => m || Response.error())));
});
