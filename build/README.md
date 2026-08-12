<!-- ============================================
 grupo-humanidade / hub comercial / gestao / estrela
 Gerado em: 11/08/2026 23:10
 Como gerar e publicar uma versao nova do Painel Vendas x Estoque.
============================================ -->

# Geração do painel

Transforma o painel **aberto** (exportado do Cowork) no `docs/index.html`
criptografado que vai para o GitHub Pages, com o widget de chat embutido.

```
Cowork  ──exporta──▶  painel-aberto.html  (numeros em texto claro)
                              │
                              ▼
                    build/encrypt_painel.py
                      · injeta chat-proxy/widget.js
                      · substitui __PAINEL_TOKEN__
                      · PBKDF2-SHA256 250k + AES-256-GCM
                      · encaixa em build/shell.template.html
                              │
                              ▼
                       docs/index.html  ──▶  GitHub Pages
```

## Arquivos

| Arquivo | Papel |
|---|---|
| `encrypt_painel.py` | O gerador |
| `shell.template.html` | Tela de senha + rotina de descriptografia. `__PAYLOAD__` e `__GERADO_EM__` são preenchidos na geração. |
| `_extrair_template.py` | Uso único: regerou o template a partir do `docs/index.html` publicado. Só rodar de novo se a casca mudar. |

## ⚠️ O `painel-aberto.html` já não é uma cópia crua do Cowork

Em **12/08/2026** três ajustes de interface foram feitos **direto no
`painel-aberto.html`**, não no artefato do Cowork:

1. **Misto** e **Terceiros** nascem desmarcados nos filtros (todas as abas) —
   via a opção `off` de cada grupo em `mkFilters`.
2. O chip **Todos** virou alternador: marcado, o clique **limpa** o grupo.
3. O grupo **Fase (Vale)** só aparece quando o Empreendimento está isolado em
   *Estrela do Vale*; escondido, volta sozinho ao padrão (todas as fases) —
   via as opções `visivel` e `syncVis` em `mkFilters`.

**Uma reexportação do Cowork apaga os três.** Antes de sobrescrever o
`painel-aberto.html`, ou o artefato do Cowork já traz esses ajustes, ou eles
precisam ser reaplicados na mão (tudo mora em `mkFilters` e nas três chamadas
`mkFilters(...)`, cerca de 60 linhas no total).

## Gerar

**1.** Exporte o painel aberto do Cowork para `C:\Users\ricar\Downloads\painel-aberto.html`.

**2.** Ponha o token do Worker no ambiente da sessão (some ao fechar a janela):

```bash
$env:PAINEL_TOKEN = "<token guardado no gerenciador de senhas>"
```

**3.** Gere. A senha do painel é pedida duas vezes e não aparece na tela:

```bash
cd C:\Users\ricar\Documents\GitHub\estrela; python build\encrypt_painel.py "$env:USERPROFILE\Downloads\painel-aberto.html"
```

**4.** Bumpe a versão do cache do service worker — sem isso, quem tem o PWA
instalado continua na versão antiga do arquivo em modo offline. Edite
`docs/sw.js`: `CACHE = 'estrela-painel-AAMMDD-N'`.

**5.** Commite e publique:

```bash
cd C:\Users\ricar\Documents\GitHub\estrela; git add docs/ && git commit -m "gestao: painel <data>" && git push
```

**6.** Confira em `https://humanidade-grupo.github.io/estrela/`.

## As quatro travas

O script aborta **sem escrever nada** se qualquer uma falhar:

| Trava | O que pega |
|---|---|
| Marcador substituído | `__PAINEL_TOKEN__` sobreviveu → widget sairia sem token |
| Round-trip | Descriptografa o próprio resultado e compara com a entrada — pega qualquer erro de cifragem |
| Token não vazou | O `PAINEL_TOKEN` aparece em texto claro no HTML final |
| Dados não vazaram | 25 amostras do painel aberto aparecem em texto claro no HTML final |

A terceira e a quarta são as que importam num repositório **público**: elas
garantem que um erro futuro no script falhe barulhento em vez de publicar
segredo ou dado aberto.

## Verificado em 11/08/2026

Compatibilidade Python → WebCrypto testada ponta a ponta num painel de exemplo:
o navegador descriptografou o payload gerado pelo Python (9.902 bytes), a tabela
renderizou, o botão "Perguntar ao Claude" apareceu, e a extração da tabela
produziu o TSV esperado.

## Se o chat der 401

O painel e o Worker guardam o mesmo token; 401 significa que eles divergiram.
Provoque uma falha de auth de propósito e leia os hashes no log:

```bash
cd C:\Users\ricar\Documents\GitHub\estrela\chat-proxy; npx.cmd wrangler tail --format pretty
```

Em outra janela, dispare qualquer pergunta no painel. O log mostra
`hashRecebido` (o que o painel mandou) e `hashEsperado` (o que o Worker tem).
São hashes truncados — não expõem o token.

Divergiram? Rode o **comando de ressincronização** abaixo. Ele grava o token no
Worker, **confirma com uma requisição real**, e só então gera o painel — se o
`secret put` falhar, aborta sem gerar nada:

```bash
cd C:\Users\ricar\Documents\GitHub\estrela; $t = python -c "import secrets; print(secrets.token_urlsafe(32))"; if ([string]::IsNullOrWhiteSpace($t)) { Write-Host "ABORTADO" -ForegroundColor Red } else { $t | npx.cmd wrangler secret put PAINEL_TOKEN --config chat-proxy\wrangler.toml; Start-Sleep -Seconds 40; $b = @{tabela="## T`nA`tB`n1`t2"; mensagens=@(@{role="user";content="oi"})} | ConvertTo-Json -Depth 5 -Compress; $st = 0; try { $st = [int](Invoke-WebRequest -Uri "https://estrela-painel-chat.ricardocandrade.workers.dev" -Method POST -Headers @{"Origin"="https://humanidade-grupo.github.io";"Content-Type"="application/json";"Authorization"="Bearer $t"} -Body $b -UseBasicParsing).StatusCode } catch { $st = [int]$_.Exception.Response.StatusCode }; if ($st -ne 200) { Write-Host "ABORTADO: Worker respondeu $st. Nada foi gerado." -ForegroundColor Red } else { $env:PAINEL_TOKEN = $t; $t | Set-Clipboard; python build\encrypt_painel.py "$env:USERPROFILE\Downloads\painel-aberto.html" } }
```

Compare o `hash` que o script imprime com o `hashEsperado` do log. Iguais =
sincronizado.

> ⚠️ **`--config chat-proxy\wrangler.toml` é obrigatório** em qualquer comando
> `wrangler` rodado fora da pasta `chat-proxy/`. Sem ele o wrangler não acha o
> `wrangler.toml`, falha com *"Required Worker name missing"* — e num comando
> longo esse erro passa despercebido no meio da saída. Foi exatamente assim que
> o painel foi publicado uma vez com um token que o Worker não conhecia.

## Nunca versionar

O `painel-aberto.html` tem os números em texto claro e **não pode entrar no
repositório** — ele é público. O `.gitignore` na raiz bloqueia os nomes usuais,
mas confira o `git status` antes de commitar mesmo assim.
