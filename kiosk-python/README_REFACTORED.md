# RCV Kiosk - Raspberry Pi Product Verification System

## Project Structure

```
kiosk-python/
├── main.py              # Main application entry point
├── config.py            # Configuration and constants
├── models.py            # Data models
├── services/            # Service modules
│   ├── __init__.py
│   ├── api_service.py   # RCV API communication
│   ├── tts_service.py   # Text-to-Speech
│   ├── gpio_service.py  # GPIO LED control
│   └── ocr_handler.py   # OCR camera handling
├── requirements.txt     # Python dependencies
├── install.sh           # Installation script
├── run_kiosk.sh         # Quick launcher
└── .env                 # Environment configuration
```

## Features

- **QR Code Scanning**: Verify product certificates via blockchain
- **OCR Product Scanning**: 2-photo capture (front + back labels)
- **Text-to-Speech**: Filipino/English voice announcements
- **GPIO LED Status**: Visual indicators for Raspberry Pi
- **Offline-Ready**: Works without constant internet connection

## Installation on Raspberry Pi

### 1. Quick Install

```bash
chmod +x install.sh
./install.sh
```

### 2. Manual Installation

```bash
# Update system
sudo apt-get update

# Install system dependencies
sudo apt-get install -y python3 python3-pip python3-tk tesseract-ocr \
    tesseract-ocr-eng tesseract-ocr-tgl libzbar0 mpg123 ffmpeg

# Install Python packages
pip3 install -r requirements.txt
```

### 3. Configure Environment

Edit `.env` file:

```bash
RCV_API_URL=http://your-server:3000/api/v1
CAMERA_INDEX=0
FULLSCREEN=1
```

## Running the Kiosk

### Method 1: Desktop Launcher
Double-click "RCV Kiosk" icon on desktop

### Method 2: Command Line
```bash
./run_kiosk.sh
```

### Method 3: Manual
```bash
python3 main.py
```

## Hardware Requirements

- **Raspberry Pi 4 Model B** (2GB+ RAM recommended)
- **USB Camera** (720p or higher)
- **7" Touch Display** (800x480 or larger)
- **GPIO LEDs** (Optional):
  - GPIO 17: Processing (Blue)
  - GPIO 27: Success (Green)
  - GPIO 22: Error (Red)

## GPIO LED Wiring

```
LED Wiring (with 220Ω resistors):
- GPIO 17 → [220Ω] → Blue LED → GND
- GPIO 27 → [220Ω] → Green LED → GND
- GPIO 22 → [220Ω] → Red LED → GND
```

## Usage

### QR Code Scanning Mode
1. Tap "START CAMERA"
2. Place QR code in front of camera
3. System automatically scans and verifies

### OCR Product Label Scanning
1. Tap "SCAN LABEL"
2. Position FRONT of label → Tap "CAPTURE"
3. Review → Tap "NEXT" or "RETAKE"
4. Position BACK of label → Tap "CAPTURE"
5. Review → Tap "SUBMIT"

## Troubleshooting

### Camera Not Working
```bash
# Check camera devices
ls -l /dev/video*

# Test camera
v4l2-ctl --list-devices
```

### GPIO Not Working
```bash
# Add user to gpio group
sudo usermod -a -G gpio $USER
# Log out and log back in
```

### TTS Not Working
```bash
# Install mpg123 player
sudo apt-get install mpg123

# Test edge-tts
edge-tts --text "Hello" --write-media test.mp3
mpg123 test.mp3
```

### Tesseract OCR Issues
```bash
# Install Filipino language data
sudo apt-get install tesseract-ocr-tgl

# Test OCR
tesseract image.jpg output
```

## Auto-Start on Boot

Add to `/etc/rc.local` (before `exit 0`):

```bash
sudo nano /etc/rc.local

# Add this line:
cd /home/pi/kiosk-python && ./run_kiosk.sh &
```

Or use systemd service:

```bash
sudo nano /etc/systemd/system/rcv-kiosk.service
```

```ini
[Unit]
Description=RCV Kiosk Application
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/kiosk-python
ExecStart=/home/pi/kiosk-python/run_kiosk.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable rcv-kiosk
sudo systemctl start rcv-kiosk
```

## Development

### Project Modules

- **config.py**: All constants, enums, and configuration
- **models.py**: Data classes (CertificateData, ProductData)
- **services/api_service.py**: Backend API communication
- **services/tts_service.py**: Text-to-Speech with Filipino support
- **services/gpio_service.py**: LED status indicators
- **services/ocr_handler.py**: 2-photo OCR capture and processing

### Key Fixes in This Refactor

1. ✅ **OCR Image Saving**: Fixed 2-photo capture with immediate disk writes
2. ✅ **Modular Architecture**: Separated concerns into logical modules
3. ✅ **Better Error Handling**: Proper cleanup and state management
4. ✅ **Installation Script**: Automated Raspberry Pi setup
5. ✅ **Documentation**: Clear setup and usage instructions

## License

Proprietary - RCV System

## Support

For issues, contact the RCV development team.
