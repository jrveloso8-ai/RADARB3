@echo off
cd /d "%~dp0"
title RADAR B3 PRO IA - Analise Financeira & Opcoes

echo ========================================================
echo         RADAR B3 PRO IA - MERCADO FINANCEIRO & OPCOES
echo ========================================================
echo.

:: 1. Criar arquivo de configuracao se nao existir
if not exist ".env.local" (
    if exist ".env.local.example" (
        echo [INFO] Criando .env.local...
        copy ".env.local.example" ".env.local" >nul
    )
)

:: 2. Instalar dependencias se nao existirem
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias do projeto...
    call npm install
)

:: 3. Garantir que as portas 3000 e 3001 estao livres (encerra processos zumbis anteriores)
echo [INFO] Verificando e liberando portas 3000 e 3001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 4. Abrir navegador em paralelo aguardando o servidor iniciar
start /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [INFO] Iniciando servidor Next.js na porta 3000...
echo ========================================================
echo   Acesse: http://localhost:3000
echo   Pressione Ctrl + C nesta janela para encerrar.
echo ========================================================
echo.

call npm run dev
