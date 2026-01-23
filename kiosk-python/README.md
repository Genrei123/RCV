# RCV Kiosk Machine

Automated product verification kiosk for QR code and product scanning. Connects to RCV backend API for real-time certificate and product verification.

## Features

- 🔍 **Automatic QR Code Scanning** - No buttons needed, continuous scanning
- 📜 **Certificate Verification** - Validates certificates against blockchain
- 📦 **Product Authentication** - Searches RCV database and FDA registry
- 🔊 **Tagalog TTS** - Voice announcements in Filipino/Tagalog
- 🖥️ **Kiosk Mode** - Fullscreen, auto-start, no user interaction required
- ⏱️ **Auto-reset** - Returns to scanning after 20 seconds

## Quick Start (Development)

```bash 
# Install dependencies
pip install -r requirements.txt

# Configure API URL
cp .env.example .env
# Edit .env with your API URL

# Run the kiosk
python main.py
```

Press `Escape` to exit in development mode.

## Raspberry Pi Installation

### Requirements

- Raspberry Pi 4 (recommended) or Pi 3B+
- Raspberry Pi OS (Desktop version)
- USB Webcam or Pi Camera Module
- Display (HDMI)
- Internet connection

### Automatic Installation

1. Copy all files to your Raspberry Pi (via USB, SCP, or Git)

2. Run the installation script:
```bash
chmod +x install_raspberry_pi.sh
./install_raspberry_pi.sh
```

3. Reboot to start the kiosk:
```bash
sudo reboot
```

### Manual Installation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y python3-pip python3-tk python3-pil python3-pil.imagetk \
    libzbar0 tesseract-ocr python3-opencv espeak mpg123

# Install Python packages
pip3 install opencv-python-headless numpy Pillow pyzbar pytesseract \
    pyttsx3 gTTS requests python-dotenv

# Run the kiosk
python3 main.py
```

## Configuration

Edit `.env` file:

```env
# RCV API Server URL
RCV_API_URL=https://rcv-production-cbd6.up.railway.app/api/v1

# Display duration (seconds)
DISPLAY_DURATION=20

# Cooldown between same scan (seconds)
SCAN_COOLDOWN=2

# TTS Settings
TTS_LANGUAGE=tl
TTS_ENABLED=true
```

## QR Code Formats Supported

| Format | Example |
|--------|---------|
| Certificate ID | `CERT-COMP-ABC123` |
| JSON Certificate | `{"certificateId": "CERT-COMP-ABC123"}` |
| JSON Product | `{"productName": "...", "LTONumber": "..."}` |
| URL | `https://rcv.com/certificate/CERT-COMP-ABC123` |

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /certificate-blockchain/certificate/:id` | Fetch certificate from blockchain |
| `GET /certificate-blockchain/pdf/:id` | Get PDF URL |
| `POST /scan/scanProduct` | Process OCR text |
| `POST /scan/searchProduct` | Search product database |

## Service Management

```bash
# Start kiosk
sudo systemctl start rcv-kiosk

# Stop kiosk
sudo systemctl stop rcv-kiosk

# Enable auto-start on boot
sudo systemctl enable rcv-kiosk

# Disable auto-start
sudo systemctl disable rcv-kiosk

# View logs
journalctl -u rcv-kiosk -f
```

## Troubleshooting

### Camera not detected
```bash
# Check if camera is recognized
ls /dev/video*

# Add user to video group
sudo usermod -a -G video $USER
# Then logout and login again
```

### Display issues
```bash
# Set display environment variable
export DISPLAY=:0
```

### TTS not working
```bash
# Install espeak for pyttsx3
sudo apt-get install espeak

# Or use gTTS (requires internet)
pip install gTTS
```

### API connection issues
```bash
# Test API connectivity
curl https://rcv-production-cbd6.up.railway.app/

# Check .env file
cat ~/rcv-kiosk/.env
```

## File Structure

```
kiosk-python/
├── main.py                    # Main application
├── requirements.txt           # Python dependencies
├── .env                       # Configuration (API URL)
├── .env.example              # Configuration template
├── install_raspberry_pi.sh   # Raspberry Pi installer
└── README.md                 # This file
```

## License

Part of the RCV (Real Certificate Verification) project.
