# KARN Auto Installer for Windows

Write-Host "🤖 KARN Auto Installer" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta

# Check if Bun is installed
try {
    $bunVersion = bun --version 2>$null
    Write-Host "✅ Bun already installed ($bunVersion)" -ForegroundColor Green
} catch {
    Write-Host "📦 Bun not found. Installing Bun..." -ForegroundColor Yellow
    irm bun.sh/install.ps1 | iex
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Bun installed successfully!" -ForegroundColor Green
}

# Install KARN
Write-Host "📦 Installing KARN..." -ForegroundColor Yellow
bun install -g kathawut-ai

# Create proper wrapper for Windows
$bunBinPath = "$env:USERPROFILE\.bun\bin"
$wrapperPath = "$bunBinPath\karn.cmd"

$wrapperContent = @"
@echo off
bun "%~dp0karn" %*
"@

Set-Content -Path $wrapperPath -Value $wrapperContent -Force
Write-Host "✅ Created Windows wrapper" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Installation complete!" -ForegroundColor Green
Write-Host "Run 'karn' to start the bot" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: If 'karn' doesn't work, try 'bun karn' instead" -ForegroundColor Yellow
