/* Estrela Urbanidade — Painel Comercial
   Service worker: instalação PWA + reserva offline.
   Atualizado em: 30/08/2026 — "N fora da regra" ao lado do carimbo no selo
   da metade PS (decisão 44 do Diário): busca própria à rota fn=fora-da-regra
   depois de a tela subir, tooltip com a quebra carga-inicial × etapa-fora,
   e ausência silenciosa quando a rota não responde.
   Antes, 29/08 (3ª do dia) — a barra de estoque da M-19 sobe
   para a linha do seletor, à direita, junto do botão Atualizar; e ganha a
   guarda [hidden] (o display de autor vencia o hidden do navegador e a barra
   nascia à mostra, com traços).
   2ª do dia — barra de estoque da M-19 abaixo do
   botão Atualizar, só na metade do Parque; lê a rota pública do Cofre
   (?app=estoque), que é cross-origin e já passa direto pelo SW.
   Antes, no mesmo dia: a aba Executivo (sem o "v2" no rótulo) virou a
   porta de entrada das duas metades, com os filtros de mês logo abaixo das
   abas: no Parque escolhem o mês da tela; na Estrela, o fim da janela de 12m.
   Estratégia: rede primeiro (pega versão nova quando online), cache como
   reserva offline. A cada deploy, bumpar a versão em CACHE. */
const CACHE = 'estrela-painel-260830-1';

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
