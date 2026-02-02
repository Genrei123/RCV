#!/bin/bash
# Test script to verify the modular architecture works

echo "🧪 Testing RCV Kiosk Modular Architecture"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Test 1: Core modules
echo "📦 Test 1: Core modules..."
python3 -c "from config import Colors, KioskState; from models import CertificateData, ProductData; print('   ✅ config.py and models.py OK')" 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ Core modules failed"
    exit 1
fi

# Test 2: Camera manager
echo "📦 Test 2: Camera manager..."
python3 -c "from camera_manager import CameraManager; print('   ✅ camera_manager.py OK')" 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ Camera manager failed"
    exit 1
fi

# Test 3: Services
echo "📦 Test 3: Services..."
python3 -c "from services import RCVApiService, TTSService, GPIOLEDService, OCRCameraHandler; print('   ✅ services/ OK')" 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ Services failed"
    exit 1
fi

# Test 4: UI modules
echo "📦 Test 4: UI modules..."
python3 -c "from ui import KioskStateManager, IdleScreen, CertificateScreen; print('   ✅ ui/ OK')" 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ UI modules failed"
    exit 1
fi

# Test 5: Main application
echo "📦 Test 5: Main application..."
python3 -c "import main; print('   ✅ main.py OK')" 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ Main application failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All tests passed!"
echo "=========================================="
echo ""
echo "Modular architecture is working correctly."
echo "You can now run: ./run_kiosk.sh"
echo ""
