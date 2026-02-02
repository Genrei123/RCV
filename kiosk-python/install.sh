#!/bin/bash

# RCV Kiosk Installation Script for Raspberry Pi
# This script installs all dependencies and sets up the kiosk application

set -e  # Exit on error

echo "========================================="
echo "RCV Kiosk Installation Script"
echo "========================================="

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is designed for Linux/Raspberry Pi"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-tk \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-tgl \
    libzbar0 \
    libzbar-dev \
    mpg123 \
    ffmpeg \
    libopencv-dev \
    python3-opencv \
    poppler-utils

# Install Python dependencies
echo "🐍 Installing Python packages..."
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Configure Tesseract (if needed)
echo "🔧 Configuring Tesseract OCR..."
if [ ! -f "/usr/share/tesseract-ocr/*/tessdata/eng.traineddata" ]; then
    echo "⚠️  English language data not found. Tesseract may not work properly."
fi

# Create data directories
echo "📁 Creating data directories..."
mkdir -p ~/kiosk_data/ocr_scans
mkdir -p ~/kiosk_temp

# Set environment variables
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating default .env file..."
    cat > .env << EOF
# RCV API Configuration
RCV_API_URL=http://localhost:3000/api/v1

# Camera Configuration
CAMERA_INDEX=0

# Display Configuration
FULLSCREEN=1
EOF
    echo "✅ Created .env file. Please update RCV_API_URL if needed."
fi

# Test camera access
echo "📷 Testing camera access..."
if ls /dev/video* 1> /dev/null 2>&1; then
    echo "✅ Camera device(s) found:"
    ls -l /dev/video*
else
    echo "⚠️  No camera devices found. Please connect a USB camera."
fi

# Test GPIO access (for Raspberry Pi)
echo "🔌 Checking GPIO access..."
if [ -d "/sys/class/gpio" ]; then
    echo "✅ GPIO available"
    # Add user to gpio group if not already
    if ! groups $USER | grep -q gpio; then
        echo "Adding $USER to gpio group..."
        sudo usermod -a -G gpio $USER
        echo "⚠️  Please log out and log back in for GPIO permissions to take effect."
    fi
else
    echo "⚠️  GPIO not available (not on Raspberry Pi?)"
fi

# Create desktop launcher (optional)
echo "🖥️  Creating desktop launcher..."
cat > ~/Desktop/rcv_kiosk.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=RCV Kiosk
Comment=Launch RCV Product Verification Kiosk
Exec=$(pwd)/run_kiosk.sh
Icon=camera
Terminal=false
Categories=Utility;
EOF
chmod +x ~/Desktop/rcv_kiosk.desktop

# Create run script
echo "📝 Creating run script..."
cat > run_kiosk.sh << 'EOF'
#!/bin/bash
# Quick launcher for RCV Kiosk

echo "🚀 Starting RCV Kiosk"
cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check data directory
if [ ! -d "$HOME/kiosk_data" ]; then
    mkdir -p "$HOME/kiosk_data/ocr_scans"
fi

# Run the application
python3 main.py
EOF
chmod +x run_kiosk.sh

echo ""
echo "========================================="
echo "✅ Installation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your RCV_API_URL"
echo "2. Connect USB camera to Raspberry Pi"
echo "3. Run the kiosk: ./run_kiosk.sh"
echo ""
echo "Or double-click 'RCV Kiosk' on the desktop"
echo ""
echo "To start on boot, add to /etc/rc.local:"
echo "  sudo nano /etc/rc.local"
echo "  Add before 'exit 0':"
echo "    cd $(pwd) && ./run_kiosk.sh &"
echo ""
