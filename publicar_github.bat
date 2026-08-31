@echo off
title RADAR B3 PRO IA - Publicar no GitHub
color 0A

echo ============================================================
echo   RADAR B3 PRO IA - PUBLICAR CODIGO NO GITHUB
echo ============================================================
echo.
echo Repositorio destino: https://github.com/jrveloso8-ai/RADARB3
echo.

:: 1. Adicionar todos os arquivos modificados e novos
echo [1/3] Adicionando arquivos modificados e novos...
git add .

:: 2. Solicitar mensagem de commit opcional
echo.
set /p COMMIT_MSG="[2/3] Digite a mensagem do commit (ou pressione Enter para padrao): "
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Atualizacao automatica: %DATE% %TIME%
)

echo Gravando alteracoes no Git...
git commit -m "%COMMIT_MSG%"

:: 3. Enviar para o GitHub
echo.
echo [3/3] Enviando branch main para o GitHub...
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   [SUCESSO] O codigo foi enviado para o GitHub com sucesso!
    echo   Acesse seu repositorio: https://github.com/jrveloso8-ai/RADARB3
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   [AVISO] Verifique se ha conflitos ou se sua conta do GitHub
    echo   requer autenticacao no navegador.
    echo ============================================================
)

echo.
pause
