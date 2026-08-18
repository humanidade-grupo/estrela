<!-- ============================================
 grupo-humanidade / hub comercial / gestao / estrela
 Gerado em: 11/08/2026 23:10
 Como gerar e publicar uma versao nova do Painel Vendas x Estoque.
============================================ -->

> ## ⛔ APOSENTADO EM 17/08/2026 — não use este caminho
>
> O painel deixou de embutir dado. Ele agora **lê do Cofre** pela porta única
> (`?app=estrela&fn=dados&token=…`), e por isso **não há mais o que criptografar**:
> o `docs/index.html` publicado não carrega número nenhum, só a tela e o portão
> de token. Quem protege o dado agora é o token, que nunca fica no arquivo.
>
> **Consequências práticas:**
>
> | Antes | Agora |
> |---|---|
> | `painel-aberto.html` → `encrypt_painel.py` → `docs/index.html` | `docs/index.html` **é** a fonte — edite-o direto |
> | Publicar = exportar do Cowork + rodar o gerador | Publicar = commit + push (e bumpar o `CACHE` do `sw.js`) |
> | Dado novo = republicar o painel | Dado novo = a importação de 4h do Cofre, sozinha |
> | Senha do painel (PBKDF2+AES) | Token do Cofre, digitado uma vez por aparelho |
> | `chat-proxy/widget.js` injetado na cifra | [`docs/chat.js`](../docs/chat.js), servido pelo Pages — ver [`chat-proxy/README.md`](../chat-proxy/README.md) |
>
> **O chat foi vítima desta mudança e ficou um dia fora do ar.** Ele não estava
> no `docs/index.html`: quem o colocava lá era o passo de injeção do
> `encrypt_painel.py`, que morreu junto com a cifra. Religado em 18/08.
>
> `encrypt_painel.py`, `shell.template.html`, `_extrair_template.py`,
> `publicar.ps1` e `PUBLICAR.cmd` **não têm mais função**. Ficam aqui como
> histórico até serem removidos.
>
> **Os três ajustes de interface descritos abaixo** (Misto/Terceiros
> desmarcados · `Todos` alternador · Fase só com o Vale isolado) foram
> **reimplementados** no `docs/index.html` em 17/08 a partir desta descrição —
> o `painel-aberto.html` que os continha só existia no Downloads e se perdeu.
> Era exatamente o risco que este README antecipou. Agora eles moram no
> arquivo versionado, e não há mais como perdê-los.

---

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

## Publicar (caminho normal: um duplo-clique)

**1.** Exporte o painel aberto do Cowork para `C:\Users\ricar\Downloads\painel-aberto.html`.

**2.** Duplo-clique em **`PUBLICAR.cmd`**, na raiz do repositório. Ele faz os
quatro passos de uma vez: gera o painel criptografado, bumpa o cache do service
worker, commita e dá push.

**3.** Confira em `https://humanidade-grupo.github.io/estrela/` (o GitHub Pages
leva ~1 minuto para trocar a versão).

### Os segredos, uma vez só

Na **primeira** execução o `PUBLICAR.cmd` pede o token do Worker e a senha do
painel em campo oculto e guarda os dois cifrados em
`%LOCALAPPDATA%\estrela-hub\*.sec`. A cifragem é **DPAPI**: só a sua conta do
Windows, nesta máquina, decifra aqueles arquivos — nem o script nem o
repositório guardam segredo em texto claro. Das próximas vezes ele não pergunta
mais nada, e a publicação vira só o duplo-clique.

> A senha do painel já ficava salva em texto claro no `localStorage` do
> navegador de quem abre o painel (é assim que a casca evita pedir a senha toda
> vez). O cofre DPAPI é mais protegido que isso, não menos. Trocou a senha ou o
> token? Apague o `.sec` correspondente e o script pergunta de novo.

Para regravar um segredo sem publicar nada, apague o `.sec` e rode o
`PUBLICAR.cmd` — ele pergunta antes de qualquer outra coisa.

### À mão, se precisar

O caminho manual continua valendo — útil para depurar um passo isolado:

```bash
$env:PAINEL_TOKEN = "<token guardado no gerenciador de senhas>"
```

```bash
cd C:\Users\ricar\Documents\GitHub\estrela; python build\encrypt_painel.py "$env:USERPROFILE\Downloads\painel-aberto.html"
```

Depois bumpe `CACHE` em `docs/sw.js` (`estrela-painel-AAMMDD-N`) — sem isso quem
tem o PWA instalado continua na versão antiga em modo offline — e commite:

```bash
cd C:\Users\ricar\Documents\GitHub\estrela; git add docs/ && git commit -m "gestao: painel <data>" && git push
```

O `build/publicar.ps1` aceita `-SemPrompt` (aborta em vez de perguntar, para
execução sem humano na frente) e `-Cofre <pasta>` (cofre alternativo, usado para
ensaiar a publicação numa cópia do repositório).

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

Divergiram? **Duplo-clique em `CONSERTAR-CHAT.cmd`** (raiz do repositório). Ele
regrava no Worker o token que já está no cofre e confirma com uma requisição
real. Depois rode o `PUBLICAR.cmd`, que é quem injeta o token no painel.

Compare o `hash` que ele imprime com o `hashEsperado` do log. Iguais =
sincronizado.

Para trocar o token por um novo (e não só reenviar o atual):

```bash
cd C:\Users\ricar\Documents\GitHub\estrela; powershell -ExecutionPolicy Bypass -File build\rotacionar-token.ps1
```

### ⚠️ O `\n` no `wrangler secret put` — causa raiz do 401 crônico

Este README recomendava, até 12/08/2026, ressincronizar com
`$t | npx.cmd wrangler secret put PAINEL_TOKEN`. **Esse comando é o próprio
defeito.** O pipeline do PowerShell acrescenta uma quebra de linha ao valor, o
wrangler grava o `\n` junto, e o segredo fica com 44 caracteres enquanto o
painel manda 43. O Worker compara com `!==` e devolve 401 — para sempre, e a
"receita de conserto" reproduzia o problema a cada tentativa.

Confirmado no log do Worker em 12/08/2026:
`{"tamanhoRecebido":43,"tamanhoEsperado":44}`.

O `rotacionar-token.ps1` escreve direto no stdin do processo com `.Write()`
(nunca `WriteLine()`), então o valor vai exato. **Nunca mande um segredo para o
wrangler pelo pipeline do PowerShell.**

### ⚠️ Ordem dos passos numa rotação

O passo irreversível é o `secret put`: a partir dele o Worker só aceita o valor
novo. Por isso o token vai para o cofre **antes** da confirmação. Abortar sem
guardar — como a primeira tentativa de 12/08/2026 fazia — perde o token e deixa
o Worker esperando um valor que ninguém tem, com o chat morto até outra rotação.

> ⚠️ **`--config chat-proxy\wrangler.toml` é obrigatório** em qualquer comando
> `wrangler` rodado fora da pasta `chat-proxy/`. Sem ele o wrangler não acha o
> `wrangler.toml`, falha com *"Required Worker name missing"* — e num comando
> longo esse erro passa despercebido no meio da saída. Foi exatamente assim que
> o painel foi publicado uma vez com um token que o Worker não conhecia.

## Nunca versionar

O `painel-aberto.html` tem os números em texto claro e **não pode entrar no
repositório** — ele é público. O `.gitignore` na raiz bloqueia os nomes usuais,
mas confira o `git status` antes de commitar mesmo assim.
