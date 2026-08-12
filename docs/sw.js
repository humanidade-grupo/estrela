/* Estrela Urbanidade â€” Painel Comercial
   Service worker: instalaÃ§Ã£o PWA + reserva offline.
   Gerado em: 12/08/2026
   EstratÃ©gia: rede primeiro (pega versÃ£o nova quando online), cache como
   reserva offline. A cada deploy, bumpar a versÃ£o em CACHE. */
const CACHE = 'estrela-painel-260812-6';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});
