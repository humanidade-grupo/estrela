<!-- ============================================
 grupo-humanidade / painel-comercial (repo `estrela`)
 Gerado em: 11/08/2026 22:00 · reescrito em 18/08/2026, quando o chat voltou.
 Instrucoes de deploy do proxy de chat do Painel Comercial.
============================================ -->

# Chat do painel — proxy Cloudflare Worker

Permite conversar com o Claude sobre os números do Painel Comercial sem que a
chave da API da Anthropic apareça no navegador ou no repositório.

```
navegador (painel destravado)
   │  POST { tabela, mensagens }  +  Authorization: Bearer <token do Cofre>
   ▼
Worker  ──  ANTHROPIC_API_KEY como secret
   ▼
api.anthropic.com
```

## O que mudou em 18/08 — e por que

O botão do chat sumiu em 17/08. Não foi bug: até ali o widget era **injetado**
no painel pelo `build/encrypt_painel.py`, na mesma passagem que criptografava
tudo. Quando o painel passou a ler do Cofre sem cifra e sem dado embutido, o
`encrypt_painel.py` foi aposentado — e o passo de injeção foi junto.

Religar exigiu resolver o motivo de o widget viver dentro do blob: ele carregava
o `PAINEL_TOKEN` em texto claro, e a regra é que **nenhum segredo mora em
HTML**. Três consequências:

| Antes (até 12/08) | Agora |
|---|---|
| `widget.js` nesta pasta, injetado na cifra | [`docs/chat.js`](../docs/chat.js), servido pelo Pages |
| token próprio do chat, aleatório, dentro do blob | o **token do Cofre**, lido do `localStorage` |
| duas digitações (senha do painel + token) | uma digitação, a que o painel já pede |
| `PUBLICAR.cmd` reinjetava o token a cada publicação | nada a reinjetar |

**Nada nesta pasta é publicado no GitHub Pages** — o Pages serve apenas `docs/`.
Os segredos ficam no Cloudflare, nunca em arquivo versionado.

## Arquivos

| Arquivo | Onde roda |
|---|---|
| `worker.js` | Cloudflare Worker — prompt de sistema e chamada à API |
| `wrangler.toml` | Configuração do deploy |
| `../docs/chat.js` | Navegador. **Não mora mais aqui**: sem segredo dentro, o arquivo nasce no destino |

## O token: um valor, dois porteiros

O `PAINEL_TOKEN` do Worker tem de guardar **exatamente o mesmo texto** que o
Cofre exige — o token que cada pessoa digita uma vez por aparelho e que fica no
`localStorage` sob a chave `hub_token_gestao`.

Não é elegância: sem a cifra não existe lugar no painel para esconder um segundo
segredo. Ou o chat usa o token que já está lá, ou volta a pedir uma digitação a
mais para guardar em texto claro o que não pode ficar em texto claro.

Consequência a aceitar de olhos abertos: **quem abre o painel pode usar o
chat.** Não há permissão separada. Rotacionar o token do Cofre passa a derrubar
o chat também, até o comando abaixo ser rodado de novo.

## Deploy

**1. Publicar o Worker**

```bash
npm install -g wrangler
```

```bash
wrangler login
```

```bash
cd chat-proxy && wrangler deploy
```

Guarde a URL que o deploy imprime. Ela já está fixada em `docs/chat.js`
(`PROXY`, no topo) e só muda se o Worker for republicado com outro nome.

**2. Definir os dois segredos**

A chave da API — cole quando o comando pedir; não fica no histórico do shell:

```bash
wrangler secret put ANTHROPIC_API_KEY
```

O token — cole o **token do Cofre**, o mesmo que o painel pede ao abrir. Não
gere um valor novo aqui:

```bash
wrangler secret put PAINEL_TOKEN
```

Nada a fazer no painel depois. Ele não carrega token nenhum dentro de si.

## Se o chat der 401

O painel abriu, então o token está certo — quem discorda é o Worker. Regrave:

```bash
cd chat-proxy && wrangler secret put PAINEL_TOKEN
```

O log do Worker imprime `AUTH FALHOU` com o tamanho e um hash truncado dos dois
lados, o suficiente para ver que divergem sem expor o valor.

O `CONSERTAR-CHAT.cmd` na raiz **não conserta mais isto sozinho**: ele chamava
`build/rotacionar-token.ps1`, que reenviava o token aleatório do cofre DPAPI
local — hoje o valor errado por definição. O arquivo ficou, mas só imprime o
comando acima.

## O que o navegador manda

`docs/chat.js` monta o bloco `<tabela>` a partir de `window.__DADOS__` /
`window.__DADOS_PS__` — o dado que o Cofre entregou —, **não** da raspagem das
`<table>` da tela. A versão de agosto/12 raspava o DOM, e hoje isso mentiria: as
tabelas estão filtradas pelos chips, e a metade do Parque mostra um mês por vez.

Vai só a empresa **aberta na tela**. Trocar de empresa limpa o histórico da
conversa — manter faria o modelo responder sobre jazigos citando lotes.

O `worker.js` deriva as colunas dos campos reais de cada registro; o glossário
no prompt de sistema descreve os campos como estão em 18/08 e diz ao modelo que
o cabeçalho do TSV é a autoridade, não o glossário.

## Custo estimado

Base: ~15 mil tokens em cache, Claude Opus 5 (US$ 5 / US$ 25 por milhão). O
valor real depende do tamanho da base da empresa aberta.

| | Custo |
|---|---|
| Primeira pergunta (escreve o cache, 1,25×) | ~US$ 0,10 |
| Perguntas seguintes na mesma sessão (lê o cache, 0,1×) | ~US$ 0,03 |

O cache expira em 5 minutos de inatividade. **Trocar de empresa também derruba
o cache** — a base muda inteira, e a pergunta seguinte volta a pagar a escrita.

Trocar o modelo para `claude-sonnet-5` em `worker.js` derruba o custo para cerca
de 60% disso. Plano gratuito do Cloudflare Workers: 100 mil requisições/dia.

## Notas de segurança

- A chave da API nunca sai do Worker.
- O Worker confere `Origin` além do token. `Origin` é forjável fora do
  navegador; quem realmente autentica é o token.
- Erros da API da Anthropic vão para o log do Worker, não para o navegador.
- **Os dados de vendas saem para a API da Anthropic** a cada pergunta — agora a
  base inteira da empresa aberta, não o recorte da tela. Decisão de negócio, não
  técnica.
