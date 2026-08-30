@echo off
title RADAR B3 PRO IA - Publicar no GitHub
color 0A

echo ============================================================
echo   RADAR B3 PRO IA - PUBLICAR CODIGO NO GITHUB
echo ============================================================
echo.
echo Repositorio destino: https://github.com/jrveloso8-ai/RADARB3
echo.
echo Enviando branch main para o GitHub...
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   SUCESSO! O codigo foi enviado para o GitHub com sucesso!
    echo   Acesse: https://github.com/jrveloso8-ai/RADARB3
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   Ops! Ocorreu um erro ou foi solicitada autenticacao.
    echo   Verifique sua conexao ou login no GitHub.
    echo ============================================================
)

echo.
pause
