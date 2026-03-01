@echo off
REM KARN Auto Installer for Windows CMD

echo 🤖 KARN Auto Installer
echo ======================

REM Check if Bun is installed
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Bun already installed
) else (
    echo 📦 Bun not found. Installing Bun...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    
    REM Refresh PATH
    call refreshenv >nul 2>nul
    
    echo ✅ Bun installed successfully!
)

REM Install KARN
echo 📦 Installing KARN...
bun install -g kathawut-ai

echo.
echo 🎉 Installation complete!
echo Run 'karn' to start the bot
pause
