@echo off
cd /d "%~dp0"
title RADAR B3 PRO IA - Backup Rapido e Seletivo
color 0B

echo ================================================================
echo         RADAR B3 PRO IA - BACKUP RAPIDO E SELETIVO
echo ================================================================
echo.
echo  Copia exclusivamente arquivos necessarios (src/, configs, .env.local)
echo  Tempo estimado: menos de 1 segundo (sem node_modules nem .next)
echo.

set /p BACKUP_DESC="Digite uma descricao para o ponto (ou pressione ENTER): "
if "%BACKUP_DESC%"=="" (
    set BACKUP_DESC=Checkpoint Manual
)

node scripts/backup-manager.js backup "%BACKUP_DESC%"

pause
