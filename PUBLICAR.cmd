@echo off
REM ============================================
REM  grupo-humanidade / hub comercial / gestao / estrela
REM  Gerado em: 12/08/2026 15:20
REM  Duplo-clique aqui para publicar o painel. Na primeira vez ele pede a
REM  senha do painel e o token do Worker (digitacao oculta) e guarda os dois
REM  cifrados na sua conta do Windows; depois disso nao pergunta mais nada.
REM ============================================
title Hub Comercial - publicar painel
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build\publicar.ps1"
