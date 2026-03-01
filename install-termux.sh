#!/data/data/com.termux/files/usr/bin/bash
# KARN Auto Installer for Termux (Android)

echo "🤖 KARN Auto Installer for Termux"
echo "=================================="

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ]; then
    echo "❌ This script is for Termux only!"
    echo "Please install Termux from F-Droid or Google Play"
    exit 1
fi

# Update packages
echo "📦 Updating Termux packages..."
pkg update -y

# Install Node.js (Bun doesn't support Android yet)
echo "📦 Installing Node.js..."
pkg install -y nodejs

# Install KARN
echo "📦 Installing KARN..."
npm install -g kathawut-ai

echo ""
echo "🎉 Installation complete!"
echo "Run 'karn' to start the bot"
echo ""
echo "📱 Termux Tips:"
echo "- Grant storage permission: termux-setup-storage"
echo "- Keep Termux running: Use 'Acquire Wakelock' in notification"
echo "- Config files are in: ~/.karn/"
echo ""
echo "⚠️  Note: Android uses Node.js instead of Bun"
