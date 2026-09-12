@echo off
setlocal EnableDelayedExpansion
title RADAR B3 PRO IA - Publicar no GitHub (COM PORTAO DE AUDITORIA)
cd /d "%~dp0"
set "PATH=C:\Program Files\Git\usr\bin;%PATH%"
color 0A

echo ============================================================
echo   RADAR B3 PRO IA - PUBLICAR NO GITHUB (SEGURO)
echo ============================================================
echo.
echo Este script SO publica se o Portao de Auditoria passar.
echo Se algo falhar abaixo, NADA e commitado nem enviado ao GitHub -
echo corrija o codigo e rode este .bat de novo.
echo.

REM ===========================================================
REM ETAPA 1 - PORTAO DE AUDITORIA (mesma logica do
REM portao_auditoria_radar_b3.bat, embutida aqui para nao depender
REM de encadear janelas)
REM ===========================================================

if not exist node_modules (
    echo node_modules nao encontrado. Rodando "npm install" primeiro...
    call npm install
    echo.
)

echo [1/5] Executando suite de testes (npx vitest run) ...
echo ---------------------------------------------------
call npx vitest run
set GATE_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

echo [2/5] Executando script anti-dados-fabricados ...
echo ---------------------------------------------------
call node scripts\check-fabricated-data.js
set FABRICATED_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

set ESLINT_RESULT=0
set ESLINT_SKIPPED=0
if exist .eslintrc.json goto :run_eslint
if exist .eslintrc.js goto :run_eslint
if exist eslint.config.mjs goto :run_eslint
if exist eslint.config.js goto :run_eslint
set ESLINT_SKIPPED=1
goto :after_eslint

:run_eslint
echo [3/5] Verificando REGRA 00 (ESLint) ...
echo ---------------------------------------------------
call npx eslint src/components --ext .tsx,.jsx
set ESLINT_RESULT=%ERRORLEVEL%
call npx eslint src/lib/domain src/lib/services --ext .ts
if !ERRORLEVEL! NEQ 0 set ESLINT_RESULT=!ERRORLEVEL!
echo ---------------------------------------------------
echo.

:after_eslint

echo [4/5] Verificando se o codigo ja commitado compila sozinho ...
echo ---------------------------------------------------
set TSC_RESULT=0
set TSC_OUT=%TEMP%\publicar_seguro_tsc_out.txt
call npx tsc --noEmit > "%TSC_OUT%" 2>&1
type "%TSC_OUT%"
findstr /I /V "next\types next/types" "%TSC_OUT%" | findstr /I "error TS" >nul
if !ERRORLEVEL! EQU 0 (set TSC_RESULT=1) else (set TSC_RESULT=0)
del "%TSC_OUT%" >nul 2>&1
echo ---------------------------------------------------
echo.

echo DIAGNOSTICO DO PORTAO:
echo   GATE_RESULT=%GATE_RESULT% FABRICATED_RESULT=%FABRICATED_RESULT% TSC_RESULT=%TSC_RESULT% ESLINT_SKIPPED=%ESLINT_SKIPPED% ESLINT_RESULT=%ESLINT_RESULT%
echo.

REM ===========================================================
REM DECISAO: so segue para commit/push se o portao estiver limpo.
REM ESLINT_SKIPPED=1 (config nao existe ainda) e uma pendencia
REM conhecida, NAO bloqueia a publicacao - mas e sempre avisado.
REM ===========================================================
set BLOQUEADO=0
if %GATE_RESULT% NEQ 0 set BLOQUEADO=1
if %FABRICATED_RESULT% NEQ 0 set BLOQUEADO=1
if %TSC_RESULT% NEQ 0 set BLOQUEADO=1
if %ESLINT_SKIPPED% EQU 0 if %ESLINT_RESULT% NEQ 0 set BLOQUEADO=1

if %BLOQUEADO% EQU 1 (
    echo ============================================================
    echo   [BLOQUEADO] O PORTAO DE AUDITORIA NAO PASSOU.
    echo   NADA foi commitado ou enviado ao GitHub.
    echo   Corrija o problema apontado acima e rode este .bat de novo.
    echo ============================================================
    echo.
    pause
    exit /b 1
)

if %ESLINT_SKIPPED% EQU 1 (
    echo [AVISO] ESLint nao configurado - Regra 00 nao verificada
    echo automaticamente. Publicando mesmo assim ^(pendencia conhecida,
    echo nao bloqueante^), mas registre isso no seu proximo relatorio.
    echo.
)

echo [5/5] Portao de auditoria OK. Prosseguindo para publicacao...
echo ============================================================
echo.
echo Repositorio destino: https://github.com/jrveloso8-ai/RADARB3
echo.

echo Adicionando arquivos modificados e novos...
git add .

echo.
set /p COMMIT_MSG="Digite a mensagem do commit (1 achado = 1 commit - seja especifico): "
if "%COMMIT_MSG%"=="" (
    echo [BLOQUEADO] Mensagem de commit vazia nao e permitida neste script
    echo seguro - descreva exatamente o que foi corrigido.
    pause
    exit /b 1
)

echo Gravando alteracoes no Git...
git commit -m "%COMMIT_MSG%"

echo.
echo Enviando branch main para o GitHub...
echo.
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   [SUCESSO] Portao passou e o codigo foi publicado no GitHub.
    echo   Guarde a saida completa desta janela como evidencia do
    echo   commit que acabou de subir - o auditor vai pedir isso.
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   [AVISO] O commit foi feito localmente, mas o push falhou.
    echo   Verifique conflitos ou autenticacao do GitHub e rode
    echo   "git push -u origin main" manualmente.
    echo ============================================================
)

echo.
pause
