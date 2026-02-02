# Migration Guide: Refactored Kiosk Structure

## ✅ What Was Done

### 1. **Modular Architecture Created**
- `config.py` - All constants, enums, and configuration
- `models.py` - Data classes (CertificateData, ProductData)
- `services/` directory:
  - `api_service.py` - RCV API communication
  - `tts_service.py` - Text-to-Speech service
  - `gpio_service.py` - GPIO LED control
  - `ocr_handler.py` - **Fixed OCR 2-photo capture**

### 2. **OCR Scanning Fixed**
The main issue was that images weren't being properly saved. New `OCRCameraHandler` class:
- ✅ Saves images immediately to disk with timestamps
- ✅ Maintains separate front/back image state
- ✅ Proper cleanup on retake
- ✅ Validates both images before submission
- ✅ Returns file paths for API upload

### 3. **Installation & Deployment**
- `install.sh` - Automated Raspberry Pi setup script
- `run_kiosk.sh` - Quick launcher
- `requirements.txt` - Updated with all dependencies
- `README_REFACTORED.md` - Complete documentation

## 🔧 How to Update Your main.py

### Update Imports (Top of file)

Replace:
```python
# Old messy imports spread throughout
```

With:
```python
#!/usr/bin/env python3
import os
import tkinter as tk
import cv2
import json
from datetime import datetime
from PIL import Image, ImageTk

# Import refactored modules
from config import Colors, KioskState, OCRCaptureStep, Timing, TagalogMessages
from models import CertificateData, ProductData
from services import RCVApiService, TTSService, GPIOLEDService, OCRCameraHandler
```

### Update KioskApp.__init__()

Replace OCR state management:
```python
# OLD:
self.ocr_step = OCRCaptureStep.READY_FRONT
self.ocr_front_image = None
self.ocr_back_image = None
# ... etc
```

With:
```python
# NEW:
self.ocr_handler = OCRCameraHandler(self.data_dir)
```

### Update OCR Methods

Replace all OCR capture methods with:

```python
def _ocr_capture_photo(self):
    """Capture photo using OCR handler"""
    if self.current_frame is None:
        return
    
    success = self.ocr_handler.capture_photo(self.current_frame)
    if success:
        self._update_ocr_ui()
        self.tts.speak("Larawan na-capture na", "fil")

def _ocr_retake_photo(self):
    """Retake current photo"""
    self.ocr_handler.retake_current()
    self._update_ocr_ui()

def _ocr_submit_scan(self):
    """Submit OCR scan to backend"""
    if not self.ocr_handler.can_submit():
        return
    
    self._show_loading_screen("Processing product labels...")
    self.gpio_led.start_processing()
    
    # Run in background thread
    threading.Thread(
        target=self._process_ocr_scan,
        daemon=True
    ).start()

def _process_ocr_scan(self):
    """Process OCR scan in background"""
    try:
        # Extract OCR text
        ocr_text = self.ocr_handler.get_combined_ocr_text()
        
        # Get base64 images for API
        front_b64 = self.ocr_handler.get_front_base64()
        back_b64 = self.ocr_handler.get_back_base64()
        
        # Call API
        response = self.api.scan_product_ocr(
            ocr_text=ocr_text,
            front_image_url=f"data:image/jpeg;base64,{front_b64}",
            back_image_url=f"data:image/jpeg;base64,{back_b64}"
        )
        
        # Handle response in main thread
        self.root.after(0, lambda: self._display_compliance_result(response))
        
    except Exception as e:
        print(f"OCR processing error: {e}")
        self.root.after(0, lambda: self._handle_error("OCR processing failed"))

def _update_ocr_ui(self):
    """Update OCR UI based on handler state"""
    step = self.ocr_handler.step
    
    if step == OCRCaptureStep.READY_FRONT:
        self.ocr_instruction_label.config(text="Position FRONT of label")
        self.ocr_capture_btn.config(state=tk.NORMAL, text="CAPTURE")
        self.ocr_retake_btn.config(state=tk.DISABLED)
        self.ocr_submit_btn.config(state=tk.DISABLED)
        
    elif step == OCRCaptureStep.PREVIEW_FRONT:
        self.ocr_instruction_label.config(text="Front captured! Review or retake")
        self.ocr_capture_btn.config(state=tk.DISABLED)
        self.ocr_retake_btn.config(state=tk.NORMAL)
        # Show thumbnail
        if self.ocr_handler.front_frame is not None:
            self.ocr_front_thumb.config(text="Front: ✓", bg=Colors.SUCCESS)
        # Move to back after 2 seconds
        self.root.after(2000, self.ocr_handler.move_to_next_step)
        self.root.after(2100, self._update_ocr_ui)
        
    elif step == OCRCaptureStep.READY_BACK:
        self.ocr_instruction_label.config(text="Position BACK of label")
        self.ocr_capture_btn.config(state=tk.NORMAL, text="CAPTURE")
        self.ocr_retake_btn.config(state=tk.DISABLED)
        
    elif step == OCRCaptureStep.PREVIEW_BACK:
        self.ocr_instruction_label.config(text="Back captured! Ready to submit")
        self.ocr_capture_btn.config(state=tk.DISABLED)
        self.ocr_retake_btn.config(state=tk.NORMAL)
        # Show thumbnail
        if self.ocr_handler.back_frame is not None:
            self.ocr_back_thumb.config(text="Back: ✓", bg=Colors.SUCCESS)
        # Enable submit
        if self.ocr_handler.can_submit():
            self.ocr_submit_btn.config(state=tk.NORMAL)
```

## 📋 Testing Checklist

After updating main.py:

- [ ] QR Code scanning still works
- [ ] OCR front image saves to `~/kiosk_data/ocr_scans/front_*.jpg`
- [ ] OCR back image saves to `~/kiosk_data/ocr_scans/back_*.jpg`
- [ ] Both images are sent to API
- [ ] Retake button works correctly
- [ ] TTS announcements work
- [ ] GPIO LEDs work (if on Raspberry Pi)
- [ ] Error handling works

## 🚀 Deployment to Raspberry Pi

```bash
# 1. Copy refactored files to Raspberry Pi
scp -r kiosk-python pi@raspberrypi:~/

# 2. SSH into Raspberry Pi
ssh pi@raspberrypi

# 3. Run installation
cd ~/kiosk-python
chmod +x install.sh
./install.sh

# 4. Configure API URL
nano .env
# Set: RCV_API_URL=http://your-server:3000/api/v1

# 5. Test run
./run_kiosk.sh
```

## 📝 Key Improvements

1. **OCR Images Now Save**: Files created at `~/kiosk_data/ocr_scans/` with timestamps
2. **Modular Code**: Easy to maintain and debug
3. **Proper State Management**: OCRCameraHandler tracks capture state
4. **Better Error Handling**: Cleanup on failures
5. **Automated Install**: One script sets up everything
6. **Documentation**: README with troubleshooting guide

## 🐛 Common Issues & Fixes

### "Module not found" errors
```bash
pip3 install -r requirements.txt
```

### Camera not working
```bash
ls -l /dev/video*
# Should show /dev/video0
```

### Tesseract not found
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-eng
```

### GPIO permission denied
```bash
sudo usermod -a -G gpio $USER
# Then log out and back in
```
