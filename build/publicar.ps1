# ============================================
# grupo-humanidade / hub comercial / gestao / estrela
# Gerado em: 12/08/2026 15:20
# Publica o painel de ponta a ponta: gera o docs/index.html criptografado,
# bumpa o cache do service worker, commita e da' push. Feito para ser
# DUPLO-CLICADO pelo PUBLICAR.cmd na raiz — nao precisa abrir terminal.
#
# OS DOIS SEGREDOS
#   PAINEL_TOKEN  - token do Worker do chat
#   SENHA_PAINEL  - senha que a equipe usa para abrir o painel
# Na primeira execucao eles sao pedidos em campo oculto e guardados
# cifrados em %LOCALAPPDATA%\estrela-hub\ (DPAPI: so' a sua conta do
# Windows, nesta maquina, consegue decifrar). Das proximas vezes o script
# le' de la' e nao pergunta mais nada.
#
# -SemPrompt  aborta em vez de perguntar, quando nao ha' nada guardado.
#             E' o modo usado por quem roda o script sem um humano na frente.
# -Cofre      pasta alternativa dos segredos. Existe para ensaiar a publicacao
#             numa copia do repo sem encostar no cofre de verdade.
# ============================================
[CmdletBinding()]
param([switch]$SemPrompt,
      [string]$Cofre = (Join-Path $env:LOCALAPPDATA 'estrela-hub'))

$ErrorActionPreference = 'Stop'
$RAIZ  = Split-Path -Parent $PSScriptRoot
$COFRE = $Cofre

function Falhar($msg) {
  Write-Host ''
  Write-Host "ABORTADO: $msg" -ForegroundColor Red
  Write-Host 'Nada foi publicado.' -ForegroundColor Red
  if (-not $SemPrompt) { Write-Host ''; Read-Host 'Enter para fechar' }
  exit 1
}

# --- segredos ---------------------------------------------------------------
# ConvertFrom-SecureString sem -Key cifra com a DPAPI do usuario corrente:
# o arquivo e' inutil em outra conta ou em outra maquina.
function Ler-Segredo($nome, $rotulo) {
  $arq = Join-Path $COFRE "$nome.sec"
  if (Test-Path $arq) {
    try {
      # .Trim() porque o blob da DPAPI e' hexadecimal puro: qualquer BOM ou
      # quebra de linha que sobre no arquivo faz o ConvertTo-SecureString
      # estourar. Por isso a gravacao abaixo usa ASCII (sem BOM no 5.1).
      $sec = (Get-Content $arq -Raw).Trim() | ConvertTo-SecureString
    } catch {
      Falhar "nao consegui decifrar $arq. Apague o arquivo e rode de novo para regravar."
    }
  } else {
    if ($SemPrompt) { Falhar "$rotulo nao esta guardado em $COFRE e o modo -SemPrompt nao pergunta." }
    Write-Host ''
    Write-Host "  $rotulo" -ForegroundColor Cyan
    Write-Host '  (a digitacao fica oculta; sera guardado cifrado para as proximas vezes)'
    $sec = Read-Host '  >' -AsSecureString
    if ($sec.Length -eq 0) { Falhar "$rotulo veio vazio." }
    New-Item -ItemType Directory -Force -Path $COFRE | Out-Null
    $sec | ConvertFrom-SecureString | Set-Content -Path $arq -Encoding ascii
  }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host ''
Write-Host '  Hub Comercial - publicacao do painel' -ForegroundColor Cyan
Write-Host '  ------------------------------------'

$token = Ler-Segredo 'painel-token' 'Token do Worker do chat (PAINEL_TOKEN)'
$senha = Ler-Segredo 'painel-senha' 'Senha do painel (a mesma que a equipe usa hoje)'

# --- 1. gerar ---------------------------------------------------------------
$aberto = Join-Path $env:USERPROFILE 'Downloads\painel-aberto.html'
if (-not (Test-Path $aberto)) { Falhar "painel aberto nao encontrado em $aberto" }

Write-Host ''
Write-Host '  [1/4] gerando o painel criptografado...' -ForegroundColor Cyan
$env:PAINEL_TOKEN = $token
$env:SENHA_PAINEL = $senha
try {
  python (Join-Path $RAIZ 'build\encrypt_painel.py') $aberto
  $codigo = $LASTEXITCODE
} finally {
  # Os segredos saem do ambiente do processo mesmo se o python explodir.
  Remove-Item Env:\PAINEL_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:\SENHA_PAINEL -ErrorAction SilentlyContinue
}
if ($codigo -ne 0) { Falhar "encrypt_painel.py saiu com codigo $codigo (veja a mensagem acima)." }

# --- 2. bumpar o cache do service worker ------------------------------------
# Sem isso quem tem o PWA instalado continua vendo a versao antiga offline.
Write-Host '  [2/4] bumpando o cache do service worker...' -ForegroundColor Cyan
$swArq = Join-Path $RAIZ 'docs\sw.js'
$sw    = Get-Content $swArq -Raw
$hoje  = (Get-Date).ToString('yyMMdd')
if ($sw -match "estrela-painel-(\d{6})-(\d+)") {
  $n = if ($Matches[1] -eq $hoje) { [int]$Matches[2] + 1 } else { 1 }
  $sw = $sw -replace "estrela-painel-\d{6}-\d+", "estrela-painel-$hoje-$n"
  Set-Content -Path $swArq -Value $sw -Encoding utf8 -NoNewline
  Write-Host "        CACHE = estrela-painel-$hoje-$n"
} else {
  Falhar 'nao achei a linha do CACHE em docs/sw.js.'
}

# --- 3. commitar ------------------------------------------------------------
Write-Host '  [3/4] commitando...' -ForegroundColor Cyan
Push-Location $RAIZ
try {
  # Trava final: o painel ABERTO nunca pode entrar num repositorio publico.
  $sujo = git status --porcelain
  if ($sujo -match 'painel-aberto|\-aberto\.html|plaintext') {
    Falhar 'ha um painel ABERTO no diretorio do repositorio. Nao commitei nada.'
  }
  git add docs/
  if (-not (git diff --cached --name-only)) {
    Write-Host '        nada mudou em docs/ - nada a publicar.' -ForegroundColor Yellow
    Pop-Location
    if (-not $SemPrompt) { Write-Host ''; Read-Host 'Enter para fechar' }
    exit 0
  }
  git commit -q -m "gestao: painel $((Get-Date).ToString('dd/MM/yyyy HH:mm'))"
  if ($LASTEXITCODE -ne 0) { Falhar 'git commit falhou.' }

  # --- 4. publicar ----------------------------------------------------------
  Write-Host '  [4/4] publicando (git push)...' -ForegroundColor Cyan
  git push
  if ($LASTEXITCODE -ne 0) { Falhar 'git push falhou.' }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host '  PUBLICADO.' -ForegroundColor Green
Write-Host '  https://humanidade-grupo.github.io/estrela/'
Write-Host '  (o GitHub Pages leva ~1 minuto para trocar a versao)'
Write-Host ''
if (-not $SemPrompt) { Read-Host 'Enter para fechar' }
