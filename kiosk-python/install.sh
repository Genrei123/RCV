#!/bin/bash

# =========================================================================
# RCV Kiosk Installation Script for Raspberry Pi
# =========================================================================
# This script installs all dependencies, sets up the kiosk application,
# and configures it to auto-start on boot via systemd.
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
# =========================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  RCV Kiosk Installation Script"
echo "========================================="
echo "Install directory: $SCRIPT_DIR"
echo ""

# --------------------------------------------------
# 1. Check if running on Linux
# --------------------------------------------------
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is designed for Linux/Raspberry Pi"
    exit 1
fi

# --------------------------------------------------
# 2. Update system packages
# --------------------------------------------------
echo "📦 Updating system packages..."
sudo apt-get update -y

# --------------------------------------------------
# 3. Install system dependencies
# --------------------------------------------------
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    python3-tk \
    tesseract-ocr \
    tesseract-ocr-eng \
    libzbar0 \
    libzbar-dev \
    mpg123 \
    ffmpeg \
    libopencv-dev \
    python3-opencv \
    poppler-utils

# --------------------------------------------------
# 4. Create and activate virtual environment
# --------------------------------------------------
echo "🐍 Setting up Python virtual environment..."
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv --system-site-packages
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

source venv/bin/activate

# --------------------------------------------------
# 5. Install Python dependencies
# --------------------------------------------------
echo "🐍 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# --------------------------------------------------
# 6. Configure Tesseract OCR
# --------------------------------------------------
echo "🔧 Configuring Tesseract OCR..."
if command -v tesseract &> /dev/null; then
    echo "✅ Tesseract version: $(tesseract --version 2>&1 | head -1)"
else
    echo "⚠️  Tesseract not found in PATH. OCR may not work."
fi

# --------------------------------------------------
# 7. Create data directories
# --------------------------------------------------
echo "📁 Creating data directories..."
mkdir -p ~/kiosk_data/ocr_scans
mkdir -p ~/kiosk_temp

# --------------------------------------------------
# 8. Create .env file if it doesn't exist
# --------------------------------------------------
echo "🔧 Setting up environment..."
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "Creating default .env file..."
    cat > "$SCRIPT_DIR/.env" << 'ENVEOF'
# RCV API Configuration
RCV_API_URL=http://localhost:3000/api/v1

# Camera Configuration
CAMERA_INDEX=0

# Display Configuration
FULLSCREEN=1

# Kiosk Identity (auto-generated if empty)
# KIOSK_ID=
# KIOSK_NAME=
# KIOSK_ADDRESS=
# KIOSK_CITY=
# KIOSK_LAT=
# KIOSK_LNG=
ENVEOF
    echo "✅ Created .env file. Please update RCV_API_URL with your server address."
else
    echo "✅ .env file already exists"
fi

# --------------------------------------------------
# 9. Test camera access
# --------------------------------------------------
echo "📷 Testing camera access..."
if ls /dev/video* 1> /dev/null 2>&1; then
    echo "✅ Camera device(s) found:"
    ls -l /dev/video*
else
    echo "⚠️  No camera devices found. Please connect a USB camera."
fi

# --------------------------------------------------
# 10. Test GPIO access (Raspberry Pi only)
# --------------------------------------------------
echo "🔌 Checking GPIO access..."
if [ -d "/sys/class/gpio" ]; then
    echo "✅ GPIO available"
    if ! groups "$USER" | grep -q gpio; then
        echo "Adding $USER to gpio group..."
        sudo usermod -a -G gpio "$USER"
        echo "⚠️  Please log out and log back in for GPIO permissions to take effect."
    fi
else
    echo "⚠️  GPIO not available (not on Raspberry Pi?)"
fi

# --------------------------------------------------
# 11. Make run_kiosk.sh executable
# --------------------------------------------------
echo "📝 Setting up run_kiosk.sh..."
chmod +x "$SCRIPT_DIR/run_kiosk.sh"
echo "✅ run_kiosk.sh is ready"

# --------------------------------------------------
# 12. Create systemd service for auto-start on boot
# --------------------------------------------------
echo "🔧 Setting up auto-start on boot (systemd)..."

SERVICE_FILE="/etc/systemd/system/rcv-kiosk.service"
CURRENT_USER="$USER"

sudo bash -c "cat > $SERVICE_FILE" << SERVICEEOF
[Unit]
Description=RCV Kiosk - Product Verification Scanner
After=network-online.target graphical.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$CURRENT_USER/.Xauthority
ExecStart=$SCRIPT_DIR/run_kiosk.sh
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=graphical.target
SERVICEEOF

sudo systemctl daemon-reload
sudo systemctl enable rcv-kiosk.service
echo "✅ Kiosk service enabled (will auto-start on boot)"

# --------------------------------------------------
# 13. Create desktop launcher (optional)
# --------------------------------------------------
if [ -d "$HOME/Desktop" ]; then
    echo "🖥️  Creating desktop launcher..."
    cat > "$HOME/Desktop/rcv_kiosk.desktop" << DESKTOPEOF
[Desktop Entry]
Version=1.0
Type=Application
Name=RCV Kiosk
Comment=Launch RCV Product Verification Kiosk
Exec=$SCRIPT_DIR/run_kiosk.sh
Icon=camera
Terminal=false
Categories=Utility;
DESKTOPEOF
    chmod +x "$HOME/Desktop/rcv_kiosk.desktop"
    echo "✅ Desktop launcher created"
fi

# --------------------------------------------------
# Done!
# --------------------------------------------------
echo ""
echo "========================================="
echo "  ✅ Installation Complete!"
echo "========================================="
echo ""
echo "The kiosk is configured to:"
echo "  • Auto-start on boot via systemd service"
echo "  • Auto-restart on crash (with rapid-crash protection)"
echo "  • Stop gracefully via the Debug Tool's 'Close Application' button"
echo ""
echo "Useful commands:"
echo "  Start now:           sudo systemctl start rcv-kiosk"
echo "  Stop:                sudo systemctl stop rcv-kiosk"
echo "  View logs:           journalctl -u rcv-kiosk -f"
echo "  Disable auto-start:  sudo systemctl disable rcv-kiosk"
echo "  Check status:        sudo systemctl status rcv-kiosk"
echo ""
echo "Next steps:"
echo "  1. Update .env file with your RCV_API_URL"
echo "  2. Connect a USB camera"
echo "  3. Reboot to auto-start, or run: sudo systemctl start rcv-kiosk"
echo ""
