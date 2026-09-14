@echo off
cd /d "%~dp0"
title RADAR B3 PRO IA - Rollback Inteligente
color 0E

echo ================================================================
echo           RADAR B3 PRO IA - RESTAURACAO / ROLLBACK
echo ================================================================
echo.

node scripts/backup-manager.js rollback

echo.
pause
