@echo off
REM ============================================================
REM  JARVIS NEWS - lanzador para Windows (doble clic para abrir)
REM ============================================================
title JARVIS NEWS
cd /d "%~dp0"

echo.
echo   ====================================
echo      JARVIS NEWS - iniciando sistema
echo   ====================================
echo.

REM Instala dependencias la primera vez.
if not exist "node_modules" (
  echo   Instalando dependencias por primera vez...
  call npm install
)

REM Abre el navegador despues de 3 segundos.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"

echo   Servidor en: http://localhost:3000
echo   ^(Cierra esta ventana para detener JARVIS NEWS^)
echo.
node server.js

pause
