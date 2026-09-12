@echo off
setlocal EnableDelayedExpansion
title Portao de Auditoria (Audit Gate) - RADAR B3 PRO IA
cd /d "%~dp0"
set "PATH=C:\Program Files\Git\usr\bin;%PATH%"

echo ===================================================
echo   Portao de Auditoria (Audit Gate) - RADAR B3 PRO IA
echo ===================================================
echo.
echo Regra de ouro: se algum teste ou verificacao falhar, a
echo correcao e no codigo de producao (opportunity-radar.ts,
echo market-quotes.ts, sentiment.ts, TradingViewOverview.tsx,
echo black-scholes.ts, brapi.ts, options-barriers.ts,
echo Navbar.tsx, analytics/track/route.ts etc) - NUNCA
echo enfraquecendo o teste ou o script de verificacao.
echo.

if not exist node_modules (
    echo node_modules nao encontrado. Rodando "npm install" primeiro...
    echo ^(isso pode levar alguns minutos^)
    echo.
    call npm install
    echo.
)

echo Executando toda a suite de testes (vitest run, testes colocados
echo em src\lib\domain\*.test.ts) ...
echo ---------------------------------------------------
call npx vitest run
set GATE_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

echo Executando script anti-dados-fabricados (scripts\check-fabricated-data.js) ...
echo ---------------------------------------------------
call node scripts\check-fabricated-data.js
set FABRICATED_RESULT=%ERRORLEVEL%
echo ---------------------------------------------------
echo.

REM ---------------------------------------------------------------
REM ESLint (REGRA 00): este projeto AINDA NAO TEM eslint configurado
REM (nao ha .eslintrc/eslint.config.* nem eslint no package.json).
REM A verificacao abaixo so roda se um eslint config existir; caso
REM contrario, e pulada e sinalizada como pendencia, nao como "ok".
REM ---------------------------------------------------------------
set ESLINT_RESULT=0
set ESLINT_SKIPPED=0
if exist .eslintrc.json goto :run_eslint
if exist .eslintrc.js goto :run_eslint
if exist eslint.config.mjs goto :run_eslint
if exist eslint.config.js goto :run_eslint
set ESLINT_SKIPPED=1
goto :after_eslint

:run_eslint
echo Verificando REGRA 00 (ESLint: numero magico / .toFixed solto em JSX
echo fora de DataValue.tsx, e fallback magico em domain/services) ...
echo ---------------------------------------------------
call npx eslint src/components --ext .tsx,.jsx
set ESLINT_RESULT=%ERRORLEVEL%
call npx eslint src/lib/domain src/lib/services --ext .ts
if !ERRORLEVEL! NEQ 0 set ESLINT_RESULT=!ERRORLEVEL!
echo ---------------------------------------------------
echo.

:after_eslint

echo Verificando se o codigo COMMITADO compila sozinho (git stash + tsc) ...
echo ^(isso pega o caso de um commit depender de arquivo que ficou so na pasta,
echo   sem nunca ter sido commitado - passar no teste acima NAO garante isso^)
echo ---------------------------------------------------
set STATUS_OUT=%TEMP%\audit_gate_status_out.txt
git status --porcelain > "%STATUS_OUT%" 2>nul
set DIRTY_COUNT=0
for %%A in ("%STATUS_OUT%") do if %%~zA GTR 0 set DIRTY_COUNT=1
del "%STATUS_OUT%" >nul 2>&1
set TSC_RESULT=0
set TSC_OUT=%TEMP%\audit_gate_tsc_out.txt

if "%DIRTY_COUNT%"=="0" (
    echo Pasta de trabalho ja esta limpa - typecheck roda direto no HEAD.
    call npx tsc --noEmit > "%TSC_OUT%" 2>&1
    type "%TSC_OUT%"
    findstr /I /V "next\types next/types" "%TSC_OUT%" | findstr /I "error TS" >nul
    if !ERRORLEVEL! EQU 0 (set TSC_RESULT=1) else (set TSC_RESULT=0)
) else (
    echo Ha arquivo^(s^) nao commitado^(s^). Isolando o HEAD com
    echo "git stash" para checar se o que esta COMMITADO compila sozinho...
    call git stash --include-untracked -m "audit-gate-typecheck-temp"
    call npx tsc --noEmit > "%TSC_OUT%" 2>&1
    type "%TSC_OUT%"
    findstr /I /V "next\types next/types" "%TSC_OUT%" | findstr /I "error TS" >nul
    if !ERRORLEVEL! EQU 0 (set TSC_RESULT=1) else (set TSC_RESULT=0)
    echo Restaurando a pasta de trabalho...
    call git stash pop
    if !ERRORLEVEL! NEQ 0 (
        echo.
        echo ===================================================
        echo ATENCAO: "git stash pop" NAO restaurou a pasta de trabalho
        echo automaticamente ^(pode ser um arquivo em conflito^). Suas
        echo mudancas NAO foram perdidas - elas continuam guardadas em
        echo "git stash list". NAO feche esta janela ainda: rode
        echo "git stash show stash@{0} --stat" para ver o que esta
        echo pendente e resolva o conflito antes de continuar, ou peca
        echo ajuda ao auditor.
        echo ===================================================
        echo.
    )
)
del "%TSC_OUT%" >nul 2>&1
echo ---------------------------------------------------
echo.
echo DIAGNOSTICO INTERNO ^(nao apague esta linha ao colar o resultado^):
echo   DIRTY_COUNT=%DIRTY_COUNT% TSC_RESULT=%TSC_RESULT% ESLINT_SKIPPED=%ESLINT_SKIPPED%
echo.

if %GATE_RESULT% NEQ 0 (
    echo RESULTADO: AINDA HA TESTE^(S^) FALHANDO ^(veja as falhas em vermelho acima^).
    echo Corrija o codigo apontado por cada teste e rode este .bat de novo.
) else if %FABRICATED_RESULT% NEQ 0 (
    echo RESULTADO: TESTES PASSARAM, MAS O CHECK-FABRICATED-DATA.JS ENCONTROU
    echo VIOLACAO SEM TAG PROVENANCE ^(veja acima^). Corrija o dado fabricado
    echo ou classifique explicitamente a proveniencia antes de reportar.
) else if %TSC_RESULT% NEQ 0 (
    echo RESULTADO: TESTES E SCRIPT ANTI-FABRICACAO PASSARAM, MAS O CODIGO
    echo COMMITADO NAO COMPILA ^(veja os erros de typecheck acima^). Isso
    echo significa que algum commit depende de arquivo que ainda nao foi
    echo commitado. Commite o que falta e rode este .bat de novo antes de
    echo reportar a rodada como fechada.
) else if %ESLINT_SKIPPED% EQU 1 (
    echo RESULTADO: TESTES, SCRIPT ANTI-FABRICACAO E TYPECHECK PASSARAM.
    echo PENDENCIA: nao ha ESLint configurado neste projeto ainda, entao a
    echo REGRA 00 ^(nenhum numero magico/.toFixed solto em JSX fora de
    echo DataValue.tsx^) NAO foi verificada automaticamente. Isso NAO deve
    echo ser tratado como "gate limpo" - e uma lacuna conhecida a fechar
    echo antes de confiar no gate para fases futuras.
) else if %ESLINT_RESULT% NEQ 0 (
    echo RESULTADO: TESTES, SCRIPT ANTI-FABRICACAO E TYPECHECK PASSARAM, MAS
    echo HA VIOLACAO DA REGRA 00 DE ESLINT ^(veja os erros acima^). So
    echo considere a rodada fechada quando a tela que voce esta migrando
    echo nesta rodada nao aparecer mais nesta lista.
) else (
    echo RESULTADO: TODOS OS TESTES PASSARAM, O SCRIPT ANTI-FABRICACAO NAO
    echo ENCONTROU VIOLACAO SEM TAG, O CODIGO COMMITADO COMPILA E A REGRA 00
    echo DE ESLINT ESTA CONFORME.
)

echo.
echo ===================================================
echo Esta janela NAO vai fechar sozinha.
echo Copie o resultado acima e feche manualmente quando terminar.
echo ===================================================
echo.
cmd /k