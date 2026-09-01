/* Painel Comercial — Parque da Saudade + Estrela Urbanidade
   Service worker: instalação PWA + reserva offline.
   Atualizado em: 01/09/2026 (4ª do dia) — MASTHEAD NOVO: o cabeçalho virou
   cartão com selo GRUPO HUMANIDADE, título grande com "Comercial" no acento,
   halo radial e fio de acento no pé — tudo nas variáveis que a tela já usa,
   então troca de tom junto com a empresa (ciano na Estrela, dourado no
   Parque) sem JS. O portão de token diz "Humanidade" no lugar de "Estrela
   Urbanidade", e o <title> virou "Painel Comercial — Grupo Humanidade".
   Antes, 01/09/2026 (3ª do dia) — NAVEGAÇÃO SEM RECARGA, pedido do
   Ricardo em três partes: (1) Esteira, Retrospectiva e Perfil Cliente viram
   MOLDURAS dentro do Painel (iframe como o Executivo, src na primeira
   abertura, vivas depois — trocar de aba não recarrega nada); o claude.ai
   recusa iframe (frame-ancestors 'self'), então o Perfil mora em
   /perfil-cliente/, cópia da foto de 28/08 do artefato 2aa935f2, que passa a
   ser o lugar onde o Perfil é REFEITO (regra 8). (2) ARRANQUE PELO CACHE:
   quem já abriu uma vez sobe na hora com a cópia local e carimbo dela; a
   busca roda em segundo plano e só oferece "Mostrar" se houver carimbo novo
   — o "Aquecendo" ficou só para a primeira carga da vida do aparelho.
   (3) As telas embutidas escondem o próprio "voltar" (html.embutido) — o
   cabeçalho do Painel é o retorno permanente; abertas por link direto, o
   voltar continua lá (Perfil ganhou o dele).
   Antes, 01/09/2026 (2ª do dia) — AS ABAS MÊS E QUEBRAS DO PARQUE
   SAÍRAM, por decisão do Ricardo: o Executivo cobre a leitura do mês. Os
   painéis delas seguem no HTML, inertes (podar o render seria mais arriscado
   que deixá-los inalcançáveis). A barra inferior do Parque fica com 6 itens
   em 3 colunas, duas filas.
   Antes, 01/09/2026 — O MENU DO PARQUE VIRA O ÍNDICE DO ECOSSISTEMA:
   as abas ganham Esteira e Retrospectiva (links para as telas do próprio repo),
   Perfil Cliente (o artefato "Quem compra no Parque da Saudade", nova aba),
   Docs (painel novo com os downloads da base-conhecimento, servidos do Drive)
   e Pocket (o app do vendedor, nova aba). No celular a barra inferior do
   Parque passa a DUAS FILAS de 4. E a metade da ESTRELA deixa de cravar a
   janela de 12 meses no código (era jul/25–jun/26 fixo): Dashboard, ranking,
   sparkline, série mensal e síntese agora terminam no último mês com venda na
   base — era isso que fazia o Dashboard discordar do Executivo.
   Antes, 31/08/2026 (4ª do dia) — NASCE A RETROSPECTIVA DO TIME
   COMERCIAL em /retrospectiva/, tela de GESTÃO do Parque que lê
   ?app=retrospectiva&fn=dados. Ela é o ESPELHO DE LEITURA do artefato
   `2df469ed` do claude.ai, e não o substitui: no artefato o Ricardo escreve a
   leitura do mês e conduz a reunião; aqui Fábricia e Rodrigo leem, porque o
   artefato lê pelo conector do Drive e não é compartilhável. Não escreve nada.
   Fica dentro do escopo deste PWA pelo mesmo motivo da Esteira: o público é o
   do Painel. FORA, por decisão: a coluna reservada do formulário do time e a
   planilha da liderança — o token de gestão é um só para os três.
   Antes, 31/08/2026 (3ª do dia) — A FILA DE COBRANÇA CAIU DE CINCO
   ETAPAS PARA TRÊS: Lead Quente, Lead Agendado e Visita Realizada. Aprovação e
   Contrato saíram por decisão do Ricardo — ali o negócio já está fechando e o
   que destrava é papel, crédito e assinatura, não um toque de vendedor. Havia
   DUAS listas no código (o `cob:1` do ET e um array literal) e nada lia a
   primeira; agora o array é derivado do ET, então a etapa se corrige num lugar
   só. Os números da fila CAEM com este deploy — sem bump, metade da equipe
   compararia o total novo com o texto velho das cinco etapas.
   Antes, 31/08/2026 (2ª do dia) — "De onde vem a carteira" ganha uma
   ROSCA à direita do texto de leitura, com o total do mês e as três origens
   SEPARADAS (própria · SATI · formulário). A tabela e as barras logo abaixo
   continuam somando SATI + formulário numa coluna só ("Recebido"): são duas
   perguntas diferentes — a rosca é "de onde veio o mês", a tabela é "que fatia
   cada vendedor foi atrás". Só desenho; nenhuma rota, conta ou filtro mudou.
   Antes, 31/08/2026 — SÓ TEXTO na Esteira do Funil: rótulos, notas e
   tarjas reescritos para quem abre a página sem contexto do projeto, com a
   explicação no ponto em que o número aparece e sem o vocabulário interno
   (foto/carimbo/censurado). Nenhuma conta, filtro ou rota mudou — mas o HTML
   mudou inteiro, e sem bump a equipe continuaria lendo o texto velho.
   Antes, 30/08/2026 (3ª do dia) — nasce a ESTEIRA DO FUNIL em
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
const CACHE = 'painel-comercial-260901-4';

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
