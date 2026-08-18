@echo off
REM ============================================
REM  grupo-humanidade / painel-comercial (repo `estrela`)
REM  Reescrito em: 18/08/2026.
REM
REM  Este arquivo NAO conserta mais nada sozinho — de proposito.
REM
REM  Ate' 17/08 o chat tinha um token proprio, aleatorio, guardado num cofre
REM  DPAPI local e injetado no painel na hora de criptografar. Esse desenho
REM  acabou junto com a cifra. Hoje o Worker deve guardar exatamente o MESMO
REM  token que o Cofre exige — o que se digita uma vez por aparelho.
REM
REM  Se este .cmd continuasse chamando o build\rotacionar-token.ps1, um
REM  duplo-clique regravaria no Worker o token velho e aleatorio do cofre
REM  DPAPI: o chat pararia de vez, com cara de conserto.
REM ============================================
title Painel Comercial - o chat respondeu 401?

echo.
echo   O chat esta' respondendo 401?
echo.
echo   Significa que o PAINEL_TOKEN guardado no Worker nao e' o mesmo token
echo   do Cofre. Um comando resolve — ele pede o valor e nao o deixa no
echo   historico do shell:
echo.
echo       cd chat-proxy
echo       wrangler secret put PAINEL_TOKEN
echo.
echo   Cole o token do Cofre (o mesmo que o painel pede ao abrir) e pronto.
echo   Nao ha' nada a republicar depois: o painel nao carrega mais token
echo   nenhum dentro dele.
echo.
echo   Detalhes: chat-proxy\README.md
echo.
pause
