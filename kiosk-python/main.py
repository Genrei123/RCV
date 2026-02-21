#!/usr/bin/env python3
"""
================================================================================
RCV KIOSK MACHINE - QR Code & Product Scanner
================================================================================
Automated kiosk for certificate verification and product authenticity checking.
Integrated with RCV API for real-time verification against FDA Philippines database.

================================================================================
HOW TO USE THIS KIOSK
================================================================================

FOR END USERS (Kiosk Operators):
--------------------------------
1. QR CODE SCANNING (Automatic)
   - Simply hold a product QR code in front of the camera
   - The kiosk will automatically detect and scan the QR code
   - Results will display within 2-3 seconds
   - GREEN = Valid/Authentic | RED = Not Found/Invalid

2. PRODUCT LABEL SCANNING (OCR)
   - Tap "Scan Product Label" on the start screen
   - Position the FRONT of the product label and tap "Capture Front"
   - Position the BACK of the product label and tap "Capture Back"  
   - Tap "Submit" to analyze the label text
   - The system will extract registration codes (LTO, CFPR) and verify

3. MANUAL SEARCH
   - Tap "Manual Search" on the start screen
   - Enter the CFPR number (e.g., FR-4A-1234) and/or LTO number
   - Tap "Search" to find the product in the database

4. VIEWING CERTIFICATES
   - After a successful scan, tap "VIEW CERTIFICATE" to see the official PDF
   - Pinch to zoom, drag to pan the certificate document
   - Tap "CLOSE" to return to results

UNDERSTANDING THE RESULTS:
--------------------------
✅ GREEN HEADER = Product/Certificate is REGISTERED and VALID
❌ RED HEADER = Product NOT FOUND in database (may be counterfeit/unregistered)

Information displayed:
- Product Name & Brand
- CFPR Number (FDA Product Registration)
- LTO Number (License to Operate)
- Certificate ID
- Registration & Expiry Dates

================================================================================
FOR DEVELOPERS / SYSTEM ADMINISTRATORS
================================================================================

INSTALLATION (Raspberry Pi 4):
------------------------------
1. Install system dependencies:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3-pip python3-tk python3-pil python3-pil.imagetk
   sudo apt-get install -y libzbar0 tesseract-ocr tesseract-ocr-eng
   sudo apt-get install -y libatlas-base-dev  # For numpy
   ```

2. Install Python packages:
   ```bash
   pip3 install opencv-python-headless pillow pyzbar numpy requests
   pip3 install pytesseract python-dotenv
   pip3 install RPi.GPIO  # For LED indicators (Raspberry Pi only)
   pip3 install edge-tts  # For text-to-speech (optional, requires internet)
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   nano .env  # Set API_BASE_URL to your RCV API server
   ```

4. Run the kiosk:
   ```bash
   python3 main.py
   ```

INSTALLATION (Windows/Desktop - Development):
---------------------------------------------
1. Install Python 3.8+ from python.org
2. Install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki
3. Install packages:
   ```bash
   pip install opencv-python pillow pyzbar numpy requests
   pip install pytesseract python-dotenv
   ```
4. Run: `python main.py`

ENVIRONMENT VARIABLES (.env file):
----------------------------------
API_BASE_URL=https://your-api-server.com/api/v1
# or for local development:
API_BASE_URL=http://localhost:5500/api/v1

HARDWARE SETUP (Raspberry Pi):
------------------------------
- Camera: USB webcam or Raspberry Pi Camera Module
- Display: HDMI touchscreen (7" or larger recommended)
- LEDs (optional): Connect to GPIO pins for status indicators
  - Green LED: GPIO 17 (Success)
  - Red LED: GPIO 27 (Error)  
  - Yellow LED: GPIO 22 (Processing)
  See GPIO_LED_WIRING_GUIDE.md for detailed wiring instructions.

OCR ENGINE:
-----------
- Uses Tesseract OCR (works on all platforms including Raspberry Pi)
- Install: sudo apt-get install tesseract-ocr tesseract-ocr-eng
- Python: pip install pytesseract

TROUBLESHOOTING:
----------------
1. OCR not working:
   - Make sure Tesseract is installed: sudo apt-get install tesseract-ocr
   - Check: tesseract --version

2. Camera not working:
   - Check camera connection: ls /dev/video*
   - Test with: python3 -c "import cv2; print(cv2.VideoCapture(0).isOpened())"

3. API connection failed:
   - Verify API_BASE_URL in .env file
   - Check network connectivity
   - Ensure API server is running

4. No OCR text extracted:
   - Ensure good lighting on the product label
   - Hold the label steady and in focus
   - Try different angles if text is reflective

================================================================================
API ENDPOINTS USED
================================================================================
POST /kiosk-scan/scanProduct     - OCR text analysis and product search
GET  /certificate/:id            - Fetch certificate details
GET  /certificate/:id/pdf-url    - Get certificate PDF URL
POST /product/search             - Search products by name/codes

================================================================================
"""

# ============================================================================
# SAFE IMPORTS - Handle "illegal instruction" errors on Raspberry Pi
# ============================================================================
import os
import platform
import sys

# Detect architecture FIRST before importing heavy libraries
IS_RASPBERRY_PI = platform.machine().startswith('arm') or platform.machine().startswith('aarch')
IS_ARM64 = platform.machine() == 'aarch64'

print(f"Platform: {platform.system()} / {platform.machine()}")
print(f"Python: {sys.version}")
print(f"Is Raspberry Pi (ARM): {IS_RASPBERRY_PI}")

# Set environment variables to avoid illegal instruction errors on Raspberry Pi
if IS_RASPBERRY_PI:
    # Disable OpenBLAS multi-threading which can cause issues on some ARM chips
    os.environ['OPENBLAS_NUM_THREADS'] = '1'
    os.environ['OMP_NUM_THREADS'] = '1'
    # Disable NumPy optimizations that may use unsupported instructions
    os.environ['NPY_DISABLE_CPU_FEATURES'] = 'AVX,AVX2,AVX512,FMA'
    print("ARM mode: Disabled advanced CPU features to prevent illegal instruction errors")

# Now import the rest
import threading
import json
import time
import re
import requests
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import base64
from urllib.parse import urljoin
import math
from datetime import datetime

# Import numpy with error handling
try:
    import numpy as np
    print(f"NumPy {np.__version__} loaded successfully")
except Exception as e:
    print(f"ERROR loading NumPy: {e}")
    print("Try: pip install numpy --no-binary numpy")
    sys.exit(1)

# Import OpenCV with error handling  
try:
    import cv2
    print(f"OpenCV {cv2.__version__} loaded successfully")
except Exception as e:
    print(f"ERROR loading OpenCV: {e}")
    print("Try: pip install opencv-python-headless")
    sys.exit(1)

# Import pyzbar for QR codes
try:
    from pyzbar import pyzbar
    print("pyzbar loaded successfully")
except Exception as e:
    print(f"ERROR loading pyzbar: {e}")
    print("Try: sudo apt-get install libzbar0 && pip install pyzbar")
    sys.exit(1)

# Import Tkinter
import tkinter as tk
from tkinter import font as tkfont

# Import PIL
try:
    from PIL import Image, ImageTk, ImageDraw, ImageFont
    print("PIL/Pillow loaded successfully")
except Exception as e:
    print(f"ERROR loading PIL: {e}")
    sys.exit(1)

# ============================================================================
# ============================================================================
# OCR Engine Setup - Tesseract OCR (cross-platform, works on Raspberry Pi)
# ============================================================================
TESSERACT_AVAILABLE = False

try:
    import pytesseract
    # Configure Tesseract path for Windows
    if platform.system() == 'Windows':
        possible_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        ]
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                TESSERACT_AVAILABLE = True
                print(f"Tesseract OCR found at: {path}")
                break
        if not TESSERACT_AVAILABLE:
            print("WARNING: Tesseract not found in standard Windows paths")
            print("Install from: https://github.com/UB-Mannheim/tesseract/wiki")
    else:
        # Linux/Mac - tesseract should be in PATH
        TESSERACT_AVAILABLE = True
        print("Tesseract OCR available (Linux/Mac)")
except ImportError:
    print("ERROR: pytesseract not installed. Install with: pip install pytesseract")
    print("Also install Tesseract OCR: sudo apt-get install tesseract-ocr")

if not TESSERACT_AVAILABLE:
    print("="*60)
    print("WARNING: OCR functionality will not work!")
    print("Install Tesseract: sudo apt-get install tesseract-ocr tesseract-ocr-eng")
    print("Install pytesseract: pip install pytesseract")
    print("="*60)

# GPIO for Raspberry Pi LED control
GPIO_AVAILABLE = False
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    print("RPi.GPIO not available. LED indicators disabled. Install with: pip install RPi.GPIO")

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, use system env vars

# Text-to-Speech imports - Priority: edge-tts (best quality) > pyttsx3 > gTTS
TTS_AVAILABLE = False
TTS_ENGINE = None

# Try edge-tts first (Microsoft neural voices - best quality for Filipino)
try:
    import edge_tts
    import asyncio
    TTS_AVAILABLE = True
    TTS_ENGINE = "edge_tts"
except ImportError:
    pass

# Fallback to pyttsx3 (offline, English only)
if not TTS_AVAILABLE:
    try:
        import pyttsx3
        TTS_AVAILABLE = True
        TTS_ENGINE = "pyttsx3"
    except ImportError:
        pass

# Fallback to gTTS (Google Text-to-Speech)
if not TTS_AVAILABLE:
    try:
        from gtts import gTTS
        import subprocess
        TTS_AVAILABLE = True
        TTS_ENGINE = "gtts"
    except ImportError:
        print("TTS not available. Install edge-tts for best voice quality: pip install edge-tts")

# ============================================================================
# KIOSK MONITORING CONFIG
# ============================================================================
# Kiosk sends heartbeat to API every HEALTH_CHECK_INTERVAL seconds
# API returns any pending commands (restart, mode change, LED control)
# Kiosk executes commands and reports status on next heartbeat

def get_auto_location():
    """
    Auto-detect kiosk location using IP geolocation.
    Falls back to default Manila coordinates if detection fails.
    
    Note: IP geolocation returns ISP location, not exact physical location.
    For precise location, set KIOSK_LAT/KIOSK_LNG environment variables
    or use GPS hardware on the kiosk.
    
    Uses free ip-api.com service (no API key required, 45 requests/min limit).
    """
    default_location = {
        'lat': 14.5995,
        'lng': 120.9842,
        'city': 'Manila',
        'address': 'RCV Office, Manila',
        'country': 'Philippines'
    }
    
    try:
        import requests
        # Try multiple geolocation services for better accuracy
        services = [
            ('http://ip-api.com/json/', lambda d: {
                'lat': d.get('lat'),
                'lng': d.get('lon'),
                'city': d.get('city'),
                'region': d.get('regionName'),
                'country': d.get('country'),
                'success': d.get('status') == 'success'
            }),
            ('https://ipapi.co/json/', lambda d: {
                'lat': d.get('latitude'),
                'lng': d.get('longitude'),
                'city': d.get('city'),
                'region': d.get('region'),
                'country': d.get('country_name'),
                'success': not d.get('error')
            }),
        ]
        
        for url, parser in services:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = parser(response.json())
                    if data.get('success') and data.get('lat') and data.get('lng'):
                        location = {
                            'lat': float(data['lat']),
                            'lng': float(data['lng']),
                            'city': data.get('city', default_location['city']),
                            'address': f"{data.get('city', '')}, {data.get('region', '')}",
                            'country': data.get('country', default_location['country'])
                        }
                        print(f"✓ Auto-detected location: {location['city']}, {location['country']} ({location['lat']}, {location['lng']})")
                        print(f"  (Note: This is approximate ISP location. Set KIOSK_LAT/KIOSK_LNG env vars for exact location)")
                        return location
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"⚠ Location auto-detect failed: {e}. Using defaults.")
    
    print(f"⚠ Using default location: {default_location['city']}")
    return default_location

def get_unique_kiosk_id():
    """
    Generate a unique kiosk ID based on machine identifiers.
    Priority: MAC address > hostname > random UUID
    """
    import uuid
    import socket
    
    # Try to use MAC address (most unique)
    try:
        mac = uuid.getnode()
        # Format: kiosk-XXXX (last 4 hex chars of MAC)
        mac_suffix = format(mac, 'x')[-4:].upper()
        return f"kiosk-{mac_suffix}"
    except:
        pass
    
    # Fall back to hostname
    try:
        hostname = socket.gethostname().lower().replace(' ', '-')[:12]
        return f"kiosk-{hostname}"
    except:
        pass
    
    # Last resort: random UUID
    return f"kiosk-{str(uuid.uuid4())[:8]}"

# Auto-detect location on startup (can be overridden by env vars)
_auto_location = get_auto_location()

KIOSK_ID = os.getenv('KIOSK_ID') or get_unique_kiosk_id()
KIOSK_NAME = os.getenv('KIOSK_NAME', f'Kiosk {KIOSK_ID}')
KIOSK_LAT = float(os.getenv('KIOSK_LAT', '0')) or _auto_location['lat']
KIOSK_LNG = float(os.getenv('KIOSK_LNG', '0')) or _auto_location['lng']
KIOSK_ADDRESS = os.getenv('KIOSK_ADDRESS') or _auto_location['address']
KIOSK_CITY = os.getenv('KIOSK_CITY') or _auto_location['city']
HEALTH_CHECK_INTERVAL = 3600  # seconds between heartbeats (1 hour to reduce server load)

print(f"✓ Kiosk ID: {KIOSK_ID}")
print(f"✓ Location: {KIOSK_CITY} ({KIOSK_LAT}, {KIOSK_LNG})")

# psutil for system monitoring (optional)
PSUTIL_AVAILABLE = False
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    print("psutil not installed. System info disabled. Install: pip install psutil")

# ============================================================================
# Design Constants (matching Flutter main.dart theme)
# ============================================================================
class Colors:
    PRIMARY = "#005440"          # Dark green from Flutter theme
    PRIMARY_LIGHT = "#00755A"    # Lighter green
    PRIMARY_DARK = "#003D2E"     # Darker green for gradients
    BACKGROUND = "#FFFFFF"       # White background
    BACKGROUND_DARK = "#1A1A1A"  # Dark background for standby
    SURFACE = "#F5F5F5"          # Light gray surface
    SURFACE_DARK = "#2D2D2D"     # Dark surface
    TEXT_PRIMARY = "#1A1A1A"     # Dark text
    TEXT_SECONDARY = "#666666"   # Gray text
    TEXT_WHITE = "#FFFFFF"       # White text
    SUCCESS = "#4CAF50"          # Green for verified
    SUCCESS_LIGHT = "#E8F5E9"    # Light green background
    ERROR = "#F44336"            # Red for fraud/error
    ERROR_LIGHT = "#FFEBEE"      # Light red background
    WARNING = "#FF9800"          # Orange for warnings
    WARNING_LIGHT = "#FFF3E0"    # Light orange background
    ACCENT = "#00BFA5"           # Teal accent
    GRADIENT_START = "#005440"   # Gradient start
    GRADIENT_END = "#00755A"     # Gradient end

# GPIO Pin Configuration for Status LEDs
class LEDPins:
    """GPIO Pin definitions for status LEDs on Raspberry Pi"""
    PIN_PROCESSING = 17   # GPIO 17 - Blinks during processing
    PIN_SUCCESS = 27      # GPIO 27 - Solid when scan successful
    PIN_ERROR = 22        # GPIO 22 - Solid when error occurs

class KioskState(Enum):
    IDLE = "idle"                      # Ready to scan - camera active
    CAMERA_OFF = "camera_off"          # Camera not started yet (lazy loading)
    SCANNING = "scanning"              # Actively scanning
    OCR_CAPTURE = "ocr_capture"        # OCR photo capture mode (2-photo flow)
    PROCESSING = "processing"          # Processing QR/OCR data - HUGE loading screen
    DISPLAY_CERTIFICATE = "certificate" # Showing certificate info - MASSIVE display
    DISPLAY_PRODUCT = "product"        # Showing product info - MASSIVE display
    DISPLAY_COMPLIANCE = "compliance"  # Showing OCR compliance report
    ERROR = "error"                    # Error state - 10 second timeout
    MAINTENANCE = "maintenance"        # Server offline/unreachable - polling for recovery

class OCRCaptureStep(Enum):
    """Steps in the OCR 2-photo capture flow"""
    READY_FRONT = "ready_front"        # Ready to capture front
    PREVIEW_FRONT = "preview_front"    # Previewing front photo
    READY_BACK = "ready_back"          # Ready to capture back
    PREVIEW_BACK = "preview_back"      # Previewing back photo  
    SUBMITTING = "submitting"          # Sending to backend

@dataclass
class CertificateData:
    """Certificate information from QR code"""
    certificate_id: str
    product_name: str
    company_name: str
    issue_date: str
    expiry_date: str
    status: str  # "valid", "expired", "revoked"
    pdf_url: Optional[str] = None
    certificate_type: str = "company"
    block_index: Optional[int] = None
    block_hash: Optional[str] = None
    pdf_hash: Optional[str] = None
    additional_info: Dict[str, Any] = None
    # V2.0 fields for entity details
    entity_data: Dict[str, Any] = None  # Full entity details from blockchain
    approvers: List[Dict[str, Any]] = None  # List of approvers with wallet addresses
    transaction_hash: Optional[str] = None
    verified_at: Optional[str] = None
    version: str = "1.0"

@dataclass
class ProductData:
    """Product information from scan"""
    product_name: str
    brand: str
    batch_number: str
    manufacture_date: str
    expiry_date: str
    is_authentic: bool
    confidence_score: float
    lto_number: Optional[str] = None
    cfpr_number: Optional[str] = None
    manufacturer: Optional[str] = None
    source: str = "unknown"  # "internal_database", "grounded_search_pdf", "not_found"
    warnings: List[str] = field(default_factory=list)

# ============================================================================
# RCV API Service - Connects to your backend
# ============================================================================
class RCVApiService:
    """Service to communicate with RCV Backend API"""
    
    # Firebase Storage bucket for certificates
    FIREBASE_BUCKET = "rcv-flutter.firebasestorage.app"
    
    def __init__(self, base_url: str = None):
        # Default to localhost, can be configured via environment variable
        self.base_url = base_url or os.environ.get('RCV_API_URL', 'http://localhost:3000/api/v1')
        self.timeout = 30  # seconds
    
    def _construct_firebase_pdf_url(self, certificate_id: str) -> str:
        """
        Construct Firebase Storage URL for a certificate PDF
        Path: certificates/product/{CERTIFICATE_ID}.pdf or certificates/company/{CERTIFICATE_ID}.pdf
        """
        # Determine type from certificate ID
        if certificate_id.startswith("CERT-PROD-"):
            cert_type = "product"
        elif certificate_id.startswith("CERT-COMP-"):
            cert_type = "company"
        else:
            cert_type = "product"  # Default to product
        
        # Construct Firebase Storage URL
        # Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media
        file_path = f"certificates/{cert_type}/{certificate_id}.pdf"
        encoded_path = file_path.replace("/", "%2F")
        
        return f"https://firebasestorage.googleapis.com/v0/b/{self.FIREBASE_BUCKET}/o/{encoded_path}?alt=media"
    
    def _make_request(self, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
        """Make HTTP request to API"""
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, params=params, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "connection_error", "message": "Cannot connect to RCV server"}
        except requests.exceptions.Timeout:
            return {"success": False, "error": "timeout", "message": "Request timed out"}
        except requests.exceptions.HTTPError as e:
            try:
                return e.response.json()
            except:
                return {"success": False, "error": "http_error", "message": str(e)}
        except Exception as e:
            return {"success": False, "error": "unknown", "message": str(e)}
    
    # ============ Certificate Blockchain API ============
    
    def get_certificate_by_id(self, certificate_id: str) -> dict:
        """
        Get certificate details from blockchain
        GET /api/v1/certificate-blockchain/certificate/:certificateId
        """
        return self._make_request('GET', f'/certificate-blockchain/certificate/{certificate_id}')
    
    def get_certificate_pdf_url(self, certificate_id: str) -> dict:
        """
        Get certificate PDF URL from Firebase Storage
        GET /api/v1/certificate-blockchain/pdf/:certificateId
        Falls back to constructing URL directly if API fails
        """
        result = self._make_request('GET', f'/certificate-blockchain/pdf/{certificate_id}')
        
        # If API returns URL, use it
        if result.get("success") and result.get("certificate", {}).get("pdfUrl"):
            return result
        
        # Fallback: construct URL directly
        pdf_url = self._construct_firebase_pdf_url(certificate_id)
        return {
            "success": True,
            "message": "PDF URL constructed from certificate ID",
            "certificate": {
                "certificateId": certificate_id,
                "pdfUrl": pdf_url
            }
        }
    
    def verify_certificate_pdf(self, certificate_id: str, pdf_hash: str) -> dict:
        """
        Verify certificate PDF hash against blockchain
        POST /api/v1/certificate-blockchain/verify
        """
        return self._make_request('POST', '/certificate-blockchain/verify', {
            'certificateId': certificate_id,
            'pdfHash': pdf_hash
        })
    
    def get_blockchain_stats(self) -> dict:
        """
        Get certificate blockchain statistics
        GET /api/v1/certificate-blockchain/stats
        """
        return self._make_request('GET', '/certificate-blockchain/stats')
    
    # ============ Product Scan API ============
    
    def scan_product_ocr(self, ocr_text: str, front_image_url: str = None, back_image_url: str = None) -> dict:
        """
        Process OCR text with AI to extract product information
        POST /api/v1/kiosk-scan/scanProduct (public endpoint for kiosk)
        """
        data = {'blockOfText': ocr_text}
        if front_image_url:
            data['frontImageUrl'] = front_image_url
        if back_image_url:
            data['backImageUrl'] = back_image_url
        
        print(f"OCR API Payload Details:")
        print(f"   - blockOfText: {len(ocr_text)} characters")
        print(f"   - frontImageUrl: {front_image_url if front_image_url else 'Not provided'}")
        print(f"   - backImageUrl: {back_image_url if back_image_url else 'Not provided'}")
        print(f"   - First 100 chars: {ocr_text[:100]}...")
        
        return self._make_request('POST', 'api/v1/kiosk-scan/scanProduct', data)
    
    def search_product(self, product_name: str = None, lto_number: str = None, 
                       cfpr_number: str = None, brand_name: str = None,
                       manufacturer: str = None) -> dict:
        """
        Search for product in database and official registry
        POST /api/v1/scan/searchProduct
        """
        data = {}
        if product_name:
            data['productName'] = product_name
        if lto_number:
            data['LTONumber'] = lto_number
        if cfpr_number:
            data['CFPRNumber'] = cfpr_number
        if brand_name:
            data['brandName'] = brand_name
        if manufacturer:
            data['manufacturer'] = manufacturer
        
        return self._make_request('POST', '/scan/searchProduct', data)
    
    # ============ Health Check ============
    
    def health_check(self) -> dict:
        """Check if API is accessible"""
        try:
            response = requests.get(urljoin(self.base_url.replace('/api/v1', ''), '/'), timeout=5)
            return response.json()
        except:
            return {"success": False, "message": "API not accessible"}

# ============================================================================
# TTS Service for Voice Output - Using Microsoft Neural Voices
# ============================================================================
class TTSService:
    # Microsoft Edge TTS voices (neural, natural-sounding)
    FILIPINO_VOICE = "fil-PH-BlessicaNeural"  # Female Filipino voice
    FILIPINO_VOICE_MALE = "fil-PH-AngeloNeural"  # Male Filipino voice
    ENGLISH_VOICE = "en-US-JennyNeural"  # English voice (default)
    
    def __init__(self):
        self.enabled = TTS_AVAILABLE
        self.is_muted = False
        self.temp_dir = os.path.expanduser("~/kiosk_temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        self.engine = None
        self.is_speaking = False
        self.playback_process = None
        
        print(f"TTS Engine: {TTS_ENGINE}")
        
        if TTS_AVAILABLE and TTS_ENGINE == "pyttsx3":
            try:
                self.engine = pyttsx3.init()
                self.engine.setProperty('rate', 150)
                self.engine.setProperty('volume', 1.0)
            except Exception as e:
                print(f"pyttsx3 init error: {e}")
                self.enabled = False
    
    def speak(self, text: str, lang: str = "en"):
        """Speak text using Microsoft neural voice (edge-tts) for natural speech"""
        if not self.enabled or self.is_muted or self.is_speaking:
            return
        
        try:
            # Run TTS in separate thread to not block UI
            thread = threading.Thread(target=self._speak_async, args=(text, lang), daemon=True)
            thread.start()
        except Exception as e:
            print(f"TTS Error: {e}")
    
    def _speak_async(self, text: str, lang: str):
        """Async TTS playback"""
        self.is_speaking = True
        try:
            if TTS_ENGINE == "edge_tts":
                # Use Microsoft Edge neural TTS (best quality)
                self._speak_edge_tts(text, lang)
            elif TTS_ENGINE == "pyttsx3" and self.engine:
                # pyttsx3 (offline, English only)
                self.engine.say(text)
                self.engine.runAndWait()
            elif TTS_ENGINE == "gtts":
                # gTTS (Google Text-to-Speech)
                temp_file = os.path.join(self.temp_dir, "tts_output.mp3")
                tts = gTTS(text=text, lang="tl", slow=False)
                tts.save(temp_file)
                self._play_audio(temp_file)
                    
        except Exception as e:
            print(f"TTS playback error: {e}")
        finally:
            self.is_speaking = False
    
    def _speak_edge_tts(self, text: str, lang: str):
        """Use Microsoft Edge neural TTS for natural-sounding speech"""
        try:
            # Select voice based on language
            voice = self.FILIPINO_VOICE if lang in ["fil", "tl", "tagalog"] else self.ENGLISH_VOICE
            
            temp_file = os.path.join(self.temp_dir, "tts_edge_output.mp3")
            
            # edge-tts is async, need to run in event loop
            async def generate_audio():
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(temp_file)
            
            # Run async function
            asyncio.run(generate_audio())
            
            # Play the audio
            self._play_audio(temp_file)
            
        except Exception as e:
            print(f"Edge TTS error: {e}")
    
    def _play_audio(self, filepath: str):
        """Play audio file using system player"""
        try:
            if platform.system() == 'Windows':
                # Try multiple Windows playback methods
                try:
                    # Method 1: Windows Media Player COM object (best for MP3)
                    import winsound
                    import subprocess
                    # Use ffplay from ffmpeg if available (best quality)
                    result = subprocess.run(
                        ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet', filepath],
                        check=False,
                        timeout=60
                    )
                except FileNotFoundError:
                    # Method 2: PowerShell with Windows Media Player
                    import subprocess
                    ps_script = f'''
                    $player = New-Object -ComObject WMPlayer.OCX
                    $player.URL = "{filepath}"
                    $player.controls.play()
                    while ($player.playState -ne 1) {{ Start-Sleep -Milliseconds 100 }}
                    '''
                    self.playback_process = subprocess.Popen(
                        ['powershell', '-Command', ps_script],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                    self.playback_process.wait()
            else:
                # Linux/Mac: use mpg123 or afplay
                import subprocess
                subprocess.run(['mpg123', '-q', filepath], check=False)
        except Exception as e:
            print(f"Audio playback error: {e}")
    
    def stop(self):
        """Stop current playback"""
        try:
            if TTS_ENGINE == "pyttsx3" and self.engine:
                self.engine.stop()
            if self.playback_process:
                self.playback_process.terminate()
        except:
            pass
    
    def toggle_mute(self):
        """Toggle mute state"""
        self.is_muted = not self.is_muted
        if self.is_muted:
            self.stop()

# ============================================================================
# English Messages
# ============================================================================
class EnglishMessages:
    WELCOME = "Welcome! The kiosk is ready for scanning."
    SCAN_DETECTED = "Scan detected. Processing..."
    
    @staticmethod
    def certificate_valid(product_name: str, company: str) -> str:
        return f"The certificate for {product_name} from {company} is valid and authentic."
    
    @staticmethod
    def certificate_expired(product_name: str) -> str:
        return f"Warning! The certificate for {product_name} has expired."
    
    @staticmethod
    def certificate_invalid() -> str:
        return "Warning! This certificate is not recognized. May be counterfeit."
    
    @staticmethod
    def product_authentic(product_name: str, brand: str) -> str:
        return f"The {product_name} from {brand} is authentic and quality-verified."
    
    @staticmethod
    def product_suspicious(product_name: str) -> str:
        return f"Warning! The {product_name} may be counterfeit. Exercise caution."
    
    READY_FOR_NEXT = "Ready for the next scan."
    ERROR_OCCURRED = "An error occurred. Please try again."

# ============================================================================
# GPIO LED Control Service
# ============================================================================
class GPIOLEDService:
    """Service to control status LEDs via GPIO on Raspberry Pi"""
    
    def __init__(self):
        self.enabled = GPIO_AVAILABLE
        self.blink_thread = None
        self.is_blinking = False
        self.blink_stop_event = threading.Event()
        
        if self.enabled:
            try:
                # Setup GPIO mode
                GPIO.setmode(GPIO.BCM)
                GPIO.setwarnings(False)
                
                # Setup pins as outputs
                GPIO.setup(LEDPins.PIN_PROCESSING, GPIO.OUT)
                GPIO.setup(LEDPins.PIN_SUCCESS, GPIO.OUT)
                GPIO.setup(LEDPins.PIN_ERROR, GPIO.OUT)
                
                # Turn all LEDs off initially
                self.all_off()
                print("GPIO LEDs initialized (Pins: 17, 27, 22)")
                
                # Test: Blink all LEDs 3 times on startup
                self._startup_test()
            except Exception as e:
                print(f"GPIO initialization failed: {e}")
                self.enabled = False
    
    def _startup_test(self):
        """Test GPIO by blinking all LEDs 3 times on startup"""
        print("Testing GPIO LEDs (3 blinks)...")
        try:
            for i in range(3):
                # Turn all LEDs on
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.HIGH)
                GPIO.output(LEDPins.PIN_SUCCESS, GPIO.HIGH)
                GPIO.output(LEDPins.PIN_ERROR, GPIO.HIGH)
                time.sleep(0.3)
                
                # Turn all LEDs off
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
                GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
                GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
                time.sleep(0.3)
            
            print("GPIO LED test complete - 3 blinks successful")
        except Exception as e:
            print(f"GPIO test failed: {e}")
    
    def all_off(self):
        """Turn off all LEDs"""
        if not self.enabled:
            return
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
        except Exception as e:
            print(f"GPIO error (all_off): {e}")
    
    def start_processing(self):
        """Start blinking processing LED (GPIO 17)"""
        if not self.enabled:
            return
        
        # Stop any existing blink
        self.stop_blinking()
        
        # Turn off other LEDs
        try:
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
        except:
            pass
        
        # Start blinking thread
        self.is_blinking = True
        self.blink_stop_event.clear()
        self.blink_thread = threading.Thread(target=self._blink_processing, daemon=True)
        self.blink_thread.start()
        print("Processing LED blinking (GPIO 17)")
    
    def _blink_processing(self):
        """Blink the processing LED at 2Hz (500ms on/off)"""
        try:
            while self.is_blinking and not self.blink_stop_event.is_set():
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.HIGH)
                if self.blink_stop_event.wait(0.5):  # 500ms
                    break
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
                if self.blink_stop_event.wait(0.5):  # 500ms
                    break
        except Exception as e:
            print(f"GPIO blink error: {e}")
        finally:
            try:
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            except:
                pass
    
    def stop_blinking(self):
        """Stop blinking processing LED"""
        if not self.enabled:
            return
        
        self.is_blinking = False
        self.blink_stop_event.set()
        
        if self.blink_thread and self.blink_thread.is_alive():
            self.blink_thread.join(timeout=1.5)
        
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
        except:
            pass
    
    def show_success(self):
        """Show success - solid green LED (GPIO 27)"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.HIGH)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
            print("Success LED ON (GPIO 27)")
        except Exception as e:
            print(f"GPIO error (success): {e}")
    
    def show_error(self):
        """Show error - solid red LED (GPIO 22)"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.HIGH)
            print("Error LED ON (GPIO 22)")
        except Exception as e:
            print(f"GPIO error (error): {e}")
    
    def show_idle(self):
        """Show idle state - all LEDs off"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        self.all_off()
        print("All LEDs OFF (idle)")
    
    def cleanup(self):
        """Cleanup GPIO on exit"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        self.all_off()
        try:
            GPIO.cleanup()
            print("GPIO cleanup complete")
        except:
            pass


# ============================================================================
# KIOSK HEALTH CHECK SERVICE - Firebase Real-time Commands
# ============================================================================

# Import Firebase service
try:
    from services.firebase_service import FirebaseKioskService, FIREBASE_AVAILABLE, install_log_interceptor
except ImportError:
    FIREBASE_AVAILABLE = False
    FirebaseKioskService = None
    install_log_interceptor = None
    print("⚠️ Firebase service not available")


class KioskHealthService:
    """
    Service that uses Firebase Firestore for real-time command listening.
    
    Features:
    - INSTANT command execution via Firebase listeners (no polling!)
    - Status updates to Firebase for monitoring
    - Periodic heartbeat to update lastSeen timestamp
    
    Firebase Structure:
    - kiosks/{kioskId} - Kiosk status document
    - kiosks/{kioskId}/commands/{commandId} - Command documents (auto-deleted after execution)
    """
    
    def __init__(self, kiosk_app=None):
        self.kiosk_app = kiosk_app
        self._running = False
        self._heartbeat_thread = None
        self._heartbeat_interval = 300  # 5 minutes for status updates
        
        # Firebase service
        self._firebase: FirebaseKioskService = None
        self._log_interceptor = None
        self._cleanup_thread = None
        
        # Current status tracking
        self.current_mode = 'idle'
        self.led_states = {
            'processing': False,
            'success': False,
            'error': False
        }
    
    def start(self):
        """Start the Firebase listener and heartbeat service"""
        if self._running:
            return
        
        self._running = True
        
        # Initialize Firebase
        if FIREBASE_AVAILABLE:
            self._firebase = FirebaseKioskService(KIOSK_ID, self.kiosk_app)
            
            # Try to initialize Firebase
            cred_path = os.getenv('FIREBASE_CREDENTIALS', 'firebase-credentials.json')
            if self._firebase.initialize(cred_path):
                # Update kiosk info
                self._firebase.update_kiosk_info(
                    name=KIOSK_NAME,
                    lat=KIOSK_LAT,
                    lng=KIOSK_LNG,
                    address=KIOSK_ADDRESS,
                    city=KIOSK_CITY
                )
                
                # Start listening for commands
                self._firebase.start_listening(self._handle_firebase_command)
                
                # Start heartbeat thread for periodic status updates
                self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
                self._heartbeat_thread.start()
                
                # Install log interceptor - captures all print() output and sends to Firebase
                if install_log_interceptor:
                    self._log_interceptor = install_log_interceptor(self._firebase)
                    print(f"📋 Firebase log streaming enabled")
                
                # Start periodic log cleanup (every 6 hours, delete logs older than 24h)
                self._cleanup_thread = threading.Thread(target=self._log_cleanup_loop, daemon=True)
                self._cleanup_thread.start()
                
                print(f"🔥 Firebase kiosk service started")
                print(f"   - Kiosk ID: {KIOSK_ID}")
                print(f"   - Status updates: every {self._heartbeat_interval // 60} minutes")
                print(f"   - Commands: INSTANT via Firebase listeners")
                print(f"   - Log streaming: ENABLED")
            else:
                print("❌ Firebase initialization failed - commands will not work")
        else:
            print("❌ Firebase not available - install firebase-admin package")
    
    def stop(self):
        """Stop the Firebase listener and heartbeat service"""
        self._running = False
        
        if self._firebase:
            self._firebase.stop_listening()
        
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=2)
        
        print("🔥 Firebase kiosk service stopped")
    
    def update_status(self, mode: str, leds: dict = None):
        """Update the current status"""
        self.current_mode = mode
        if leds:
            self.led_states = leds
        
        # Update Firebase immediately
        if self._firebase:
            self._firebase.update_status('online', mode, self.led_states, self._get_system_info())
    
    def _get_system_info(self) -> dict:
        """Get system resource information"""
        if PSUTIL_AVAILABLE:
            try:
                return {
                    'cpu_percent': psutil.cpu_percent(interval=0.1),
                    'memory_percent': psutil.virtual_memory().percent,
                    'disk_percent': psutil.disk_usage('/').percent
                }
            except:
                pass
        return {'cpu_percent': 0, 'memory_percent': 0, 'disk_percent': 0}
    
    def _heartbeat_loop(self):
        """Background loop that sends periodic status updates"""
        while self._running:
            try:
                if self._firebase:
                    # Get current mode from kiosk app
                    if self.kiosk_app:
                        self.current_mode = self.kiosk_app.state.value if hasattr(self.kiosk_app, 'state') else 'idle'
                    
                    self._firebase.send_heartbeat(
                        mode=self.current_mode,
                        leds=self.led_states,
                        system_info=self._get_system_info()
                    )
                    print(f"✓ Status update sent: {self.current_mode}")
            except Exception as e:
                print(f"❌ Heartbeat error: {e}")
            
            # Wait for next interval
            time.sleep(self._heartbeat_interval)
    
    def _log_cleanup_loop(self):
        """Background loop that periodically cleans up old Firebase logs"""
        LOG_CLEANUP_INTERVAL = 6 * 3600  # Every 6 hours
        LOG_MAX_AGE_HOURS = 24  # Delete logs older than 24 hours
        
        while self._running:
            try:
                time.sleep(LOG_CLEANUP_INTERVAL)
                if self._firebase:
                    self._firebase.cleanup_old_logs(hours=LOG_MAX_AGE_HOURS)
            except Exception as e:
                print(f"⚠️ Log cleanup error: {e}")
    
    def _handle_firebase_command(self, command: str, payload: dict):
        """Handle a command received from Firebase"""
        print(f"🔧 Executing Firebase command: {command}")
        
        try:
            if command == 'restart':
                self._do_restart()
            
            elif command == 'shutdown':
                self._do_shutdown()
            
            elif command == 'close_app':
                self._do_close_app()
            
            elif command == 'set_mode':
                mode = payload.get('mode', 'idle')
                self._set_mode(mode)
            
            elif command == 'toggle_led':
                led_name = payload.get('ledName')
                if led_name:
                    self._toggle_led(led_name)
            
            elif command == 'test_all_leds':
                self._test_all_leds()
            
            elif command == 'clear_logs':
                if self._firebase:
                    self._firebase.clear_all_logs()
                    print("📋 Logs cleared by debug tool")
            
            else:
                print(f"⚠ Unknown command: {command}")
                
        except Exception as e:
            print(f"❌ Command execution failed: {e}")
    
    def _do_restart(self):
        """Restart the kiosk application"""
        print("🔄 Restarting kiosk application...")
        
        def restart():
            time.sleep(1)
            os.execv(sys.executable, ['python'] + sys.argv)
        
        threading.Thread(target=restart, daemon=True).start()
    
    def _do_shutdown(self):
        """Shutdown the kiosk (allows auto-restart by run_kiosk.sh)"""
        print("⚠️ Shutting down kiosk...")
        
        # Stop the heartbeat service first
        self.stop()
        
        def shutdown():
            time.sleep(1)
            if self.kiosk_app:
                try:
                    self.kiosk_app.root.after(0, self.kiosk_app.on_closing)
                except:
                    pass
            # Force exit after 3 seconds if graceful shutdown fails
            time.sleep(3)
            print("🛑 Forcing exit...")
            os._exit(1)  # Exit code 1 = run_kiosk.sh will auto-restart
        
        threading.Thread(target=shutdown, daemon=True).start()
    
    def _do_close_app(self):
        """Close the kiosk application for maintenance (no auto-restart)"""
        print("🔧 Closing kiosk for maintenance...")
        
        # Stop the heartbeat service first
        self.stop()
        
        def close_app():
            time.sleep(1)
            if self.kiosk_app:
                try:
                    self.kiosk_app.root.after(0, self.kiosk_app.on_closing)
                except:
                    pass
            # Force exit with code 42 after 3 seconds if graceful shutdown fails
            # Exit code 42 tells run_kiosk.sh NOT to restart
            time.sleep(3)
            print("🛑 Forcing exit for maintenance...")
            os._exit(42)
        
        threading.Thread(target=close_app, daemon=True).start()
    
    def _set_mode(self, mode: str):
        """Change kiosk mode"""
        print(f"🔀 Setting mode to: {mode}")
        self.current_mode = mode
        
        if self.kiosk_app:
            try:
                if mode == 'slideshow':
                    self.kiosk_app.root.after(0, self.kiosk_app._start_slideshow)
                elif mode == 'idle':
                    self.kiosk_app.root.after(0, self.kiosk_app._show_start_screen)
                elif mode == 'scanner':
                    self.kiosk_app.root.after(0, self.kiosk_app._show_scan_screen)
                elif mode == 'ocr':
                    self.kiosk_app.root.after(0, self.kiosk_app._show_ocr_screen)
                print(f"✓ Mode changed to: {mode}")
            except Exception as e:
                print(f"Mode change error: {e}")
    
    def _toggle_led(self, led_name: str):
        """Toggle an LED"""
        if led_name not in self.led_states:
            print(f"⚠ Unknown LED: {led_name}")
            return
        
        # Toggle state
        new_state = not self.led_states[led_name]
        self.led_states[led_name] = new_state
        print(f"💡 LED {led_name} -> {'ON' if new_state else 'OFF'}")
        
        # Control GPIO if available
        if self.kiosk_app and hasattr(self.kiosk_app, 'gpio_led'):
            gpio = self.kiosk_app.gpio_led
            if gpio and gpio.enabled:
                try:
                    # Use the gpio_led service methods
                    if led_name == 'processing':
                        if new_state:
                            gpio.start_processing()
                        else:
                            gpio.stop_blinking()
                    elif led_name == 'success':
                        if new_state:
                            gpio.show_success()
                        else:
                            gpio.stop_blinking()
                    elif led_name == 'error':
                        if new_state:
                            gpio.show_error()
                        else:
                            gpio.stop_blinking()
                except Exception as e:
                    print(f"GPIO error: {e}")
        else:
            print(f"  (GPIO not available - state tracked locally)")
    
    def _test_all_leds(self):
        """Test all LEDs in sequence"""
        print("💡 Testing all LEDs...")
        
        def run_test():
            # Test each LED for 1 second
            for led_name in ['processing', 'success', 'error']:
                self.led_states[led_name] = True
                print(f"💡 Testing {led_name} - ON")
                
                if self.kiosk_app and hasattr(self.kiosk_app, 'gpio_led'):
                    gpio = self.kiosk_app.gpio_led
                    if gpio and gpio.enabled:
                        try:
                            if led_name == 'processing':
                                gpio.start_processing()
                            elif led_name == 'success':
                                gpio.show_success()
                            elif led_name == 'error':
                                gpio.show_error()
                        except Exception as e:
                            print(f"GPIO error: {e}")
                
                time.sleep(1)
                
                self.led_states[led_name] = False
                print(f"💡 Testing {led_name} - OFF")
                
                if self.kiosk_app and hasattr(self.kiosk_app, 'gpio_led'):
                    gpio = self.kiosk_app.gpio_led
                    if gpio and gpio.enabled:
                        try:
                            gpio.show_idle()
                        except:
                            pass
            
            print("✓ LED test complete")
        
        threading.Thread(target=run_test, daemon=True).start()


# ============================================================================
# On-Screen Keyboard for Touchscreen Kiosk
# ============================================================================
class OnScreenKeyboard:
    """On-screen keyboard for touchscreen kiosk input - mobile phone style with ABC/123 toggle"""
    
    # Keyboard layouts - switch between letters and numbers like a phone
    # Registration codes like FR-12345 or LTO-2024-001 use letters, numbers, and hyphens
    LAYOUT_ABC = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '-'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
        ['123', 'SPACE', 'CLEAR'],
    ]
    
    LAYOUT_123 = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['-', '.', '/', '(', ')', '#', '@', '&', '*', '⌫'],
        ['ABC', 'SPACE', 'CLEAR'],
    ]
    
    def __init__(self, parent, target_entry=None, on_submit=None, bg_color=Colors.SURFACE):
        """
        Create an on-screen keyboard
        
        Args:
            parent: Parent tkinter widget
            target_entry: Entry widget to type into
            on_submit: Callback function when Enter/Submit is pressed
            bg_color: Background color for the keyboard
        """
        self.parent = parent
        self.target_entry = target_entry
        self.on_submit = on_submit
        self.bg_color = bg_color
        self.frame = None
        self.buttons = []
        self.current_mode = 'ABC'  # Start with letters
        self.keyboard_container = None
        
    def set_target(self, entry_widget):
        """Set the target entry widget for keyboard input"""
        self.target_entry = entry_widget
        # Highlight the active entry
        if entry_widget:
            entry_widget.config(relief=tk.SOLID, bd=3, highlightbackground=Colors.PRIMARY, highlightcolor=Colors.PRIMARY, highlightthickness=2)
    
    def create_keyboard(self, parent_frame):
        """Create the keyboard UI"""
        if self.frame:
            self.frame.destroy()
            
        self.frame = tk.Frame(parent_frame, bg=self.bg_color)
        self.frame.pack(fill=tk.X, pady=(10, 5))
        
        # Instructions label
        self.instruction_label = tk.Label(
            self.frame,
            text="ABC Mode: Type letters (A-Z) and hyphen (-)",
            font=("SF Pro Text", 11, "bold"),
            bg=self.bg_color,
            fg=Colors.PRIMARY
        )
        self.instruction_label.pack(pady=(0, 8))
        
        # Container for keyboard rows (will be rebuilt on mode switch)
        self.keyboard_container = tk.Frame(self.frame, bg=self.bg_color)
        self.keyboard_container.pack()
        
        # Build initial keyboard
        self._build_keyboard()
        
        return self.frame
    
    def _build_keyboard(self):
        """Build keyboard based on current mode"""
        # Clear existing buttons
        for widget in self.keyboard_container.winfo_children():
            widget.destroy()
        self.buttons = []
        
        # Select layout based on mode
        layout = self.LAYOUT_ABC if self.current_mode == 'ABC' else self.LAYOUT_123
        
        # Update instruction
        if self.current_mode == 'ABC':
            self.instruction_label.config(
                text="ABC Mode: Letters and hyphen  |  Tap [123] for numbers",
                fg=Colors.PRIMARY
            )
        else:
            self.instruction_label.config(
                text="123 Mode: Numbers 0-9 and symbols  |  Tap [ABC] for letters",
                fg=Colors.WARNING
            )
        
        # Key dimensions
        key_width = 4
        key_height = 2
        key_font = ("SF Pro Display", 13, "bold")
        
        for row_idx, row in enumerate(layout):
            row_frame = tk.Frame(self.keyboard_container, bg=self.bg_color)
            row_frame.pack(pady=2)
            
            for key in row:
                btn = self._create_key_button(row_frame, key, key_width, key_height, key_font)
                btn.pack(side=tk.LEFT, padx=2)
                self.buttons.append(btn)
    
    def _create_key_button(self, parent, key, width, height, font):
        """Create a single key button"""
        # Determine button properties based on key type
        if key == '⌫':
            # Backspace
            return tk.Button(
                parent,
                text="⌫ DEL",
                font=font,
                width=8,
                height=height,
                bg=Colors.WARNING,
                fg=Colors.TEXT_WHITE,
                activebackground="#F57C00",
                activeforeground=Colors.TEXT_WHITE,
                relief=tk.RAISED,
                bd=2,
                command=self._backspace
            )
        elif key == 'CLEAR':
            return tk.Button(
                parent,
                text="CLEAR ALL",
                font=font,
                width=10,
                height=height,
                bg=Colors.ERROR,
                fg=Colors.TEXT_WHITE,
                activebackground="#D32F2F",
                activeforeground=Colors.TEXT_WHITE,
                relief=tk.RAISED,
                bd=2,
                command=self._clear
            )
        elif key == 'SPACE':
            return tk.Button(
                parent,
                text="SPACE",
                font=font,
                width=12,
                height=height,
                bg=Colors.SURFACE_DARK,
                fg=Colors.TEXT_WHITE,
                activebackground=Colors.TEXT_SECONDARY,
                activeforeground=Colors.TEXT_WHITE,
                relief=tk.RAISED,
                bd=2,
                command=lambda: self._type_key(' ')
            )
        elif key == '123':
            return tk.Button(
                parent,
                text="123 #",
                font=("SF Pro Display", 12, "bold"),
                width=7,
                height=height,
                bg=Colors.PRIMARY,
                fg=Colors.TEXT_WHITE,
                activebackground=Colors.PRIMARY_LIGHT,
                activeforeground=Colors.TEXT_WHITE,
                relief=tk.RAISED,
                bd=2,
                command=self._switch_to_numbers
            )
        elif key == 'ABC':
            return tk.Button(
                parent,
                text="ABC",
                font=("SF Pro Display", 12, "bold"),
                width=7,
                height=height,
                bg=Colors.PRIMARY,
                fg=Colors.TEXT_WHITE,
                activebackground=Colors.PRIMARY_LIGHT,
                activeforeground=Colors.TEXT_WHITE,
                relief=tk.RAISED,
                bd=2,
                command=self._switch_to_letters
            )
        else:
            # Regular character key
            return tk.Button(
                parent,
                text=key,
                font=font,
                width=width,
                height=height,
                bg=Colors.BACKGROUND,
                fg=Colors.TEXT_PRIMARY,
                activebackground=Colors.PRIMARY_LIGHT,
                activeforeground=Colors.TEXT_WHITE,
                relief=tk.RAISED,
                bd=2,
                command=lambda k=key: self._type_key(k)
            )
    
    def _switch_to_numbers(self):
        """Switch to number/symbol mode"""
        self.current_mode = '123'
        self._build_keyboard()
    
    def _switch_to_letters(self):
        """Switch to letter mode"""
        self.current_mode = 'ABC'
        self._build_keyboard()
    
    def _type_key(self, key):
        """Type a key into the target entry"""
        if self.target_entry:
            self.target_entry.insert(tk.END, key)
            self.target_entry.focus()
    
    def _backspace(self):
        """Delete the last character"""
        if self.target_entry:
            current = self.target_entry.get()
            self.target_entry.delete(0, tk.END)
            self.target_entry.insert(0, current[:-1])
            self.target_entry.focus()
    
    def _clear(self):
        """Clear the entire entry"""
        if self.target_entry:
            self.target_entry.delete(0, tk.END)
            self.target_entry.focus()
    
    def destroy(self):
        """Destroy the keyboard frame"""
        if self.frame:
            self.frame.destroy()
            self.frame = None
    
    def destroy(self):
        """Destroy the keyboard frame"""
        if self.frame:
            self.frame.destroy()
            self.frame = None

# ============================================================================
# Main Kiosk Application
# ============================================================================
# ============================================================================
# DEBUG MODE TOGGLE
# Set to True during development to show mouse cursor and enable keyboard input.
# Set to False for final kiosk deployment (hides cursor, disables keyboard).
# ============================================================================
DEBUG_MODE = True  # <-- Set to False for production kiosk deployment

class KioskApp:
    # Display duration in seconds
    RESULT_DISPLAY_DURATION = 30   # 30 seconds for results (2-page PDF)
    ERROR_DISPLAY_DURATION = 10    # 10 seconds for errors
    SCAN_COOLDOWN = 5              # Seconds between scans (prevents rapid-fire phantom scans)
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("RCV Kiosk - Product Verification")
        
        # Fullscreen for kiosk mode
        self.root.attributes('-fullscreen', True)
        self.root.configure(bg=Colors.BACKGROUND)
        
        # Get screen dimensions early
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        
        # Escape key to exit (for development)
        self.root.bind('<Escape>', lambda e: self.on_closing())
        
        # State management
        self.state = KioskState.CAMERA_OFF  # Start with camera off (lazy loading)
        self.camera = None
        self.is_running = False
        self.last_scan_time = 0
        self.last_scan_data = ""
        self.display_timer = None
        
        # QR consistency tracking - require same QR across multiple frames
        # to prevent phantom/noise scans from triggering validation
        self.pending_qr_data = None
        self.pending_qr_count = 0
        self.QR_CONFIRM_FRAMES = 3  # Must see same QR in 3 consecutive frames
        self.MIN_QR_DATA_LENGTH = 5  # Minimum characters for valid QR data
        self.loading_animation_id = None
        self.loading_angle = 0
        self.is_error_timer = False
        
        # Touch-to-pause timer
        self.timer_paused = False
        self.remaining_time = 0
        
        # Processing timeout (300 seconds for OCR - EasyOCR can be slow)
        self.processing_start_time = 0
        self.processing_timeout_id = None
        self.PROCESSING_TIMEOUT = 300  # 300 seconds (5 min) for OCR processing
        
        # OCR Capture state (2-photo flow)
        self.ocr_step = OCRCaptureStep.READY_FRONT
        self.ocr_front_image = None  # PIL Image
        self.ocr_back_image = None   # PIL Image
        self.ocr_front_frame = None  # Raw OpenCV frame
        self.ocr_back_frame = None   # Raw OpenCV frame
        self.current_frame = None    # Current camera frame for capture
        self.ocr_preview_photos = []  # Keep references to preview photos
        
        # Current product/certificate data for OCR results
        self.current_ocr_product = None  # Store OCR-identified product info
        self.current_ocr_certificate_id = None  # Certificate/CFPR ID for PDF viewing
        
        # Services
        self.tts = TTSService()
        self.api = RCVApiService()  # RCV API Service
        self.gpio_led = GPIOLEDService()  # GPIO LED control for status indication
        self.video_thread = None  # Video loop thread
        
        # Remote monitoring service - sends heartbeat and receives commands
        self.health_service = KioskHealthService(kiosk_app=self)
        self.health_service.start()
        
        # Connectivity monitoring
        self.is_online = False
        self.last_connectivity_check = 0
        self.connectivity_poll_id = None
        self.CONNECTIVITY_POLL_INTERVAL = 10000  # Check every 10 seconds when offline
        self.CONNECTIVITY_POLL_INTERVAL_ONLINE = 60000  # Check every 60 seconds when online
        self.consecutive_failures = 0
        self.MAX_FAILURES_BEFORE_MAINTENANCE = 3  # Enter maintenance after 3 failures
        
        # Data directory
        self.data_dir = os.path.expanduser("~/kiosk_data")
        os.makedirs(self.data_dir, exist_ok=True)
        
        # LED display state (solid for 5s, then blink)
        self.led_solid_timer = None
        self.led_blink_started = False
        
        # PDF zoom/expand state
        self.pdf_zoom_overlay = None
        self.pdf_zoom_canvas = None
        self.pdf_zoom_scale = 1.0
        self.pdf_zoom_offset_x = 0
        self.pdf_zoom_offset_y = 0
        self.pdf_current_images = []  # Store full PDF images for zooming
        self.pdf_current_page = 0  # Current page being viewed in zoom
        self.pdf_drag_start = None
        
        # Performance optimization - cached display dimensions
        self.display_width = 640   # Camera display width (matches container)
        self.display_height = 480  # Camera display height (matches container)
        self.display_size_cached = False
        self.frame_skip_counter = 0
        self.frame_skip_rate = 2  # Process every Nth frame for display
        self.last_photo = None  # Cache last photo to avoid GC issues
        self.pdf_photos = []    # Cache for PDF pages (2 pages)
        self.logo_photo = None  # Cache for logo
        self.camera_photo = None  # Persistent camera photo reference
        
        # Slideshow state (idle screensaver)
        self.slideshow_overlay = None
        self.slideshow_images = []  # List of PIL Images
        self.slideshow_photos = []  # Keep PhotoImage references
        self.slideshow_current_index = 0
        self.slideshow_timer_id = None
        self.slideshow_active = False
        self.idle_timer_id = None
        self.SLIDESHOW_INTERVAL = 5000  # 5 seconds between slides
        self.IDLE_TIMEOUT = 30000  # 30 seconds of inactivity before slideshow
        
        # Load slideshow images
        self._load_slideshow_images()
        
        # Setup UI
        self.setup_ui()
        
        # Check API connection and auto-start camera
        self.root.after(500, self.initialize_kiosk)
    
    def setup_ui(self):
        """Setup the kiosk user interface - fullscreen layouts for each state"""
        # Main container - fills entire screen
        self.main_frame = tk.Frame(self.root, bg=Colors.BACKGROUND)
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # ============ START SCREEN (Camera off, touch to start) ============
        self.start_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ SCAN SCREEN (Camera centered with logo) ============
        self.scan_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ OCR CAPTURE SCREEN (2-photo flow) ============
        self.ocr_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ LOADING SCREEN (HUGE) ============
        self.loading_frame = tk.Frame(self.main_frame, bg=Colors.PRIMARY)
        
        # ============ RESULT SCREEN (MASSIVE with PDF) ============
        self.result_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ COMPLIANCE SCREEN (OCR results) ============
        self.compliance_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ MANUAL SEARCH SCREEN ============
        self.manual_search_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ ERROR SCREEN ============
        self.error_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ MAINTENANCE SCREEN (Server offline) ============
        self.maintenance_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ BOOT SCREEN (Startup loading) ============
        self.boot_frame = tk.Frame(self.main_frame, bg=Colors.PRIMARY)
        
        # Setup each screen
        self._setup_start_screen()
        self._setup_scan_screen()
        self._setup_ocr_capture_screen()
        self._setup_loading_screen()
        self._setup_result_screen()
        self._setup_compliance_screen()
        self._setup_manual_search_screen()
        self._setup_error_screen()
        self._setup_maintenance_screen()
        self._setup_boot_screen()
        
        # Start with boot screen (connecting to server)
        self._show_boot_screen()
    
    def _setup_start_screen(self):
        """Setup the initial start screen with sidebar layout for small screens"""
        # Main horizontal layout - sidebar on left, content on right
        main_container = tk.Frame(self.start_frame, bg=Colors.BACKGROUND)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # LEFT SIDEBAR - Navigation buttons
        sidebar = tk.Frame(main_container, bg=Colors.PRIMARY, width=180)
        sidebar.pack(side=tk.LEFT, fill=tk.Y)
        sidebar.pack_propagate(False)
        
        # Sidebar header
        tk.Label(
            sidebar,
            text="RCV",
            font=("SF Pro Display", 20, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(15, 5))
        
        tk.Label(
            sidebar,
            text="KIOSK",
            font=("SF Pro Text", 12),
            bg=Colors.PRIMARY,
            fg="#CCCCCC"
        ).pack(pady=(0, 20))
        
        # Sidebar buttons - compact for small screens
        self.start_camera_btn = tk.Button(
            sidebar,
            text="SCAN\nWITH QR",
            font=("SF Pro Display", 11, "bold"),
            bg=Colors.PRIMARY_LIGHT,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.ACCENT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=14,
            pady=15,
            command=self._start_camera_and_scan,
            cursor="hand2"
        )
        self.start_camera_btn.pack(pady=8, padx=10, fill=tk.X)
        
        self.start_ocr_btn = tk.Button(
            sidebar,
            text="SCAN\nLABEL",
            font=("SF Pro Display", 11, "bold"),
            bg=Colors.ACCENT if TESSERACT_AVAILABLE else "#999999",
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=14,
            pady=15,
            command=self._start_ocr_capture,
            cursor="hand2" if TESSERACT_AVAILABLE else "arrow",
            state=tk.NORMAL if TESSERACT_AVAILABLE else tk.DISABLED
        )
        self.start_ocr_btn.pack(pady=8, padx=10, fill=tk.X)
        
        # OCR unavailable notice
        if not TESSERACT_AVAILABLE:
            tk.Label(
                sidebar,
                text="OCR unavailable",
                font=("SF Pro Text", 8),
                bg=Colors.PRIMARY,
                fg="#FF9999"
            ).pack(padx=10)
        
        self.manual_search_btn = tk.Button(
            sidebar,
            text="MANUAL\nSEARCH",
            font=("SF Pro Display", 11, "bold"),
            bg=Colors.WARNING,
            fg=Colors.TEXT_WHITE,
            activebackground="#F57C00",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=14,
            pady=15,
            command=self._show_manual_search_screen,
            cursor="hand2"
        )
        self.manual_search_btn.pack(pady=8, padx=10, fill=tk.X)
        
        # Spacer
        tk.Frame(sidebar, bg=Colors.PRIMARY).pack(fill=tk.BOTH, expand=True)
        
        # Connection status at bottom of sidebar
        status_frame = tk.Frame(sidebar, bg=Colors.PRIMARY_DARK, height=50)
        status_frame.pack(fill=tk.X, side=tk.BOTTOM)
        status_frame.pack_propagate(False)
        
        self.connection_status_icon = tk.Label(
            status_frame,
            text="*",
            font=("SF Pro Text", 12),
            bg=Colors.PRIMARY_DARK,
            fg=Colors.TEXT_SECONDARY
        )
        self.connection_status_icon.pack(pady=(8, 2))
        
        self.connection_status_label = tk.Label(
            status_frame,
            text="Checking...",
            font=("SF Pro Text", 9),
            bg=Colors.PRIMARY_DARK,
            fg="#AAAAAA"
        )
        self.connection_status_label.pack()
        
        # RIGHT CONTENT AREA
        content_area = tk.Frame(main_container, bg=Colors.BACKGROUND)
        content_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Center content
        content = tk.Frame(content_area, bg=Colors.BACKGROUND)
        content.place(relx=0.5, rely=0.45, anchor=tk.CENTER)
        
        # Welcome message - smaller fonts for small screens
        tk.Label(
            content,
            text="Welcome",
            font=("SF Pro Display", 22, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY
        ).pack(pady=(0, 5))
        
        tk.Label(
            content,
            text="Tap a button on the left\nto begin scanning",
            font=("SF Pro Text", 14),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY,
            justify=tk.CENTER
        ).pack(pady=(0, 20))
    
    def _setup_scan_screen(self):
        """Setup the scanning screen with sidebar layout for small screens"""
        # Main horizontal layout - sidebar on left, camera on right
        main_container = tk.Frame(self.scan_frame, bg=Colors.BACKGROUND)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # LEFT SIDEBAR - Control buttons
        sidebar = tk.Frame(main_container, bg=Colors.PRIMARY, width=140)
        sidebar.pack(side=tk.LEFT, fill=tk.Y)
        sidebar.pack_propagate(False)
        
        # Sidebar header
        tk.Label(
            sidebar,
            text="RCV",
            font=("SF Pro Display", 16, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(10, 3))
        
        tk.Label(
            sidebar,
            text="QR SCAN",
            font=("SF Pro Text", 9),
            bg=Colors.PRIMARY,
            fg="#CCCCCC"
        ).pack(pady=(0, 15))
        
        # Sidebar control buttons - compact for small screens
        self.reload_camera_btn = tk.Button(
            sidebar,
            text="RELOAD",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.WARNING,
            fg=Colors.TEXT_WHITE,
            activebackground="#F57C00",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self.restart_camera
        )
        self.reload_camera_btn.pack(pady=5, padx=8, fill=tk.X)
        
        self.scan_product_btn = tk.Button(
            sidebar,
            text="SCAN\nLABEL",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ACCENT if TESSERACT_AVAILABLE else "#999999",
            fg=Colors.TEXT_WHITE,
            activebackground="#00A895",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._start_ocr_capture,
            state=tk.NORMAL if TESSERACT_AVAILABLE else tk.DISABLED
        )
        self.scan_product_btn.pack(pady=5, padx=8, fill=tk.X)
        
        self.back_to_start_btn = tk.Button(
            sidebar,
            text="BACK",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.TEXT_SECONDARY,
            fg=Colors.TEXT_WHITE,
            activebackground="#555555",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._show_start_screen
        )
        self.back_to_start_btn.pack(pady=5, padx=8, fill=tk.X)
        
        # Spacer
        tk.Frame(sidebar, bg=Colors.PRIMARY).pack(fill=tk.BOTH, expand=True)
        
        # Exit button at bottom (hidden by default)
        self.exit_button = tk.Button(
            sidebar,
            text="EXIT",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE,
            activebackground="#D32F2F",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=8,
            command=self.on_closing
        )
        # Bind long press on RELOAD to show exit button
        self.reload_camera_btn.bind('<Button-1>', self.start_exit_timer)
        self.reload_camera_btn.bind('<ButtonRelease-1>', self.cancel_exit_timer)
        self.exit_timer = None
        
        # RIGHT CONTENT AREA - Camera
        content_area = tk.Frame(main_container, bg=Colors.BACKGROUND)
        content_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Camera preview container - CENTERED
        camera_outer = tk.Frame(content_area, bg=Colors.BACKGROUND)
        camera_outer.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        
        # Instructions above camera - smaller for small screens
        tk.Label(
            camera_outer,
            text="Place QR Code Here",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY
        ).pack(pady=(0, 3))
        

        
        # Camera frame with decorative border
        camera_border = tk.Frame(
            camera_outer,
            bg=Colors.PRIMARY,
            padx=3,
            pady=3
        )
        camera_border.pack()
        
        # Inner camera container - fixed size for small screens
        qr_cam_w = min(380, self.screen_width - 180)
        qr_cam_h = min(280, self.screen_height - 120)
        
        self.camera_container = tk.Frame(
            camera_border,
            bg=Colors.SURFACE,
            width=qr_cam_w,
            height=qr_cam_h
        )
        self.camera_container.pack()
        self.camera_container.pack_propagate(False)
        self.camera_container.grid_propagate(False)
        
        # Camera label
        self.camera_label = tk.Label(
            self.camera_container,
            text="Loading Camera...",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY
        )
        self.camera_label.pack(expand=True, fill=tk.BOTH)
        self.camera_label.config(anchor=tk.CENTER)
        
        # Scanning indicator below camera
        self.scan_status_frame = tk.Frame(camera_outer, bg=Colors.BACKGROUND)
        self.scan_status_frame.pack(pady=(10, 0))
        
        self.scan_indicator = tk.Label(
            self.scan_status_frame,
            text="* Scanning",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.SUCCESS
        )
    
    def _setup_loading_screen(self):
        """Setup the HUGE loading screen"""
        # Full screen loading with spinner
        center = tk.Frame(self.loading_frame, bg=Colors.PRIMARY)
        center.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        
        # Spinner canvas - sized for small screens
        self.loading_canvas = tk.Canvas(
            center,
            width=100,
            height=100,
            bg=Colors.PRIMARY,
            highlightthickness=0
        )
        self.loading_canvas.pack(pady=(0, 15))
        
        # Loading text - fits small screen
        tk.Label(
            center,
            text="VERIFYING",
            font=("SF Pro Display", 28, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack()
        
        tk.Label(
            center,
            text="Please Wait...",
            font=("SF Pro Display", 16),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(5, 0))
        
        # Processing details
        self.loading_detail_label = tk.Label(
            center,
            text="Connecting to blockchain...",
            font=("SF Pro Text", 11),
            bg=Colors.PRIMARY,
            fg="#AAAAAA"
        )
        self.loading_detail_label.pack(pady=(15, 0))
    
    def _setup_ocr_capture_screen(self):
        """Setup OCR product scan screen - simple: camera preview + capture buttons.
        No modal, no popups. Camera shows live feed, user taps CAPTURE for front,
        then CAPTURE for back, then SUBMIT. Fixed sizes for small Pi screens."""
        # Full vertical layout
        main_container = tk.Frame(self.ocr_frame, bg=Colors.BACKGROUND)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # ===== TOP BAR - Step indicator + Cancel =====
        top_bar = tk.Frame(main_container, bg=Colors.ACCENT, height=34)
        top_bar.pack(fill=tk.X)
        top_bar.pack_propagate(False)
        
        self.ocr_header_label = tk.Label(
            top_bar,
            text="SCAN LABEL",
            font=("SF Pro Display", 10, "bold"),
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE
        )
        self.ocr_header_label.pack(side=tk.LEFT, padx=8)
        
        self.ocr_instruction_label = tk.Label(
            top_bar,
            text="Step 1: Capture FRONT",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ACCENT,
            fg="#E0F2F1"
        )
        self.ocr_instruction_label.pack(side=tk.LEFT, padx=6, expand=True)
        
        # Hidden sub-label (kept for compatibility)
        self.ocr_instruction_sub = tk.Label(top_bar, text="", bg=Colors.ACCENT, fg=Colors.ACCENT)
        
        self.ocr_cancel_btn = tk.Button(
            top_bar,
            text="CANCEL",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE,
            activebackground="#D32F2F",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            padx=8,
            command=self._ocr_cancel
        )
        self.ocr_cancel_btn.pack(side=tk.RIGHT, padx=4, pady=3)
        
        # ===== CAMERA PREVIEW - Fixed size, centered =====
        cam_w = min(400, self.screen_width - 20)
        cam_h = min(280, self.screen_height - 160)
        
        cam_center = tk.Frame(main_container, bg=Colors.BACKGROUND)
        cam_center.pack(fill=tk.BOTH, expand=True)
        
        cam_border = tk.Frame(cam_center, bg=Colors.ACCENT, padx=2, pady=2)
        cam_border.pack(expand=True)
        
        self.ocr_camera_container = tk.Frame(
            cam_border, bg="#000000",
            width=cam_w, height=cam_h
        )
        self.ocr_camera_container.pack()
        self.ocr_camera_container.pack_propagate(False)
        
        self.ocr_camera_label = tk.Label(
            self.ocr_camera_container,
            text="Camera Preview",
            font=("SF Pro Text", 10),
            bg="#000000",
            fg=Colors.TEXT_WHITE
        )
        self.ocr_camera_label.pack(expand=True, fill=tk.BOTH)
        
        # ===== STATUS STRIP - Shows capture status =====
        status_strip = tk.Frame(main_container, bg=Colors.SURFACE, height=28)
        status_strip.pack(fill=tk.X)
        status_strip.pack_propagate(False)
        
        self.ocr_front_preview = tk.Label(
            status_strip,
            text="FRONT: --",
            font=("SF Pro Text", 9),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            padx=6
        )
        self.ocr_front_preview.pack(side=tk.LEFT, padx=4)
        
        tk.Label(status_strip, text="|", bg=Colors.SURFACE, fg="#CCCCCC",
                 font=("SF Pro Text", 9)).pack(side=tk.LEFT)
        
        self.ocr_back_preview = tk.Label(
            status_strip,
            text="BACK: --",
            font=("SF Pro Text", 9),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            padx=6
        )
        self.ocr_back_preview.pack(side=tk.LEFT, padx=4)
        
        # Hidden thumb labels (for capture method compatibility)
        self.ocr_front_thumb = tk.Label(self.ocr_frame)
        self.ocr_back_thumb = tk.Label(self.ocr_frame)
        
        # ===== BOTTOM ACTION BAR - CAPTURE + SUBMIT buttons =====
        action_bar = tk.Frame(main_container, bg=Colors.PRIMARY_DARK, height=50)
        action_bar.pack(fill=tk.X, side=tk.BOTTOM)
        action_bar.pack_propagate(False)
        
        btn_frame = tk.Frame(action_bar, bg=Colors.PRIMARY_DARK)
        btn_frame.pack(expand=True, fill=tk.BOTH, padx=4, pady=4)
        
        btn_font = ("SF Pro Text", 10, "bold")
        
        self.ocr_capture_front_btn = tk.Button(
            btn_frame,
            text="CAPTURE FRONT",
            font=btn_font,
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            command=self._ocr_capture_front
        )
        self.ocr_capture_front_btn.pack(side=tk.LEFT, expand=True, fill=tk.BOTH, padx=2)
        
        self.ocr_capture_back_btn = tk.Button(
            btn_frame,
            text="CAPTURE BACK",
            font=btn_font,
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            command=self._ocr_capture_back,
            state=tk.DISABLED
        )
        self.ocr_capture_back_btn.pack(side=tk.LEFT, expand=True, fill=tk.BOTH, padx=2)
        
        self.ocr_submit_btn = tk.Button(
            btn_frame,
            text="SUBMIT",
            font=btn_font,
            bg=Colors.SUCCESS,
            fg=Colors.TEXT_WHITE,
            activebackground="#43A047",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            command=self._ocr_submit_scan,
            state=tk.DISABLED
        )
        self.ocr_submit_btn.pack(side=tk.LEFT, expand=True, fill=tk.BOTH, padx=2)
    
    def _setup_result_screen(self):
        """Setup the result screen with responsive layout for small screens"""
        # Header - responsive height
        self.result_header = tk.Frame(self.result_frame, bg=Colors.SUCCESS, height=100)
        self.result_header.pack(fill=tk.X)
        self.result_header.pack_propagate(False)
        
        self.result_status_label = tk.Label(
            self.result_header,
            text="VERIFIED",
            font=("SF Pro Display", 36, "bold"),
            bg=Colors.SUCCESS,
            fg=Colors.TEXT_WHITE
        )
        self.result_status_label.pack(expand=True)
        
        # Main content area - use canvas with scrollbar for small screens
        content_container = tk.Frame(self.result_frame, bg=Colors.BACKGROUND)
        content_container.pack(fill=tk.BOTH, expand=True)
        
        # Add scrollbar for small screens
        scrollbar = tk.Scrollbar(content_container, orient=tk.VERTICAL)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.result_canvas = tk.Canvas(
            content_container,
            bg=Colors.BACKGROUND,
            yscrollcommand=scrollbar.set,
            highlightthickness=0
        )
        self.result_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.result_canvas.yview)
        
        # Content frame inside canvas
        content = tk.Frame(self.result_canvas, bg=Colors.BACKGROUND)
        self.result_canvas_window = self.result_canvas.create_window(
            (0, 0), window=content, anchor=tk.NW
        )
        
        # Bind canvas resize to update scroll region
        content.bind('<Configure>', lambda e: self.result_canvas.configure(
            scrollregion=self.result_canvas.bbox('all')
        ))
        
        # Make canvas scrollable with touch
        self.result_canvas.bind('<Button-1>', self.start_scroll)
        self.result_canvas.bind('<B1-Motion>', self.do_scroll)
        self.scroll_start_y = 0
        
        # Left side - Information panel (responsive width)
        info_container = tk.Frame(content, bg=Colors.BACKGROUND)
        info_container.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.result_info_frame = tk.Frame(info_container, bg=Colors.SURFACE)
        self.result_info_frame.pack(fill=tk.BOTH, expand=True)
        
        # Right side - PDF display (responsive, stacked on small screens)
        pdf_container = tk.Frame(content, bg=Colors.BACKGROUND)
        pdf_container.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.pdf_display_frame = tk.Frame(pdf_container, bg=Colors.SURFACE)
        self.pdf_display_frame.pack(fill=tk.BOTH, expand=True)
        
        # PDF pages container - vertical stack for small screens
        self.pdf_pages_frame = tk.Frame(self.pdf_display_frame, bg=Colors.SURFACE)
        self.pdf_pages_frame.pack(expand=True, fill=tk.BOTH, padx=5, pady=5)
        
        # Two PDF page labels - stack vertically for better small screen support
        self.pdf_page1_label = tk.Label(
            self.pdf_pages_frame,
            text="Loading PDF Page 1...",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            cursor="hand2"  # Show clickable cursor
        )
        self.pdf_page1_label.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(0, 3))
        self.pdf_page1_label.bind('<Button-1>', lambda e: self._open_pdf_zoom(0))  # Click to zoom
        
        self.pdf_page2_label = tk.Label(
            self.pdf_pages_frame,
            text="Loading PDF Page 2...",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            cursor="hand2"  # Show clickable cursor
        )
        self.pdf_page2_label.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(3, 0))
        self.pdf_page2_label.bind('<Button-1>', lambda e: self._open_pdf_zoom(1))  # Click to zoom
        
        # Footer with timer - touch to pause
        self.result_footer = tk.Frame(self.result_frame, bg=Colors.PRIMARY, height=100)
        self.result_footer.pack(fill=tk.X, side=tk.BOTTOM)
        self.result_footer.pack_propagate(False)
        
        self.result_timer_label = tk.Label(
            self.result_footer,
            text="Returning to scanner in 30s",
            font=("SF Pro Text", 20),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        )
        self.result_timer_label.pack(pady=(10, 0))
        
        self.result_pause_hint = tk.Label(
            self.result_footer,
            text="Touch and hold to pause",
            font=("SF Pro Text", 12),
            bg=Colors.PRIMARY,
            fg="#CCCCCC"
        )
        self.result_pause_hint.pack(pady=(5, 10))
        
        # Bind touch-to-pause on result frame
        self.result_frame.bind('<Button-1>', self._pause_timer)
        self.result_frame.bind('<ButtonRelease-1>', self._resume_timer)
        self.result_footer.bind('<Button-1>', self._pause_timer)
        self.result_footer.bind('<ButtonRelease-1>', self._resume_timer)
    
    def _setup_error_screen(self):
        """Setup the error screen with 10 second timeout"""
        # Red header
        error_header = tk.Frame(self.error_frame, bg=Colors.ERROR, height=150)
        error_header.pack(fill=tk.X)
        error_header.pack_propagate(False)
        
        tk.Label(
            error_header,
            text="ERROR",
            font=("SF Pro Display", 64, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(expand=True)
        
        # Center content
        center = tk.Frame(self.error_frame, bg=Colors.BACKGROUND)
        center.pack(fill=tk.BOTH, expand=True)
        
        error_content = tk.Frame(center, bg=Colors.BACKGROUND)
        error_content.place(relx=0.5, rely=0.4, anchor=tk.CENTER)
        
        # Error icon
        error_icon = tk.Canvas(error_content, width=150, height=150, bg=Colors.BACKGROUND, highlightthickness=0)
        error_icon.pack(pady=(0, 40))
        error_icon.create_oval(10, 10, 140, 140, outline=Colors.ERROR, width=8)
        error_icon.create_text(75, 75, text="!", font=("SF Pro Display", 80, "bold"), fill=Colors.ERROR)
        
        self.error_message_label = tk.Label(
            error_content,
            text="An error occurred",
            font=("SF Pro Display", 32, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY,
            wraplength=800
        )
        self.error_message_label.pack(pady=(0, 20))
        
        self.error_detail_label = tk.Label(
            error_content,
            text="A problem occurred",
            font=("SF Pro Text", 24),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY,
            wraplength=800
        )
        self.error_detail_label.pack()
        
        # Suggestions
        suggestions_frame = tk.Frame(error_content, bg=Colors.ERROR_LIGHT, padx=30, pady=20)
        suggestions_frame.pack(pady=(50, 0))
        
        tk.Label(
            suggestions_frame,
            text="Please try:",
            font=("SF Pro Text", 18, "bold"),
            bg=Colors.ERROR_LIGHT,
            fg=Colors.TEXT_PRIMARY
        ).pack(anchor=tk.W)
        
        suggestions = [
            "• Hold the QR code steady",
            "• Ensure good lighting",
            "• Try a different QR code"
        ]
        for s in suggestions:
            tk.Label(
                suggestions_frame,
                text=s,
                font=("SF Pro Text", 16),
                bg=Colors.ERROR_LIGHT,
                fg=Colors.TEXT_SECONDARY
            ).pack(anchor=tk.W, pady=2)
        
        # Footer with timer
        error_footer = tk.Frame(self.error_frame, bg=Colors.ERROR, height=70)
        error_footer.pack(fill=tk.X, side=tk.BOTTOM)
        error_footer.pack_propagate(False)
        
        self.error_timer_label = tk.Label(
            error_footer,
            text="Returning to scanner in 10s",
            font=("SF Pro Text", 18),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        )
        self.error_timer_label.pack(expand=True)
    
    def _setup_compliance_screen(self):
        """Setup the product search results screen - shows product and certificate information"""
        # Header - dynamic based on search result
        self.compliance_header = tk.Frame(self.compliance_frame, bg=Colors.SUCCESS, height=90)
        self.compliance_header.pack(fill=tk.X)
        self.compliance_header.pack_propagate(False)
        
        self.compliance_status_label = tk.Label(
            self.compliance_header,
            text="PRODUCT FOUND",
            font=("SF Pro Display", 28, "bold"),
            bg=Colors.SUCCESS,
            fg=Colors.TEXT_WHITE
        )
        self.compliance_status_label.pack(expand=True)
        
        # Main content - scrollable
        content = tk.Frame(self.compliance_frame, bg=Colors.BACKGROUND)
        content.pack(fill=tk.BOTH, expand=True)
        
        # Product info section - PROMINENT
        self.compliance_product_frame = tk.Frame(content, bg=Colors.SURFACE, padx=20, pady=15)
        self.compliance_product_frame.pack(fill=tk.X, padx=15, pady=10)
        
        # Product icon/badge
        product_header = tk.Frame(self.compliance_product_frame, bg=Colors.SURFACE)
        product_header.pack(fill=tk.X)
        
        tk.Label(
            product_header,
            text="",
            font=("SF Pro Display", 28),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        ).pack(side=tk.LEFT, padx=(0, 12))
        
        product_info_frame = tk.Frame(product_header, bg=Colors.SURFACE)
        product_info_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        self.compliance_product_name = tk.Label(
            product_info_frame,
            text="Product Name",
            font=("SF Pro Display", 20, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY,
            anchor=tk.W,
            wraplength=500
        )
        self.compliance_product_name.pack(anchor=tk.W)
        
        self.compliance_brand = tk.Label(
            product_info_frame,
            text="Brand / Manufacturer",
            font=("SF Pro Text", 14),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            anchor=tk.W
        )
        self.compliance_brand.pack(anchor=tk.W)
        
        # REGISTRATION & CERTIFICATE DETAILS - Two columns
        reg_title = tk.Label(
            content,
            text="REGISTRATION & CERTIFICATE DETAILS",
            font=("SF Pro Display", 16, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY
        )
        reg_title.pack(pady=(10, 8))
        
        self.compliance_checklist_frame = tk.Frame(content, bg=Colors.SURFACE, padx=20, pady=12)
        self.compliance_checklist_frame.pack(fill=tk.X, padx=15)
        
        # Two-column layout for registration info
        reg_columns = tk.Frame(self.compliance_checklist_frame, bg=Colors.SURFACE)
        reg_columns.pack(fill=tk.X)
        
        left_col = tk.Frame(reg_columns, bg=Colors.SURFACE)
        left_col.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))
        
        right_col = tk.Frame(reg_columns, bg=Colors.SURFACE)
        right_col.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(10, 0))
        
        # LEFT COLUMN: CFPR and LTO
        # CFPR info row
        cfpr_row = tk.Frame(left_col, bg=Colors.SURFACE)
        cfpr_row.pack(fill=tk.X, pady=4)
        
        tk.Label(
            cfpr_row,
            text="CFPR No:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            width=10,
            anchor=tk.W
        ).pack(side=tk.LEFT)
        
        self.cfpr_check_label = tk.Label(
            cfpr_row,
            text="Loading...",
            font=("SF Pro Text", 13, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        )
        self.cfpr_check_label.pack(side=tk.LEFT, padx=5)
        
        # LTO info row
        lto_row = tk.Frame(left_col, bg=Colors.SURFACE)
        lto_row.pack(fill=tk.X, pady=4)
        
        tk.Label(
            lto_row,
            text="LTO No:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            width=10,
            anchor=tk.W
        ).pack(side=tk.LEFT)
        
        self.lto_check_label = tk.Label(
            lto_row,
            text="Loading...",
            font=("SF Pro Text", 13, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        )
        self.lto_check_label.pack(side=tk.LEFT, padx=5)
        
        # Certificate ID row (display only - no view certificate)
        cert_row = tk.Frame(left_col, bg=Colors.SURFACE)
        cert_row.pack(fill=tk.X, pady=4)
        
        tk.Label(
            cert_row,
            text="Certificate:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            width=10,
            anchor=tk.W
        ).pack(side=tk.LEFT)
        
        self.cert_id_label = tk.Label(
            cert_row,
            text="-",
            font=("SF Pro Text", 11),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        )
        self.cert_id_label.pack(side=tk.LEFT, padx=5)
        
        # RIGHT COLUMN: Dates and Status
        # Registration Date row
        reg_date_row = tk.Frame(right_col, bg=Colors.SURFACE)
        reg_date_row.pack(fill=tk.X, pady=4)
        
        tk.Label(
            reg_date_row,
            text="Registered:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            width=10,
            anchor=tk.W
        ).pack(side=tk.LEFT)
        
        self.reg_date_label = tk.Label(
            reg_date_row,
            text="-",
            font=("SF Pro Text", 13),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        )
        self.reg_date_label.pack(side=tk.LEFT, padx=5)
        
        # Expiry Date row
        exp_date_row = tk.Frame(right_col, bg=Colors.SURFACE)
        exp_date_row.pack(fill=tk.X, pady=4)
        
        tk.Label(
            exp_date_row,
            text="Expires:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            width=10,
            anchor=tk.W
        ).pack(side=tk.LEFT)
        
        self.exp_date_label = tk.Label(
            exp_date_row,
            text="-",
            font=("SF Pro Text", 13),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        )
        self.exp_date_label.pack(side=tk.LEFT, padx=5)
        
        # Status info row
        self.compliance_status_row = tk.Frame(right_col, bg=Colors.SURFACE)
        self.compliance_status_row.pack(fill=tk.X, pady=4)
        
        tk.Label(
            self.compliance_status_row,
            text="Status:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY,
            width=10,
            anchor=tk.W
        ).pack(side=tk.LEFT)
        
        self.compliance_status_info = tk.Label(
            self.compliance_status_row,
            text="Registered",
            font=("SF Pro Text", 13, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.SUCCESS
        )
        self.compliance_status_info.pack(side=tk.LEFT, padx=5)
        
        # ADDITIONAL PRODUCT DETAILS section
        self.product_details_frame = tk.Frame(content, bg=Colors.SURFACE, padx=20, pady=10)
        self.product_details_frame.pack(fill=tk.X, padx=15, pady=(8, 0))
        
        tk.Label(
            self.product_details_frame,
            text="PRODUCT DETAILS",
            font=("SF Pro Display", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        ).pack(anchor=tk.W, pady=(0, 5))
        
        # Details in a grid
        details_grid = tk.Frame(self.product_details_frame, bg=Colors.SURFACE)
        details_grid.pack(fill=tk.X)
        
        # Product Category
        cat_row = tk.Frame(details_grid, bg=Colors.SURFACE)
        cat_row.pack(fill=tk.X, pady=2)
        tk.Label(cat_row, text="Category:", font=("SF Pro Text", 11), bg=Colors.SURFACE, fg=Colors.TEXT_SECONDARY, width=12, anchor=tk.W).pack(side=tk.LEFT)
        self.product_category_label = tk.Label(cat_row, text="-", font=("SF Pro Text", 11), bg=Colors.SURFACE, fg=Colors.TEXT_PRIMARY)
        self.product_category_label.pack(side=tk.LEFT)
        
        # Product Type
        type_row = tk.Frame(details_grid, bg=Colors.SURFACE)
        type_row.pack(fill=tk.X, pady=2)
        tk.Label(type_row, text="Type:", font=("SF Pro Text", 11), bg=Colors.SURFACE, fg=Colors.TEXT_SECONDARY, width=12, anchor=tk.W).pack(side=tk.LEFT)
        self.product_type_label = tk.Label(type_row, text="-", font=("SF Pro Text", 11), bg=Colors.SURFACE, fg=Colors.TEXT_PRIMARY)
        self.product_type_label.pack(side=tk.LEFT)
        
        # Lot Number
        lot_row = tk.Frame(details_grid, bg=Colors.SURFACE)
        lot_row.pack(fill=tk.X, pady=2)
        tk.Label(lot_row, text="Lot Number:", font=("SF Pro Text", 11), bg=Colors.SURFACE, fg=Colors.TEXT_SECONDARY, width=12, anchor=tk.W).pack(side=tk.LEFT)
        self.product_lot_label = tk.Label(lot_row, text="-", font=("SF Pro Text", 11), bg=Colors.SURFACE, fg=Colors.TEXT_PRIMARY)
        self.product_lot_label.pack(side=tk.LEFT)
        
        # Additional info section (for extra details)
        self.compliance_warnings_frame = tk.Frame(content, bg=Colors.SUCCESS_LIGHT, padx=15, pady=10)
        # Don't pack yet - only shown if there is additional info
        
        self.compliance_warnings_label = tk.Label(
            self.compliance_warnings_frame,
            text="",
            font=("SF Pro Text", 11),
            bg=Colors.SUCCESS_LIGHT,
            fg=Colors.TEXT_PRIMARY,
            justify=tk.LEFT,
            wraplength=600
        )
        self.compliance_warnings_label.pack(anchor=tk.W)
        
        # Photo thumbnails section
        photos_frame = tk.Frame(content, bg=Colors.BACKGROUND)
        photos_frame.pack(pady=10)
        
        tk.Label(
            photos_frame,
            text="Scanned Images:",
            font=("SF Pro Text", 11),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        ).pack()
        
        self.compliance_photos_frame = tk.Frame(photos_frame, bg=Colors.BACKGROUND)
        self.compliance_photos_frame.pack(pady=5)
        
        self.compliance_front_thumb = tk.Label(
            self.compliance_photos_frame,
            text="Front",
            font=("SF Pro Text", 11),
            bg=Colors.SURFACE,
            width=220,
            height=140
        )
        self.compliance_front_thumb.pack(side=tk.LEFT, padx=8)
        
        self.compliance_back_thumb = tk.Label(
            self.compliance_photos_frame,
            text="Back",
            font=("SF Pro Text", 11),
            bg=Colors.SURFACE,
            width=220,
            height=140
        )
        self.compliance_back_thumb.pack(side=tk.LEFT, padx=8)
        
        # MANUAL SEARCH button - shown only when product not found
        self.compliance_manual_search_frame = tk.Frame(content, bg=Colors.BACKGROUND)
        # Don't pack yet - only shown when product not found
        
        self.compliance_manual_search_btn = tk.Button(
            self.compliance_manual_search_frame,
            text="MANUAL SEARCH\nEnter Registration Numbers",
            font=("SF Pro Display", 20, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            padx=50,
            pady=20,
            cursor="hand2",
            command=self._show_manual_search_screen
        )
        self.compliance_manual_search_btn.pack(pady=10)
        
        self.compliance_retry_btn = tk.Button(
            self.compliance_manual_search_frame,
            text="TRY SCANNING AGAIN",
            font=("SF Pro Text", 14, "bold"),
            bg=Colors.WARNING,
            fg=Colors.TEXT_WHITE,
            activebackground="#F57C00",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            padx=30,
            pady=12,
            cursor="hand2",
            command=self._start_ocr_capture
        )
        self.compliance_retry_btn.pack(pady=(0, 5))
        
        # Footer with timer
        self.compliance_footer = tk.Frame(self.compliance_frame, bg=Colors.PRIMARY, height=80)
        self.compliance_footer.pack(fill=tk.X, side=tk.BOTTOM)
        self.compliance_footer.pack_propagate(False)
        
        self.compliance_timer_label = tk.Label(
            self.compliance_footer,
            text="Returning to scanner in 30s",
            font=("SF Pro Text", 18),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        )
        self.compliance_timer_label.pack(pady=(10, 0))
        
        tk.Label(
            self.compliance_footer,
            text="Touch and hold to pause",
            font=("SF Pro Text", 11),
            bg=Colors.PRIMARY,
            fg="#CCCCCC"
        ).pack(pady=(3, 10))
        
        # Bind touch-to-pause
        self.compliance_frame.bind('<Button-1>', self._pause_timer)
        self.compliance_frame.bind('<ButtonRelease-1>', self._resume_timer)
    
    def _setup_manual_search_screen(self):
        """Setup manual search screen with on-screen keyboard for touchscreen"""
        # Main horizontal layout
        main_container = tk.Frame(self.manual_search_frame, bg=Colors.BACKGROUND)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # LEFT SIDEBAR
        sidebar = tk.Frame(main_container, bg=Colors.WARNING, width=140)
        sidebar.pack(side=tk.LEFT, fill=tk.Y)
        sidebar.pack_propagate(False)
        
        # Sidebar header
        tk.Label(
            sidebar,
            text="MANUAL",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.WARNING,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(10, 3))
        
        tk.Label(
            sidebar,
            text="SEARCH",
            font=("SF Pro Text", 10),
            bg=Colors.WARNING,
            fg="#FFFFFF"
        ).pack(pady=(0, 15))
        
        # Search button
        self.manual_search_submit_btn = tk.Button(
            sidebar,
            text="SEARCH",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.SUCCESS,
            fg=Colors.TEXT_WHITE,
            activebackground="#43A047",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._manual_search_submit
        )
        self.manual_search_submit_btn.pack(pady=5, padx=8, fill=tk.X)
        
        # Clear button
        self.manual_search_clear_btn = tk.Button(
            sidebar,
            text="CLEAR",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.TEXT_SECONDARY,
            fg=Colors.TEXT_WHITE,
            activebackground="#555555",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._manual_search_clear
        )
        self.manual_search_clear_btn.pack(pady=5, padx=8, fill=tk.X)
        
        # Back button
        self.manual_search_back_btn = tk.Button(
            sidebar,
            text="BACK",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE,
            activebackground="#D32F2F",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._show_start_screen
        )
        self.manual_search_back_btn.pack(pady=5, padx=8, fill=tk.X)
        
        # Spacer
        tk.Frame(sidebar, bg=Colors.WARNING).pack(fill=tk.BOTH, expand=True)
        
        # RIGHT CONTENT AREA - Scrollable for small screens
        content_area = tk.Frame(main_container, bg=Colors.BACKGROUND)
        content_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Center content vertically near top for keyboard visibility
        center = tk.Frame(content_area, bg=Colors.BACKGROUND)
        center.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # Title
        tk.Label(
            center,
            text="Manual Product Search",
            font=("SF Pro Display", 18, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY
        ).pack(pady=(5, 2))
        
        tk.Label(
            center,
            text="Tap on input field, then use keyboard below",
            font=("SF Pro Text", 11),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        ).pack(pady=(0, 10))
        
        # Input fields frame - side by side for better layout
        fields_frame = tk.Frame(center, bg=Colors.SURFACE, padx=20, pady=15)
        fields_frame.pack(fill=tk.X)
        
        # CFPR Number input (left side)
        cfpr_frame = tk.Frame(fields_frame, bg=Colors.SURFACE)
        cfpr_frame.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=10)
        
        tk.Label(
            cfpr_frame,
            text="CFPR Number:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        ).pack(anchor=tk.W)
        
        self.cfpr_entry = tk.Entry(
            cfpr_frame,
            font=("SF Pro Text", 18),
            width=18,
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY,
            relief=tk.SOLID,
            bd=2,
            insertwidth=3,
            insertbackground=Colors.PRIMARY
        )
        self.cfpr_entry.pack(pady=(5, 3), fill=tk.X)
        # Bind focus events to switch keyboard target
        self.cfpr_entry.bind('<FocusIn>', lambda e: self._set_keyboard_target(self.cfpr_entry))
        self.cfpr_entry.bind('<Button-1>', lambda e: self._set_keyboard_target(self.cfpr_entry))
        
        tk.Label(
            cfpr_frame,
            text="Examples: FR-12345, IM-67890, CFPR-2024-001",
            font=("SF Pro Text", 10),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        ).pack(anchor=tk.W)
        
        # LTO/BAI Number input (right side)
        lto_frame = tk.Frame(fields_frame, bg=Colors.SURFACE)
        lto_frame.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=10)
        
        tk.Label(
            lto_frame,
            text="LTO/BAI Number:",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        ).pack(anchor=tk.W)
        
        self.lto_entry = tk.Entry(
            lto_frame,
            font=("SF Pro Text", 18),
            width=18,
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY,
            relief=tk.SOLID,
            bd=2,
            insertwidth=3,
            insertbackground=Colors.PRIMARY
        )
        self.lto_entry.pack(pady=(5, 3), fill=tk.X)
        # Bind focus events to switch keyboard target
        self.lto_entry.bind('<FocusIn>', lambda e: self._set_keyboard_target(self.lto_entry))
        self.lto_entry.bind('<Button-1>', lambda e: self._set_keyboard_target(self.lto_entry))
        
        tk.Label(
            lto_frame,
            text="Examples: LTO-2024-001, DR-5678, BAI-12345",
            font=("SF Pro Text", 10),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        ).pack(anchor=tk.W)
        
        # Active field indicator
        self.active_field_label = tk.Label(
            center,
            text="Tap an input field above to type",
            font=("SF Pro Text", 11, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.PRIMARY
        )
        self.active_field_label.pack(pady=(10, 5))
        
        # Create on-screen keyboard
        self.manual_search_keyboard = OnScreenKeyboard(center, None)
        self.manual_search_keyboard.create_keyboard(center)
        
        # Note at bottom
        note_frame = tk.Frame(center, bg=Colors.BACKGROUND)
        note_frame.pack(pady=(10, 5))
        
        tk.Label(
            note_frame,
            text="Enter registration codes WITH hyphens (e.g., FR-12345)",
            font=("SF Pro Text", 11, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.WARNING
        ).pack()
        
        tk.Label(
            note_frame,
            text="Use [123] button to type numbers, [ABC] for letters",
            font=("SF Pro Text", 10),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        ).pack()
    
    def _set_keyboard_target(self, entry_widget):
        """Set the target entry for the on-screen keyboard"""
        if hasattr(self, 'manual_search_keyboard'):
            # Reset previous entry styling
            if hasattr(self, 'cfpr_entry'):
                self.cfpr_entry.config(relief=tk.SOLID, bd=2, highlightthickness=0)
            if hasattr(self, 'lto_entry'):
                self.lto_entry.config(relief=tk.SOLID, bd=2, highlightthickness=0)
            
            # Highlight active entry
            entry_widget.config(relief=tk.SOLID, bd=3, highlightthickness=3, highlightbackground=Colors.PRIMARY, highlightcolor=Colors.PRIMARY)
            
            # Set keyboard target
            self.manual_search_keyboard.set_target(entry_widget)
            
            # Update label
            if entry_widget == self.cfpr_entry:
                self.active_field_label.config(text="Typing into: CFPR Number")
            else:
                self.active_field_label.config(text="Typing into: LTO/BAI Number")
    
    def _setup_maintenance_screen(self):
        """Setup the offline/maintenance screen - sized for small Raspberry Pi screens.
        Shows clear OFFLINE status, reconnect button, and auto-retry countdown."""
        self.maintenance_frame.config(bg=Colors.ERROR)
        
        # Full-screen container
        center = tk.Frame(self.maintenance_frame, bg=Colors.ERROR)
        center.pack(fill=tk.BOTH, expand=True)
        
        content = tk.Frame(center, bg=Colors.ERROR)
        content.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        
        # Warning icon
        tk.Label(
            content,
            text="!",
            font=("SF Pro Display", 36, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(0, 5))
        
        # OFFLINE text - large but fits small screen
        tk.Label(
            content,
            text="OFFLINE",
            font=("SF Pro Display", 36, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(0, 3))
        
        tk.Label(
            content,
            text="SERVER NOT CONNECTED",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.ERROR,
            fg="#FFCCCC"
        ).pack(pady=(0, 10))
        
        # Sub-message
        self.maintenance_message = tk.Label(
            content,
            text="Cannot reach the RCV server",
            font=("SF Pro Text", 11),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_message.pack(pady=(0, 12))
        
        # Status indicator
        status_frame = tk.Frame(content, bg="#D32F2F", padx=15, pady=8)
        status_frame.pack(fill=tk.X, padx=30)
        
        self.maintenance_status_icon = tk.Label(
            status_frame,
            text="...",
            font=("SF Pro Text", 12, "bold"),
            bg="#D32F2F",
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_status_icon.pack(side=tk.LEFT, padx=(0, 8))
        
        self.maintenance_status_label = tk.Label(
            status_frame,
            text="Checking connection...",
            font=("SF Pro Text", 11, "bold"),
            bg="#D32F2F",
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_status_label.pack(side=tk.LEFT, expand=True)
        
        # ===== RECONNECT BUTTON - Big, touchable =====
        self.maintenance_reconnect_btn = tk.Button(
            content,
            text="RECONNECT NOW",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.TEXT_WHITE,
            fg=Colors.ERROR,
            activebackground="#FFCCCC",
            activeforeground=Colors.ERROR,
            relief=tk.FLAT,
            bd=0,
            padx=30,
            pady=12,
            cursor="hand2",
            command=self._manual_reconnect
        )
        self.maintenance_reconnect_btn.pack(pady=(15, 8))
        
        # Retry countdown
        self.maintenance_retry_label = tk.Label(
            content,
            text="Auto-retry in 10s",
            font=("SF Pro Text", 10),
            bg=Colors.ERROR,
            fg="#FFCCCC"
        )
        self.maintenance_retry_label.pack(pady=(5, 0))
        
        # Bottom message
        tk.Label(
            content,
            text="Will resume automatically on reconnect",
            font=("SF Pro Text", 9),
            bg=Colors.ERROR,
            fg="#FF9999"
        ).pack(pady=(8, 0))
    
    def _draw_qr_icon(self, canvas, size, color):
        """Draw a QR code icon on canvas"""
        margin = size * 0.15
        inner = size - margin * 2
        
        # Outer square
        canvas.create_rectangle(
            margin, margin, size - margin, size - margin,
            outline=color, width=4
        )
        
        # QR pattern squares
        cell = inner / 5
        positions = [(0, 0), (3, 0), (0, 3), (1, 1), (2, 2), (3, 3)]
        for px, py in positions:
            x = margin + cell * px + cell * 0.5
            y = margin + cell * py + cell * 0.5
            canvas.create_rectangle(
                x, y, x + cell * 0.8, y + cell * 0.8,
                fill=color, outline=""
            )
    
    def start_scroll(self, event):
        """Start touch scrolling on result canvas"""
        self.scroll_start_y = event.y
    
    def do_scroll(self, event):
        """Perform touch scrolling on result canvas"""
        delta = self.scroll_start_y - event.y
        self.result_canvas.yview_scroll(int(delta / 20), 'units')
        self.scroll_start_y = event.y
    
    def toggle_sound(self):
        """Toggle sound on/off - touch friendly"""
        self.tts.toggle_mute()
        button_text = "SOUND\nOFF" if self.tts.is_muted else "SOUND\nON"
        if hasattr(self, 'mute_button'):
            self.mute_button.config(text=button_text)
    
    def restart_camera(self):
        """Restart camera (reload button)"""
        print("Restarting camera...")
        self.stop_camera()
        time.sleep(0.5)
        self.start_camera()
        print("Camera restarted")
    
    def start_exit_timer(self, event):
        """Start timer for exit button reveal (long press)"""
        self.exit_timer = self.root.after(3000, self.reveal_exit_button)
    
    def cancel_exit_timer(self, event):
        """Cancel exit timer if button released early"""
        if self.exit_timer:
            self.root.after_cancel(self.exit_timer)
            self.exit_timer = None
    
    def reveal_exit_button(self):
        """Show exit button after long press"""
        if hasattr(self, 'exit_button'):
            self.exit_button.pack(side=tk.LEFT, padx=20)
            self.root.after(5000, lambda: self.exit_button.pack_forget())  # Hide after 5 seconds
    
    def _hide_all_screens(self):
        """Hide all screen frames"""
        for frame in [self.start_frame, self.scan_frame, self.ocr_frame,
                      self.loading_frame, self.result_frame, 
                      self.compliance_frame, self.manual_search_frame,
                      self.error_frame, self.maintenance_frame,
                      self.boot_frame]:
            frame.pack_forget()
        
        # Destroy dynamic OCR not-found screen if it exists
        if hasattr(self, '_ocr_not_found_frame') and self._ocr_not_found_frame:
            try:
                self._ocr_not_found_frame.destroy()
            except:
                pass
            self._ocr_not_found_frame = None
        
        # Cancel any running timers
        if self.processing_timeout_id:
            self.root.after_cancel(self.processing_timeout_id)
            self.processing_timeout_id = None
        
        if self.led_solid_timer:
            self.root.after_cancel(self.led_solid_timer)
            self.led_solid_timer = None
    
    def _show_start_screen(self):
        """Show start screen with touch buttons"""
        self._hide_all_screens()
        self.start_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.CAMERA_OFF
        
        # Stop camera if running
        if self.camera and self.camera.isOpened():
            self.is_running = False
            self.camera.release()
            self.camera = None
        
        # Start idle timer for slideshow
        self._start_idle_timer()
    
    def _show_scan_screen(self):
        """Show scanning screen"""
        self._hide_all_screens()
        self.scan_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.IDLE
        self._animate_scan_indicator()
    
    def _show_ocr_screen(self):
        """Show OCR capture screen"""
        self._hide_all_screens()
        self.ocr_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.OCR_CAPTURE
        self.ocr_step = OCRCaptureStep.READY_FRONT
        self._reset_ocr_capture()
        self._update_ocr_ui()
    
    def _show_loading_screen(self, detail_text="Connecting to blockchain..."):
        """Show HUGE loading screen"""
        self._hide_all_screens()
        self.loading_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.PROCESSING
        self.loading_detail_label.config(text=detail_text)
        self._animate_loading_spinner()
        # Start blinking processing LED
        self.gpio_led.start_processing()
        
        # Start 60-second timeout
        self.processing_start_time = time.time()
        if self.processing_timeout_id:
            self.root.after_cancel(self.processing_timeout_id)
        self.processing_timeout_id = self.root.after(self.PROCESSING_TIMEOUT * 1000, self._processing_timeout)
    
    def _show_result_screen(self):
        """Show result screen"""
        self._hide_all_screens()
        self.result_frame.pack(fill=tk.BOTH, expand=True)
    
    def _show_compliance_screen(self):
        """Show compliance report screen"""
        self._hide_all_screens()
        self.compliance_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.DISPLAY_COMPLIANCE
    
    def _show_manual_search_screen(self):
        """Show manual search screen"""
        # Cancel idle timer - user is interacting
        if self.idle_timer_id:
            self.root.after_cancel(self.idle_timer_id)
            self.idle_timer_id = None
        
        self._hide_all_screens()
        self.manual_search_frame.pack(fill=tk.BOTH, expand=True)
        # Clear previous entries
        self.cfpr_entry.delete(0, tk.END)
        self.lto_entry.delete(0, tk.END)
        # Focus on first field
        self.cfpr_entry.focus()
    
    def _show_error_screen(self, message: str, detail: str = "A problem occurred"):
        """Show error screen"""
        self._hide_all_screens()
        self.error_message_label.config(text=message)
        self.error_detail_label.config(text=detail)
        self.error_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.ERROR
        self.start_display_timer(self.ERROR_DISPLAY_DURATION, is_error=True)
        # Show error LED
        self.gpio_led.show_error()
        self.tts.speak(EnglishMessages.ERROR_OCCURRED)
    
    def _show_maintenance_screen(self, message: str = "Server connection lost"):
        """Show maintenance/offline screen and start polling"""
        self._hide_all_screens()
        self.maintenance_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.MAINTENANCE
        
        # Update message
        self.maintenance_message.config(text=message)
        self.maintenance_status_label.config(text="Checking connection...")
        self.maintenance_status_icon.config(text="...")
        
        # Stop camera to save resources
        if self.camera and self.camera.isOpened():
            self.is_running = False
            self.camera.release()
            self.camera = None
        
        # Start polling for recovery
        self._start_connectivity_polling()
    
    def _animate_scan_indicator(self):
        """Animate the scanning indicator"""
        if self.state != KioskState.IDLE:
            return
        
        try:
            current = self.scan_indicator.cget("fg")
            new_color = Colors.SUCCESS if current == Colors.PRIMARY else Colors.PRIMARY
            self.scan_indicator.config(fg=new_color)
            self.root.after(800, self._animate_scan_indicator)
        except tk.TclError:
            pass
    
    def _animate_loading_spinner(self):
        """Animate the loading spinner"""
        if self.state != KioskState.PROCESSING:
            return
        
        try:
            self.loading_canvas.delete("all")
            
            # Draw spinning arc
            cx, cy = 100, 100
            radius = 80
            
            # Background circle
            self.loading_canvas.create_oval(
                cx - radius, cy - radius, cx + radius, cy + radius,
                outline="#FFFFFF33", width=10
            )
            
            # Spinning arc
            start = self.loading_angle
            extent = 90
            self.loading_canvas.create_arc(
                cx - radius, cy - radius, cx + radius, cy + radius,
                start=start, extent=extent,
                outline=Colors.TEXT_WHITE, width=10, style=tk.ARC
            )
            
            self.loading_angle = (self.loading_angle + 15) % 360
            self.loading_animation_id = self.root.after(50, self._animate_loading_spinner)
        except tk.TclError:
            pass
    
    def _processing_timeout(self):
        """Handle processing timeout"""
        if self.state == KioskState.PROCESSING:
            print("Processing timeout")
            if self.processing_timeout_id:
                self.root.after_cancel(self.processing_timeout_id)
                self.processing_timeout_id = None
            
            self._show_error_screen(
                "Request Timeout",
                "The request timed out. Please try again."
            )
    
    def _populate_result_info(self, cert: CertificateData = None, product: ProductData = None):
        """Populate the result info panel with certificate or product data"""
        # Clear existing content
        for widget in self.result_info_frame.winfo_children():
            widget.destroy()
        
        if cert:
            # Certificate info
            is_valid = cert.status == "valid"
            is_pending = cert.status == "pending"
            is_v2 = cert.version.startswith("2") if cert.version else False
            
            # Title
            title_bg = Colors.SUCCESS_LIGHT if is_valid else (Colors.WARNING_LIGHT if is_pending else Colors.ERROR_LIGHT)
            title_frame = tk.Frame(self.result_info_frame, bg=title_bg, height=60)
            title_frame.pack(fill=tk.X)
            title_frame.pack_propagate(False)
            
            status_text = "VERIFIED" if is_valid else ("PDF FOUND" if is_pending else "NOT FOUND")
            tk.Label(
                title_frame,
                text=f"Certificate {status_text}",
                font=("SF Pro Display", 20, "bold"),
                bg=title_bg,
                fg=Colors.SUCCESS if is_valid else (Colors.WARNING if is_pending else Colors.ERROR)
            ).pack(expand=True)
            
            # V2.0 Blockchain verification badge with transaction hash
            if is_valid and (cert.block_index is not None or cert.transaction_hash):
                blockchain_frame = tk.Frame(self.result_info_frame, bg=Colors.PRIMARY_LIGHT, height=50)
                blockchain_frame.pack(fill=tk.X)
                blockchain_frame.pack_propagate(False)
                
                blockchain_content = tk.Frame(blockchain_frame, bg=Colors.PRIMARY_LIGHT)
                blockchain_content.pack(expand=True)
                
                block_text = f"Blockchain Verified"
                if cert.block_index is not None:
                    block_text += f" - Block #{cert.block_index}"
                if is_v2:
                    block_text += f" (v{cert.version})"
                
                tk.Label(
                    blockchain_content,
                    text=block_text,
                    font=("SF Pro Text", 14, "bold"),
                    bg=Colors.PRIMARY_LIGHT,
                    fg=Colors.TEXT_WHITE
                ).pack()
                
                if cert.transaction_hash:
                    # Truncate transaction hash for display
                    tx_short = cert.transaction_hash[:20] + "..." if len(cert.transaction_hash) > 20 else cert.transaction_hash
                    tk.Label(
                        blockchain_content,
                        text=f"TX: {tx_short}",
                        font=("SF Pro Text", 10),
                        bg=Colors.PRIMARY_LIGHT,
                        fg=Colors.TEXT_WHITE
                    ).pack()
            
            # Create scrollable frame for details
            details_frame = tk.Frame(self.result_info_frame, bg=Colors.SURFACE, padx=20, pady=15)
            details_frame.pack(fill=tk.BOTH, expand=True)
            
            # Basic certificate details
            details = [
                ("Certificate ID", cert.certificate_id),
                ("Type", cert.certificate_type.title() if cert.certificate_type else "N/A"),
            ]
            
            # Add entity details for v2.0
            if is_v2 and cert.entity_data:
                entity = cert.entity_data
                if cert.certificate_type == "product":
                    details.extend([
                        ("Product Name", entity.get("productName", cert.product_name)),
                        ("Brand Name", entity.get("brandName", "N/A")),
                        ("Company", entity.get("companyName", cert.company_name)),
                        ("Registration No.", entity.get("registrationNumber", "N/A")),
                    ])
                    if entity.get("LTONumber"):
                        details.append(("LTO Number", entity.get("LTONumber")))
                    if entity.get("CFPRNumber"):
                        details.append(("CFPR Number", entity.get("CFPRNumber")))
                    if entity.get("manufacturer"):
                        details.append(("Manufacturer", entity.get("manufacturer")))
                    if entity.get("expirationDate"):
                        exp_date = self._format_date(entity.get("expirationDate"))
                        is_expired = self._is_date_expired(entity.get("expirationDate"))
                        details.append(("Expiration", f"{exp_date} {'EXPIRED' if is_expired else ''}"))
                else:
                    # Company certificate
                    details.extend([
                        ("Company Name", entity.get("companyName", cert.company_name)),
                        ("Address", entity.get("companyAddress", "N/A")),
                    ])
                    if entity.get("companyLTONumber"):
                        details.append(("LTO Number", entity.get("companyLTONumber")))
                    if entity.get("companyLTOExpiryDate"):
                        exp_date = self._format_date(entity.get("companyLTOExpiryDate"))
                        is_expired = self._is_date_expired(entity.get("companyLTOExpiryDate"))
                        details.append(("LTO Expiry", f"{exp_date} {'EXPIRED' if is_expired else ''}"))
                    if entity.get("companyContactNumber"):
                        details.append(("Contact", entity.get("companyContactNumber")))
                    if entity.get("companyContactEmail"):
                        details.append(("Email", entity.get("companyContactEmail")))
            else:
                # Fallback for v1.0 certificates
                details.append(("Entity", cert.company_name))
                details.append(("Issued Date", cert.issue_date))
                
                if cert.additional_info:
                    if cert.additional_info.get("ltoNumber"):
                        details.append(("LTO Number", cert.additional_info.get("ltoNumber")))
                    if cert.additional_info.get("cfprNumber"):
                        details.append(("CFPR Number", cert.additional_info.get("cfprNumber")))
            
            # Display basic details
            for label, value in details:
                row = tk.Frame(details_frame, bg=Colors.SURFACE)
                row.pack(fill=tk.X, pady=6)
                
                tk.Label(
                    row,
                    text=label,
                    font=("SF Pro Text", 12),
                    bg=Colors.SURFACE,
                    fg=Colors.TEXT_SECONDARY
                ).pack(anchor=tk.W)
                
                # Handle warning styling for expired items
                value_str = str(value)[:50] if value else "N/A"
                value_color = Colors.ERROR if "EXPIRED" in value_str else Colors.TEXT_PRIMARY
                
                tk.Label(
                    row,
                    text=value_str,
                    font=("SF Pro Text", 14, "bold"),
                    bg=Colors.SURFACE,
                    fg=value_color
                ).pack(anchor=tk.W)
            
            # V2.0 Approvers section
            if is_v2 and cert.approvers and len(cert.approvers) > 0:
                # Approvers header
                approvers_header = tk.Frame(self.result_info_frame, bg=Colors.PRIMARY, height=40)
                approvers_header.pack(fill=tk.X)
                approvers_header.pack_propagate(False)
                
                tk.Label(
                    approvers_header,
                    text=f"Certificate Approvers ({len(cert.approvers)})",
                    font=("SF Pro Text", 14, "bold"),
                    bg=Colors.PRIMARY,
                    fg=Colors.TEXT_WHITE
                ).pack(expand=True)
                
                # Approvers list
                approvers_frame = tk.Frame(self.result_info_frame, bg=Colors.SURFACE, padx=15, pady=10)
                approvers_frame.pack(fill=tk.X)
                
                for i, approver in enumerate(cert.approvers[:3]):  # Show max 3 approvers
                    approver_row = tk.Frame(approvers_frame, bg=Colors.BACKGROUND, padx=10, pady=8)
                    approver_row.pack(fill=tk.X, pady=4)
                    
                    # Approver number and name
                    name_frame = tk.Frame(approver_row, bg=Colors.BACKGROUND)
                    name_frame.pack(fill=tk.X)
                    
                    # Number badge
                    badge = tk.Label(
                        name_frame,
                        text=f" {i + 1} ",
                        font=("SF Pro Text", 10, "bold"),
                        bg=Colors.PRIMARY,
                        fg=Colors.TEXT_WHITE
                    )
                    badge.pack(side=tk.LEFT, padx=(0, 8))
                    
                    tk.Label(
                        name_frame,
                        text=approver.get("name", "Unknown Approver"),
                        font=("SF Pro Text", 13, "bold"),
                        bg=Colors.BACKGROUND,
                        fg=Colors.TEXT_PRIMARY
                    ).pack(side=tk.LEFT)
                    
                    # Verified icon
                    tk.Label(
                        name_frame,
                        text="OK",
                        font=("SF Pro Text", 14, "bold"),
                        bg=Colors.BACKGROUND,
                        fg=Colors.SUCCESS
                    ).pack(side=tk.RIGHT)
                    
                    # Wallet address (truncated)
                    if approver.get("walletAddress"):
                        wallet = approver.get("walletAddress")
                        wallet_short = wallet[:10] + "..." + wallet[-6:] if len(wallet) > 20 else wallet
                        tk.Label(
                            approver_row,
                            text=f"Wallet: {wallet_short}",
                            font=("SF Pro Text", 9),
                            bg=Colors.BACKGROUND,
                            fg=Colors.TEXT_SECONDARY
                        ).pack(anchor=tk.W, padx=(28, 0))
                    
                    # Approval date
                    if approver.get("approvedAt"):
                        tk.Label(
                            approver_row,
                            text=f"Approved: {self._format_datetime(approver.get('approvedAt'))}",
                            font=("SF Pro Text", 9),
                            bg=Colors.BACKGROUND,
                            fg=Colors.TEXT_SECONDARY
                        ).pack(anchor=tk.W, padx=(28, 0))
                
                # Show more indicator if more than 3 approvers
                if len(cert.approvers) > 3:
                    tk.Label(
                        approvers_frame,
                        text=f"+{len(cert.approvers) - 3} more approver(s)",
                        font=("SF Pro Text", 11),
                        bg=Colors.SURFACE,
                        fg=Colors.TEXT_SECONDARY
                    ).pack(pady=5)
            
            # Verification timestamp for v2.0
            if cert.verified_at:
                verified_frame = tk.Frame(self.result_info_frame, bg=Colors.SUCCESS_LIGHT, padx=15, pady=8)
                verified_frame.pack(fill=tk.X)
                
                tk.Label(
                    verified_frame,
                    text=f"Verified: {self._format_datetime(cert.verified_at)}",
                    font=("SF Pro Text", 11),
                    bg=Colors.SUCCESS_LIGHT,
                    fg=Colors.SUCCESS
                ).pack()
            
            # TTS
            if is_valid:
                self.tts.speak(EnglishMessages.certificate_valid(cert.product_name, cert.company_name))
            elif is_pending:
                self.tts.speak("PDF certificate found. Not yet verified on blockchain.")
            else:
                self.tts.speak(EnglishMessages.certificate_invalid())
        
        elif product:
            # Product info
            is_authentic = product.is_authentic and product.confidence_score >= 0.5 and product.source != "not_found"
            
            # Title
            if product.source == "not_found":
                title_bg = Colors.ERROR_LIGHT
                status_text = "NOT FOUND"
                status_color = Colors.ERROR
            elif is_authentic:
                title_bg = Colors.SUCCESS_LIGHT
                status_text = "REGISTERED"
                status_color = Colors.SUCCESS
            else:
                title_bg = Colors.WARNING_LIGHT
                status_text = "SUSPICIOUS"
                status_color = Colors.WARNING
            
            title_frame = tk.Frame(self.result_info_frame, bg=title_bg, height=60)
            title_frame.pack(fill=tk.X)
            title_frame.pack_propagate(False)
            
            tk.Label(
                title_frame,
                text=f"Product {status_text}",
                font=("SF Pro Display", 20, "bold"),
                bg=title_bg,
                fg=status_color
            ).pack(expand=True)
            
            # Source indicator
            source_text = {
                "internal_database": "Found in RCV Database",
                "grounded_search_pdf": "Found in FDA Registry",
                "not_found": "Not in any registry",
                "qr_code": "From QR Code"
            }.get(product.source, "Unknown Source")
            
            source_frame = tk.Frame(self.result_info_frame, bg=Colors.SURFACE)
            source_frame.pack(fill=tk.X, padx=20, pady=10)
            
            tk.Label(
                source_frame,
                text=source_text,
                font=("SF Pro Text", 14, "bold"),
                bg=Colors.SURFACE,
                fg=Colors.SUCCESS if product.source in ["internal_database", "grounded_search_pdf"] else Colors.ERROR
            ).pack(anchor=tk.W)
            
            # Confidence bar
            if product.source != "not_found" and product.confidence_score > 0:
                conf_frame = tk.Frame(self.result_info_frame, bg=Colors.SURFACE, padx=20)
                conf_frame.pack(fill=tk.X)
                
                tk.Label(
                    conf_frame,
                    text=f"Confidence: {product.confidence_score * 100:.0f}%",
                    font=("SF Pro Text", 14),
                    bg=Colors.SURFACE,
                    fg=status_color
                ).pack(anchor=tk.W)
                
                bar_canvas = tk.Canvas(conf_frame, width=450, height=20, bg=Colors.SURFACE, highlightthickness=0)
                bar_canvas.pack(pady=5, anchor=tk.W)
                bar_canvas.create_rectangle(0, 0, 450, 20, fill="#E0E0E0", outline="")
                bar_canvas.create_rectangle(0, 0, int(450 * product.confidence_score), 20, fill=status_color, outline="")
            
            # Details
            details_frame = tk.Frame(self.result_info_frame, bg=Colors.SURFACE, padx=20, pady=10)
            details_frame.pack(fill=tk.BOTH, expand=True)
            
            details = [("Product", product.product_name)]
            
            if product.brand and product.brand != "Unknown":
                details.append(("Brand", product.brand))
            if product.lto_number:
                details.append(("LTO Number", product.lto_number))
            if product.cfpr_number:
                details.append(("CFPR Number", product.cfpr_number))
            if product.manufacturer and product.manufacturer != product.brand:
                details.append(("Manufacturer", product.manufacturer))
            if product.manufacture_date and product.manufacture_date != "N/A":
                details.append(("Registered", product.manufacture_date))
            
            for label, value in details:
                row = tk.Frame(details_frame, bg=Colors.SURFACE)
                row.pack(fill=tk.X, pady=6)
                
                tk.Label(
                    row,
                    text=label,
                    font=("SF Pro Text", 13),
                    bg=Colors.SURFACE,
                    fg=Colors.TEXT_SECONDARY
                ).pack(anchor=tk.W)
                
                display_value = str(value)[:40] + "..." if len(str(value)) > 40 else str(value)
                tk.Label(
                    row,
                    text=display_value,
                    font=("SF Pro Text", 15, "bold"),
                    bg=Colors.SURFACE,
                    fg=Colors.TEXT_PRIMARY
                ).pack(anchor=tk.W)
            
            # Warnings
            if product.warnings:
                warn_frame = tk.Frame(self.result_info_frame, bg=Colors.WARNING_LIGHT, padx=15, pady=10)
                warn_frame.pack(fill=tk.X, padx=20, pady=(10, 0))
                
                for warning in product.warnings[:3]:
                    warn_color = Colors.ERROR if "NOT found" in warning or "counterfeit" in warning else Colors.WARNING
                    tk.Label(
                        warn_frame,
                        text=f"* {warning}",
                        font=("SF Pro Text", 12),
                        bg=Colors.WARNING_LIGHT,
                        fg=warn_color,
                        wraplength=420,
                        anchor=tk.W,
                        justify=tk.LEFT
                    ).pack(pady=2, anchor=tk.W)
            
            # TTS
            if is_authentic:
                self.tts.speak(EnglishMessages.product_authentic(product.product_name, product.brand))
            else:
                self.tts.speak(EnglishMessages.product_suspicious(product.product_name))
    
    def setup_certificate_panel(self, cert: CertificateData):
        """Display certificate information on the MASSIVE result screen"""
        # Update header color based on status
        is_valid = cert.status == "valid"
        is_pending = cert.status == "pending"
        
        if is_valid:
            header_color = Colors.SUCCESS
            status_text = "VERIFIED"
        elif is_pending:
            header_color = Colors.WARNING
            status_text = "PDF FOUND"
        else:
            header_color = Colors.ERROR
            status_text = "NOT FOUND"
        
        self.result_header.config(bg=header_color)
        self.result_status_label.config(bg=header_color, text=status_text)
        
        # Reset LED blink state
        self.led_blink_started = False
        if self.led_solid_timer:
            self.root.after_cancel(self.led_solid_timer)
            self.led_solid_timer = None
        
        # Show success LED solid for 5 seconds, then start blinking
        if is_valid:
            self.gpio_led.show_success()
            self.led_solid_timer = self.root.after(5000, self._start_led_blinking)
        elif is_pending:
            self.gpio_led.show_success()
        else:
            self.gpio_led.show_error()
        
        # Populate info panel
        self._populate_result_info(cert=cert)
        
        # Show result screen
        self._show_result_screen()
    
    def setup_product_panel(self, product: ProductData):
        """Display product scan results on the MASSIVE result screen"""
        # Update header
        is_authentic = product.is_authentic and product.confidence_score >= 0.5 and product.source != "not_found"
        
        if product.source == "not_found":
            header_color = Colors.ERROR
            status_text = "NOT FOUND"
        elif is_authentic:
            header_color = Colors.SUCCESS
            status_text = "REGISTERED"
        else:
            header_color = Colors.WARNING
            status_text = "SUSPICIOUS"
        
        self.result_header.config(bg=header_color)
        self.result_status_label.config(bg=header_color, text=status_text)
        
        # Populate info panel
        self._populate_result_info(product=product)
        
        # Hide PDF panels for products
        self.pdf_page1_label.config(text="", image="")
        self.pdf_page2_label.config(text="", image="")
        
        # Show result screen
        self._show_result_screen()
    
    def setup_processing_panel(self):
        """Display HUGE processing/loading screen"""
        self._show_loading_screen("Connecting to verification server...")
    
    def setup_error_panel(self, message: str):
        """Display error screen with 10 second timeout"""
        self._show_error_screen(message, "A problem occurred. Please try again.")
    
    def initialize_kiosk(self):
        """Initialize kiosk - show boot screen, ping server, then transition."""
        # Boot screen is already showing from setup_ui.
        # Start the server ping process in the background.
        self._boot_ping_server()
    
    def _setup_boot_screen(self):
        """Setup the boot/startup loading screen shown while connecting to server.
        The kiosk is uninteractable until server responds or user taps Retry."""
        center = tk.Frame(self.boot_frame, bg=Colors.PRIMARY)
        center.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        
        # RCV Logo/title
        tk.Label(
            center,
            text="RCV KIOSK",
            font=("SF Pro Display", 28, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(0, 5))
        
        tk.Label(
            center,
            text="Product Verification System",
            font=("SF Pro Text", 12),
            bg=Colors.PRIMARY,
            fg="#AADDAA"
        ).pack(pady=(0, 20))
        
        # Spinner
        self.boot_canvas = tk.Canvas(
            center, width=80, height=80,
            bg=Colors.PRIMARY, highlightthickness=0
        )
        self.boot_canvas.pack(pady=(0, 15))
        
        # Status label
        self.boot_status_label = tk.Label(
            center,
            text="Connecting to server...",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        )
        self.boot_status_label.pack(pady=(0, 5))
        
        # Detail label
        self.boot_detail_label = tk.Label(
            center,
            text="Please wait",
            font=("SF Pro Text", 10),
            bg=Colors.PRIMARY,
            fg="#AAAAAA"
        )
        self.boot_detail_label.pack(pady=(0, 15))
        
        # Retry button (hidden initially, shown on failure)
        self.boot_retry_btn = tk.Button(
            center,
            text="RETRY CONNECTION",
            font=("SF Pro Display", 12, "bold"),
            bg=Colors.TEXT_WHITE,
            fg=Colors.PRIMARY,
            activebackground="#E0E0E0",
            activeforeground=Colors.PRIMARY,
            relief=tk.FLAT,
            bd=0,
            padx=25,
            pady=10,
            cursor="hand2",
            command=self._boot_retry
        )
        # Don't pack yet - shown on failure
        
        # Boot animation state
        self.boot_angle = 0
        self.boot_anim_id = None
        self.boot_attempt = 0
        self.boot_max_attempts = 5  # Try 5 times (each ~3s timeout) = ~15s total
    
    def _show_boot_screen(self):
        """Show the boot loading screen - kiosk is locked until server responds."""
        self._hide_all_screens()
        self.boot_frame.pack(fill=tk.BOTH, expand=True)
        self.boot_status_label.config(text="Connecting to server...")
        self.boot_detail_label.config(text="Please wait")
        self.boot_retry_btn.pack_forget()  # Hide retry button
        self._animate_boot_spinner()
    
    def _animate_boot_spinner(self):
        """Animate the boot screen spinner."""
        try:
            self.boot_canvas.delete("all")
            cx, cy, r = 40, 40, 30
            
            # Background ring
            self.boot_canvas.create_oval(
                cx - r, cy - r, cx + r, cy + r,
                outline="#FFFFFF33", width=6
            )
            # Spinning arc
            self.boot_canvas.create_arc(
                cx - r, cy - r, cx + r, cy + r,
                start=self.boot_angle, extent=80,
                outline=Colors.TEXT_WHITE, width=6, style=tk.ARC
            )
            self.boot_angle = (self.boot_angle + 12) % 360
            self.boot_anim_id = self.root.after(50, self._animate_boot_spinner)
        except tk.TclError:
            pass
    
    def _stop_boot_animation(self):
        """Stop boot spinner animation."""
        if self.boot_anim_id:
            self.root.after_cancel(self.boot_anim_id)
            self.boot_anim_id = None
    
    def _boot_ping_server(self):
        """Ping the server during boot. Retries up to boot_max_attempts times."""
        self.boot_attempt += 1
        attempt = self.boot_attempt
        
        self.boot_status_label.config(text=f"Connecting to server... (attempt {attempt}/{self.boot_max_attempts})")
        self.boot_detail_label.config(text="Attempting to reach server...")
        
        def do_ping():
            result = self.api.health_check()
            self.root.after(0, lambda: self._boot_ping_result(result))
        
        thread = threading.Thread(target=do_ping, daemon=True)
        thread.start()
    
    def _boot_ping_result(self, result: dict):
        """Handle boot ping result."""
        if result.get("success"):
            # Server is online - proceed to start screen
            self.is_online = True
            self.consecutive_failures = 0
            self._stop_boot_animation()
            self.boot_status_label.config(text="Connected!")
            self.boot_detail_label.config(text="Starting kiosk...")
            
            # Short delay to show success, then transition
            self.root.after(800, self._boot_complete)
        else:
            # Failed
            if self.boot_attempt < self.boot_max_attempts:
                # Retry after short delay
                self.boot_detail_label.config(text="Server not responding, retrying...")
                self.root.after(2000, self._boot_ping_server)
            else:
                # Max attempts reached - show retry button
                self._stop_boot_animation()
                self.is_online = False
                self.boot_status_label.config(text="Server Offline")
                self.boot_detail_label.config(text="Server unreachable. Tap to retry.")
                self.boot_canvas.delete("all")
                # Show X on canvas
                self.boot_canvas.create_text(40, 40, text="X", font=("SF Pro Display", 28, "bold"), fill="#FF6666")
                self.boot_retry_btn.pack(pady=(10, 0))
    
    def _boot_retry(self):
        """User tapped retry on boot screen."""
        self.boot_attempt = 0
        self.boot_retry_btn.pack_forget()
        self._animate_boot_spinner()
        self._boot_ping_server()
    
    def _boot_complete(self):
        """Boot sequence complete - server is online, show start screen."""
        self._stop_boot_animation()
        self._show_start_screen()
        self.tts.speak(EnglishMessages.WELCOME)
        
        # Update connection status on start screen
        self.root.after(100, lambda: self._update_connection_status(True))
        
        # Start background connectivity monitoring
        self.root.after(5000, self._start_background_monitoring)
    
    def _start_background_monitoring(self):
        """Start background connectivity monitoring"""
        if self.state != KioskState.MAINTENANCE:
            self.connectivity_poll_id = self.root.after(
                self.CONNECTIVITY_POLL_INTERVAL_ONLINE,
                self._poll_connectivity
            )
    
    def _check_api_connection(self):
        """Check if RCV API is accessible and update online status"""
        result = self.api.health_check()
        was_online = self.is_online
        
        if result.get("success"):
            self.is_online = True
            self.consecutive_failures = 0
            print(f"Connected to RCV API: {self.api.base_url}")
            
            # Update start screen status indicator
            self.root.after(0, lambda: self._update_connection_status(True))
            
            # If we were in maintenance mode, recover
            if self.state == KioskState.MAINTENANCE:
                self.root.after(0, self._recover_from_maintenance)
        else:
            self.is_online = False
            self.consecutive_failures += 1
            print(f"RCV API not accessible: {self.api.base_url} (failure #{self.consecutive_failures})")
            
            # Update start screen status indicator
            self.root.after(0, lambda: self._update_connection_status(False))
            
            # Enter maintenance mode after consecutive failures
            if self.consecutive_failures >= self.MAX_FAILURES_BEFORE_MAINTENANCE:
                if self.state != KioskState.MAINTENANCE:
                    self.root.after(0, lambda: self._show_maintenance_screen("Cannot connect to server"))
        
        self.last_connectivity_check = time.time()
    
    def _update_connection_status(self, is_online: bool):
        """Update connection status indicator on start screen and enable/disable buttons"""
        try:
            if is_online:
                self.connection_status_icon.config(fg=Colors.SUCCESS)
                self.connection_status_label.config(
                    text=" Server connected",
                    fg=Colors.SUCCESS
                )
                # Enable buttons when online (OCR only if Tesseract available)
                self.start_camera_btn.config(state=tk.NORMAL)
                if TESSERACT_AVAILABLE:
                    self.start_ocr_btn.config(state=tk.NORMAL)
            else:
                self.connection_status_icon.config(fg=Colors.ERROR)
                self.connection_status_label.config(
                    text=" Server offline - Features disabled",
                    fg=Colors.ERROR
                )
                # Disable buttons when offline
                self.start_camera_btn.config(state=tk.DISABLED)
                self.start_ocr_btn.config(state=tk.DISABLED)
        except tk.TclError:
            pass  # Widget may not exist yet
    
    def _start_connectivity_polling(self):
        """Start periodic connectivity checking"""
        if self.connectivity_poll_id:
            self.root.after_cancel(self.connectivity_poll_id)
        
        self._poll_connectivity()
    
    def _poll_connectivity(self):
        """Poll server connectivity and update UI"""
        if self.state != KioskState.MAINTENANCE:
            # Not in maintenance mode, use longer interval
            self.connectivity_poll_id = self.root.after(
                self.CONNECTIVITY_POLL_INTERVAL_ONLINE, 
                self._poll_connectivity
            )
            thread = threading.Thread(target=self._check_api_connection, daemon=True)
            thread.start()
            return
        
        # Update status UI
        self.maintenance_status_label.config(text="Checking connection...")
        self.maintenance_status_icon.config(text="...")
        
        # Check in background
        def check_and_update():
            result = self.api.health_check()
            self.root.after(0, lambda: self._update_maintenance_status(result))
        
        thread = threading.Thread(target=check_and_update, daemon=True)
        thread.start()
        
        # Schedule next check
        self.connectivity_poll_id = self.root.after(
            self.CONNECTIVITY_POLL_INTERVAL, 
            self._poll_connectivity
        )
        
        # Update countdown
        self._update_retry_countdown()
    
    def _update_maintenance_status(self, result: dict):
        """Update maintenance screen based on connectivity check result"""
        if result.get("success"):
            self.is_online = True
            self.consecutive_failures = 0
            self.maintenance_status_icon.config(text="OK")
            self.maintenance_status_label.config(text="Server connected! Resuming...")
            
            # Cancel polling and recover
            if self.connectivity_poll_id:
                self.root.after_cancel(self.connectivity_poll_id)
            
            self.root.after(1500, self._recover_from_maintenance)
        else:
            self.is_online = False
            self.consecutive_failures += 1
            self.maintenance_status_icon.config(text="X")
            self.maintenance_status_label.config(
                text=f"Server unreachable (attempt {self.consecutive_failures})"
            )
    
    def _update_retry_countdown(self):
        """Update the retry countdown on maintenance screen"""
        if self.state != KioskState.MAINTENANCE:
            return
        
        interval_seconds = self.CONNECTIVITY_POLL_INTERVAL // 1000
        
        def countdown(remaining):
            if self.state != KioskState.MAINTENANCE or remaining <= 0:
                return
            self.maintenance_retry_label.config(text=f"Next check in {remaining} seconds")
            self.root.after(1000, lambda: countdown(remaining - 1))
        
        countdown(interval_seconds)
    
    def _manual_reconnect(self):
        """User tapped RECONNECT button on maintenance screen."""
        self.maintenance_reconnect_btn.config(text="CONNECTING...", state=tk.DISABLED)
        self.maintenance_status_label.config(text="Checking connection...")
        self.maintenance_status_icon.config(text="...")
        
        def do_check():
            result = self.api.health_check()
            self.root.after(0, lambda: self._manual_reconnect_result(result))
        
        thread = threading.Thread(target=do_check, daemon=True)
        thread.start()
    
    def _manual_reconnect_result(self, result: dict):
        """Handle result from manual reconnect attempt."""
        try:
            self.maintenance_reconnect_btn.config(text="RECONNECT NOW", state=tk.NORMAL)
        except tk.TclError:
            pass
        
        if result.get("success"):
            self._update_maintenance_status(result)
        else:
            self.maintenance_status_icon.config(text="X")
            self.maintenance_status_label.config(text="Still offline - try again")
    
    def _recover_from_maintenance(self):
        """Recover from maintenance mode when server comes back online"""
        print("Server connection restored - recovering from maintenance mode")
        
        # Cancel any pending polls
        if self.connectivity_poll_id:
            self.root.after_cancel(self.connectivity_poll_id)
            self.connectivity_poll_id = None
        
        # Return to start screen
        self._show_start_screen()
        self.tts.speak("Server connection restored. The kiosk is ready.")
        
        # Start background monitoring (longer interval)
        self.connectivity_poll_id = self.root.after(
            self.CONNECTIVITY_POLL_INTERVAL_ONLINE,
            self._poll_connectivity
        )
    
    def start_camera(self):
        """Initialize and start the camera automatically"""
        if self.camera and self.camera.isOpened():
            print("Camera already running")
            return  # Camera already running
        
        try:
            print("Searching for camera...")
            # Try different camera indices
            camera_indices = [0, 1, 2, -1]
            
            for idx in camera_indices:
                print(f"   Trying camera index {idx}...")
                self.camera = cv2.VideoCapture(idx)
                if self.camera.isOpened():
                    print(f"Camera found at index {idx}")
                    break
                self.camera.release()
            
            if not self.camera or not self.camera.isOpened():
                raise Exception("No camera found. Please connect a camera.")
            
            # Set camera resolution
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            # Set camera buffer size to 1 to reduce latency
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Enable autofocus for sharper text/QR capture
            # CAP_PROP_AUTOFOCUS = 1 enables continuous autofocus on supported cameras
            autofocus_set = self.camera.set(cv2.CAP_PROP_AUTOFOCUS, 1)
            if autofocus_set:
                print("Camera autofocus ENABLED")
            else:
                print("Camera autofocus not supported by this camera - trying manual focus")
                # Try setting focus to 0 (infinity/auto) as fallback
                # Some cameras use CAP_PROP_FOCUS with 0 = auto
                focus_set = self.camera.set(cv2.CAP_PROP_FOCUS, 0)
                if focus_set:
                    print("Manual focus set to auto (0)")
                else:
                    print("Focus control not available - camera uses fixed focus")
            
            # Set exposure and white balance to auto for better image quality
            self.camera.set(cv2.CAP_PROP_AUTO_EXPOSURE, 3)  # 3 = auto exposure
            self.camera.set(cv2.CAP_PROP_AUTO_WB, 1)  # Enable auto white balance
            
            print(f"Camera configured: 640x480")
            
            self.is_running = True
            
            # Start video thread
            self.video_thread = threading.Thread(target=self.video_loop, daemon=True)
            self.video_thread.start()
            
            print("Video loop started")
            
        except Exception as e:
            print(f"Camera initialization failed: {e}")
            self.state = KioskState.ERROR
            self._show_error_screen(
                f"Camera Error: {str(e)}",
                "Camera not found. Please connect a camera."
            )
    
    def restart_camera(self):
        """Restart camera - used when camera is unplugged/replugged"""
        # Stop current camera
        if self.camera and self.camera.isOpened():
            self.is_running = False
            time.sleep(0.2)  # Give video loop time to stop
            self.camera.release()
            self.camera = None
        
        # Show loading briefly
        self.camera_label.config(text="Reloading Camera...\nNagre-reload ng camera...", image="")
        self.root.update()
        
        # Restart
        time.sleep(0.5)
        self.start_camera()
        self.tts.speak("Camera reloaded")
    
    def _start_camera_and_scan(self):
        """Start camera and switch to QR scan mode"""
        # Cancel idle timer - user is interacting
        if self.idle_timer_id:
            self.root.after_cancel(self.idle_timer_id)
            self.idle_timer_id = None
        
        self._show_scan_screen()
        self.start_camera()
        self.tts.speak("Camera started. Ready to scan.")
    
    def _start_ocr_capture(self):
        """Start OCR product label capture flow"""
        # Cancel idle timer - user is interacting
        if self.idle_timer_id:
            self.root.after_cancel(self.idle_timer_id)
            self.idle_timer_id = None
        
        # Start camera if not running
        if not self.camera or not self.camera.isOpened():
            self.start_camera()
        
        # Switch to OCR capture screen
        self._show_ocr_screen()
        self.tts.speak("Position the front of the product label and tap Capture.")
    
    def video_loop(self):
        """Main video loop - continuous scanning with performance optimization"""
        target_fps = 15  # Target frame rate for smooth display
        frame_time = 1.0 / target_fps
        
        while self.is_running and self.camera and self.camera.isOpened():
            loop_start = time.time()
            
            # GUARD: Skip processing entirely if slideshow is active or camera should be off
            if self.slideshow_active or self.state == KioskState.CAMERA_OFF:
                time.sleep(0.1)
                continue
            
            ret, frame = self.camera.read()
            if not ret:
                print("Failed to read frame from camera")
                time.sleep(0.1)
                continue
            
            # Store current frame for OCR capture
            self.current_frame = frame.copy()
            
            # GUARD: Double-check slideshow is not active before processing
            if self.slideshow_active:
                time.sleep(0.1)
                continue
            
            # Only process QR detection if in scanning state
            if self.state == KioskState.IDLE:
                # Try to detect QR code
                display_frame, qr_data = self.process_qr_frame(frame)
                
                if qr_data and len(qr_data.strip()) >= self.MIN_QR_DATA_LENGTH:
                    # Multi-frame confirmation: require the same QR data
                    # across consecutive frames to filter out noise/phantom reads
                    if qr_data == self.pending_qr_data:
                        self.pending_qr_count += 1
                    else:
                        # New/different QR detected - reset counter
                        self.pending_qr_data = qr_data
                        self.pending_qr_count = 1
                    
                    # Only process after consistent detection across N frames
                    if self.pending_qr_count >= self.QR_CONFIRM_FRAMES and self.can_process_scan(qr_data):
                        self.pending_qr_data = None
                        self.pending_qr_count = 0
                        self.handle_qr_detection(qr_data)
                else:
                    # No valid QR detected - reset pending confirmation
                    self.pending_qr_data = None
                    self.pending_qr_count = 0
                
                # Display frame in scan mode
                self.display_frame(display_frame)
            
            # Display frame in OCR capture mode - ALWAYS update preview
            elif self.state == KioskState.OCR_CAPTURE:
                self._display_ocr_frame(frame)
            
            # Frame rate limiting
            elapsed = time.time() - loop_start
            sleep_time = frame_time - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)
    
    def process_qr_frame(self, frame):
        """Process frame for QR codes"""
        display_frame = frame.copy()
        decoded_objects = pyzbar.decode(frame)
        
        qr_data = None
        for obj in decoded_objects:
            # Draw detection overlay
            points = obj.polygon
            if len(points) == 4:
                pts = np.array([(p.x, p.y) for p in points], dtype=np.int32)
                cv2.polylines(display_frame, [pts], True, (0, 84, 64), 4)  # Primary color
                
                # Draw corner markers
                for point in points:
                    cv2.circle(display_frame, (point.x, point.y), 8, (0, 84, 64), -1)
            
            # Get data
            qr_data = obj.data.decode('utf-8')
            
            # Display text
            x, y, w, h = obj.rect
            cv2.putText(display_frame, "QR Detected", (x, y - 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 84, 64), 2)
        
        # Add scanning overlay
        if self.state == KioskState.IDLE:
            h, w = display_frame.shape[:2]
            # Draw scan region indicator
            margin = 50
            cv2.rectangle(display_frame, (margin, margin), (w-margin, h-margin), 
                         (0, 84, 64), 2)
            
            # Add scan instruction
            cv2.putText(display_frame, "Place QR Code Here", (w//2 - 120, h - 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        return display_frame, qr_data
    
    def can_process_scan(self, data: str) -> bool:
        """Check if scan is allowed - blocks during slideshow, cooldown, etc."""
        # GUARD: Never allow scanning during slideshow mode
        if self.slideshow_active:
            return False
        
        # GUARD: Only allow scanning when in IDLE state (actively scanning)
        if self.state != KioskState.IDLE:
            return False
        
        current_time = time.time()
        time_since_last = current_time - self.last_scan_time
        
        # Global cooldown - prevent ANY scan too soon after the last one
        # This prevents rapid-fire scanning from noise or reflections
        if time_since_last < self.SCAN_COOLDOWN:
            return False
        
        # Extended cooldown for the exact same QR data (10 seconds)
        if data == self.last_scan_data and time_since_last < 10:
            return False
        
        return True
    
    def handle_qr_detection(self, qr_data: str):
        """Handle detected QR code - with slideshow guard"""
        # GUARD: Block if slideshow is active (prevents phantom scans)
        if self.slideshow_active:
            print("QR detection blocked - slideshow is active")
            return
        
        # GUARD: Block if not in a scannable state
        if self.state not in (KioskState.IDLE,):
            print(f"QR detection blocked - state is {self.state.value}")
            return
        
        self.last_scan_time = time.time()
        self.last_scan_data = qr_data
        
        self.state = KioskState.PROCESSING
        self._show_loading_screen("Analyzing QR code...")
        self.tts.speak(EnglishMessages.SCAN_DETECTED)
        
        # Process in background thread
        thread = threading.Thread(target=self._process_qr_data, args=(qr_data,), daemon=True)
        thread.start()
    
    def _process_qr_data(self, qr_data: str):
        """Process QR data and determine type - connects to RCV API"""
        try:
            # Check if it's a certificate ID (CERT-COMP-xxx or CERT-PROD-xxx)
            if qr_data.startswith("CERT-COMP-") or qr_data.startswith("CERT-PROD-"):
                self._process_certificate_id(qr_data)
                return
            
            # Try to parse as JSON
            try:
                data = json.loads(qr_data)
                
                # Check the type field first for product certificates
                qr_type = data.get("type", "").lower()
                
                # V2.0 RCV Certificate with full entity details and approvers
                if qr_type == "rcv_certificate" and data.get("version", "").startswith("2"):
                    self._process_v2_certificate(data)
                    return
                
                # Product certificates have embedded product info + certificate ID
                if qr_type == "product-certificate":
                    cert_id = data.get("certificateId")
                    # Process as certificate (which will verify on blockchain)
                    # but also check if we can search for the product
                    if cert_id:
                        self._process_certificate_id(cert_id)
                    else:
                        # Fallback to product search using embedded data
                        self._process_product_search({
                            "productName": data.get("productName"),
                            "LTONumber": data.get("ltoNumber") or data.get("LTONumber"),
                            "CFPRNumber": data.get("cfprNumber") or data.get("CFPRNumber"),
                            "brandName": data.get("brandName"),
                        })
                    return
                
                # Company certificates
                if qr_type == "company-certificate":
                    cert_id = data.get("certificateId")
                    if cert_id:
                        self._process_certificate_id(cert_id)
                        return
                
                # Check if it contains a certificate ID
                cert_id = data.get("certificateId") or data.get("certificate_id") or data.get("certId")
                if cert_id and (cert_id.startswith("CERT-COMP-") or cert_id.startswith("CERT-PROD-")):
                    self._process_certificate_id(cert_id)
                    return
                
                # Check if it's product data with search criteria (handle both camelCase variants)
                if any(key in data for key in ["productName", "product_name", "LTONumber", "CFPRNumber", "ltoNumber", "cfprNumber"]):
                    # Normalize the data keys for product search
                    normalized_data = {
                        "productName": data.get("productName") or data.get("product_name"),
                        "LTONumber": data.get("LTONumber") or data.get("ltoNumber"),
                        "CFPRNumber": data.get("CFPRNumber") or data.get("cfprNumber"),
                        "brandName": data.get("brandName") or data.get("brand_name"),
                        "manufacturer": data.get("manufacturer"),
                    }
                    self._process_product_search(normalized_data)
                    return
                
                # Generic certificate/product data
                if self._is_certificate_data(data):
                    cert = self._parse_certificate_from_json(data)
                    self.root.after(0, lambda: self._show_certificate(cert))
                else:
                    product = self._parse_product_from_json(data)
                    self.root.after(0, lambda: self._show_product(product))
                    
            except json.JSONDecodeError:
                # Not JSON - try URL or plain text
                if qr_data.startswith("http"):
                    # Extract certificate ID from URL if present
                    cert_id = self._extract_cert_id_from_url(qr_data)
                    if cert_id:
                        self._process_certificate_id(cert_id)
                    else:
                        self.root.after(0, lambda: self._handle_unknown_qr(qr_data))
                else:
                    # Try OCR-based product search
                    self._process_ocr_text(qr_data)
                    
        except Exception as e:
            print(f"Error processing QR data: {e}")
            self.root.after(0, lambda: self._handle_error(str(e)))
    
    def _process_v2_certificate(self, data: dict):
        """Process v2.0 RCV Certificate with full entity details and approvers"""
        print(f"Processing v2.0 certificate: {data.get('certificateId', 'Unknown')}")
        
        # Update loading screen
        self.root.after(0, lambda: self.loading_detail_label.config(text="Processing blockchain certificate..."))
        
        # Extract entity data
        entity = data.get("entity", {})
        entity_type = data.get("entityType", "product")
        approvers = data.get("approvers", [])
        
        # Determine certificate type and extract relevant name
        if entity_type == "product":
            product_name = entity.get("productName", "Unknown Product")
            company_name = entity.get("companyName", "Unknown Company")
        else:
            product_name = entity.get("companyName", "Unknown Company")
            company_name = entity.get("companyName", "Unknown Company")
        
        # Get PDF URL if certificate ID is available
        cert_id = data.get("certificateId")
        pdf_url = None
        if cert_id:
            pdf_response = self.api.get_certificate_pdf_url(cert_id)
            pdf_url = pdf_response.get("certificate", {}).get("pdfUrl") if pdf_response.get("success") else None
        
        # Create certificate data object with v2.0 fields
        cert = CertificateData(
            certificate_id=cert_id or "Unknown",
            product_name=product_name,
            company_name=company_name,
            issue_date=self._format_date(entity.get("issuedDate") or entity.get("dateOfRegistration")),
            expiry_date=self._format_date(entity.get("expirationDate") or entity.get("companyLTOExpiryDate")),
            status="valid",  # V2.0 QR codes are pre-verified
            pdf_url=pdf_url,
            certificate_type=entity_type,
            block_index=data.get("blockNumber"),
            block_hash=None,
            pdf_hash=entity.get("pdfHash"),
            additional_info={
                "registrationNumber": entity.get("registrationNumber"),
                "ltoNumber": entity.get("LTONumber") or entity.get("companyLTONumber"),
                "cfprNumber": entity.get("CFPRNumber"),
                "brandName": entity.get("brandName"),
                "manufacturer": entity.get("manufacturer"),
                "companyAddress": entity.get("companyAddress"),
                "companyContactNumber": entity.get("companyContactNumber"),
                "companyContactEmail": entity.get("companyContactEmail"),
            },
            entity_data=entity,
            approvers=approvers,
            transaction_hash=data.get("transactionHash"),
            verified_at=data.get("verifiedAt"),
            version=data.get("version", "2.0")
        )
        
        self.root.after(0, lambda: self._show_certificate(cert))
    
    def _process_certificate_id(self, certificate_id: str):
        """Fetch certificate from blockchain API"""
        print(f"Looking up certificate: {certificate_id}")
        
        # Update loading screen detail
        self.root.after(0, lambda: self.loading_detail_label.config(text="Verifying on blockchain..."))
        
        # Always get PDF URL (this constructs it even if API fails)
        pdf_response = self.api.get_certificate_pdf_url(certificate_id)
        pdf_url = pdf_response.get("certificate", {}).get("pdfUrl") if pdf_response.get("success") else None
        
        # Get certificate details from blockchain
        cert_response = self.api.get_certificate_by_id(certificate_id)
        
        if cert_response.get("success"):
            cert_data = cert_response.get("certificate", {})
            
            cert = CertificateData(
                certificate_id=cert_data.get("certificateId", certificate_id),
                product_name=cert_data.get("entityName", "Unknown"),
                company_name=cert_data.get("entityName", "Unknown"),
                issue_date=self._format_date(cert_data.get("issuedDate")),
                expiry_date="N/A",  # Certificates don't expire in this system
                status="valid",
                pdf_url=pdf_url,
                certificate_type=cert_data.get("certificateType", "unknown"),
                block_index=cert_data.get("blockIndex"),
                block_hash=cert_data.get("blockHash"),
                pdf_hash=cert_data.get("pdfHash"),
                additional_info=cert_data
            )
            
            self.root.after(0, lambda: self._show_certificate(cert))
        else:
            # Certificate not found in blockchain - but PDF might still exist in Firebase
            # Still show as "valid" if we can construct a PDF URL (for cases where blockchain was reset)
            cert = CertificateData(
                certificate_id=certificate_id,
                product_name="Unknown",
                company_name="Unknown",
                issue_date="N/A",
                expiry_date="N/A",
                status="pending" if pdf_url else "invalid",  # "pending" if PDF exists but not in blockchain
                pdf_url=pdf_url  # Try to show PDF anyway
            )
            self.root.after(0, lambda: self._show_certificate(cert))
    
    def _process_product_search(self, data: dict):
        """Search for product using API"""
        print(f"Searching for product: {data}")
        
        response = self.api.search_product(
            product_name=data.get("productName") or data.get("product_name"),
            lto_number=data.get("LTONumber") or data.get("lto_number"),
            cfpr_number=data.get("CFPRNumber") or data.get("cfpr_number"),
            brand_name=data.get("brandName") or data.get("brand_name"),
            manufacturer=data.get("manufacturer")
        )
        
        if response.get("success") and response.get("found"):
            products = response.get("data") or response.get("Product") or []
            source = response.get("source", "unknown")
            
            if products and len(products) > 0:
                prod_data = products[0]  # Get first match
                
                product = ProductData(
                    product_name=prod_data.get("productName", "Unknown"),
                    brand=prod_data.get("brandName", prod_data.get("company", {}).get("name", "Unknown")),
                    batch_number=prod_data.get("batchNumber", "N/A"),
                    manufacture_date=self._format_date(prod_data.get("dateOfRegistration")),
                    expiry_date=self._format_date(prod_data.get("expirationDate")),
                    is_authentic=True,
                    confidence_score=float(prod_data.get("confidence", 0.95)),
                    lto_number=prod_data.get("LTONumber"),
                    cfpr_number=prod_data.get("CFPRNumber"),
                    manufacturer=prod_data.get("company", {}).get("name"),
                    source=source,
                    warnings=[]
                )
                
                # Add source info as warning/note
                if source == "grounded_search_pdf":
                    product.warnings.append("Found in official FDA registry (not in RCV database)")
                
                self.root.after(0, lambda: self._show_product(product))
            else:
                self._show_not_found_product(data)
        else:
            self._show_not_found_product(data)
    
    def _process_ocr_text(self, text: str):
        """Process plain text (possibly from OCR) to search for product"""
        print(f"Processing OCR text: {text[:100]}...")
        
        # First try to extract product info via AI
        response = self.api.scan_product_ocr(text)
        
        if response.get("success"):
            extracted = response.get("extractedInfo", {})
            
            # Now search for the product
            self._process_product_search({
                "productName": extracted.get("productName"),
                "LTONumber": extracted.get("LTONumber"),
                "CFPRNumber": extracted.get("CFPRNumber"),
                "manufacturer": extracted.get("manufacturer")
            })
        else:
            # Fallback: try direct search with the text as product name
            self._process_product_search({"productName": text.split('\n')[0]})
    
    def _show_not_found_product(self, search_data: dict):
        """Show product not found result"""
        product = ProductData(
            product_name=search_data.get("productName", search_data.get("product_name", "Unknown")),
            brand=search_data.get("brandName", "Unknown"),
            batch_number="N/A",
            manufacture_date="N/A",
            expiry_date="N/A",
            is_authentic=False,
            confidence_score=0.0,
            source="not_found",
            warnings=[
                "Product NOT found in RCV database",
                "Product NOT found in official FDA registry",
                "This product may be counterfeit or unregistered"
            ]
        )
        self.root.after(0, lambda: self._show_product(product))
    
    def _extract_cert_id_from_url(self, url: str) -> Optional[str]:
        """Extract certificate ID from URL"""
        # Pattern: /certificate/CERT-COMP-xxx or /pdf/CERT-PROD-xxx
        patterns = [
            r'CERT-COMP-[A-Za-z0-9-]+',
            r'CERT-PROD-[A-Za-z0-9-]+'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(0)
        return None
    
    def _format_date(self, date_str: str) -> str:
        """Format date string for display"""
        if not date_str or date_str == "N/A":
            return "N/A"
        
        try:
            # Try various date formats
            for fmt in ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%d/%m/%Y"]:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime("%B %d, %Y")
                except ValueError:
                    continue
            return str(date_str)[:10]  # Fallback: just first 10 chars
        except:
            return str(date_str)
    
    def _format_datetime(self, date_str: str) -> str:
        """Format datetime string for display with time"""
        if not date_str or date_str == "N/A":
            return "N/A"
        
        try:
            # Try various date formats
            for fmt in ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"]:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime("%b %d, %Y %H:%M")
                except ValueError:
                    continue
            return str(date_str)[:16]  # Fallback
        except:
            return str(date_str)
    
    def _is_date_expired(self, date_str: str) -> bool:
        """Check if a date string represents an expired date"""
        if not date_str or date_str == "N/A":
            return False
        
        try:
            # Try various date formats
            for fmt in ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%d/%m/%Y"]:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt < datetime.now()
                except ValueError:
                    continue
            return False
        except:
            return False
    
    def _is_certificate_data(self, data: dict) -> bool:
        """Check if data represents a certificate"""
        cert_keys = ["certificate_id", "cert_id", "certificateId", "type", "pdfHash", "blockIndex"]
        return any(key in data for key in cert_keys) or data.get("type") == "certificate"
    
    def _parse_certificate_from_json(self, data: dict) -> CertificateData:
        """Parse certificate data from JSON"""
        return CertificateData(
            certificate_id=data.get("certificateId", data.get("certificate_id", data.get("id", "Unknown"))),
            product_name=data.get("entityName", data.get("productName", data.get("product_name", "Unknown"))),
            company_name=data.get("companyName", data.get("company_name", data.get("entityName", "Unknown"))),
            issue_date=self._format_date(data.get("issuedDate", data.get("issue_date"))),
            expiry_date=self._format_date(data.get("expiryDate", data.get("expiry_date"))),
            status=data.get("status", "valid"),
            pdf_url=data.get("pdfUrl", data.get("pdf_url")),
            certificate_type=data.get("certificateType", "unknown"),
            block_index=data.get("blockIndex"),
            pdf_hash=data.get("pdfHash"),
            additional_info=data
        )
    
    def _parse_product_from_json(self, data: dict) -> ProductData:
        """Parse product data from JSON"""
        return ProductData(
            product_name=data.get("productName", data.get("product_name", "Unknown")),
            brand=data.get("brandName", data.get("brand", data.get("manufacturer", "Unknown"))),
            batch_number=data.get("batchNumber", data.get("batch_number", "N/A")),
            manufacture_date=self._format_date(data.get("dateOfRegistration", data.get("manufacture_date"))),
            expiry_date=self._format_date(data.get("expirationDate", data.get("expiry_date"))),
            is_authentic=data.get("isAuthentic", data.get("verified", True)),
            confidence_score=float(data.get("confidence", data.get("score", 0.85))),
            lto_number=data.get("LTONumber"),
            cfpr_number=data.get("CFPRNumber"),
            source=data.get("source", "qr_code"),
            warnings=data.get("warnings", [])
        )
    
    def _handle_error(self, message: str):
        """Handle processing error"""
        self.state = KioskState.ERROR
        self._show_error_screen(f"Processing Error: {message}", "A processing error occurred. Please try again.")
    
    def _handle_unknown_qr(self, data: str):
        """Handle unrecognized QR code"""
        self.state = KioskState.ERROR
        self._show_error_screen(
            "Unrecognized QR Code",
            f"Unrecognized QR code format.\n\nData: {data[:80]}..."
        )
    
    def _show_certificate(self, cert: CertificateData):
        """Display certificate information"""
        self.state = KioskState.DISPLAY_CERTIFICATE
        self.setup_certificate_panel(cert)
        self.log_scan("certificate", cert.__dict__)
        
        # Update GPIO LED based on certificate status
        if cert.status == "valid":
            self.gpio_led.show_success()
        else:
            self.gpio_led.show_error()
        
        # Show PDF panel and fetch PDF if available (2 pages)
        # Timer will start after PDF loads or if no PDF
        if cert.pdf_url:
            self._fetch_and_display_pdf_pages(cert.pdf_url)
        else:
            self.pdf_page1_label.config(text="No PDF available", image="")
            self.pdf_page2_label.config(text="", image="")
            # Start timer immediately if no PDF to load
            self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
    
    def _show_product(self, product: ProductData):
        """Display product information"""
        self.state = KioskState.DISPLAY_PRODUCT
        self.setup_product_panel(product)
        self.log_scan("product", product.__dict__)
        
        # Update GPIO LED based on product authenticity
        if product.is_authentic:
            self.gpio_led.show_success()
        else:
            self.gpio_led.show_error()
        
        # Start 30 second timer for results (no PDF to load for products)
        self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
    
    def start_display_timer(self, duration: int, is_error: bool = False):
        """Start countdown timer for display"""
        self.remaining_time = duration
        self.is_error_timer = is_error
        self.timer_paused = False
        self.update_timer()
    
    def update_timer(self):
        """Update the countdown timer"""
        # Skip if timer is paused
        if self.timer_paused:
            self.display_timer = self.root.after(500, self.update_timer)
            return
        
        if self.remaining_time > 0:
            timer_text = f"Returning to scanner in {self.remaining_time}s"
            
            # Update the correct timer label based on current screen
            if self.is_error_timer:
                self.error_timer_label.config(text=timer_text)
            elif self.state == KioskState.DISPLAY_COMPLIANCE:
                self.compliance_timer_label.config(text=timer_text)
            else:
                self.result_timer_label.config(text=timer_text)
            
            self.remaining_time -= 1
            self.display_timer = self.root.after(1000, self.update_timer)
        else:
            self.reset_to_idle()
    
    def _pause_timer(self, event=None):
        """Pause the countdown timer when user touches screen"""
        self.timer_paused = True
        pause_text = "PAUSED - Release to continue"
        
        # Pause LED blinking too
        if self.led_blink_started:
            self.gpio_led.stop_blinking()
            self.gpio_led.show_success()  # Return to solid
            print("LED blinking paused")
        
        if self.state == KioskState.DISPLAY_COMPLIANCE:
            self.compliance_timer_label.config(text=pause_text)
        elif not self.is_error_timer:
            self.result_timer_label.config(text=pause_text)
    
    def _resume_timer(self, event=None):
        """Resume the countdown timer when user releases touch"""
        self.timer_paused = False
        
        # Resume LED blinking if it was started
        if self.led_blink_started:
            self.gpio_led.start_processing()
            print("LED blinking resumed")
    
    def _start_led_blinking(self):
        """Start LED blinking after 5 seconds of solid display"""
        if not self.timer_paused and not self.led_blink_started:
            self.led_blink_started = True
            print("Starting LED blinking (after 5s solid)")
            self.gpio_led.start_processing()  # Reuse blinking LED
    
    def reset_to_idle(self):
        """Reset kiosk to start screen (camera off) to prevent phantom scans during standby"""
        if self.display_timer:
            self.root.after_cancel(self.display_timer)
        
        # Clear PDF cache
        self.pdf_photos = []
        self.last_scan_data = ""  # Reset last scan to allow re-scanning same QR
        
        # Reset QR confirmation state
        self.pending_qr_data = None
        self.pending_qr_count = 0
        
        # Set GPIO to idle state (all LEDs off)
        self.gpio_led.show_idle()
        
        # Return to START screen (camera off) instead of scan screen
        # This prevents the kiosk from randomly scanning when nobody is using it
        self._show_start_screen()
        
        self.tts.speak(EnglishMessages.READY_FOR_NEXT)
    
    # ============ OCR Capture Methods ============
    
    def _reset_ocr_capture(self):
        """Reset OCR capture state for a new scan"""
        self.ocr_front_image = None
        self.ocr_back_image = None
        self.ocr_front_frame = None
        self.ocr_back_frame = None
        self.ocr_preview_photos = []  # Clear preview references
        
        # Reset thumbnails (hidden references)
        try:
            self.ocr_front_thumb.config(text="Front: -", image="")
            self.ocr_back_thumb.config(text="Back: -", image="")
        except Exception:
            pass
        
        # Reset preview indicators
        self.ocr_front_preview.config(text="FRONT: --", image="", bg=Colors.SURFACE, fg=Colors.TEXT_SECONDARY)
        self.ocr_back_preview.config(text="BACK: --", image="", bg=Colors.SURFACE, fg=Colors.TEXT_SECONDARY)
        
        # Update UI
        self._update_ocr_ui()
    
    def _update_ocr_ui(self):
        """Update OCR UI based on captured images"""
        # Update button states based on what's captured
        if self.ocr_front_frame is None:
            self.ocr_instruction_label.config(text="Step 1: Capture FRONT")
            self.ocr_capture_front_btn.config(state=tk.NORMAL)
            self.ocr_capture_back_btn.config(state=tk.DISABLED)
            self.ocr_submit_btn.config(state=tk.DISABLED)
        
        elif self.ocr_front_frame is not None and self.ocr_back_frame is None:
            self.ocr_instruction_label.config(text="Step 2: Capture BACK")
            self.ocr_capture_front_btn.config(state=tk.NORMAL)  # Can retake
            self.ocr_capture_back_btn.config(state=tk.NORMAL)  # Now enabled
            self.ocr_submit_btn.config(state=tk.DISABLED)
        
        elif self.ocr_front_frame is not None and self.ocr_back_frame is not None:
            self.ocr_instruction_label.config(text="Ready! Tap SUBMIT")
            self.ocr_capture_front_btn.config(state=tk.NORMAL)  # Can retake
            self.ocr_capture_back_btn.config(state=tk.NORMAL)  # Can retake
            self.ocr_submit_btn.config(state=tk.NORMAL)  # Can submit
    
    def _display_ocr_frame(self, frame):
        """Display frame in OCR capture camera preview - fixed size"""
        try:
            # Use the fixed container size
            container_w = self.ocr_camera_container.winfo_width()
            container_h = self.ocr_camera_container.winfo_height()
            
            # Fallback if container not yet rendered
            if container_w < 50 or container_h < 50:
                container_w = min(400, self.screen_width - 20)
                container_h = min(280, self.screen_height - 160)
            
            # Resize maintaining aspect ratio
            frame_h, frame_w = frame.shape[:2]
            frame_ratio = frame_w / frame_h
            label_ratio = container_w / container_h
            
            if frame_ratio > label_ratio:
                display_w = container_w
                display_h = int(container_w / frame_ratio)
            else:
                display_h = container_h
                display_w = int(container_h * frame_ratio)
            
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_resized = cv2.resize(frame_rgb, (display_w, display_h), interpolation=cv2.INTER_LINEAR)
            
            pil_image = Image.fromarray(frame_resized)
            photo = ImageTk.PhotoImage(pil_image)
            
            self.ocr_camera_label.config(image=photo, text="")
            self.ocr_camera_label.image = photo
        except Exception as e:
            print(f"OCR frame display error: {e}")
            self.ocr_camera_label.config(text=f"Camera error: {str(e)[:50]}")
    
    
    def _ocr_capture_front(self):
        """Capture PICTURE 1 (front of label)"""
        if self.current_frame is None:
            return
        
        # Capture the current frame
        frame_copy = self.current_frame.copy()
        self.ocr_front_frame = frame_copy
        
        # Create thumbnail for hidden ref
        try:
            thumb = self._create_thumbnail(frame_copy, 150, 100)
            self.ocr_front_thumb.config(image=thumb, text="")
            self.ocr_front_thumb.image = thumb
        except Exception:
            thumb = None
        
        # Update status indicator text
        self.ocr_front_preview.config(text="FRONT: OK", image="", bg=Colors.SUCCESS_LIGHT, fg=Colors.SUCCESS)
        
        # Store refs to prevent garbage collection
        self.ocr_preview_photos = []
        if thumb:
            self.ocr_preview_photos.append(thumb)
        
        print(f"Front captured")
        
        # Update UI
        self._update_ocr_ui()
        self.tts.speak("Front captured. Now capture the back.")
    
    def _ocr_capture_back(self):
        """Capture PICTURE 2 (back of label)"""
        if self.current_frame is None:
            return
        
        # Capture the current frame
        frame_copy = self.current_frame.copy()
        self.ocr_back_frame = frame_copy
        
        # Create thumbnail for hidden ref
        try:
            thumb = self._create_thumbnail(frame_copy, 150, 100)
            self.ocr_back_thumb.config(image=thumb, text="")
            self.ocr_back_thumb.image = thumb
        except Exception:
            thumb = None
        
        # Update status indicator text
        self.ocr_back_preview.config(text="BACK: OK", image="", bg=Colors.SUCCESS_LIGHT, fg=Colors.SUCCESS)
        
        # Add to list to prevent garbage collection
        if thumb:
            self.ocr_preview_photos.append(thumb)
        
        print(f"Back captured")
        
        # Update UI
        self._update_ocr_ui()
        self.tts.speak("Back captured. Tap Submit to analyze.")
    
    def _create_thumbnail(self, frame, width, height):
        """Create a thumbnail from a frame"""
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        
        # Calculate aspect ratio
        aspect = pil_image.width / pil_image.height
        if aspect > width / height:
            new_width = width
            new_height = int(width / aspect)
        else:
            new_height = height
            new_width = int(height * aspect)
        
        # Resize image
        resized = pil_image.resize((new_width, new_height), Image.LANCZOS)
        return ImageTk.PhotoImage(resized)
    
    def _ocr_cancel(self):
        """Cancel OCR capture and return to start screen"""
        self._reset_ocr_capture()
        self._show_start_screen()
    
    # ============ Manual Search Methods ============
    
    def _manual_search_clear(self):
        """Clear manual search input fields"""
        self.cfpr_entry.delete(0, tk.END)
        self.lto_entry.delete(0, tk.END)
        self.cfpr_entry.focus()
    
    def _manual_search_submit(self):
        """Submit manual search with entered codes"""
        cfpr = self.cfpr_entry.get().strip().upper()
        lto = self.lto_entry.get().strip().upper()
        
        # Validate at least one field is filled
        if not cfpr and not lto:
            self._show_error_screen(
                "Missing Information",
                "Please enter at least a CFPR or LTO/BAI number."
            )
            return
        
        # Show loading screen
        self._show_loading_screen("Searching for product...")
        
        # Process in background
        thread = threading.Thread(target=self._process_manual_search, args=(cfpr, lto), daemon=True)
        thread.start()
    
    def _process_manual_search(self, cfpr: str, lto: str):
        """Process manual search by constructing searchable text that matches backend patterns"""
        try:
            # IMPORTANT: The backend FuzzySearchService expects the actual code values directly
            # It uses learned patterns from the database like:
            #   CFPR: /(?:FR|IM|CFPR)[-\s]?[A-Z0-9]{2,}/gi
            #   LTO:  /(?:LTO|DR)[-\s]?[A-Z0-9]{2,}/gi
            # So we need to include the codes EXACTLY as they would appear on a label
            
            text_parts = []
            
            # For CFPR - include multiple variations the OCR might see
            if cfpr:
                # Clean any extra spaces
                cfpr_clean = cfpr.strip()
                # Add the raw code (this is what the regex will match)
                text_parts.append(cfpr_clean)
                # Also add with common label prefixes
                text_parts.append(f"CFPR No. {cfpr_clean}")
                text_parts.append(f"CFPR-{cfpr_clean}")
                # If the code doesn't have a standard prefix, try adding FR-
                if not any(cfpr_clean.startswith(p) for p in ['FR-', 'FR', 'IM-', 'IM', 'CFPR']):
                    text_parts.append(f"FR-{cfpr_clean}")
                    text_parts.append(f"IM-{cfpr_clean}")
            
            # For LTO - include multiple variations  
            if lto:
                lto_clean = lto.strip()
                # Add the raw code
                text_parts.append(lto_clean)
                # Also add with common label prefixes
                text_parts.append(f"LTO No. {lto_clean}")
                text_parts.append(f"LTO-{lto_clean}")
                # If the code doesn't have a standard prefix, try adding LTO- or DR-
                if not any(lto_clean.startswith(p) for p in ['LTO-', 'LTO', 'DR-', 'DR']):
                    text_parts.append(f"LTO-{lto_clean}")
                    text_parts.append(f"DR-{lto_clean}")
            
            # Combine into searchable text block
            # The backend will scan this for recognizable codes
            combined_text = "\n".join(text_parts)
            
            print(f"\n{'='*60}")
            print(f"MANUAL SEARCH")
            print(f"{'='*60}")
            print(f"CFPR Input: {cfpr if cfpr else 'Not provided'}")
            print(f"LTO/BAI Input: {lto if lto else 'Not provided'}")
            print(f"Constructed text block:")
            for line in text_parts:
                print(f"   - {line}")
            print(f"Total text length: {len(combined_text)} chars")
            print(f"{'='*60}\n")
            
            self.root.after(0, lambda: self.loading_detail_label.config(text="Searching database..."))
            
            # Send to API using same endpoint as OCR
            print(f"Calling POST /api/v1/kiosk-scan/scanProduct (Manual Search)")
            print(f"Payload: blockOfText={len(combined_text)} chars")
            response = self.api.scan_product_ocr(combined_text)
            print(f"API Response: success={response.get('success')}, found={response.get('found')}, isCompliant={response.get('isCompliant')}")
            
            if response.get("success"):
                print(f"Displaying compliance result to user")
                self.root.after(0, lambda: self._display_compliance_result(response))
            else:
                print(f"Search failed: {response.get('message')}")
                self.root.after(0, lambda: self._show_error_screen(
                    "Product Not Found",
                    response.get("message", "No product found with those registration numbers")
                ))
                
        except Exception as e:
            print(f"Manual search error: {e}")
            self.root.after(0, lambda: self._show_error_screen(
                f"Search Error: {str(e)}",
                "An error occurred while searching for the product."
            ))
    
    def _review_ocr_capture(self, image_index: int):
        """Open captured OCR image in fullscreen for review"""
        # Get the appropriate frame
        if image_index == 0 and self.ocr_front_frame is not None:
            frame = self.ocr_front_frame
            title = "Front Image - Picture 1"
        elif image_index == 1 and self.ocr_back_frame is not None:
            frame = self.ocr_back_frame
            title = "Back Image - Picture 2"
        else:
            return  # No image captured yet
        
        # Convert to PIL Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_frame)
        
        # Calculate proper scaling to fit screen
        max_width = self.screen_width - 100
        max_height = self.screen_height - 200
        
        width_ratio = max_width / pil_image.width
        height_ratio = max_height / pil_image.height
        scale = min(width_ratio, height_ratio, 2.0)  # Max 2x zoom
        
        new_width = int(pil_image.width * scale)
        new_height = int(pil_image.height * scale)
        
        scaled_image = pil_image.resize((new_width, new_height), Image.LANCZOS)
        
        # Store in list for zoom viewer (reuse PDF zoom functionality)
        self.pdf_current_images = [scaled_image]
        self.pdf_current_page = 0
        self.pdf_zoom_scale = 1.0
        self.pdf_zoom_offset_x = 0
        self.pdf_zoom_offset_y = 0
        
        # Create overlay
        self.pdf_zoom_overlay = tk.Frame(self.root, bg="#000000")
        self.pdf_zoom_overlay.place(x=0, y=0, relwidth=1, relheight=1)
        
        # Top bar
        control_bar = tk.Frame(self.pdf_zoom_overlay, bg=Colors.PRIMARY, height=70)
        control_bar.pack(fill=tk.X)
        control_bar.pack_propagate(False)
        
        # Close button
        tk.Button(
            control_bar,
            text="CLOSE",
            font=("SF Pro Display", 16, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE,
            activebackground="#D32F2F",
            relief=tk.FLAT,
            bd=0,
            padx=25,
            pady=12,
            command=self._close_pdf_zoom
        ).pack(side=tk.LEFT, padx=15, pady=10)
        
        # Title
        tk.Label(
            control_bar,
            text=title,
            font=("SF Pro Display", 18, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack(side=tk.LEFT, padx=20)
        
        # Zoom controls
        zoom_frame = tk.Frame(control_bar, bg=Colors.PRIMARY)
        zoom_frame.pack(side=tk.RIGHT, padx=15)
        
        tk.Button(
            zoom_frame,
            text="−",
            font=("SF Pro Display", 20, "bold"),
            bg=Colors.PRIMARY_LIGHT,
            fg=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            width=4,
            command=lambda: self._zoom_pdf(-0.2)
        ).pack(side=tk.LEFT, padx=5)
        
        self.zoom_label = tk.Label(
            zoom_frame,
            text="100%",
            font=("SF Pro Text", 16),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            width=7
        )
        self.zoom_label.pack(side=tk.LEFT, padx=5)
        
        tk.Button(
            zoom_frame,
            text="+",
            font=("SF Pro Display", 20, "bold"),
            bg=Colors.PRIMARY_LIGHT,
            fg=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            width=4,
            command=lambda: self._zoom_pdf(0.2)
        ).pack(side=tk.LEFT, padx=5)
        
        tk.Button(
            zoom_frame,
            text="FIT",
            font=("SF Pro Text", 14, "bold"),
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            padx=12,
            command=lambda: self._reset_pdf_zoom()
        ).pack(side=tk.LEFT, padx=5)
        
        # Canvas for image
        self.pdf_zoom_canvas = tk.Canvas(
            self.pdf_zoom_overlay,
            bg="#000000",
            highlightthickness=0
        )
        self.pdf_zoom_canvas.pack(fill=tk.BOTH, expand=True)
        
        # Bind events
        self.pdf_zoom_canvas.bind('<ButtonPress-1>', self._start_pdf_drag)
        self.pdf_zoom_canvas.bind('<B1-Motion>', self._drag_pdf)
        self.pdf_zoom_canvas.bind('<ButtonRelease-1>', self._end_pdf_drag)
        self.pdf_zoom_canvas.bind('<MouseWheel>', self._mousewheel_zoom)
        self.pdf_zoom_overlay.bind('<Escape>', lambda e: self._close_pdf_zoom())
        self.pdf_zoom_overlay.focus_set()
        
        # Render
        self._render_pdf_zoom()
    
    def _ocr_submit_scan(self):
        """Submit captured photos for OCR processing"""
        if self.ocr_front_frame is None or self.ocr_back_frame is None:
            return
        
        # Show loading screen
        self._show_loading_screen("Processing product label...\nPinoproseso ang label ng produkto...")
        
        # Process in background
        thread = threading.Thread(target=self._process_ocr_scan, daemon=True)
        thread.start()
    
    def _enhanced_ocr_extraction(self, frame, label: str = "") -> str:
        """
        OCR extraction using Tesseract OCR - sends RAW text to backend.
        
        Matches the mobile app approach: minimal image preprocessing,
        single OCR pass, NO text filtering/cleaning/code extraction.
        The backend handles all fuzzy matching and code extraction.
        """
        global TESSERACT_AVAILABLE
        
        if not TESSERACT_AVAILABLE:
            print(f"   ERROR: Tesseract OCR not available!")
            return "ERROR: Tesseract OCR not installed. Run: sudo apt-get install tesseract-ocr"
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        # Image preprocessing (matches mobile app approach):
        # 1. Upscale small images for better OCR accuracy
        min_dimension = 1500
        if max(height, width) < min_dimension:
            scale = min_dimension / max(height, width)
            gray = cv2.resize(gray, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
            print(f"   Upscaled from {width}x{height} to {gray.shape[1]}x{gray.shape[0]}")
        
        # 2. Light denoising (preserve edges)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # 3. Contrast enhancement (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Single OCR pass with best general settings
        print(f"   Running Tesseract OCR ({label})...")
        try:
            raw_text = pytesseract.image_to_string(
                Image.fromarray(enhanced),
                lang='eng',
                config='--psm 6 --oem 1'  # Assume uniform block of text
            )
            print(f"   OCR result: {len(raw_text)} chars")
            print(f"   Preview: {raw_text[:200] if len(raw_text) > 200 else raw_text}")
            return raw_text.strip()
        except Exception as e:
            print(f"   OCR failed: {e}")
            return ""
    
    def _clean_ocr_text(self, text: str) -> str:
        """Minimal text cleanup - preserve raw OCR output for backend processing"""
        if not text:
            return ""
        return text.strip()
    
    def _is_valid_word(self, word: str) -> bool:
        """Check if a word is valid - kept for backward compatibility"""
        if not word or len(word.strip()) < 2:
            return False
        return True
    
    def _process_ocr_scan(self):
        """Process OCR scan - extract raw text and let backend handle analysis.
        Follows the same approach as the mobile app: send raw OCR text with
        --- FRONT/BACK OF LABEL --- delimiters.
        
        Guard clauses:
        - Validates frames exist before processing
        - Checks minimum text length (matching mobile app's 20 char minimum)
        - Handles API errors gracefully with user-friendly messages
        - Catches all exceptions to prevent crashes
        """
        try:
            # GUARD: Validate frames exist
            if self.ocr_front_frame is None:
                self.root.after(0, lambda: self._show_ocr_not_found_screen(
                    "No front image captured. Please capture the front of the label first."
                ))
                return
            
            if self.ocr_back_frame is None:
                self.root.after(0, lambda: self._show_ocr_not_found_screen(
                    "No back image captured. Please capture the back of the label first."
                ))
                return
            
            # Extract raw text from both images
            self.root.after(0, lambda: self.loading_detail_label.config(text="Reading front label..."))
            
            print("\n" + "="*60)
            print("OCR EXTRACTION - FRONT IMAGE")
            print("="*60)
            front_text = ""
            try:
                front_text = self._enhanced_ocr_extraction(self.ocr_front_frame, "FRONT")
            except Exception as e:
                print(f"Front OCR extraction failed: {e}")
                front_text = ""
            print(f"Front text: {len(front_text)} chars")
            
            self.root.after(0, lambda: self.loading_detail_label.config(text="Reading back label..."))
            
            print("\n" + "="*60)
            print("OCR EXTRACTION - BACK IMAGE")
            print("="*60)
            back_text = ""
            try:
                back_text = self._enhanced_ocr_extraction(self.ocr_back_frame, "BACK")
            except Exception as e:
                print(f"Back OCR extraction failed: {e}")
                back_text = ""
            print(f"Back text: {len(back_text)} chars")
            
            # Combine with delimiters matching mobile app format
            combined_text = f"--- FRONT OF LABEL ---\n\n{front_text}\n\n--- BACK OF LABEL ---\n\n{back_text}"
            print(f"\n=== COMBINED RAW OCR TEXT ({len(combined_text)} chars) ===")
            print(combined_text[:500])
            print(f"=========================")
            
            # GUARD: Check minimum text length (matching mobile app's validation)
            actual_text = front_text.strip() + back_text.strip()
            if len(actual_text) < 10:
                print(f"Insufficient OCR text detected: {len(actual_text)} chars (minimum: 10)")
                self.root.after(0, lambda: self._show_ocr_not_found_screen(
                    "Could not read text from the label.\\n\\n"
                    "Tips:\\n"
                    "• Ensure good lighting\\n"
                    "• Hold the label steady and flat\\n"
                    "• Make sure text is in focus\\n"
                    "• Try positioning closer to the camera"
                ))
                return
            
            self.root.after(0, lambda: self.loading_detail_label.config(text="Searching for product..."))
            
            # Send to API - calling /scan/scanProduct endpoint
            print(f"Calling POST /api/v1/kiosk-scan/scanProduct")
            print(f"Payload: blockOfText={len(combined_text)} chars")
            response = self.api.scan_product_ocr(combined_text)
            print(f"API Response: success={response.get('success')}, found={response.get('found')}, isCompliant={response.get('isCompliant')}")
            
            # GUARD: Handle connection errors
            if response.get("error") == "connection_error":
                self.root.after(0, lambda: self._show_error_screen(
                    "Server Unavailable",
                    "Cannot connect to RCV server. Please check your internet connection."
                ))
                return
            
            # GUARD: Handle timeout
            if response.get("error") == "timeout":
                self.root.after(0, lambda: self._show_ocr_not_found_screen(
                    "Request timed out. The server took too long to respond.\\n\\n"
                    "Try again or use Manual Search instead."
                ))
                return
            
            # GUARD: Handle HTTP errors (404, 500, etc.)
            if response.get("error") in ("http_error", "unknown"):
                error_msg = response.get("message", "Unknown error")
                print(f"API error: {error_msg}")
                self.root.after(0, lambda: self._show_ocr_not_found_screen(
                    f"Server error: {error_msg}\\n\\n"
                    "Try Manual Search instead."
                ))
                return
            
            if response.get("success"):
                print(f"Displaying compliance result to user")
                self.root.after(0, lambda: self._display_compliance_result(response))
            else:
                # API returned success=false - show not found with manual search option
                msg = response.get("message", "Could not process the product label")
                print(f"Scan returned not successful: {msg}")
                self.root.after(0, lambda: self._show_ocr_not_found_screen(
                    f"{msg}\\n\\nTry Manual Search to enter registration numbers directly."
                ))
                
        except requests.exceptions.ConnectionError:
            print("OCR processing error: Connection refused")
            self.root.after(0, lambda: self._show_error_screen(
                "Server Unavailable",
                "Cannot connect to RCV server. Check your connection."
            ))
        except requests.exceptions.Timeout:
            print("OCR processing error: Request timeout")
            self.root.after(0, lambda: self._show_ocr_not_found_screen(
                "Request timed out.\\n\\nTry Manual Search instead."
            ))
        except Exception as e:
            error_msg = str(e)
            print(f"OCR processing error: {error_msg}")
            self.root.after(0, lambda msg=error_msg: self._show_ocr_not_found_screen(
                f"Processing Error: {msg}\\n\\nTry Manual Search instead."
            ))
    
    def _show_ocr_not_found_screen(self, message: str = "Product not found"):
        """Show a 'Product Not Found' screen with a prominent MANUAL SEARCH button.
        Used when OCR fails, text is insufficient, or API returns no results.
        Gives the user a clear path to manual search instead of a dead end."""
        
        # Stop camera while showing this screen
        if self.camera and self.camera.isOpened():
            self.is_running = False
            self.camera.release()
            self.camera = None
        
        self._hide_all_screens()
        self.state = KioskState.ERROR
        
        # GPIO LED - error state
        self.gpio_led.show_error()
        
        # Build the not-found screen dynamically
        not_found_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        not_found_frame.pack(fill=tk.BOTH, expand=True)
        
        # Red header
        header = tk.Frame(not_found_frame, bg=Colors.ERROR, height=120)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        
        tk.Label(
            header,
            text="PRODUCT NOT FOUND",
            font=("SF Pro Display", 42, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(expand=True)
        
        # Content area
        content = tk.Frame(not_found_frame, bg=Colors.BACKGROUND)
        content.pack(fill=tk.BOTH, expand=True)
        
        center = tk.Frame(content, bg=Colors.BACKGROUND)
        center.place(relx=0.5, rely=0.45, anchor=tk.CENTER)
        
        # Error icon
        error_icon = tk.Canvas(center, width=120, height=120, bg=Colors.BACKGROUND, highlightthickness=0)
        error_icon.pack(pady=(0, 20))
        error_icon.create_oval(10, 10, 110, 110, outline=Colors.ERROR, width=6)
        error_icon.create_text(60, 60, text="!", font=("SF Pro Display", 60, "bold"), fill=Colors.ERROR)
        
        # Message
        tk.Label(
            center,
            text=message.replace("\\n", "\n"),
            font=("SF Pro Text", 18),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY,
            wraplength=700,
            justify=tk.CENTER
        ).pack(pady=(0, 30))
        
        # ===== BIG MANUAL SEARCH BUTTON =====
        manual_btn = tk.Button(
            center,
            text="MANUAL SEARCH\nEnter Registration Numbers",
            font=("SF Pro Display", 24, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            padx=60,
            pady=25,
            cursor="hand2",
            command=lambda: [not_found_frame.destroy(), self._show_manual_search_screen()]
        )
        manual_btn.pack(pady=(0, 20))
        
        # TRY AGAIN button (re-scan with OCR)
        retry_btn = tk.Button(
            center,
            text="TRY SCANNING AGAIN",
            font=("SF Pro Display", 16, "bold"),
            bg=Colors.WARNING,
            fg=Colors.TEXT_WHITE,
            activebackground="#F57C00",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            padx=40,
            pady=15,
            cursor="hand2",
            command=lambda: [not_found_frame.destroy(), self._start_ocr_capture()]
        )
        retry_btn.pack(pady=(0, 15))
        
        # BACK TO HOME button
        home_btn = tk.Button(
            center,
            text="BACK TO HOME",
            font=("SF Pro Text", 14),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY,
            activebackground="#E0E0E0",
            relief=tk.FLAT,
            bd=0,
            padx=30,
            pady=10,
            cursor="hand2",
            command=lambda: [not_found_frame.destroy(), self._show_start_screen()]
        )
        home_btn.pack()
        
        # Store reference for cleanup
        self._ocr_not_found_frame = not_found_frame
        
        # Auto-return to home after 60 seconds
        self.start_display_timer(60, is_error=True)
        
        self.tts.speak("Product not found. You can try Manual Search to enter registration numbers directly.")
    
    def _display_compliance_result(self, response: dict):
        """Display product search result - shows product and certificate information"""
        found = response.get("found", False)
        
        # Store current product info for certificate viewing
        product_info = response.get("productInfo", {})
        self.current_ocr_product = product_info
        
        # Certificate ID priority: actual blockchain cert ID > CFPR number
        # The scan endpoint returns CFPRNumber as certificateId, which isn't
        # the blockchain certificate ID. We store both for the PDF lookup.
        self.current_ocr_certificate_id = (
            product_info.get("certificateId") or 
            product_info.get("CFPRNumber") or 
            product_info.get("registrationNumber")
        )
        
        # Update GPIO LED based on result
        if found:
            self.gpio_led.show_success()
        else:
            self.gpio_led.show_error()
        
        # Update header based on result
        if not found:
            self.compliance_header.config(bg=Colors.ERROR)
            self.compliance_status_label.config(
                bg=Colors.ERROR,
                text="PRODUCT NOT FOUND"
            )
            # Show MANUAL SEARCH button when product not found
            self.compliance_manual_search_frame.pack(fill=tk.X, padx=15, pady=(10, 0))
        else:
            self.compliance_header.config(bg=Colors.SUCCESS)
            self.compliance_status_label.config(
                bg=Colors.SUCCESS,
                text="REGISTERED PRODUCT FOUND"
            )
            # Hide MANUAL SEARCH button when product is found
            self.compliance_manual_search_frame.pack_forget()
        
        # Product info - PROMINENT DISPLAY
        product_name = product_info.get("productName", "Unknown Product")
        brand_name = product_info.get("brandName", "")
        manufacturer = product_info.get("manufacturer", "")
        
        self.compliance_product_name.config(text=product_name)
        
        # Build brand/manufacturer string
        brand_mfr = ""
        if brand_name and manufacturer:
            brand_mfr = f"by {brand_name} • {manufacturer}"
        elif brand_name:
            brand_mfr = f"by {brand_name}"
        elif manufacturer:
            brand_mfr = f"by {manufacturer}"
        self.compliance_brand.config(text=brand_mfr)
        
        # Registration numbers - CLEAR INFO
        compliance = response.get("packagingCompliance", {})
        
        # CFPR Number
        cfpr = compliance.get("cfpr", {})
        cfpr_value = cfpr.get("required", None) or product_info.get("CFPRNumber", None)
        if cfpr_value:
            self.cfpr_check_label.config(
                text=cfpr_value,
                fg=Colors.PRIMARY
            )
        else:
            self.cfpr_check_label.config(
                text="Not available",
                fg=Colors.TEXT_SECONDARY
            )
        
        # LTO Number
        lto = compliance.get("lto", {})
        lto_value = lto.get("required", None) or product_info.get("LTONumber", None)
        if lto_value:
            self.lto_check_label.config(
                text=lto_value,
                fg=Colors.PRIMARY
            )
        else:
            self.lto_check_label.config(
                text="Not available",
                fg=Colors.TEXT_SECONDARY
            )
        
        # Certificate ID
        cert_id = product_info.get("certificateId", None) or product_info.get("registrationNumber", None)
        if cert_id:
            self.cert_id_label.config(text=cert_id, fg=Colors.ACCENT)
        else:
            self.cert_id_label.config(text="-", fg=Colors.TEXT_SECONDARY)
        
        # Registration Date
        reg_date = product_info.get("dateOfRegistration", None) or product_info.get("issuedDate", None)
        if reg_date:
            self.reg_date_label.config(text=self._format_date(reg_date), fg=Colors.TEXT_PRIMARY)
        else:
            self.reg_date_label.config(text="-", fg=Colors.TEXT_SECONDARY)
        
        # Expiry Date
        exp_date = product_info.get("expirationDate", None) or product_info.get("expiryDate", None)
        if exp_date:
            # Check if expired
            if self._is_date_expired(exp_date):
                self.exp_date_label.config(text=f"{self._format_date(exp_date)} (EXPIRED)", fg=Colors.ERROR)
            else:
                self.exp_date_label.config(text=self._format_date(exp_date), fg=Colors.SUCCESS)
        else:
            self.exp_date_label.config(text="-", fg=Colors.TEXT_SECONDARY)
        
        # Product Details section
        product_category = product_info.get("productCategory", None)
        product_type = product_info.get("productType", None)
        lot_number = product_info.get("lotNumber", None)
        
        self.product_category_label.config(text=product_category or "-")
        self.product_type_label.config(text=product_type or "-")
        self.product_lot_label.config(text=lot_number or "-")
        
        # Show/hide product details frame based on whether we have any details
        if found and (product_category or product_type or lot_number):
            self.product_details_frame.pack(fill=tk.X, padx=15, pady=(8, 0))
        else:
            self.product_details_frame.pack_forget()
        
        # Show status row with registered status
        if found:
            self.compliance_status_row.pack(fill=tk.X, pady=5)
            self.compliance_status_info.config(
                text="Registered Product",
                fg=Colors.SUCCESS
            )
        else:
            self.compliance_status_row.pack_forget()
        
        # Additional information (show as helpful notes, not warnings)
        # Don't show warnings/violations - just positive info
        self.compliance_warnings_frame.pack_forget()
        
        # Show thumbnails of captured images (if from OCR scan) - larger for better visibility
        if self.ocr_front_frame is not None:
            thumb = self._create_thumbnail(self.ocr_front_frame, 220, 140)
            self.compliance_front_thumb.config(image=thumb, text="")
            self.compliance_front_thumb.image = thumb
        else:
            self.compliance_front_thumb.config(text="Front", image="")
        
        if self.ocr_back_frame is not None:
            thumb = self._create_thumbnail(self.ocr_back_frame, 220, 140)
            self.compliance_back_thumb.config(image=thumb, text="")
            self.compliance_back_thumb.image = thumb
        else:
            self.compliance_back_thumb.config(text="Back", image="")
        
        # Show screen and start timer
        self._show_compliance_screen()
        self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
        
        # TTS - positive messaging
        if not found:
            self.tts.speak("Product not found in database. Please try again or check the label.")
        else:
            self.tts.speak(f"Product found. {product_name}. This is a registered product.")
    
    def _on_certificate_click(self, event=None):
        """Handle click on certificate ID - view certificate PDF"""
        if self.current_ocr_certificate_id:
            self._view_certificate()
    
    def _view_certificate(self):
        """View certificate PDF for the OCR-identified product"""
        if not self.current_ocr_certificate_id:
            self.tts.speak("No certificate available")
            return
        
        cert_id = self.current_ocr_certificate_id
        print(f"Viewing certificate: {cert_id}")
        
        # Pause the timer while viewing certificate
        self.timer_paused = True
        
        # Show loading
        self._show_loading_screen("Loading certificate...")
        
        # Fetch certificate in background
        thread = threading.Thread(
            target=self._fetch_ocr_certificate, 
            args=(cert_id,), 
            daemon=True
        )
        thread.start()
    
    def _fetch_ocr_certificate(self, certificate_id: str):
        """Fetch and display certificate PDF for OCR result.
        
        The certificate_id from scan response can be:
        - A CFPR number (e.g., 'FR-1234567') - NOT a blockchain cert ID
        - A blockchain cert ID (e.g., 'CERT-PROD-xxx' or 'CERT-COMP-xxx')
        
        Strategy:
        1. If it's a blockchain ID (CERT-xxx), use the PDF endpoint directly
        2. Otherwise, try the blockchain PDF endpoint first (might match)
        3. Fall back to constructing a Firebase Storage URL from product info
        """
        try:
            product_info = self.current_ocr_product or {}
            pdf_url = None
            
            # Strategy 1: Try blockchain PDF endpoint
            print(f"Attempting to fetch PDF for: {certificate_id}")
            pdf_response = self.api.get_certificate_pdf_url(certificate_id)
            if pdf_response.get("success"):
                pdf_url = pdf_response.get("certificate", {}).get("pdfUrl")
            
            # Strategy 2: If the scan response included a productId or companyId,
            # try constructing a CERT-PROD- or CERT-COMP- ID
            if not pdf_url:
                product_id = product_info.get("productId")
                company_id = product_info.get("companyId")
                
                if product_id:
                    alt_cert_id = f"CERT-PROD-{product_id}"
                    print(f"Trying constructed cert ID: {alt_cert_id}")
                    alt_response = self.api.get_certificate_pdf_url(alt_cert_id)
                    if alt_response.get("success"):
                        pdf_url = alt_response.get("certificate", {}).get("pdfUrl")
                        certificate_id = alt_cert_id  # Update to the real cert ID
                
                if not pdf_url and company_id:
                    alt_cert_id = f"CERT-COMP-{company_id}"
                    print(f"Trying constructed cert ID: {alt_cert_id}")
                    alt_response = self.api.get_certificate_pdf_url(alt_cert_id)
                    if alt_response.get("success"):
                        pdf_url = alt_response.get("certificate", {}).get("pdfUrl")
                        certificate_id = alt_cert_id
            
            # Strategy 3: Direct Firebase Storage URL construction
            if not pdf_url:
                print(f"API lookup failed, constructing Firebase URL directly")
                pdf_url = self.api._construct_firebase_pdf_url(certificate_id)
                print(f"Constructed URL: {pdf_url}")
                # Verify the URL is accessible
                try:
                    head_resp = requests.head(pdf_url, timeout=10, allow_redirects=True)
                    if head_resp.status_code != 200:
                        print(f"Firebase URL returned {head_resp.status_code}, PDF may not exist")
                        pdf_url = None
                except Exception as e:
                    print(f"Firebase URL check failed: {e}")
                    pdf_url = None
            
            if pdf_url:
                print(f"Certificate PDF URL: {pdf_url}")
                # Create certificate data object with CORRECT field names
                cert = CertificateData(
                    certificate_id=certificate_id,
                    product_name=product_info.get("productName", "Unknown Product"),
                    company_name=product_info.get("manufacturer", "Unknown"),
                    issue_date=product_info.get("dateOfRegistration", "N/A"),
                    expiry_date=product_info.get("expirationDate", "N/A"),
                    status="valid",
                    pdf_url=pdf_url,
                )
                
                # Switch to result screen with PDF
                self.root.after(0, lambda: self._show_ocr_certificate_result(cert, pdf_url))
            else:
                print(f"No PDF available for certificate: {certificate_id}")
                self.root.after(0, lambda: self._show_error_screen(
                    "Certificate PDF Not Found",
                    f"Could not find PDF for {certificate_id}.\nThe certificate may not have a PDF uploaded yet."
                ))
                
        except Exception as e:
            print(f"Error fetching certificate: {e}")
            self.root.after(0, lambda: self._show_error_screen(
                "Certificate Error",
                str(e)
            ))
    
    def _show_ocr_certificate_result(self, cert: CertificateData, pdf_url: str):
        """Display certificate result from OCR scan - similar to QR scan result"""
        # Setup the result panel similar to QR scan
        self.setup_certificate_panel(cert)
        
        # Fetch and display PDF pages
        self._fetch_and_display_pdf_pages(pdf_url)
        
        # Show result screen
        self._show_result_screen()
        
        # Resume timer with extended time for viewing
        self.timer_paused = False
        self.start_display_timer(60, is_error=False)  # 60 seconds to view certificate
        
        self.tts.speak("Certificate loaded. You can view the official document.")

    def _fetch_and_display_pdf_pages(self, pdf_url: str):
        """Fetch PDF and display 2 pages side by side"""
        # Show loading state
        self.pdf_page1_label.config(text="Loading PDF...", image="")
        self.pdf_page2_label.config(text="", image="")
        
        # Fetch PDF in background thread
        thread = threading.Thread(target=self._fetch_pdf_pages, args=(pdf_url,), daemon=True)
        thread.start()
    
    def _fetch_pdf_pages(self, pdf_url: str):
        """Fetch PDF from Firebase and display both pages"""
        try:
            print(f"Fetching PDF from: {pdf_url}")
            
            # Download PDF
            response = requests.get(pdf_url, timeout=30)
            if response.status_code != 200:
                self.root.after(0, lambda: self._show_pdf_error("Failed to load PDF"))
                return
            
            # Try to render PDF to images using pdf2image if available
            try:
                from pdf2image import convert_from_bytes
                
                # Convert first 2 pages of PDF to images
                images = convert_from_bytes(
                    response.content,
                    first_page=1,
                    last_page=2,  # Get 2 pages
                    dpi=120  # Good quality for display
                )
                
                if images:
                    # Calculate sizes to fit in available space
                    # Each page gets half the available width
                    max_width = 400  # Each page max width
                    max_height = self.screen_height - 300  # Leave room for header/footer
                    
                    processed_images = []
                    for i, pdf_image in enumerate(images):
                        # Calculate scaling
                        width_ratio = max_width / pdf_image.width
                        height_ratio = max_height / pdf_image.height
                        scale = min(width_ratio, height_ratio)
                        
                        new_width = int(pdf_image.width * scale)
                        new_height = int(pdf_image.height * scale)
                        
                        resized = pdf_image.resize((new_width, new_height), Image.LANCZOS)
                        processed_images.append(resized)
                    
                    # Display on main thread
                    self.root.after(0, lambda imgs=processed_images: self._display_pdf_pages(imgs))
                else:
                    self.root.after(0, lambda: self._show_pdf_error("PDF Loaded\n(Preview not available)"))
                    
            except ImportError:
                # pdf2image not available
                print("pdf2image not installed, showing text indicator")
                self.root.after(0, lambda: self._show_pdf_success_no_preview())
                
        except Exception as e:
            print(f"Error fetching PDF: {e}")
            self.root.after(0, lambda: self._show_pdf_error(f"Error loading PDF\n{str(e)[:50]}"))
    
    def _display_pdf_pages(self, images: list):
        """Display PDF pages in the result screen"""
        try:
            self.pdf_photos = []  # Clear old photos
            self.pdf_current_images = images  # Store full images for zoom view
            
            # Display page 1
            if len(images) >= 1:
                photo1 = ImageTk.PhotoImage(images[0])
                self.pdf_photos.append(photo1)
                self.pdf_page1_label.config(image=photo1, text="")
            
            # Display page 2
            if len(images) >= 2:
                photo2 = ImageTk.PhotoImage(images[1])
                self.pdf_photos.append(photo2)
                self.pdf_page2_label.config(image=photo2, text="")
            elif len(images) == 1:
                # Only 1 page, hide second label
                self.pdf_page2_label.config(text="(Single page document)", image="")
            
            # Add hint text to click for zoom
            if len(images) > 0:
                tk.Label(
                    self.pdf_pages_frame,
                    text="Click pages to zoom",
                    font=("SF Pro Text", 10),
                    bg=Colors.SURFACE,
                    fg=Colors.TEXT_SECONDARY
                ).pack(pady=(5, 0))
            
            # NOW start the countdown timer after PDF is displayed
            self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
                
        except Exception as e:
            print(f"Error displaying PDF pages: {e}")
            self._show_pdf_error("Error displaying PDF")
    
    def _show_pdf_error(self, message: str):
        """Show PDF loading error - also starts timer"""
        self.pdf_page1_label.config(text=message, image="")
        self.pdf_page2_label.config(text="", image="")
        # Start timer after PDF load attempt completes
        self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
    
    def _show_pdf_success_no_preview(self):
        """Show PDF loaded but no preview available"""
        self.pdf_page1_label.config(
            text="PDF Certificate Available\n\n(Install pdf2image for preview)",
            image=""
        )
        self.pdf_page2_label.config(text="", image="")
        # Start timer after PDF load attempt completes
        self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
    
    def _open_pdf_zoom(self, page_index: int):
        """Open PDF page in fullscreen zoom view"""
        if not self.pdf_current_images or page_index >= len(self.pdf_current_images):
            return
        
        self.pdf_current_page = page_index
        self.pdf_zoom_scale = 1.0
        self.pdf_zoom_offset_x = 0
        self.pdf_zoom_offset_y = 0
        
        # Create overlay frame (modal)
        self.pdf_zoom_overlay = tk.Frame(self.root, bg="#000000")
        self.pdf_zoom_overlay.place(x=0, y=0, relwidth=1, relheight=1)
        
        # Top bar with controls
        control_bar = tk.Frame(self.pdf_zoom_overlay, bg=Colors.PRIMARY, height=60)
        control_bar.pack(fill=tk.X)
        control_bar.pack_propagate(False)
        
        # Close button
        close_btn = tk.Button(
            control_bar,
            text="CLOSE",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE,
            activebackground="#D32F2F",
            relief=tk.FLAT,
            bd=0,
            padx=20,
            pady=10,
            command=self._close_pdf_zoom
        )
        close_btn.pack(side=tk.LEFT, padx=10, pady=10)
        
        # Page indicator
        page_label = tk.Label(
            control_bar,
            text=f"Page {page_index + 1} of {len(self.pdf_current_images)}",
            font=("SF Pro Text", 14),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        )
        page_label.pack(side=tk.LEFT, padx=20)
        
        # Zoom controls
        zoom_frame = tk.Frame(control_bar, bg=Colors.PRIMARY)
        zoom_frame.pack(side=tk.RIGHT, padx=10)
        
        tk.Button(
            zoom_frame,
            text="-",
            font=("SF Pro Display", 18, "bold"),
            bg=Colors.PRIMARY_LIGHT,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.ACCENT,
            relief=tk.FLAT,
            width=3,
            command=lambda: self._zoom_pdf(-0.2)
        ).pack(side=tk.LEFT, padx=5)
        
        self.zoom_label = tk.Label(
            zoom_frame,
            text="100%",
            font=("SF Pro Text", 14),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            width=6
        )
        self.zoom_label.pack(side=tk.LEFT, padx=5)
        
        tk.Button(
            zoom_frame,
            text="+",
            font=("SF Pro Display", 18, "bold"),
            bg=Colors.PRIMARY_LIGHT,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.ACCENT,
            relief=tk.FLAT,
            width=3,
            command=lambda: self._zoom_pdf(0.2)
        ).pack(side=tk.LEFT, padx=5)
        
        tk.Button(
            zoom_frame,
            text="FIT",
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            relief=tk.FLAT,
            padx=10,
            command=lambda: self._reset_pdf_zoom()
        ).pack(side=tk.LEFT, padx=5)
        
        # Page navigation if multiple pages
        if len(self.pdf_current_images) > 1:
            nav_frame = tk.Frame(control_bar, bg=Colors.PRIMARY)
            nav_frame.pack(side=tk.RIGHT, padx=20)
            
            if page_index > 0:
                tk.Button(
                    nav_frame,
                    text="PREV",
                    font=("SF Pro Text", 12, "bold"),
                    bg=Colors.PRIMARY_LIGHT,
                    fg=Colors.TEXT_WHITE,
                    activebackground=Colors.ACCENT,
                    relief=tk.FLAT,
                    padx=15,
                    command=lambda: self._change_pdf_page(-1)
                ).pack(side=tk.LEFT, padx=5)
            
            if page_index < len(self.pdf_current_images) - 1:
                tk.Button(
                    nav_frame,
                    text="NEXT",
                    font=("SF Pro Text", 12, "bold"),
                    bg=Colors.PRIMARY_LIGHT,
                    fg=Colors.TEXT_WHITE,
                    activebackground=Colors.ACCENT,
                    relief=tk.FLAT,
                    padx=15,
                    command=lambda: self._change_pdf_page(1)
                ).pack(side=tk.LEFT, padx=5)
        
        # Canvas for PDF display with scrolling
        self.pdf_zoom_canvas = tk.Canvas(
            self.pdf_zoom_overlay,
            bg="#000000",
            highlightthickness=0
        )
        self.pdf_zoom_canvas.pack(fill=tk.BOTH, expand=True)
        
        # Bind mouse events for panning
        self.pdf_zoom_canvas.bind('<ButtonPress-1>', self._start_pdf_drag)
        self.pdf_zoom_canvas.bind('<B1-Motion>', self._drag_pdf)
        self.pdf_zoom_canvas.bind('<ButtonRelease-1>', self._end_pdf_drag)
        
        # Bind mouse wheel for zooming
        self.pdf_zoom_canvas.bind('<MouseWheel>', self._mousewheel_zoom)  # Windows
        self.pdf_zoom_canvas.bind('<Button-4>', lambda e: self._zoom_pdf(0.1))  # Linux scroll up
        self.pdf_zoom_canvas.bind('<Button-5>', lambda e: self._zoom_pdf(-0.1))  # Linux scroll down
        
        # Bind keyboard shortcuts
        self.pdf_zoom_overlay.bind('<Escape>', lambda e: self._close_pdf_zoom())
        self.pdf_zoom_overlay.bind('<plus>', lambda e: self._zoom_pdf(0.2))
        self.pdf_zoom_overlay.bind('<minus>', lambda e: self._zoom_pdf(-0.2))
        self.pdf_zoom_overlay.bind('<Left>', lambda e: self._change_pdf_page(-1))
        self.pdf_zoom_overlay.bind('<Right>', lambda e: self._change_pdf_page(1))
        self.pdf_zoom_overlay.focus_set()
        
        # Initial render
        self._render_pdf_zoom()
    
    def _render_pdf_zoom(self):
        """Render PDF at current zoom level"""
        if not self.pdf_zoom_canvas or not self.pdf_current_images:
            return
        
        try:
            # Get current page image
            original_image = self.pdf_current_images[self.pdf_current_page]
            
            # Calculate zoomed size
            new_width = int(original_image.width * self.pdf_zoom_scale)
            new_height = int(original_image.height * self.pdf_zoom_scale)
            
            # Resize image
            zoomed_image = original_image.resize((new_width, new_height), Image.LANCZOS)
            
            # Convert to PhotoImage
            self.pdf_zoom_photo = ImageTk.PhotoImage(zoomed_image)
            
            # Clear canvas
            self.pdf_zoom_canvas.delete('all')
            
            # Calculate position (centered with offset)
            canvas_width = self.pdf_zoom_canvas.winfo_width()
            canvas_height = self.pdf_zoom_canvas.winfo_height()
            
            x = (canvas_width - new_width) // 2 + self.pdf_zoom_offset_x
            y = (canvas_height - new_height) // 2 + self.pdf_zoom_offset_y
            
            # Display image
            self.pdf_zoom_canvas.create_image(x, y, image=self.pdf_zoom_photo, anchor=tk.NW)
            
        except Exception as e:
            print(f"Error rendering PDF zoom: {e}")
    
    def _zoom_pdf(self, delta: float):
        """Zoom PDF in or out"""
        new_scale = self.pdf_zoom_scale + delta
        if 0.5 <= new_scale <= 5.0:  # Limit zoom range
            self.pdf_zoom_scale = new_scale
            self.zoom_label.config(text=f"{int(self.pdf_zoom_scale * 100)}%")
            self._render_pdf_zoom()
    
    def _reset_pdf_zoom(self):
        """Reset zoom to fit screen"""
        self.pdf_zoom_scale = 1.0
        self.pdf_zoom_offset_x = 0
        self.pdf_zoom_offset_y = 0
        self.zoom_label.config(text="100%")
        self._render_pdf_zoom()
    
    def _mousewheel_zoom(self, event):
        """Handle mouse wheel zoom"""
        if event.delta > 0:
            self._zoom_pdf(0.1)
        else:
            self._zoom_pdf(-0.1)
    
    def _start_pdf_drag(self, event):
        """Start dragging PDF"""
        self.pdf_drag_start = (event.x, event.y)
    
    def _drag_pdf(self, event):
        """Drag PDF around canvas"""
        if self.pdf_drag_start:
            dx = event.x - self.pdf_drag_start[0]
            dy = event.y - self.pdf_drag_start[1]
            self.pdf_zoom_offset_x += dx
            self.pdf_zoom_offset_y += dy
            self.pdf_drag_start = (event.x, event.y)
            self._render_pdf_zoom()
    
    def _end_pdf_drag(self, event):
        """End dragging PDF"""
        self.pdf_drag_start = None
    
    def _change_pdf_page(self, direction: int):
        """Change to next/previous PDF page"""
        new_page = self.pdf_current_page + direction
        if 0 <= new_page < len(self.pdf_current_images):
            self.pdf_current_page = new_page
            self.pdf_zoom_offset_x = 0
            self.pdf_zoom_offset_y = 0
            self._render_pdf_zoom()
            
            # Update page label
            for widget in self.pdf_zoom_overlay.winfo_children():
                if isinstance(widget, tk.Frame):
                    for child in widget.winfo_children():
                        if isinstance(child, tk.Label) and "Page" in child.cget("text"):
                            child.config(text=f"Page {self.pdf_current_page + 1} of {len(self.pdf_current_images)}")
    
    def _close_pdf_zoom(self):
        """Close PDF zoom overlay"""
        if self.pdf_zoom_overlay:
            self.pdf_zoom_overlay.destroy()
            self.pdf_zoom_overlay = None
            self.pdf_zoom_canvas = None
    
    def display_frame(self, frame):
        """Display camera frame in UI - optimized for performance"""
        try:
            # Frame skipping for performance
            self.frame_skip_counter += 1
            if self.frame_skip_counter < self.frame_skip_rate:
                return
            self.frame_skip_counter = 0
            
            # Get camera label dimensions
            label_width = self.camera_label.winfo_width()
            label_height = self.camera_label.winfo_height()
            
            if label_width < 100 or label_height < 100:
                # Widget not ready yet, use defaults
                label_width = 540
                label_height = 400
            
            # Calculate display size maintaining aspect ratio
            frame_h, frame_w = frame.shape[:2]
            frame_ratio = frame_w / frame_h
            label_ratio = label_width / label_height
            
            if frame_ratio > label_ratio:
                display_width = label_width
                display_height = int(label_width / frame_ratio)
            else:
                display_height = label_height
                display_width = int(label_height * frame_ratio)
            
            # Resize using OpenCV (much faster than PIL)
            resized = cv2.resize(frame, (display_width, display_height), 
                                interpolation=cv2.INTER_LINEAR)
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image and then to PhotoImage
            frame_pil = Image.fromarray(frame_rgb)
            photo = ImageTk.PhotoImage(image=frame_pil)
            
            # Update label
            self.camera_label.config(image=photo, text='')
            self.camera_label.image = photo  # Keep reference
            self.last_photo = photo  # Extra reference to prevent GC
            
        except Exception as e:
            pass  # Ignore display errors to keep loop running
    
    def log_scan(self, scan_type: str, data: dict):
        """Log scan to file"""
        try:
            log_file = os.path.join(self.data_dir, "scan_log.json")
            
            entry = {
                "timestamp": datetime.now().isoformat(),
                "type": scan_type,
                "data": data
            }
            
            # Load existing logs
            logs = []
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    logs = json.load(f)
            
            logs.append(entry)
            
            # Keep last 1000 entries
            logs = logs[-1000:]
            
            with open(log_file, 'w') as f:
                json.dump(logs, f, indent=2, default=str)
                
        except Exception as e:
            print(f"Log error: {e}")
    
    def toggle_sound(self):
        """Toggle sound on/off - touch friendly"""
        self.tts.toggle_mute()
        button_text = "SOUND\nOFF" if self.tts.is_muted else "SOUND\nON"
        self.mute_button.config(text=button_text)
    
    def start_exit_timer(self, event):
        """Start timer for exit button reveal (long press)"""
        self.exit_timer = self.root.after(3000, self.reveal_exit_button)
    
    def cancel_exit_timer(self, event):
        """Cancel exit timer if button released early"""
        if self.exit_timer:
            self.root.after_cancel(self.exit_timer)
            self.exit_timer = None
    
    def reveal_exit_button(self):
        """Show exit button after long press"""
        self.exit_button.pack(side=tk.LEFT, padx=20)
        self.root.after(5000, lambda: self.exit_button.pack_forget())  # Hide after 5 seconds
    
    # ============ SLIDESHOW / SCREENSAVER ============
    
    def _load_slideshow_images(self):
        """Load PNG images from assets/slideshow folder"""
        slideshow_dir = os.path.join(os.path.dirname(__file__), "assets", "slideshow")
        
        # Create the folder if it doesn't exist
        os.makedirs(slideshow_dir, exist_ok=True)
        
        self.slideshow_images = []
        
        # Look for PNG, JPG, JPEG images
        extensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG']
        
        if os.path.exists(slideshow_dir):
            files = sorted(os.listdir(slideshow_dir))
            for filename in files:
                if any(filename.endswith(ext) for ext in extensions):
                    filepath = os.path.join(slideshow_dir, filename)
                    try:
                        img = Image.open(filepath)
                        self.slideshow_images.append(img)
                        print(f"Loaded slideshow image: {filename}")
                    except Exception as e:
                        print(f"Failed to load slideshow image {filename}: {e}")
        
        if self.slideshow_images:
            print(f"Loaded {len(self.slideshow_images)} slideshow images")
        else:
            print(f"No slideshow images found in {slideshow_dir}")
            print("Add PNG/JPG images to assets/slideshow/ folder for screensaver")
    
    def _start_idle_timer(self):
        """Start/reset the idle timer for slideshow"""
        # Cancel existing timer
        if self.idle_timer_id:
            self.root.after_cancel(self.idle_timer_id)
            self.idle_timer_id = None
        
        # Only start idle timer if we have slideshow images and on start screen
        if self.slideshow_images and self.state == KioskState.CAMERA_OFF:
            self.idle_timer_id = self.root.after(self.IDLE_TIMEOUT, self._start_slideshow)
    
    def _reset_idle_timer(self, event=None):
        """Reset idle timer on any user interaction"""
        # If slideshow is active, dismiss it
        if self.slideshow_active:
            self._stop_slideshow()
            return
        
        # Reset the idle timer
        self._start_idle_timer()
    
    def _start_slideshow(self):
        """Start the fullscreen slideshow overlay"""
        if not self.slideshow_images or self.slideshow_active:
            return
        
        # Only show slideshow on start screen (camera off)
        if self.state != KioskState.CAMERA_OFF:
            return
        
        print("Starting slideshow screensaver...")
        
        # CRITICAL: Stop camera to prevent phantom scans during idle slideshow
        if self.camera and self.camera.isOpened():
            print("Stopping camera for slideshow (prevents phantom scans)")
            self.is_running = False
            self.camera.release()
            self.camera = None
        
        # Reset any pending QR state
        self.pending_qr_data = None
        self.pending_qr_count = 0
        
        self.slideshow_active = True
        self.slideshow_current_index = 0
        
        # Create fullscreen overlay
        self.slideshow_overlay = tk.Frame(self.root, bg="#000000")
        self.slideshow_overlay.place(x=0, y=0, relwidth=1, relheight=1)
        
        # Create label to display images
        self.slideshow_label = tk.Label(
            self.slideshow_overlay,
            bg="#000000",
            cursor="hand2"
        )
        self.slideshow_label.pack(fill=tk.BOTH, expand=True)
        
        # Small hint text at bottom
        self.slideshow_hint = tk.Label(
            self.slideshow_overlay,
            text="Tap anywhere to start",
            font=("SF Pro Text", 14),
            bg="#000000",
            fg="#666666"
        )
        self.slideshow_hint.place(relx=0.5, rely=0.95, anchor=tk.CENTER)
        
        # Bind click/tap to dismiss
        self.slideshow_overlay.bind('<Button-1>', self._stop_slideshow)
        self.slideshow_label.bind('<Button-1>', self._stop_slideshow)
        
        # Show first image
        self._show_slideshow_image()
        
        # Start cycling
        self._cycle_slideshow()
    
    def _show_slideshow_image(self):
        """Display current slideshow image scaled to fullscreen"""
        if not self.slideshow_images or not self.slideshow_active:
            return
        
        try:
            # Get current image
            img = self.slideshow_images[self.slideshow_current_index]
            
            # Scale to fit screen while maintaining aspect ratio
            screen_w = self.screen_width
            screen_h = self.screen_height
            
            img_w, img_h = img.size
            
            # Calculate scale to fit
            scale_w = screen_w / img_w
            scale_h = screen_h / img_h
            scale = min(scale_w, scale_h)
            
            new_w = int(img_w * scale)
            new_h = int(img_h * scale)
            
            # Resize image
            resized = img.resize((new_w, new_h), Image.LANCZOS)
            
            # Convert to PhotoImage
            photo = ImageTk.PhotoImage(resized)
            
            # Keep reference to prevent garbage collection
            self.slideshow_photos = [photo]
            
            # Display
            self.slideshow_label.config(image=photo)
            
        except Exception as e:
            print(f"Slideshow display error: {e}")
    
    def _cycle_slideshow(self):
        """Cycle to next slideshow image"""
        if not self.slideshow_active:
            return
        
        # Move to next image
        self.slideshow_current_index = (self.slideshow_current_index + 1) % len(self.slideshow_images)
        self._show_slideshow_image()
        
        # Schedule next cycle
        self.slideshow_timer_id = self.root.after(self.SLIDESHOW_INTERVAL, self._cycle_slideshow)
    
    def _stop_slideshow(self, event=None):
        """Stop slideshow and return to main menu (camera stays off until user taps scan)"""
        if not self.slideshow_active:
            return
        
        print("Stopping slideshow - returning to main menu (camera OFF)")
        self.slideshow_active = False
        
        # Cancel cycling timer
        if self.slideshow_timer_id:
            self.root.after_cancel(self.slideshow_timer_id)
            self.slideshow_timer_id = None
        
        # Destroy overlay
        if self.slideshow_overlay:
            self.slideshow_overlay.destroy()
            self.slideshow_overlay = None
        
        # Clear photo references
        self.slideshow_photos = []
        
        # Show start screen (camera stays off - user must tap to start scanning)
        # This prevents phantom scans when nobody is actively using the kiosk
        self._show_start_screen()
        
        # Restart idle timer
        self._start_idle_timer()
    
    def on_closing(self):
        """Handle application closing"""
        self.is_running = False
        self.tts.stop()
        
        # Stop heartbeat service
        if hasattr(self, 'health_service') and self.health_service:
            self.health_service.stop()
        
        # Cancel any pending timers
        if self.display_timer:
            self.root.after_cancel(self.display_timer)
        if self.loading_animation_id:
            self.root.after_cancel(self.loading_animation_id)
        if self.exit_timer:
            self.root.after_cancel(self.exit_timer)
        if self.slideshow_timer_id:
            self.root.after_cancel(self.slideshow_timer_id)
        if self.idle_timer_id:
            self.root.after_cancel(self.idle_timer_id)
        
        # Cleanup GPIO
        self.gpio_led.cleanup()
        
        # Release camera resources
        if self.camera:
            self.camera.release()
        
        # Clear image references
        self.camera_photo = None
        self.pdf_photos = []
        self.last_photo = None
        self.slideshow_photos = []
        
        self.root.destroy()


def main():
    """Main entry point"""
    root = tk.Tk()
    
    # Hide cursor for kiosk mode (unless DEBUG_MODE is enabled)
    if not DEBUG_MODE:
        root.config(cursor="none")
    else:
        print("DEBUG MODE: Mouse cursor visible, keyboard input enabled")
    
    app = KioskApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()