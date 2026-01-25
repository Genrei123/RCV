#!/bin/bash
# ============================================================================
# RCV Kiosk - Raspberry Pi Installation Script
# Run this script on your Raspberry Pi to set up the kiosk
# Usage: chmod +x install_raspberry_pi.sh && ./install_raspberry_pi.sh
# ============================================================================

set -e  # Exit on any error

echo "========================================"
echo "  RCV Kiosk - Raspberry Pi Installer"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Raspberry Pi
if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo -e "${YELLOW}Warning: This doesn't appear to be a Raspberry Pi${NC}"
    echo "Continuing anyway..."
fi

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

echo -e "${GREEN}Step 2: Installing system dependencies...${NC}"
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-tk \
    python3-pil \
    python3-pil.imagetk \
    libzbar0 \
    libzbar-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-fil \
    libopencv-dev \
    python3-opencv \
    xserver-xorg \
    x11-xserver-utils \
    unclutter \
    libjpeg-dev \
    zlib1g-dev \
    libatlas-base-dev \
    libhdf5-dev \
    libhdf5-serial-dev \
    libharfbuzz-dev \
    libwebp-dev \
    libtiff5-dev \
    libjasper-dev \
    libilmbase-dev \
    libopenexr-dev \
    libgstreamer1.0-dev

echo -e "${GREEN}Step 3: Creating kiosk directory...${NC}"
KIOSK_DIR="$HOME/rcv-kiosk"
mkdir -p "$KIOSK_DIR"
cd "$KIOSK_DIR"

echo -e "${GREEN}Step 4: Creating Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

echo -e "${GREEN}Step 5: Installing Python dependencies...${NC}"
pip install --upgrade pip setuptools wheel

# Install dependencies in order (opencv can be tricky on RPi)
pip install \
    numpy \
    Pillow \
    pyzbar \
    pytesseract \
    requests \
    python-dotenv

# Install OpenCV (using headless version for better compatibility)
echo -e "${YELLOW}Installing OpenCV (this may take a while on Raspberry Pi)...${NC}"
pip install opencv-python-headless

echo -e "${GREEN}Step 6: Copying application files...${NC}"
# Copy main application file
if [[ -f "$(dirname "$0")/main.py" ]]; then
    cp "$(dirname "$0")/main.py" "$KIOSK_DIR/"
    cp "$(dirname "$0")/.env" "$KIOSK_DIR/" 2>/dev/null || true
    cp "$(dirname "$0")/.env.example" "$KIOSK_DIR/" 2>/dev/null || true
else
    echo -e "${YELLOW}main.py not found in script directory${NC}"
    echo "Please copy main.py and .env to $KIOSK_DIR manually"
fi

echo -e "${GREEN}Step 7: Creating systemd service for auto-start...${NC}"
sudo tee /etc/systemd/system/rcv-kiosk.service > /dev/null << EOF
[Unit]
Description=RCV Kiosk Application
After=network.target graphical.target
Wants=graphical.target

[Service]
Type=simple
User=$USER
Environment=DISPLAY=:0
Environment=XAUTHORITY=$HOME/.Xauthority
WorkingDirectory=$KIOSK_DIR
ExecStart=$KIOSK_DIR/venv/bin/python $KIOSK_DIR/main.py
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

echo -e "${GREEN}Step 8: Creating kiosk launcher script...${NC}"
cat > "$KIOSK_DIR/start_kiosk.sh" << 'EOF'
#!/bin/bash
# RCV Kiosk Launcher
cd "$(dirname "$0")"
source venv/bin/activate

# Hide cursor after 1 second of inactivity
unclutter -idle 1 &

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Start the kiosk application
python main.py
EOF
chmod +x "$KIOSK_DIR/start_kiosk.sh"

echo -e "${GREEN}Step 9: Configuring auto-login and kiosk mode...${NC}"
# Create autostart directory
mkdir -p "$HOME/.config/autostart"

# Create autostart entry
cat > "$HOME/.config/autostart/rcv-kiosk.desktop" << EOF
[Desktop Entry]
Type=Application
Name=RCV Kiosk
Exec=$KIOSK_DIR/start_kiosk.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

echo -e "${GREEN}Step 10: Setting up camera permissions...${NC}"
# Add user to video group for camera access
sudo usermod -a -G video $USER

echo -e "${GREEN}Step 11: Testing Python imports...${NC}"
source venv/bin/activate
python3 << 'PYEOF'
import sys
try:
    import cv2
    import numpy as np
    from pyzbar import pyzbar
    import pytesseract
    import tkinter as tk
    from PIL import Image, ImageTk, ImageDraw, ImageFont
    import requests
    print("✓ All Python dependencies imported successfully!")
except ImportError as e:
    print(f"✗ Import error: {e}")
    sys.exit(1)
PYEOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Python dependencies verified!${NC}"
else
    echo -e "${RED}Warning: Some Python dependencies failed to import${NC}"
fi

echo ""
echo -e "${GREEN}========================================"
echo "  Installation Complete!"
echo "========================================${NC}"
echo ""
echo "Kiosk installed to: $KIOSK_DIR"
echo ""
echo "Available commands:"
echo "  - Start kiosk manually:  $KIOSK_DIR/start_kiosk.sh"
echo "  - Start via systemd:     sudo systemctl start rcv-kiosk"
echo "  - Enable auto-start:     sudo systemctl enable rcv-kiosk"
echo "  - View logs:             journalctl -u rcv-kiosk -f"
echo "  - Stop kiosk:            sudo systemctl stop rcv-kiosk"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit $KIOSK_DIR/.env to configure API URL if needed"
echo "2. Connect your USB camera"
echo "3. Reboot to test auto-start: sudo reboot"
echo ""
echo -e "${GREEN}To start the kiosk now, run:${NC}"
echo "  cd $KIOSK_DIR && ./start_kiosk.sh"