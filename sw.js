/*
 * Service worker for Celestial Nav Explorer. Plain script: the build (vite.config.ts) fills in
 * __VERSION__ and __PRECACHE__ (every file in dist) and writes it to dist/sw.js.
 *
 * Install: precache everything, so the whole app works offline after the first visit (SCOPE §9).
 * Activate: delete caches from older versions (storage hygiene).
 * Fetch: pages network-first (fresh when online, cached when not); hashed assets cache-first.
 */
const VERSION = '769a059a4220';
const PRECACHE = ["./","THIRD_PARTY_LICENSES.txt","assets/GlobeView-keAEBo5a.js","assets/NoonSweep-VgwviOdR.js","assets/PlottingSheet-BKTjGVYz.js","assets/PolarisGlobe-HsW-eBeU.js","assets/YouControls-B9QWKY3I.js","assets/earth.2000-2050-GJSpOwaB.bin","assets/engine-VtVP-eCN.js","assets/index-D6i_kCIP.js","assets/index-DhmP4ILK.css","assets/jupiter.2020-2040-BELDYa_a.bin","assets/mars.2020-2040-BKyS-eT9.bin","assets/moon.2020-2040-CW2GQJV4.bin","assets/palette-BpCFdn8b.js","assets/react-BCnKyWd2.js","assets/saturn.2020-2040-CZ9C_My_.bin","assets/sun.2000-2050-CI_rQCU2.bin","assets/three-CMesfX-m.js","assets/venus.2020-2040-B6PcuJUy.bin","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon.svg","manifest.webmanifest"];
const CACHE = `celnav-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(new URL(p, self.registration.scope), { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('celnav-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'version') e.source?.postMessage({ type: 'version', version: VERSION, files: PRECACHE.length });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      // A navigate-mode Request can't be re-issued with options, so fetch its URL afresh.
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(new URL('./', self.registration.scope), copy));
          return res;
        })
        .catch(() => caches.match(new URL('./', self.registration.scope), { ignoreVary: true })),
    );
    return;
  }
  // ignoreVary: scripts loaded with `crossorigin` send an Origin header the precache requests did
  // not, and a `Vary: Origin` response would otherwise never match (the app then fails offline).
  e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)));
});
