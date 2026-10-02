@echo off
setlocal EnableDelayedExpansion
title Finance Tracker - Starting servers...

set ROOT=%~dp0

echo ============================================
echo  Finance Tracker - Server Startup
echo  %date% %time%
echo ============================================
echo.

REM ── Kill any stale process on port 3001 (backend) ────────────────────────────
echo [1/5] Checking for stale backend process on port 3001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Write-Host '      Killing stale backend PID' $_.OwningProcess; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

REM ── Kill any stale process on port 3000 (frontend) ───────────────────────────
echo [2/5] Checking for stale frontend process on port 3000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Write-Host '      Killing stale frontend PID' $_.OwningProcess; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

REM Brief pause to let ports fully release
timeout /t 2 /nobreak >nul

REM ── Start backend (Express on port 3001) ─────────────────────────────────────
echo [3/5] Starting backend (port 3001)...
start "Finance Backend" /MIN cmd /c "cd /d "%ROOT%backend" && node server.js"

REM Wait for backend to be ready (up to 15 seconds)
echo [4/5] Waiting for backend to be ready...
set /a attempts=0
:wait_backend
timeout /t 2 /nobreak >nul
set /a attempts+=1
curl -s "http://localhost:3001/api/fx/usd-inr" >nul 2>&1
if %errorlevel%==0 (
    echo       Backend is UP.
    goto backend_ready
)
if %attempts% lss 8 goto wait_backend
echo       WARNING: Backend health check timed out, continuing anyway...

:backend_ready

REM ── Start frontend (Vite on port 3000) ───────────────────────────────────────
echo [5/5] Starting frontend (port 3000)...
start "Finance Frontend" /MIN cmd /c "cd /d "%ROOT%frontend" && node node_modules/vite/bin/vite.js --port 3000 --host"

echo.
echo ============================================
echo  Servers started successfully!
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:3001
echo ============================================
echo.
echo Verifying rates endpoint...
timeout /t 3 /nobreak >nul
curl -s "http://localhost:3001/api/quotes?symbols=MSFT" 2>nul | findstr "regularMarketPrice" >nul
if %errorlevel%==0 (
    echo  Rates fetch: OK
) else (
    echo  Rates fetch: Not ready yet (normal during startup)
)
echo.
echo Window will close in 5 seconds...
timeout /t 5 /nobreak >nul
exit
