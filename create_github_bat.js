const fs = require('fs');
const path = require('path');

const target = 'C:/projetos antigravity/RADAR-TASYTRADE/atualizar_github.bat';

const batContent = `@echo off
title RADAR TASTYTRADE - ATUALIZAR GITHUB
cls
echo ===================================================
echo   RADAR TASTYTRADE PRO IA - ATUALIZADOR DO GITHUB
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando status dos arquivos modificados...
git status -s
echo.

set /p MSG="Digite a mensagem do commit (ou pressione ENTER para mensagem padrao): "
if "%MSG%"=="" (
    set MSG=Update: Atualizacao do Radar Tastytrade %date% %time%
)

echo.
echo [2/4] Adicionando arquivos ao palco (Staging)...
git add .

echo.
echo [3/4] Criando commit com a mensagem: "%MSG%"...
git commit -m "%MSG%"

echo.
echo [4/4] Enviando alteracoes para o GitHub (branch main)...
git push origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo   [SUCESSO] Codigo atualizado com sucesso no GitHub!
    echo   Repositorio: https://github.com/jrveloso8-ai/tastyradar
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo   [ALERTA] Ocorreu um problema ao enviar para o GitHub.
    echo   Verifique sua conexao ou credenciais.
    echo ===================================================
)

echo.
pause
`;

fs.writeFileSync(target, batContent, 'utf8');
console.log('Created atualizar_github.bat successfully');
