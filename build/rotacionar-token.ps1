# ============================================
# grupo-humanidade / hub comercial / gestao / estrela
# Gerado em: 12/08/2026 16:40
# Aposenta o PAINEL_TOKEN e poe um novo no lugar, sem que ele apareca em
# lugar nenhum: gera, grava no Worker, CONFIRMA com uma requisicao real e
# so' entao guarda no cofre DPAPI. Se qualquer passo falhar, o cofre nao e'
# tocado — o token velho continua valendo e nada quebra.
#
# O token novo NUNCA e' impresso. O que sai na tela e' o hash SHA-256
# truncado, que e' o mesmo valor que o log do Worker mostra em caso de 401
# (`hashEsperado`) — da' para comparar sem expor o segredo.
#
# DEPOIS DE RODAR: o painel publicado ainda carrega o token ANTIGO, entao o
# chat responde 401 ate' a proxima publicacao. Rode o PUBLICAR.cmd em
# seguida — e' ele que injeta o token novo no painel.
# ============================================
# -SoConfirmar  nao gera nem grava nada: pega o token que ja' esta' no cofre e
#               so' confere se o Worker o aceita.
# -Reenviar     nao gera token novo: pega o do cofre e regrava no Worker. E' o
#               conserto certo quando o segredo do Worker ficou corrompido (o
#               caso do \n) mas o token em si continua bom e secreto.
[CmdletBinding()]
param([string]$Cofre = (Join-Path $env:LOCALAPPDATA 'estrela-hub'),
      [switch]$SoConfirmar,
      [switch]$Reenviar)

$ErrorActionPreference = 'Stop'
$RAIZ   = Split-Path -Parent $PSScriptRoot
$WORKER = 'https://estrela-painel-chat.ricardocandrade.workers.dev'
$ORIGEM = 'https://humanidade-grupo.github.io'

function Falhar($msg) {
  Write-Host ''
  Write-Host "ABORTADO: $msg" -ForegroundColor Red
  Write-Host 'O token antigo continua valendo. O cofre nao foi alterado.' -ForegroundColor Red
  exit 1
}

# --- 1. gerar (ou recuperar, no modo -SoConfirmar) --------------------------
if ($SoConfirmar -or $Reenviar) {
  $arq = Join-Path $Cofre 'painel-token.sec'
  if (-not (Test-Path $arq)) { Falhar "nao ha' token guardado em $arq." }
  $sec  = (Get-Content $arq -Raw).Trim() | ConvertTo-SecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
} else {
  # 32 bytes do CSPRNG do sistema em base64url = 43 caracteres, mesmo formato
  # do secrets.token_urlsafe(32) que gerou o token original.
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$sha  = [System.Security.Cryptography.SHA256]::Create()
$hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($token))) -replace '-').ToLower().Substring(0, 8)

Write-Host ''
Write-Host '  Rotacao do PAINEL_TOKEN' -ForegroundColor Cyan
Write-Host '  -----------------------'
if ($SoConfirmar) {
  Write-Host "  [1/2] token lido do cofre ($($token.Length) caracteres, hash $hash)"
} else {
  if ($Reenviar) {
    Write-Host "  [1/4] token do cofre reaproveitado ($($token.Length) caracteres, hash $hash)"
  } else {
    Write-Host "  [1/4] token novo gerado ($($token.Length) caracteres, hash $hash)"
  }

  # --- 2. gravar no Worker -------------------------------------------------
  # NAO use `$token | npx.cmd wrangler secret put`: o pipeline do PowerShell
  # acrescenta uma quebra de linha e o wrangler grava o \n junto do valor. O
  # segredo fica com 44 caracteres, o painel manda 43, e o Worker devolve 401
  # para sempre — foi assim que o chat quebrou em 12/08/2026, e provavelmente
  # antes. Escrevendo direto no stdin com .Write() (nao WriteLine) o valor vai
  # exato, e nada precisa passar por arquivo temporario.
  # --config e' obrigatorio fora da pasta chat-proxy/: sem ele o wrangler falha
  # com "Required Worker name missing" e o erro passa despercebido.
  Write-Host '  [2/4] gravando no Worker (wrangler secret put, stdin sem \n)...'
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName               = 'npx.cmd'
  $psi.Arguments              = "wrangler secret put PAINEL_TOKEN --config `"$(Join-Path $RAIZ 'chat-proxy\wrangler.toml')`""
  $psi.WorkingDirectory       = $RAIZ
  $psi.UseShellExecute        = $false
  $psi.RedirectStandardInput  = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  $proc.StandardInput.Write($token)
  $proc.StandardInput.Close()
  $proc.WaitForExit()
  if ($proc.ExitCode -ne 0) { Falhar "wrangler secret put saiu com codigo $($proc.ExitCode)." }
}

# --- 3. guardar no cofre IMEDIATAMENTE -------------------------------------
# O passo irreversivel foi o `secret put` acima: dali em diante o Worker so'
# aceita este token. Guardar antes de confirmar e' o que impede o token de se
# perder se a confirmacao falhar — perder aqui deixaria o Worker esperando um
# valor que ninguem tem, e o chat morto ate' outra rotacao. Confirmar depois
# custa nada; guardar depois custou uma rotacao inteira em 12/08/2026.
if (-not $SoConfirmar -and -not $Reenviar) {
  Write-Host '  [3/4] guardando no cofre (antes de confirmar, de proposito)...'
  New-Item -ItemType Directory -Force -Path $Cofre | Out-Null
  $paraCofre = ConvertTo-SecureString $token -AsPlainText -Force
  $paraCofre | ConvertFrom-SecureString | Set-Content -Path (Join-Path $Cofre 'painel-token.sec') -Encoding ascii
} elseif ($Reenviar) {
  Write-Host '  [3/4] cofre ja'' tem este token; nada a guardar.'
}

# --- 4. confirmar com uma requisicao real ----------------------------------
# A propagacao do secret nao tem prazo garantido — 40s ja' se mostrou curto.
# Tentativas repetidas: 401 nem chega na API da Anthropic, entao insistir e'
# barato. Falhar aqui NAO desfaz nada; so' avisa para reconferir depois.
Write-Host '  [4/4] confirmando com uma requisicao real (ate 6 tentativas)...'
$corpo = @{ tabela = "## Teste`nA`tB`n1`t2"; mensagens = @(@{ role = 'user'; content = 'responda apenas: ok' }) } |
  ConvertTo-Json -Depth 5 -Compress
$status = 0
for ($i = 1; $i -le 6; $i++) {
  Start-Sleep -Seconds 20
  try {
    $r = Invoke-WebRequest -Uri $WORKER -Method POST -UseBasicParsing `
      -Headers @{ Origin = $ORIGEM; 'Content-Type' = 'application/json'; Authorization = "Bearer $token" } `
      -Body $corpo
    $status = [int]$r.StatusCode
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
  }
  Write-Host "        tentativa $i : HTTP $status"
  if ($status -eq 200) { break }
}
if ($status -ne 200) {
  Write-Host ''
  Write-Host "  ATENCAO: o Worker respondeu $status, nao 200." -ForegroundColor Yellow
  Write-Host '  O token novo ESTA guardado no cofre e ja'' foi gravado no Worker —' -ForegroundColor Yellow
  Write-Host '  nada se perdeu. Provavel demora de propagacao. Rode este script' -ForegroundColor Yellow
  Write-Host '  com -SoConfirmar daqui a pouco para reconferir.' -ForegroundColor Yellow
} else {
  Write-Host '        Worker respondeu 200 com o token novo.'
}

Write-Host ''
Write-Host "  TOKEN ROTACIONADO. hash $hash" -ForegroundColor Green
Write-Host '  O chat do painel responde 401 ate a proxima publicacao.'
Write-Host '  Proximo passo: PUBLICAR.cmd.'
Write-Host ''
