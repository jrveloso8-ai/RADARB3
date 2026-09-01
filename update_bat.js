const fs = require('fs');
const path = 'C:/projetos antigravity/RADAR-TASYTRADE/iniciar.bat';

const content = `@echo off
title RADAR TASTYTRADE PRO IA
echo ===================================================
echo   INICIANDO RADAR TASTYTRADE PRO IA + GEX ENGINE
echo ===================================================
echo.
cd /d "%~dp0"
echo [1/2] Abrindo o navegador em http://localhost:3000 ...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
echo [2/2] Iniciando servidor Next.js em tempo real...
echo.
npm run dev
pause
`;

fs.writeFileSync(path, content, 'utf8');
console.log('iniciar.bat updated successfully with automatic browser launch');
