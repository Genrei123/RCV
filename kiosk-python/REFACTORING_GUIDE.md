# RCV Kiosk - Modular Architecture Guide

## 📊 Active Version

✅ **This is now the active version!** The old monolithic main.py has been replaced.

| File | Lines | Purpose |
|------|-------|---------|
| **OLD** `main_old_backup.py` | **3,786** | Backup of monolithic file |
| **CURRENT** `main.py` | **352** | Active orchestrator |
| **Reduction** | **90.7%** | Much more maintainable! |

## 🎯 Benefits of New Structure

1. **Separation of Concerns** - Each module has a single responsibility
2. **Easier Testing** - Can test components independently
3. **Better Maintainability** - Find and fix bugs faster
4. **Reusability** - Services can be used in other projects
5. **Cleaner Code** - ~350 lines vs ~3800 lines in main file

## 📁 New File Structure

```
kiosk-python/
├── main_refactored.py          # Main app (352 lines) ✨ START HERE
├── config.py                   # All configuration & constants
├── models.py                   # Data models (CertificateData, ProductData)
├── camera_manager.py           # Camera operations & QR detection
│
├── services/                   # Business logic services
│   ├── __init__.py
│   ├── api_service.py         # RCV API communication
│   ├── tts_service.py         # Text-to-Speech
│   ├── gpio_service.py        # LED control
│   └── ocr_handler.py         # OCR 2-photo capture
│
└── ui/                         # All UI components
    ├── __init__.py
    ├── state_manager.py       # State transitions & timeouts
    ├── screens.py             # Base screens (Idle, Scanning, etc.)
    ├── ocr_capture_screen.py  # OCR workflow screens
    ├── certificate_screen.py  # Certificate display
    ├── product_screen.py      # Product display
    └── compliance_screen.py   # OCR results display
```

## 🚀 Quick Start

### Running the Kiosk

```bash
# Standard way
./run_kiosk.sh

# Or directly
python3 main.py
```

### Development
```bash
# Test individual modules
python3 -c "from ui import IdleScreen; print('UI module OK')"
python3 -c "from services import RCVApiService; print('Services OK')"
```

## 🔧 Module Descriptions

### Main Application (`main_refactored.py`)
**352 lines** - The orchestrator that ties everything together
- Initializes all services and UI screens
- Handles keyboard input
- Manages display update loop
- Coordinates between components

**Key Features:**
- Clean separation of initialization and runtime logic
- Simple event handling
- Threading for background tasks
- Proper cleanup on exit

### Configuration (`config.py`)
Centralized constants for easy modification:
- **Colors** - All UI colors in one place
- **LEDPins** - GPIO pin assignments
- **KioskState** - All possible states
- **OCRCaptureStep** - OCR workflow steps
- **Timing** - Timeouts and delays
- **APIConfig** - API URLs and settings
- **TagalogMessages** - TTS messages

### Models (`models.py`)
Data classes for type safety:
- `CertificateData` - Certificate information from QR codes
- `ProductData` - Product information from OCR/search

### Camera Manager (`camera_manager.py`)
Handles all camera operations:
- `start()` / `stop()` - Camera lifecycle
- `read_frame()` - Get current frame
- `capture_photo()` - Take a snapshot
- `detect_qr_codes()` - Find QR codes in frame
- `draw_qr_overlay()` - Visualize detections
- `resize_for_display()` - Fit to screen

### Services (`services/`)

#### API Service (`api_service.py`)
- `get_certificate_by_id()` - Verify QR code
- `scan_product_ocr()` - Submit OCR text
- `search_product()` - Search database
- `health_check()` - Check API availability

#### TTS Service (`tts_service.py`)
- `speak_tagalog()` - Predefined Tagalog messages
- `speak_custom()` - Custom text with edge-tts

#### GPIO Service (`gpio_service.py`)
- `set_processing()` - Blink yellow LED
- `set_success()` - Solid green LED
- `set_error()` - Solid red LED
- `cleanup()` - Reset pins on exit

#### OCR Handler (`ocr_handler.py`)
- `capture_photo()` - Save front/back photos immediately ✅ FIXED
- `retake_current()` - Delete and recapture
- `can_submit()` - Validate both photos exist
- `get_combined_ocr_text()` - Extract text with Tesseract

### UI Screens (`ui/`)

#### State Manager (`state_manager.py`)
Manages state transitions and auto-reset timeouts:
- `change_state()` - Transition to new state
- `reset_to_idle()` - Return to scanning
- `start_ocr_capture()` - Begin OCR flow
- `advance_ocr_step()` - Move to next OCR step

#### Screen Components
Each screen is a separate class with `render()` method:
- **IdleScreen** - Ready to scan, camera view
- **ScanningScreen** - Active scanning overlay
- **OCRCaptureScreen** - 2-photo workflow with previews
- **ProcessingScreen** - Large loading indicator
- **CertificateScreen** - Display certificate details
- **ProductScreen** - Display product info
- **ComplianceScreen** - OCR results
- **ErrorScreen** - Error messages
- **MaintenanceScreen** - API unavailable
Rollback (If Needed)

If you need to go back to the old version:

```bash
# Restore old version
cp main_old_backup.py main.py

# Run as usual
./run_kiosk.sh
python3 main.py  # Now points to refactored version
```

## 🎨 How to Customize

### Change Colors
Edit `config.py`:
```python
class Colors:
    PRIMARY = "#YOUR_COLOR"  # Change any color here
```

### Change LED Pins
Edit `config.py`:
```python
class LEDPins:
    PIN_PROCESSING = 17  # Change GPIO pins
    PIN_SUCCESS = 27
    PIN_ERROR = 22
```

### Change Timeouts
Edit `config.py`:
```python
class Timing:
    ERROR_DISPLAY_SECONDS = 10  # Auto-reset after error
    SCAN_COOLDOWN = 3.0         # Time between scans
```

### Add New Screen
1. Create new class in `ui/` directory:
```python
class MyNewScreen(BaseScreen):
    def render(self, canvas, **kwargs):
        # Your rendering logic
```

2. Import in `ui/__init__.py`:
```python
from .my_new_screen import MyNewScreen
```

3. Initialize in `main_refactored.py`:
```python
self.screens['my_screen'] = MyNewScreen(self.root, self.width, self.height)
```

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'ui'"
Make sure you're running from the `kiosk-python` directory:
```bash
cd ~/kiosk-python
python3 main_refactored.py
```

### "No module named 'config'"
Ensure all files are in the same directory:
```bash
ls -la  # Should show config.py, models.py, etc.
```

### Camera not starting
Check permissions:
```bash
# Add user to video group
sudo usermod -a -G video $USER
# Log out and back in
```

### GPIO errors on non-Pi systems
The app handles this gracefully - LEDs just won't work on Windows/Mac.

## 📊 Performance Improvements

| Aspect | Old main.py | New Modular | Improvement |
|--------|-------------|-------------|-------------|
| **File Size** | 3,786 lines | 352 lines | 90.7% reduction |
| **Maintainability** | Poor | Excellent | ⭐⭐⭐⭐⭐ |
| **Testing** | Difficult | Easy | Isolated components |
| **Bug Fixing** | Hard to locate | Fast | Clear module boundaries |
| **Code Reuse** | None | High | Services reusable |

## ✅ What's Fixed

1. **OCR Image Saving** - Photos now save immediately to disk with timestamps
2. **File Organization** - Everything has a clear home
3. **State Management** - Clean state transitions with timeouts
4. **Error Handling** - Better error messages and recovery
5. **Code Duplication** - DRY principles applied throughout

## 🎯 Next Steps

1. **Test the new architecture** thoroughly on development machine
2. **Deploy to Raspberry Pi** using `install.sh`
3. **Monitor for issues** - Check logs in `~/kiosk_data/`
4. **Customize as needed** - Colors, messages, timeouts
5. **Consider removing old main.py** once stable

## 📝 Notes

- The old `main.py` is still there as backup
- New version is in `main_refactored.py`
- All functionality preserved, just better organized
- Zero breaking changes to API or external interfaces
- Can switch back to old version anytime if needed

## 🆘 Support

If you encounter issues:
1. Check console output for error messages
2. Verify all imports work: `python3 -c "import config, models, services, ui"`
3. Test individual modules in Python REPL
4. Check file permissions: `ls -la *.py`
5. Ensure all dependencies installed: `pip3 install -r requirements.txt`
