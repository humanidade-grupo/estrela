# ============================================
# grupo-humanidade / hub comercial / gestao / estrela
# Gerado em: 11/08/2026 22:00
# Utilitario de uso unico: extrai a casca de senha do docs/index.html
# publicado e grava build/shell.template.html com os marcadores
# __PAYLOAD__ e __GERADO_EM__. Rodar de novo so' se a casca mudar.
# ============================================

import re
import pathlib

raiz = pathlib.Path(__file__).resolve().parent.parent
src = (raiz / "docs" / "index.html").read_text(encoding="utf-8")

linhas = src.split("\n")
alvo = [i for i, l in enumerate(linhas) if l.startswith("const P=")]
assert len(alvo) == 1, f"esperava 1 linha de payload, achei {len(alvo)}"
linhas[alvo[0]] = "const P=__PAYLOAD__;"

for i, l in enumerate(linhas):
    if l.strip().startswith("Gerado em:"):
        linhas[i] = re.sub(r"Gerado em:.*", "Gerado em: __GERADO_EM__", l)
        break

tpl = "\n".join(linhas)
destino = raiz / "build" / "shell.template.html"
destino.write_text(tpl, encoding="utf-8", newline="\n")

print(f"template gravado: {len(tpl)} bytes (payload estava na linha {alvo[0] + 1})")
print(f"marcadores presentes: __PAYLOAD__={'__PAYLOAD__' in tpl} "
      f"__GERADO_EM__={'__GERADO_EM__' in tpl}")
assert "sk-ant" not in tpl and len(tpl) < 20000, "template grande demais - payload vazou?"
print("OK: template nao contem o payload de dados.")
