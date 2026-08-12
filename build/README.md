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

## Nunca versionar

O `painel-aberto.html` tem os números em texto claro e **não pode entrar no
repositório** — ele é público. O `.gitignore` na raiz bloqueia os nomes usuais,
mas confira o `git status` antes de commitar mesmo assim.
