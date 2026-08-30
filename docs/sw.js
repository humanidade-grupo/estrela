/* Painel Comercial — Parque da Saudade + Estrela Urbanidade
   Service worker: instalação PWA + reserva offline.
   Atualizado em: 30/08/2026 (3ª do dia) — nasce a ESTEIRA DO FUNIL em
   /esteira/, tela de gestão do Parque que lê ?app=leads&fn=list ao vivo. Ela
   fica DENTRO do escopo deste PWA de propósito: o público é o mesmo do Painel
   (a lição de 11/08 era o app do TIME engolindo página da gestão, e não é o
   caso aqui). A estratégia rede-primeiro serve bem a ela — versão nova quando
   online, última boa quando não.
   Antes, 30/08 (2ª do dia) — o repo passou de `estrela` para
   `painel-comercial` e o endereço mudou junto: o Pages agora serve em
   /painel-comercial/, e o GitHub NÃO redireciona Pages de projeto renomeado.
   O nome do cache carregava o nome velho e mudou com ele — cache que sobrevive
   a uma troca de escopo é cache que serve a casca errada. Quem tinha o Painel
   instalado precisa reinstalar: o escopo do PWA mudou.
   Antes, 30/08 — "N fora da regra" ao lado do carimbo no selo
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
const CACHE = 'painel-comercial-260830-6';

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
