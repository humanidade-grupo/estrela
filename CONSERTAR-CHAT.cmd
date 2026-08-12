@echo off
REM ============================================
REM  grupo-humanidade / hub comercial / gestao / estrela
REM  Gerado em: 12/08/2026 17:05
REM  Duplo-clique aqui quando o chat do painel responder 401.
REM  Regrava no Worker o token que ja' esta' no cofre, sem a quebra de linha
REM  que o pipeline do PowerShell acrescentava (a causa do 401). Nao gera
REM  token novo e nao mexe na senha do painel.
REM  Depois deste, rode o PUBLICAR.cmd para o painel sair com o token certo.
REM ============================================
title Hub Comercial - consertar o chat (401)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build\rotacionar-token.ps1" -Reenviar
echo.
pause
