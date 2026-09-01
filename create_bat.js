const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

const iniciarBat = `@echo off
title RADAR TASTYTRADE PRO IA
echo ===================================================
echo   INICIANDO RADAR TASTYTRADE PRO IA + GEX ENGINE
echo ===================================================
echo.
cd /d "%~dp0"
npm run dev
pause
`;

fs.writeFileSync(path.join(targetBase, 'iniciar.bat'), iniciarBat, 'utf8');
console.log('iniciar.bat created');
