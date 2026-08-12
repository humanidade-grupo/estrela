<!-- ============================================
 grupo-humanidade / hub comercial / gestao / estrela
 Gerado em: 11/08/2026 22:00
 Instrucoes de deploy do proxy de chat do Painel Vendas x Estoque.
============================================ -->

# Chat do painel — proxy Cloudflare Worker

Permite conversar com o Claude sobre os números do Painel Vendas × Estoque
sem que a chave da API da Anthropic apareça no navegador ou no repositório.

```
navegador (painel destravado)
   │  POST { tabela, mensagens }  +  Authorization: Bearer <PAINEL_TOKEN>
   ▼
Worker  ──  ANTHROPIC_API_KEY como secret
   ▼
api.anthropic.com
```

**Nada nesta pasta é publicado no GitHub Pages** — o Pages serve apenas `docs/`.
Os dois segredos ficam no Cloudflare, nunca em arquivo versionado.

## Arquivos

| Arquivo | Onde roda |
|---|---|
| `worker.js` | Cloudflare Worker |
| `wrangler.toml` | Configuração do deploy |
| `widget.js` | Cola no **fonte do painel no Cowork** — não no `docs/index.html` |

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

Guarde a URL que o deploy imprime (`https://estrela-painel-chat.<subdominio>.workers.dev`).

**2. Definir os dois segredos**

A chave da API — cole quando o comando pedir; ela não fica no histórico do shell:

```bash
wrangler secret put ANTHROPIC_API_KEY
```

O token do painel — gere um valor aleatório e guarde, você vai precisar dele no passo 3:

```bash
wrangler secret put PAINEL_TOKEN
```

Para gerar o token (PowerShell):

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**3. Ligar o painel ao Worker**

Nada a fazer manualmente: o `build/encrypt_painel.py` injeta o `widget.js` no
painel e substitui o marcador `__PAINEL_TOKEN__` pelo token real **antes** de
criptografar. Assim o token entra no blob cifrado junto com os dados e fica
protegido pela senha do painel.

A URL do Worker (`PROXY`, no topo do `widget.js`) já está fixada. Só precisa
mudar se o Worker for republicado com outro nome ou em outra conta.

Fluxo de geração e publicação: ver [`build/README.md`](../build/README.md).

## Custo estimado

Base: tabela de ~15 mil tokens em cache, Claude Opus 5 (US$ 5 / US$ 25 por
milhão de tokens). Estimativa — o valor real depende do tamanho do extrato.

| | Custo |
|---|---|
| Primeira pergunta (escreve o cache, 1,25×) | ~US$ 0,10 |
| Perguntas seguintes na mesma sessão (lê o cache, 0,1×) | ~US$ 0,03 |

O cache expira em 5 minutos de inatividade — a pergunta seguinte volta a pagar
a escrita. Trocar o modelo para `claude-sonnet-5` em `worker.js` derruba o custo
para cerca de 60% disso (US$ 3 / US$ 15 por milhão, com preço promocional de
US$ 2 / US$ 10 até 31/08/2026).

Plano gratuito do Cloudflare Workers: 100 mil requisições/dia. Folga ampla.

## Notas de segurança

- A chave da API nunca sai do Worker. O navegador só conhece o `PAINEL_TOKEN`.
- O `PAINEL_TOKEN` vive dentro do blob criptografado: quem não tem a senha do
  painel não chega nele. Diferente de uma chave de API, ele é rotacionável
  (`wrangler secret put PAINEL_TOKEN` + regerar o painel) e não dá acesso a
  nenhuma conta — só a este Worker.
- O Worker confere `Origin` além do token. `Origin` é forjável fora do
  navegador; quem realmente autentica é o token.
- Erros da API da Anthropic vão para o log do Worker, não para o navegador.
- **Os dados de vendas saem para a API da Anthropic** a cada pergunta. Decisão
  de negócio, não técnica — alinhar antes de colocar em uso.

## Rotacionar o token

```bash
wrangler secret put PAINEL_TOKEN
```

Depois regenere o painel no Cowork com o novo valor e publique. Painéis antigos
em cache no navegador de alguém passam a receber 401 — é o comportamento
esperado.
