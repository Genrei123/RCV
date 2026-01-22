#!/usr/bin/env python3
"""
RCV Kiosk Machine - QR Code & Product Scanner
Automated kiosk for certificate verification and product authenticity checking
No user interaction required - fully automated scanning flow
Integrated with RCV API for real-time verification
"""

import cv2
import numpy as np
from pyzbar import pyzbar
import pytesseract
from datetime import datetime
import tkinter as tk
from tkinter import font as tkfont
from PIL import Image, ImageTk, ImageDraw, ImageFont
import threading
import json
import os
import platform
import time
import re
import requests
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import base64
from urllib.parse import urljoin
import math

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

# Fallback to gTTS (Google, supports Tagalog but sounds robotic)
if not TTS_AVAILABLE:
    try:
        from gtts import gTTS
        import subprocess
        TTS_AVAILABLE = True
        TTS_ENGINE = "gtts"
    except ImportError:
        print("TTS not available. Install edge-tts for best Filipino voice: pip install edge-tts")

# Configure Tesseract path for Windows
if platform.system() == 'Windows':
    possible_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    ]
    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break

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
        POST /api/v1/scan/scanProduct
        """
        data = {'blockOfText': ocr_text}
        if front_image_url:
            data['frontImageUrl'] = front_image_url
        if back_image_url:
            data['backImageUrl'] = back_image_url
        
        return self._make_request('POST', '/scan/scanProduct', data)
    
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
# TTS Service for Tagalog Voice Output - Using Microsoft Neural Voices
# ============================================================================
class TTSService:
    # Microsoft Edge TTS Filipino voices (neural, natural-sounding)
    FILIPINO_VOICE = "fil-PH-BlessicaNeural"  # Female Filipino voice
    FILIPINO_VOICE_MALE = "fil-PH-AngeloNeural"  # Male Filipino voice
    ENGLISH_VOICE = "en-US-JennyNeural"  # Fallback English voice
    
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
    
    def speak(self, text: str, lang: str = "fil"):
        """Speak text using Microsoft neural voice (edge-tts) for natural Filipino"""
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
                # Use Microsoft Edge neural TTS (best quality for Filipino)
                self._speak_edge_tts(text, lang)
            elif TTS_ENGINE == "pyttsx3" and self.engine:
                # pyttsx3 (offline, English only)
                self.engine.say(text)
                self.engine.runAndWait()
            elif TTS_ENGINE == "gtts":
                # gTTS (Google, supports Tagalog but sounds robotic)
                temp_file = os.path.join(self.temp_dir, "tts_output.mp3")
                tts = gTTS(text=text, lang="tl", slow=False)
                tts.save(temp_file)
                self._play_audio(temp_file)
                    
        except Exception as e:
            print(f"TTS playback error: {e}")
        finally:
            self.is_speaking = False
    
    def _speak_edge_tts(self, text: str, lang: str):
        """Use Microsoft Edge neural TTS for natural-sounding Filipino"""
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
# Tagalog Messages
# ============================================================================
class TagalogMessages:
    WELCOME = "Magandang araw! Handa na ang kiosk para sa pag-scan."
    SCAN_DETECTED = "May na-detect na scan. Pinoproseso..."
    
    @staticmethod
    def certificate_valid(product_name: str, company: str) -> str:
        return f"Ang sertipiko para sa {product_name} mula sa {company} ay balido at tunay."
    
    @staticmethod
    def certificate_expired(product_name: str) -> str:
        return f"Babala! Ang sertipiko para sa {product_name} ay expired na."
    
    @staticmethod
    def certificate_invalid() -> str:
        return "Babala! Hindi kilala ang sertipiko na ito. Maaaring peke."
    
    @staticmethod
    def product_authentic(product_name: str, brand: str) -> str:
        return f"Ang {product_name} mula sa {brand} ay tunay at may kalidad."
    
    @staticmethod
    def product_suspicious(product_name: str) -> str:
        return f"Babala! Ang {product_name} ay maaaring peke. Mag-ingat sa pagbili."
    
    READY_FOR_NEXT = "Handa na ulit para sa susunod na scan."
    ERROR_OCCURRED = "May nangyaring error. Subukan muli."

# ============================================================================
# Main Kiosk Application
# ============================================================================
class KioskApp:
    # Display duration in seconds
    RESULT_DISPLAY_DURATION = 30   # 30 seconds for results (2-page PDF)
    ERROR_DISPLAY_DURATION = 10    # 10 seconds for errors
    SCAN_COOLDOWN = 2              # Seconds between scans
    
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
        self.loading_animation_id = None
        self.loading_angle = 0
        self.is_error_timer = False
        
        # Touch-to-pause timer
        self.timer_paused = False
        self.remaining_time = 0
        
        # OCR Capture state (2-photo flow)
        self.ocr_step = OCRCaptureStep.READY_FRONT
        self.ocr_front_image = None  # PIL Image
        self.ocr_back_image = None   # PIL Image
        self.ocr_front_frame = None  # Raw OpenCV frame
        self.ocr_back_frame = None   # Raw OpenCV frame
        self.current_frame = None    # Current camera frame for capture
        
        # Services
        self.tts = TTSService()
        self.api = RCVApiService()  # RCV API Service
        
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
        
        # ============ ERROR SCREEN ============
        self.error_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # ============ MAINTENANCE SCREEN (Server offline) ============
        self.maintenance_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        
        # Setup each screen
        self._setup_start_screen()
        self._setup_scan_screen()
        self._setup_ocr_capture_screen()
        self._setup_loading_screen()
        self._setup_result_screen()
        self._setup_compliance_screen()
        self._setup_error_screen()
        self._setup_maintenance_screen()
        
        # Start with start screen (camera off)
        self._show_start_screen()
    
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
            text="START\nCAMERA",
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
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=14,
            pady=15,
            command=self._start_ocr_capture,
            cursor="hand2"
        )
        self.start_ocr_btn.pack(pady=8, padx=10, fill=tk.X)
        
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
            text="Maligayang Pagdating",
            font=("SF Pro Text", 14),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        ).pack(pady=(0, 20))
        
        tk.Label(
            content,
            text="Tap a button on the left\nto begin scanning",
            font=("SF Pro Text", 12),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY,
            justify=tk.CENTER
        ).pack(pady=(0, 10))
        
        tk.Label(
            content,
            text="I-tap ang button sa kaliwa\npara magsimula",
            font=("SF Pro Text", 10),
            bg=Colors.BACKGROUND,
            fg="#999999",
            justify=tk.CENTER
        ).pack()
    
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
        self.mute_button = tk.Button(
            sidebar,
            text="SOUND\nON" if not self.tts.is_muted else "SOUND\nOFF",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.PRIMARY_LIGHT,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.ACCENT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self.toggle_sound
        )
        self.mute_button.pack(pady=5, padx=8, fill=tk.X)
        
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
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE,
            activebackground="#00A895",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._start_ocr_capture
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
        # Bind long press to show exit button
        self.mute_button.bind('<Button-1>', self.start_exit_timer)
        self.mute_button.bind('<ButtonRelease-1>', self.cancel_exit_timer)
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
        
        tk.Label(
            camera_outer,
            text="Ilagay ang QR Code dito",
            font=("SF Pro Text", 10),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        ).pack(pady=(0, 10))
        
        # Camera frame with decorative border
        camera_border = tk.Frame(
            camera_outer,
            bg=Colors.PRIMARY,
            padx=3,
            pady=3
        )
        camera_border.pack()
        
        # Inner camera container - responsive size for small screens
        self.camera_container = tk.Frame(
            camera_border,
            bg=Colors.SURFACE,
            width=400,
            height=300
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
            fg=Colors.TEXT_SECONDARY,
            width=400,
            height=300
        )
        self.camera_label.pack(expand=False, fill=tk.NONE)
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
        
        # Large spinner canvas
        self.loading_canvas = tk.Canvas(
            center,
            width=200,
            height=200,
            bg=Colors.PRIMARY,
            highlightthickness=0
        )
        self.loading_canvas.pack(pady=(0, 50))
        
        # Loading text - HUGE
        tk.Label(
            center,
            text="VERIFYING",
            font=("SF Pro Display", 72, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack()
        
        tk.Label(
            center,
            text="Please Wait...",
            font=("SF Pro Display", 36),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(10, 0))
        
        tk.Label(
            center,
            text="Mangyaring maghintay...",
            font=("SF Pro Text", 28),
            bg=Colors.PRIMARY,
            fg="#CCCCCC"
        ).pack(pady=(20, 0))
        
        # Processing details
        self.loading_detail_label = tk.Label(
            center,
            text="Connecting to blockchain...",
            font=("SF Pro Text", 18),
            bg=Colors.PRIMARY,
            fg="#AAAAAA"
        )
        self.loading_detail_label.pack(pady=(50, 0))
    
    def _setup_ocr_capture_screen(self):
        """Setup OCR product scan screen with sidebar layout for small screens"""
        # Main horizontal layout - sidebar on left, content on right
        main_container = tk.Frame(self.ocr_frame, bg=Colors.BACKGROUND)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # LEFT SIDEBAR - Control buttons
        sidebar = tk.Frame(main_container, bg=Colors.ACCENT, width=140)
        sidebar.pack(side=tk.LEFT, fill=tk.Y)
        sidebar.pack_propagate(False)
        
        # Sidebar header
        tk.Label(
            sidebar,
            text="SCAN",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(10, 3))
        
        self.ocr_header_label = tk.Label(
            sidebar,
            text="LABEL",
            font=("SF Pro Text", 10),
            bg=Colors.ACCENT,
            fg="#CCCCCC"
        )
        self.ocr_header_label.pack(pady=(0, 15))
        
        # Control buttons - compact for small screens
        self.ocr_capture_btn = tk.Button(
            sidebar,
            text="CAPTURE",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE,
            activebackground=Colors.PRIMARY_LIGHT,
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._ocr_capture_photo
        )
        self.ocr_capture_btn.pack(pady=5, padx=8, fill=tk.X)
        
        self.ocr_retake_btn = tk.Button(
            sidebar,
            text="RETAKE",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.WARNING,
            fg=Colors.TEXT_WHITE,
            activebackground="#F57C00",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._ocr_retake_photo
        )
        self.ocr_retake_btn.pack(pady=5, padx=8, fill=tk.X)
        
        self.ocr_submit_btn = tk.Button(
            sidebar,
            text="SUBMIT",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.SUCCESS,
            fg=Colors.TEXT_WHITE,
            activebackground="#43A047",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._ocr_submit_scan,
            state=tk.DISABLED
        )
        self.ocr_submit_btn.pack(pady=5, padx=8, fill=tk.X)
        
        self.ocr_cancel_btn = tk.Button(
            sidebar,
            text="CANCEL",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE,
            activebackground="#D32F2F",
            activeforeground=Colors.TEXT_WHITE,
            relief=tk.FLAT,
            bd=0,
            width=12,
            pady=10,
            command=self._ocr_cancel
        )
        self.ocr_cancel_btn.pack(pady=5, padx=8, fill=tk.X)
        
        # Spacer
        tk.Frame(sidebar, bg=Colors.ACCENT).pack(fill=tk.BOTH, expand=True)
        
        # Thumbnails at bottom of sidebar
        tk.Label(
            sidebar,
            text="Photos:",
            font=("SF Pro Text", 9, "bold"),
            bg=Colors.ACCENT,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(5, 3), padx=8, anchor=tk.W)
        
        self.ocr_front_thumb = tk.Label(
            sidebar,
            text="Front: -",
            font=("SF Pro Text", 8),
            bg="#00A895",
            fg=Colors.TEXT_WHITE,
            width=14,
            height=2
        )
        self.ocr_front_thumb.pack(pady=3, padx=8)
        
        self.ocr_back_thumb = tk.Label(
            sidebar,
            text="Back: -",
            font=("SF Pro Text", 8),
            bg="#00A895",
            fg=Colors.TEXT_WHITE,
            width=14,
            height=2
        )
        self.ocr_back_thumb.pack(pady=(3, 10), padx=8)
        
        # RIGHT CONTENT AREA - Camera and instructions
        content_area = tk.Frame(main_container, bg=Colors.BACKGROUND)
        content_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Center content
        center = tk.Frame(content_area, bg=Colors.BACKGROUND)
        center.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        
        # Instructions - smaller for small screens
        self.ocr_instruction_label = tk.Label(
            center,
            text="Position FRONT of label",
            font=("SF Pro Display", 14, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY
        )
        self.ocr_instruction_label.pack(pady=(0, 3))
        
        self.ocr_instruction_sub = tk.Label(
            center,
            text="Ilagay ang HARAP ng label",
            font=("SF Pro Text", 10),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        )
        self.ocr_instruction_sub.pack(pady=(0, 10))
        
        # Camera frame for OCR - smaller for small screens
        ocr_camera_border = tk.Frame(center, bg=Colors.ACCENT, padx=3, pady=3)
        ocr_camera_border.pack()
        
        self.ocr_camera_container = tk.Frame(
            ocr_camera_border,
            bg=Colors.SURFACE,
            width=400,
            height=300
        )
        self.ocr_camera_container.pack()
        self.ocr_camera_container.pack_propagate(False)
        
        self.ocr_camera_label = tk.Label(
            self.ocr_camera_container,
            text="Camera Preview",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY
        )
        self.ocr_camera_label.pack(expand=True)
    
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
            fg=Colors.TEXT_SECONDARY
        )
        self.pdf_page1_label.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(0, 3))
        
        self.pdf_page2_label = tk.Label(
            self.pdf_pages_frame,
            text="Loading PDF Page 2...",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY
        )
        self.pdf_page2_label.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(3, 0))
        
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
            text="May nangyaring problema",
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
        """Setup the compliance report screen for OCR scan results"""
        # Header - dynamic based on compliance status
        self.compliance_header = tk.Frame(self.compliance_frame, bg=Colors.SUCCESS, height=100)
        self.compliance_header.pack(fill=tk.X)
        self.compliance_header.pack_propagate(False)
        
        self.compliance_status_label = tk.Label(
            self.compliance_header,
            text="PRODUCT COMPLIANT",
            font=("SF Pro Display", 32, "bold"),
            bg=Colors.SUCCESS,
            fg=Colors.TEXT_WHITE
        )
        self.compliance_status_label.pack(expand=True)
        
        # Main content
        content = tk.Frame(self.compliance_frame, bg=Colors.BACKGROUND)
        content.pack(fill=tk.BOTH, expand=True)
        
        # Product info section
        self.compliance_product_frame = tk.Frame(content, bg=Colors.SURFACE, padx=20, pady=15)
        self.compliance_product_frame.pack(fill=tk.X, padx=20, pady=10)
        
        self.compliance_product_name = tk.Label(
            self.compliance_product_frame,
            text="Product Name",
            font=("SF Pro Display", 24, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        )
        self.compliance_product_name.pack(anchor=tk.W)
        
        self.compliance_brand = tk.Label(
            self.compliance_product_frame,
            text="Brand / Manufacturer",
            font=("SF Pro Text", 18),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY
        )
        self.compliance_brand.pack(anchor=tk.W)
        
        # Compliance checklist section
        compliance_title = tk.Label(
            content,
            text="PACKAGING COMPLIANCE",
            font=("SF Pro Display", 20, "bold"),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_PRIMARY
        )
        compliance_title.pack(pady=(20, 10))
        
        self.compliance_checklist_frame = tk.Frame(content, bg=Colors.SURFACE, padx=20, pady=15)
        self.compliance_checklist_frame.pack(fill=tk.X, padx=20)
        
        # CFPR check
        self.cfpr_check_label = tk.Label(
            self.compliance_checklist_frame,
            text="CFPR Number: Checking...",
            font=("SF Pro Text", 18),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        )
        self.cfpr_check_label.pack(anchor=tk.W, pady=5)
        
        # LTO check
        self.lto_check_label = tk.Label(
            self.compliance_checklist_frame,
            text="LTO Number: Checking...",
            font=("SF Pro Text", 18),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        )
        self.lto_check_label.pack(anchor=tk.W, pady=5)
        
        # Expiry check
        self.expiry_check_label = tk.Label(
            self.compliance_checklist_frame,
            text="Expiration Date: Checking...",
            font=("SF Pro Text", 18),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        )
        self.expiry_check_label.pack(anchor=tk.W, pady=5)
        
        # Warnings/Violations section
        self.compliance_warnings_frame = tk.Frame(content, bg=Colors.WARNING_LIGHT, padx=20, pady=15)
        # Don't pack yet - only shown if there are warnings
        
        self.compliance_warnings_label = tk.Label(
            self.compliance_warnings_frame,
            text="",
            font=("SF Pro Text", 14),
            bg=Colors.WARNING_LIGHT,
            fg=Colors.WARNING,
            justify=tk.LEFT
        )
        self.compliance_warnings_label.pack(anchor=tk.W)
        
        # Photo thumbnails
        photos_frame = tk.Frame(content, bg=Colors.BACKGROUND)
        photos_frame.pack(pady=20)
        
        tk.Label(
            photos_frame,
            text="Captured Images:",
            font=("SF Pro Text", 14),
            bg=Colors.BACKGROUND,
            fg=Colors.TEXT_SECONDARY
        ).pack()
        
        self.compliance_photos_frame = tk.Frame(photos_frame, bg=Colors.BACKGROUND)
        self.compliance_photos_frame.pack(pady=10)
        
        self.compliance_front_thumb = tk.Label(
            self.compliance_photos_frame,
            text="Front",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            width=20,
            height=8
        )
        self.compliance_front_thumb.pack(side=tk.LEFT, padx=10)
        
        self.compliance_back_thumb = tk.Label(
            self.compliance_photos_frame,
            text="Back",
            font=("SF Pro Text", 12),
            bg=Colors.SURFACE,
            width=20,
            height=8
        )
        self.compliance_back_thumb.pack(side=tk.LEFT, padx=10)
        
        # Footer with timer
        self.compliance_footer = tk.Frame(self.compliance_frame, bg=Colors.PRIMARY, height=100)
        self.compliance_footer.pack(fill=tk.X, side=tk.BOTTOM)
        self.compliance_footer.pack_propagate(False)
        
        self.compliance_timer_label = tk.Label(
            self.compliance_footer,
            text="Returning to scanner in 30s",
            font=("SF Pro Text", 20),
            bg=Colors.PRIMARY,
            fg=Colors.TEXT_WHITE
        )
        self.compliance_timer_label.pack(pady=(10, 0))
        
        tk.Label(
            self.compliance_footer,
            text="Touch and hold to pause",
            font=("SF Pro Text", 12),
            bg=Colors.PRIMARY,
            fg="#CCCCCC"
        ).pack(pady=(5, 10))
        
        # Bind touch-to-pause
        self.compliance_frame.bind('<Button-1>', self._pause_timer)
        self.compliance_frame.bind('<ButtonRelease-1>', self._resume_timer)
    
    def _setup_maintenance_screen(self):
        """Setup the maintenance/offline mode screen - FULL SCREEN LOCKOUT"""
        # FULL SCREEN RED BACKGROUND for maximum visibility
        self.maintenance_frame.config(bg=Colors.ERROR)
        
        # Entire screen is one big warning
        center = tk.Frame(self.maintenance_frame, bg=Colors.ERROR)
        center.pack(fill=tk.BOTH, expand=True)
        
        content = tk.Frame(center, bg=Colors.ERROR)
        content.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        
        # Warning text instead of emoji for small screens
        tk.Label(
            content,
            text="!",
            font=("SF Pro Display", 80, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(0, 20))
        
        # MASSIVE "OFFLINE" text
        tk.Label(
            content,
            text="OFFLINE",
            font=("SF Pro Display", 120, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(0, 20))
        
        # Tagalog translation - still large
        tk.Label(
            content,
            text="WALANG KONEKSYON",
            font=("SF Pro Display", 48, "bold"),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        ).pack(pady=(0, 40))
        
        # Sub-message
        self.maintenance_message = tk.Label(
            content,
            text="Cannot connect to server",
            font=("SF Pro Text", 32),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_message.pack(pady=(0, 10))
        
        tk.Label(
            content,
            text="Hindi maka-connect sa server",
            font=("SF Pro Text", 24),
            bg=Colors.ERROR,
            fg="#FFCCCC"
        ).pack(pady=(0, 50))
        
        # Status indicator box
        status_frame = tk.Frame(content, bg="#D32F2F", padx=40, pady=25)
        status_frame.pack()
        
        self.maintenance_status_icon = tk.Label(
            status_frame,
            text="...",
            font=("SF Pro Text", 28, "bold"),
            bg="#D32F2F",
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_status_icon.pack(side=tk.LEFT, padx=(0, 20))
        
        self.maintenance_status_label = tk.Label(
            status_frame,
            text="Checking connection...",
            font=("SF Pro Text", 24, "bold"),
            bg="#D32F2F",
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_status_label.pack(side=tk.LEFT)
        
        # Retry countdown - prominent
        self.maintenance_retry_label = tk.Label(
            content,
            text="Next check in 10 seconds",
            font=("SF Pro Text", 22),
            bg=Colors.ERROR,
            fg=Colors.TEXT_WHITE
        )
        self.maintenance_retry_label.pack(pady=(40, 0))
        
        # Bottom message
        tk.Label(
            content,
            text="Kiosk will resume automatically when connection is restored",
            font=("SF Pro Text", 18),
            bg=Colors.ERROR,
            fg="#FFCCCC"
        ).pack(pady=(20, 0))
        
        tk.Label(
            content,
            text="Awtomatikong magpapatuloy ang kiosk kapag naibalik ang koneksyon",
            font=("SF Pro Text", 16),
            bg=Colors.ERROR,
            fg="#FF9999"
        ).pack(pady=(5, 0))
    
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
                      self.compliance_frame, self.error_frame, 
                      self.maintenance_frame]:
            frame.pack_forget()
    
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
    
    def _show_result_screen(self):
        """Show result screen"""
        self._hide_all_screens()
        self.result_frame.pack(fill=tk.BOTH, expand=True)
    
    def _show_compliance_screen(self):
        """Show compliance report screen"""
        self._hide_all_screens()
        self.compliance_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.DISPLAY_COMPLIANCE
    
    def _show_error_screen(self, message: str, detail: str = "May nangyaring problema"):
        """Show error screen"""
        self._hide_all_screens()
        self.error_message_label.config(text=message)
        self.error_detail_label.config(text=detail)
        self.error_frame.pack(fill=tk.BOTH, expand=True)
        self.state = KioskState.ERROR
        self.start_display_timer(self.ERROR_DISPLAY_DURATION, is_error=True)
        self.tts.speak(TagalogMessages.ERROR_OCCURRED)
    
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
                        details.append(("Expiration", f"{exp_date} {'⚠ EXPIRED' if is_expired else '✓'}"))
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
                        details.append(("LTO Expiry", f"{exp_date} {'⚠ EXPIRED' if is_expired else '✓'}"))
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
                self.tts.speak(TagalogMessages.certificate_valid(cert.product_name, cert.company_name))
            elif is_pending:
                self.tts.speak("Nakita ang PDF certificate. Hindi pa na-verify sa blockchain.")
            else:
                self.tts.speak(TagalogMessages.certificate_invalid())
        
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
                self.tts.speak(TagalogMessages.product_authentic(product.product_name, product.brand))
            else:
                self.tts.speak(TagalogMessages.product_suspicious(product.product_name))
    
    def setup_certificate_panel(self, cert: CertificateData):
        """Display certificate information on the MASSIVE result screen"""
        # Update header color based on status
        is_valid = cert.status == "valid"
        is_pending = cert.status == "pending"
        
        if is_valid:
            header_color = Colors.SUCCESS
            status_text = "VERIFIED / TUNAY"
        elif is_pending:
            header_color = Colors.WARNING
            status_text = "PDF FOUND / NAKITA ANG PDF"
        else:
            header_color = Colors.ERROR
            status_text = "NOT FOUND / HINDI NAHANAP"
        
        self.result_header.config(bg=header_color)
        self.result_status_label.config(bg=header_color, text=status_text)
        
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
            status_text = "NOT FOUND / HINDI NAHANAP"
        elif is_authentic:
            header_color = Colors.SUCCESS
            status_text = "REGISTERED / REHISTRADO"
        else:
            header_color = Colors.WARNING
            status_text = "SUSPICIOUS / KAHINA-HINALA"
        
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
        self._show_error_screen(message, "May nangyaring problema. Subukan muli.")
    
    def initialize_kiosk(self):
        """Initialize kiosk - check API, show start screen (camera off)"""
        # Check API connection in background
        thread = threading.Thread(target=self._check_api_connection, daemon=True)
        thread.start()
        
        # Show start screen (camera stays off until user taps)
        self._show_start_screen()
        self.tts.speak(TagalogMessages.WELCOME)
        
        # Start background connectivity monitoring (after initial delay)
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
            print(f"✓ Connected to RCV API: {self.api.base_url}")
            
            # Update start screen status indicator
            self.root.after(0, lambda: self._update_connection_status(True))
            
            # If we were in maintenance mode, recover
            if self.state == KioskState.MAINTENANCE:
                self.root.after(0, self._recover_from_maintenance)
        else:
            self.is_online = False
            self.consecutive_failures += 1
            print(f"⚠ RCV API not accessible: {self.api.base_url} (failure #{self.consecutive_failures})")
            
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
                # Enable buttons when online
                self.start_camera_btn.config(state=tk.NORMAL)
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
    
    def _recover_from_maintenance(self):
        """Recover from maintenance mode when server comes back online"""
        print("✓ Server connection restored - recovering from maintenance mode")
        
        # Cancel any pending polls
        if self.connectivity_poll_id:
            self.root.after_cancel(self.connectivity_poll_id)
            self.connectivity_poll_id = None
        
        # Return to start screen
        self._show_start_screen()
        self.tts.speak("Koneksyon sa server ay naibalik. Handa na ulit ang kiosk.")
        
        # Start background monitoring (longer interval)
        self.connectivity_poll_id = self.root.after(
            self.CONNECTIVITY_POLL_INTERVAL_ONLINE,
            self._poll_connectivity
        )
    
    def start_camera(self):
        """Initialize and start the camera automatically"""
        if self.camera and self.camera.isOpened():
            return  # Camera already running
        
        try:
            # Try different camera indices
            camera_indices = [0, 1, 2, -1]
            
            for idx in camera_indices:
                self.camera = cv2.VideoCapture(idx)
                if self.camera.isOpened():
                    break
                self.camera.release()
            
            if not self.camera or not self.camera.isOpened():
                raise Exception("No camera found. Please connect a camera.")
            
            # Set camera resolution (lower resolution for better performance)
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            # Set camera buffer size to 1 to reduce latency
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            self.is_running = True
            
            # Start video thread
            self.video_thread = threading.Thread(target=self.video_loop, daemon=True)
            self.video_thread.start()
            
        except Exception as e:
            self.state = KioskState.ERROR
            self._show_error_screen(
                f"Camera Error: {str(e)}",
                "Hindi mahanap ang camera. Mangyaring ikonekta ang camera."
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
        self._show_scan_screen()
        self.start_camera()
        self.tts.speak("Camera started. Ready to scan.")
    
    def _start_ocr_capture(self):
        """Start OCR product label capture flow"""
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
        
        while self.is_running and self.camera:
            loop_start = time.time()
            
            ret, frame = self.camera.read()
            if not ret:
                continue
            
            # Store current frame for OCR capture
            self.current_frame = frame.copy()
            
            # Only process QR detection if in scanning state
            if self.state == KioskState.IDLE:
                # Try to detect QR code
                display_frame, qr_data = self.process_qr_frame(frame)
                
                if qr_data and self.can_process_scan(qr_data):
                    self.handle_qr_detection(qr_data)
                
                # Display frame in scan mode
                self.display_frame(display_frame)
            
            # Display frame in OCR capture mode (when ready to capture)
            elif self.state == KioskState.OCR_CAPTURE:
                if self.ocr_step in [OCRCaptureStep.READY_FRONT, OCRCaptureStep.READY_BACK]:
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
        """Check if enough time has passed since last scan"""
        current_time = time.time()
        if data == self.last_scan_data and (current_time - self.last_scan_time) < self.SCAN_COOLDOWN:
            return False
        return True
    
    def handle_qr_detection(self, qr_data: str):
        """Handle detected QR code"""
        self.last_scan_time = time.time()
        self.last_scan_data = qr_data
        
        self.state = KioskState.PROCESSING
        self._show_loading_screen("Analyzing QR code...")
        self.tts.speak(TagalogMessages.SCAN_DETECTED)
        
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
        self._show_error_screen(f"Processing Error: {message}", "May problema sa pagproseso. Subukan muli.")
    
    def _handle_unknown_qr(self, data: str):
        """Handle unrecognized QR code"""
        self.state = KioskState.ERROR
        self._show_error_screen(
            "Unrecognized QR Code",
            f"Hindi kilalang QR code format.\n\nData: {data[:80]}..."
        )
    
    def _show_certificate(self, cert: CertificateData):
        """Display certificate information"""
        self.state = KioskState.DISPLAY_CERTIFICATE
        self.setup_certificate_panel(cert)
        self.log_scan("certificate", cert.__dict__)
        
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
        
        if self.state == KioskState.DISPLAY_COMPLIANCE:
            self.compliance_timer_label.config(text=pause_text)
        elif not self.is_error_timer:
            self.result_timer_label.config(text=pause_text)
    
    def _resume_timer(self, event=None):
        """Resume the countdown timer when user releases touch"""
        self.timer_paused = False
    
    def reset_to_idle(self):
        """Reset kiosk to idle/scan state"""
        if self.display_timer:
            self.root.after_cancel(self.display_timer)
        
        # Clear PDF cache
        self.pdf_photos = []
        self.last_scan_data = ""  # Reset last scan to allow re-scanning same QR
        
        # Return to scan screen
        self._show_scan_screen()
        
        # Restart camera if needed
        if not self.camera or not self.camera.isOpened():
            self.start_camera()
        
        self.tts.speak(TagalogMessages.READY_FOR_NEXT)
    
    # ============ OCR Capture Methods ============
    
    def _reset_ocr_capture(self):
        """Reset OCR capture state for a new scan"""
        self.ocr_step = OCRCaptureStep.READY_FRONT
        self.ocr_front_image = None
        self.ocr_back_image = None
        self.ocr_front_frame = None
        self.ocr_back_frame = None
        
        # Reset thumbnails
        self.ocr_front_thumb.config(text="Not captured", image="")
        self.ocr_back_thumb.config(text="Not captured", image="")
        
        # Enable capture button, disable submit
        self.ocr_capture_btn.config(state=tk.NORMAL)
        self.ocr_submit_btn.config(state=tk.DISABLED)
    
    def _update_ocr_ui(self):
        """Update OCR capture screen UI based on current step"""
        if self.ocr_step == OCRCaptureStep.READY_FRONT:
            self.ocr_instruction_label.config(text="Position FRONT of label")
            self.ocr_instruction_sub.config(text="Ilagay ang HARAP ng label")
            self.ocr_capture_btn.config(text="CAPTURE", state=tk.NORMAL)
            self.ocr_retake_btn.config(state=tk.DISABLED)
        
        elif self.ocr_step == OCRCaptureStep.PREVIEW_FRONT:
            self.ocr_instruction_label.config(text="Front captured! Ready for BACK")
            self.ocr_instruction_sub.config(text="Handa na para sa LIKOD")
            self.ocr_capture_btn.config(text="CAPTURE", state=tk.NORMAL)
            self.ocr_retake_btn.config(state=tk.NORMAL)
        
        elif self.ocr_step == OCRCaptureStep.READY_BACK:
            self.ocr_instruction_label.config(text="Position BACK of label")
            self.ocr_instruction_sub.config(text="Ilagay ang LIKOD ng label")
            self.ocr_capture_btn.config(text="CAPTURE", state=tk.NORMAL)
            self.ocr_retake_btn.config(state=tk.NORMAL)
        
        elif self.ocr_step == OCRCaptureStep.PREVIEW_BACK:
            self.ocr_instruction_label.config(text="Both sides captured! Ready")
            self.ocr_instruction_sub.config(text="Nakuha ang dalawang panig!")
            self.ocr_capture_btn.config(state=tk.DISABLED)
            self.ocr_retake_btn.config(state=tk.NORMAL)
            self.ocr_submit_btn.config(state=tk.NORMAL)
    
    def _display_ocr_frame(self, frame):
        """Display frame in OCR capture camera preview"""
        try:
            # Resize and convert
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_resized = cv2.resize(frame_rgb, (400, 300))
            
            pil_image = Image.fromarray(frame_resized)
            photo = ImageTk.PhotoImage(pil_image)
            
            self.ocr_camera_label.config(image=photo, text="")
            self.ocr_camera_label.image = photo
        except Exception as e:
            pass
    
    def _ocr_capture_photo(self):
        """Capture current frame as photo"""
        if self.current_frame is None:
            return
        
        # Capture the current frame
        frame_copy = self.current_frame.copy()
        
        if self.ocr_step == OCRCaptureStep.READY_FRONT:
            self.ocr_front_frame = frame_copy
            
            # Create thumbnail
            thumb = self._create_thumbnail(frame_copy, 150, 100)
            self.ocr_front_thumb.config(image=thumb, text="")
            self.ocr_front_thumb.image = thumb
            
            # Move to ready for back
            self.ocr_step = OCRCaptureStep.PREVIEW_FRONT
            self._update_ocr_ui()
            self.tts.speak("Front captured. Now position the back.")
        
        elif self.ocr_step in [OCRCaptureStep.PREVIEW_FRONT, OCRCaptureStep.READY_BACK]:
            self.ocr_back_frame = frame_copy
            
            # Create thumbnail
            thumb = self._create_thumbnail(frame_copy, 150, 100)
            self.ocr_back_thumb.config(image=thumb, text="")
            self.ocr_back_thumb.image = thumb
            
            # Ready to submit
            self.ocr_step = OCRCaptureStep.PREVIEW_BACK
            self._update_ocr_ui()
            self.tts.speak("Back captured. Tap Submit to analyze.")
    
    def _create_thumbnail(self, frame, width, height):
        """Create a thumbnail from a frame"""
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        pil_image.thumbnail((width, height))
        return ImageTk.PhotoImage(pil_image)
    
    def _ocr_retake_photo(self):
        """Retake the last captured photo"""
        if self.ocr_step == OCRCaptureStep.PREVIEW_FRONT:
            # Retake front
            self.ocr_front_frame = None
            self.ocr_front_thumb.config(text="Not captured", image="")
            self.ocr_step = OCRCaptureStep.READY_FRONT
        elif self.ocr_step in [OCRCaptureStep.READY_BACK, OCRCaptureStep.PREVIEW_BACK]:
            # Retake back
            self.ocr_back_frame = None
            self.ocr_back_thumb.config(text="Not captured", image="")
            self.ocr_step = OCRCaptureStep.READY_BACK
        
        self._update_ocr_ui()
    
    def _ocr_cancel(self):
        """Cancel OCR capture and return to start screen"""
        self._reset_ocr_capture()
        self._show_start_screen()
    
    def _ocr_submit_scan(self):
        """Submit captured photos for OCR processing"""
        if self.ocr_front_frame is None or self.ocr_back_frame is None:
            return
        
        # Show loading screen
        self._show_loading_screen("Processing product label...\nPinoproseso ang label ng produkto...")
        
        # Process in background
        thread = threading.Thread(target=self._process_ocr_scan, daemon=True)
        thread.start()
    
    def _process_ocr_scan(self):
        """Process OCR scan - extract text and send to API"""
        try:
            # Extract text from both images using Tesseract
            self.root.after(0, lambda: self.loading_detail_label.config(text="Reading front label..."))
            
            front_rgb = cv2.cvtColor(self.ocr_front_frame, cv2.COLOR_BGR2RGB)
            front_pil = Image.fromarray(front_rgb)
            front_text = pytesseract.image_to_string(front_pil)
            
            self.root.after(0, lambda: self.loading_detail_label.config(text="Reading back label..."))
            
            back_rgb = cv2.cvtColor(self.ocr_back_frame, cv2.COLOR_BGR2RGB)
            back_pil = Image.fromarray(back_rgb)
            back_text = pytesseract.image_to_string(back_pil)
            
            # Combine text
            combined_text = f"{front_text}\n\n{back_text}"
            print(f"OCR Text extracted ({len(combined_text)} chars)")
            
            self.root.after(0, lambda: self.loading_detail_label.config(text="Searching for product..."))
            
            # Send to API - calling /scan/scanProduct endpoint
            print(f"📡 Calling /scan/scanProduct API...")
            response = self.api.scan_product_ocr(combined_text)
            print(f"📨 API Response: found={response.get('found')}, isCompliant={response.get('isCompliant')}")
            
            if response.get("success"):
                print(f"✅ Displaying compliance result to user")
                self.root.after(0, lambda: self._display_compliance_result(response))
            else:
                print(f"❌ Scan failed: {response.get('message')}")
                self.root.after(0, lambda: self._show_error_screen(
                    "Scan failed",
                    response.get("message", "Could not process the product label")
                ))
                
        except Exception as e:
            print(f"OCR processing error: {e}")
            self.root.after(0, lambda: self._show_error_screen(
                f"Processing Error: {str(e)}",
                "May problema sa pagproseso ng label"
            ))
    
    def _display_compliance_result(self, response: dict):
        """Display compliance scan result"""
        is_compliant = response.get("isCompliant", False)
        found = response.get("found", False)
        
        # Update header based on result
        if not found:
            self.compliance_header.config(bg=Colors.ERROR)
            self.compliance_status_label.config(
                bg=Colors.ERROR,
                text="PRODUCT NOT FOUND"
            )
        elif is_compliant:
            self.compliance_header.config(bg=Colors.SUCCESS)
            self.compliance_status_label.config(
                bg=Colors.SUCCESS,
                text="PRODUCT COMPLIANT"
            )
        else:
            self.compliance_header.config(bg=Colors.WARNING)
            self.compliance_status_label.config(
                bg=Colors.WARNING,
                text="PACKAGING VIOLATIONS"
            )
        
        # Product info
        product_info = response.get("productInfo", {})
        self.compliance_product_name.config(
            text=product_info.get("productName", "Unknown Product")
        )
        self.compliance_brand.config(
            text=f"{product_info.get('brandName', '')} / {product_info.get('manufacturer', '')}"
        )
        
        # Compliance checklist
        compliance = response.get("packagingCompliance", {})
        
        cfpr = compliance.get("cfpr", {})
        cfpr_status = cfpr.get("status", "N/A")
        cfpr_icon = "✓" if cfpr_status == "COMPLIANT" else ("✗" if cfpr_status == "VIOLATION" else "?")
        cfpr_color = Colors.SUCCESS if cfpr_status == "COMPLIANT" else (Colors.ERROR if cfpr_status == "VIOLATION" else Colors.TEXT_SECONDARY)
        self.cfpr_check_label.config(
            text=f"{cfpr_icon} CFPR: {cfpr.get('required', 'N/A')} - {cfpr_status}",
            fg=cfpr_color
        )
        
        lto = compliance.get("lto", {})
        lto_status = lto.get("status", "N/A")
        lto_icon = "✓" if lto_status == "COMPLIANT" else ("✗" if lto_status == "VIOLATION" else "?")
        lto_color = Colors.SUCCESS if lto_status == "COMPLIANT" else (Colors.ERROR if lto_status == "VIOLATION" else Colors.TEXT_SECONDARY)
        self.lto_check_label.config(
            text=f"{lto_icon} LTO: {lto.get('required', 'N/A')} - {lto_status}",
            fg=lto_color
        )
        
        expiry = compliance.get("expirationDate", {})
        expiry_status = expiry.get("status", "N/A")
        expiry_icon = "✓" if expiry_status == "COMPLIANT" else "✗"
        expiry_color = Colors.SUCCESS if expiry_status == "COMPLIANT" else Colors.ERROR
        self.expiry_check_label.config(
            text=f"{expiry_icon} Expiry: {expiry.get('foundOnPackaging', 'Not found')} - {expiry_status}",
            fg=expiry_color
        )
        
        # Warnings/Violations
        violations = response.get("violations", [])
        warnings = response.get("warnings", [])
        
        if violations or warnings:
            all_warnings = violations + warnings
            self.compliance_warnings_label.config(
                text="\n".join(f"• {w}" for w in all_warnings[:5])
            )
            self.compliance_warnings_frame.pack(fill=tk.X, padx=20, pady=10)
        else:
            self.compliance_warnings_frame.pack_forget()
        
        # Show thumbnails
        if self.ocr_front_frame is not None:
            thumb = self._create_thumbnail(self.ocr_front_frame, 150, 100)
            self.compliance_front_thumb.config(image=thumb, text="")
            self.compliance_front_thumb.image = thumb
        
        if self.ocr_back_frame is not None:
            thumb = self._create_thumbnail(self.ocr_back_frame, 150, 100)
            self.compliance_back_thumb.config(image=thumb, text="")
            self.compliance_back_thumb.image = thumb
        
        # Show compliance screen and start timer
        self._show_compliance_screen()
        self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
        
        # TTS
        if not found:
            self.tts.speak("Product not found in database.")
        elif is_compliant:
            self.tts.speak("Product is compliant. All required information found on packaging.")
        else:
            self.tts.speak("Warning. Packaging has violations. Please check the details.")
    
    def _fetch_and_display_pdf_pages(self, pdf_url: str):
        """Fetch PDF and display 2 pages side by side"""
        # Show loading state
        self.pdf_page1_label.config(text="Loading PDF...\nNaglo-load ng PDF...", image="")
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
                self.root.after(0, lambda: self._show_pdf_error("Failed to load PDF\nHindi ma-load ang PDF"))
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
            text="PDF Certificate Available\nNakuha ang PDF Certificate\n\n(Install pdf2image for preview)",
            image=""
        )
        self.pdf_page2_label.config(text="", image="")
        # Start timer after PDF load attempt completes
        self.start_display_timer(self.RESULT_DISPLAY_DURATION, is_error=False)
    
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
        button_text = "🔇 SOUND OFF" if self.tts.is_muted else "🔊 SOUND ON"
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
    
    def on_closing(self):
        """Handle application closing"""
        self.is_running = False
        self.tts.stop()
        
        # Cancel any pending timers
        if self.display_timer:
            self.root.after_cancel(self.display_timer)
        if self.loading_animation_id:
            self.root.after_cancel(self.loading_animation_id)
        if self.exit_timer:
            self.root.after_cancel(self.exit_timer)
        
        # Release camera resources
        if self.camera:
            self.camera.release()
        
        # Clear image references
        self.camera_photo = None
        self.pdf_photos = []
        self.last_photo = None
        
        self.root.destroy()


def main():
    """Main entry point"""
    root = tk.Tk()
    
    # Hide cursor for kiosk mode
    root.config(cursor="none")
    
    app = KioskApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()