#!/bin/bash
# Quick launcher for refactored RCV Kiosk

echo "🚀 Starting RCV Kiosk (Refactored Version)"
echo "==========================================="

# Change to script directory
cd "$(dirname "$0")"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found"
    exit 1
fi

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Check for required modules
echo "🔍 Checking dependencies..."
python3 -c "import cv2, PIL, pyzbar, pytesseract" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Some dependencies missing. Run ./install.sh first"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env" ]; then
    echo "📝 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env file not found"
fi

# Check data directory
if [ ! -d "$HOME/kiosk_data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p "$HOME/kiosk_data/ocr_scans"
fi

# Run the application
echo "✨ Launching RCV Kiosk..."
echo ""
python3 main_refactored.py

echo ""
echo "👋 Kiosk stopped. Goodbye!"
