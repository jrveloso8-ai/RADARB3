@echo off
title RADAR B3 PRO IA - GERAR LINK PUBLICO
color 0A
cls

echo ========================================================
echo         RADAR B3 PRO IA - PUBLICAR LINK PUBLICO
echo ========================================================
echo.
echo [1/3] Liberando portas 3000 e 3001 no Windows...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/3] Iniciando servidor Next.js em modo de producao...
start "RADAR_B3_PRO_IA_SERVER" /min cmd /c "npm run start"

timeout /t 4 /nobreak > nul

echo [3/3] Criando tunel publico seguro (HTTPS) para compartilhamento...
echo.
echo ========================================================
echo  COPIE E ENVIE O LINK ABAIXO PARA QUEM FOR TESTAR:
echo ========================================================
echo.
npx --yes localtunnel --port 3000
pause
