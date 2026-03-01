#!/bin/bash
# KARN Auto Installer for macOS/Linux

echo "🤖 KARN Auto Installer"
echo "======================"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    
    # Add Bun to PATH for current session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    echo "✅ Bun installed successfully!"
else
    echo "✅ Bun already installed ($(bun --version))"
fi

# Install KARN
echo "📦 Installing KARN..."
bun install -g kathawut-ai

echo ""
echo "🎉 Installation complete!"
echo "Run 'karn' to start the bot"
