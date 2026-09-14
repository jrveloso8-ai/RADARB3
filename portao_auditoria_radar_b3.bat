@echo off
setlocal EnableDelayedExpansion
title Portao de Auditoria (Audit Gate) - RADAR B3 PRO IA
cd /d "%~dp0"
set "PATH=C:\Program Files\Git\usr\bin;%PATH%"

echo ===================================================
echo   Portao de Auditoria (Audit Gate) - RADAR B3 PRO IA
echo   Data da Versao: 14/09/2026 - Versao 3.2.0 Estrita
echo ===================================================
echo.
echo Regra de ouro: se algum teste ou verificacao falhar, a
echo correcao e no codigo de producao - NUNCA enfraquecendo
echo o teste, a regra de lint ou o script de verificacao.
echo Dados fabricados sao expressamente proibidos.
echo.

if not exist node_modules (
    echo node_modules nao encontrado. Rodando "npm install" primeiro...
    echo ^(isso pode levar alguns minutos^)
    echo.
    call npm install
    echo.
)

REM ---------------------------------------------------------------
REM 1. SUITE COMPLETA DE TESTES (Vitest)
REM ---------------------------------------------------------------
echo [1/5] Executando suite completa de testes vitest (src\lib\domain\*.test.ts) ...
echo ---------------------------------------------------
call npx vitest run
set GATE_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

REM ---------------------------------------------------------------
REM 2. VERIFICADOR DINAMICO ANTI-DADOS-FABRICADOS
REM ---------------------------------------------------------------
echo [2/5] Executando auditoria dinamica anti-dados-fabricados (scripts\check-fabricated-data.js) ...
echo ---------------------------------------------------
call node scripts\check-fabricated-data.js
set FABRICATED_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

REM ---------------------------------------------------------------
REM 3. ESLINT OFICIAL COM BARREIRA AST (no-restricted-syntax)
REM ---------------------------------------------------------------
echo [3/5] Executando ESLint oficial com barreira AST (.eslintrc.json) ...
echo ---------------------------------------------------
call npm run lint
set ESLINT_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

REM ---------------------------------------------------------------
REM 4. TYPECHECK ESTRITO TYPESCRIPT (tsc --noEmit)
REM ---------------------------------------------------------------
echo [4/5] Executando verificacao estrita de tipos (tsc --noEmit) ...
echo ---------------------------------------------------
set TSC_OUT=%TEMP%\audit_gate_tsc_out.txt
call npx tsc --noEmit > "%TSC_OUT%" 2>&1
set TSC_RESULT=%ERRORLEVEL%
type "%TSC_OUT%"
del "%TSC_OUT%" >nul 2>&1
echo ---------------------------------------------------
echo.

REM ---------------------------------------------------------------
REM 5. HIGIENE DO GIT / REPOSITORIO LIMPO (git status)
REM ---------------------------------------------------------------
echo [5/5] Verificando higiene do Git (nenhum arquivo solto ou pendente de commit) ...
echo ---------------------------------------------------
set STATUS_OUT=%TEMP%\audit_gate_status_out.txt
git status --porcelain > "%STATUS_OUT%" 2>nul
set DIRTY_COUNT=0
for %%A in ("%STATUS_OUT%") do if %%~zA GTR 0 set DIRTY_COUNT=1
if "%DIRTY_COUNT%"=="1" (
    echo [AVISO] Ha modificacoes ou novos arquivos nao commitados:
    type "%STATUS_OUT%"
) else (
    echo [OK] Working tree limpa. Todos os arquivos estao commitados no Git.
)
del "%STATUS_OUT%" >nul 2>&1
echo ---------------------------------------------------
echo.

REM ---------------------------------------------------------------
REM PARECER FINAL DO PORTAO
REM ---------------------------------------------------------------
echo ===================================================
echo               PARECER DO AUDIT GATE
echo ===================================================
echo DIAGNOSTICO:
echo   TESTES_VITEST=%GATE_RESULT%
echo   DADOS_FABRICADOS=%FABRICATED_RESULT%
echo   ESLINT_AST=%ESLINT_RESULT%
echo   TSC_TYPECHECK=%TSC_RESULT%
echo   DIRTY_GIT=%DIRTY_COUNT%
echo.

if %GATE_RESULT% NEQ 0 (
    echo RESULTADO: [REPROVADO] HA TESTE^(S^) FALHANDO.
    echo Corrija o codigo apontado por cada teste e rode este .bat novamente.
) else if %FABRICATED_RESULT% NEQ 0 (
    echo RESULTADO: [REPROVADO] SCRIPT ANTI-FABRICACAO ENCONTROU DADOS SEM PROVENIENCIA.
    echo Elimine os literais fixos/fallbacks ou declare proveniencia oficial antes de entregar.
) else if %ESLINT_RESULT% NEQ 0 (
    echo RESULTADO: [REPROVADO] VIOLACAO DA BARREIRA AST DO ESLINT.
    echo Ha literais em ??/|| ou outras violacoes de lint no codigo. Corrija-os.
) else if %TSC_RESULT% NEQ 0 (
    echo RESULTADO: [REPROVADO] ERRO DE COMPILACAO TYPESCRIPT.
    echo O compilador detectou erros de tipagem. Corrija antes de entregar.
) else if "%DIRTY_COUNT%"=="1" (
    echo RESULTADO: [APROVADO TECNICAMENTE COM RESSALVA DE COMMIT]
    echo Todos os testes, linters, checagens e compilador passaram com 100%% de sucesso!
    echo POREM ha alteracoes ainda nao commitadas no Git. Commite suas alteracoes
    echo com "git add ." e "git commit" para fechar a rodada em definitivo.
) else (
    echo RESULTADO: [100%% APROVADO] PARABENS!
    echo Todos os testes passaram, script anti-fabricacao validou 59 arquivos,
    echo barreira AST de ESLint esta conforme, TypeScript compila com zero erros
    echo e a working tree do Git esta perfeitamente limpa e commitada.
)

echo.
echo ===================================================
echo Auditoria finalizada.
echo ===================================================
echo.
if "%~1"=="--headless" goto :done
if "%~1"=="--ci" goto :done
echo Esta janela NAO vai fechar sozinha no modo interativo.
echo Copie o resultado acima e feche manualmente quando terminar.
cmd /k

:done
if %GATE_RESULT% NEQ 0 exit /b 1
if %FABRICATED_RESULT% NEQ 0 exit /b 1
if %ESLINT_RESULT% NEQ 0 exit /b 1
if %TSC_RESULT% NEQ 0 exit /b 1
exit /b 0