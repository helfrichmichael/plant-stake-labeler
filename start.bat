@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo    Plant Stake Labeler - Launcher (Windows)
echo ==================================================
echo.

REM 1. Check build status
if not exist "dist\label-live-app\browser\index.html" (
    echo [Setup] First-time build setup required...
    where npm >nul 2>nul
    if %errorlevel% neq 0 (
        echo [Error] Node.js and npm are required for first-time build setup.
        echo Please install Node.js from https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    if not exist "node_modules" (
        echo [Setup] Installing dependencies (npm install)...
        call npm install
        if %errorlevel% neq 0 (
            echo [Error] npm install failed.
            pause
            exit /b 1
        )
    )
    echo [Setup] Compiling application (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [Error] npm run build failed.
        pause
        exit /b 1
    )
)

REM 2. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Python is required to run the local server.
    echo Please install Python 3 from https://www.python.org/
    pause
    exit /b 1
)

echo [Launch] Starting Plant Stake Labeler on http://localhost:4200...
start "" http://localhost:4200
python server.py 4200
