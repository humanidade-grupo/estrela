#!/usr/bin/env python3
# ============================================
# grupo-humanidade / hub comercial / gestao / estrela
# Gerado em: 11/08/2026 22:00
# Monta docs/index.html a partir do painel aberto exportado do Cowork:
# injeta o widget de chat, criptografa (PBKDF2-SHA256 250k + AES-256-GCM)
# e encaixa o resultado na casca de senha.
#
# USO:
#   $env:PAINEL_TOKEN = "<token do Worker>"
#   python build\encrypt_painel.py "C:\Users\ricar\Downloads\painel-aberto.html"
#
# A senha do painel e' pedida no terminal (nao aparece na tela) ou lida de
# SENHA_PAINEL. Nem a senha nem o token sao gravados em disco.
#
# TRAVAS antes de escrever o arquivo final:
#   1. marcador __PAINEL_TOKEN__ tem que ter sumido do widget
#   2. round-trip: descriptografa o proprio resultado e compara com a entrada
#   3. o token NAO pode aparecer em texto claro no HTML gerado
#   4. amostras do painel aberto NAO podem aparecer em texto claro
# Qualquer uma que falhe aborta a geracao sem escrever nada.
# ============================================

import base64
import getpass
import hashlib
import json
import os
import secrets
import sys
from datetime import datetime
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITERACOES = 250_000
RAIZ = Path(__file__).resolve().parent.parent
TEMPLATE = RAIZ / "build" / "shell.template.html"
WIDGET = RAIZ / "chat-proxy" / "widget.js"
SAIDA = RAIZ / "docs" / "index.html"

# document.write() substitui o documento inteiro, <head> incluso: tudo que
# estava na casca de senha e' descartado no destravamento. Estas tags precisam
# existir DENTRO do painel, senao o navegador para de oferecer "Instalar app"
# depois que o usuario destrava.
PWA_HEAD = (
    '<link rel="manifest" href="./manifest.webmanifest">\n'
    '<link rel="apple-touch-icon" href="./icone-eu-180.png">\n'
)

# Registrar de novo e' inofensivo (no-op se ja' registrado pela casca) e cobre
# o caso de o painel ser aberto sem passar pela casca.
PWA_SW = (
    "\n<script>\n"
    "if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');\n"
    "</script>\n"
)


def abortar(msg: str) -> None:
    print(f"\nABORTADO: {msg}", file=sys.stderr)
    print("Nenhum arquivo foi escrito.", file=sys.stderr)
    sys.exit(1)


def b64(dados: bytes) -> str:
    return base64.b64encode(dados).decode("ascii")


def ler_senha() -> str:
    senha = os.environ.get("SENHA_PAINEL")
    if senha:
        print("Senha lida de SENHA_PAINEL.")
    else:
        primeira = getpass.getpass("Senha do painel: ")
        segunda = getpass.getpass("Repita a senha:  ")
        if primeira != segunda:
            abortar("as duas senhas nao conferem.")
        senha = primeira

    # Validacao vale para os dois caminhos (prompt e variavel de ambiente).
    if len(senha) < 4:
        abortar(f"senha de {len(senha)} caractere(s): vazia ou curta demais "
                "para ser intencional.")
    # Sem minimo rigido acima disso: a senha tem que continuar sendo a mesma do
    # painel ja' publicado, senao a equipe perde o acesso. Mas o arquivo e'
    # baixavel por qualquer um, e senha curta cede a ataque offline apesar do
    # PBKDF2 — por isso o aviso.
    if len(senha) < 12:
        print(f"\n  AVISO: senha de {len(senha)} caracteres.")
        print("  O index.html e' publico e pode ser baixado para ataque offline.")
        print("  Considere alongar a senha (exige avisar a equipe). Prosseguindo.\n")
    return senha


def main() -> None:
    if len(sys.argv) < 2:
        abortar("informe o caminho do painel aberto exportado do Cowork.\n"
                '  Ex.: python build\\encrypt_painel.py "C:\\Users\\ricar\\Downloads\\painel-aberto.html"')

    entrada = Path(sys.argv[1])
    if not entrada.is_file():
        abortar(f"arquivo nao encontrado: {entrada}")

    # 2o argumento opcional: caminho de saida alternativo (para testes secos,
    # sem sobrescrever o painel publicado).
    saida = Path(sys.argv[2]) if len(sys.argv) > 2 else SAIDA

    token = os.environ.get("PAINEL_TOKEN", "").strip()
    if not token:
        abortar("variavel PAINEL_TOKEN nao definida.\n"
                '  No PowerShell:  $env:PAINEL_TOKEN = "<token>"')

    for caminho in (TEMPLATE, WIDGET):
        if not caminho.is_file():
            abortar(f"arquivo ausente: {caminho}")

    # --- 1. widget com o token injetado ---------------------------------
    widget = WIDGET.read_text(encoding="utf-8")
    if "__PAINEL_TOKEN__" not in widget:
        abortar(f"marcador __PAINEL_TOKEN__ nao encontrado em {WIDGET.name}.")
    widget = widget.replace("__PAINEL_TOKEN__", token)
    if "__PAINEL_TOKEN__" in widget:
        abortar("marcador __PAINEL_TOKEN__ sobreviveu a substituicao.")

    # --- 2. painel aberto + tags de PWA + widget --------------------------
    painel = entrada.read_text(encoding="utf-8")

    if 'rel="manifest"' in painel:
        print("AVISO: painel ja' traz <link rel=manifest>; nao reinjetado.")
    elif "</head>" in painel:
        painel = painel.replace("</head>", PWA_HEAD + "</head>", 1)
    else:
        abortar("</head> nao encontrado: sem ele as tags de PWA nao entram e "
                "o 'Instalar app' quebra depois do document.write().")

    bloco = f"\n<script>\n{widget}\n</script>\n" + PWA_SW
    if "</body>" in painel:
        painel = painel.replace("</body>", bloco + "</body>", 1)
    else:
        print("AVISO: </body> nao encontrado; widget anexado ao final.")
        painel += bloco

    for esperado, rotulo in (('rel="manifest"', "link do manifest"),
                             ("apple-touch-icon", "apple-touch-icon"),
                             ("serviceWorker.register", "registro do service worker"),
                             ("eu-chat-bt", "botao do widget de chat")):
        if esperado not in painel:
            abortar(f"{rotulo} ausente do painel montado.")

    claro = painel.encode("utf-8")

    # --- 3. criptografia --------------------------------------------------
    senha = ler_senha()
    sal = secrets.token_bytes(16)
    iv = secrets.token_bytes(12)
    chave = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, ITERACOES, dklen=32)
    cifrado = AESGCM(chave).encrypt(iv, claro, None)  # tag ja' vem anexada

    payload = json.dumps({"s": b64(sal), "i": b64(iv), "c": b64(cifrado), "it": ITERACOES})

    # --- 4. round-trip: o resultado tem que voltar identico ---------------
    try:
        conferido = AESGCM(chave).decrypt(iv, cifrado, None)
    except Exception as e:
        abortar(f"falha ao descriptografar o proprio resultado: {e}")
    if conferido != claro:
        abortar("round-trip divergiu: o texto decifrado nao bate com a entrada.")

    # --- 5. montagem do HTML final ----------------------------------------
    agora = datetime.now().strftime("%d/%m/%Y %H:%M")
    html = (TEMPLATE.read_text(encoding="utf-8")
            .replace("__PAYLOAD__", payload)
            .replace("__GERADO_EM__", agora))

    # --- 6. travas de vazamento -------------------------------------------
    if token in html:
        abortar("o PAINEL_TOKEN aparece em texto claro no HTML gerado.")

    texto_painel = painel
    amostras = [texto_painel[i:i + 40]
                for i in range(0, max(1, len(texto_painel) - 40), max(1, len(texto_painel) // 25))][:25]
    vazadas = [a for a in amostras if a and a in html]
    if vazadas:
        abortar(f"{len(vazadas)} trecho(s) do painel aberto aparecem em texto claro no HTML gerado.")

    # --- 7. gravacao -------------------------------------------------------
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(html, encoding="utf-8", newline="\n")

    # Hash truncado do token embutido: seguro de mostrar e de comparar com o
    # log do Worker. Se este valor nao bater com o que o Worker registra, o
    # painel e o proxy estao dessincronizados e o chat vai responder 401.
    impressao = hashlib.sha256(token.encode("utf-8")).hexdigest()[:8]

    print()
    print(f"  entrada .... {entrada}  ({len(claro):,} bytes)".replace(",", "."))
    print(f"  widget ..... {WIDGET.name} (token injetado)")
    print(f"  token ...... {len(token)} caracteres, hash {impressao}")
    print(f"  saida ...... {saida}  ({len(html):,} bytes)".replace(",", "."))
    print(f"  gerado em .. {agora}")
    print("  travas ..... marcador OK / round-trip OK / token nao vazou / dados nao vazaram")
    print()
    print("Proximo passo: bumpar CACHE em docs/sw.js, commitar e publicar.")


if __name__ == "__main__":
    main()
