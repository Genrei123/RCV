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

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, use system env vars

# Text-to-Speech imports
TTS_AVAILABLE = False
TTS_ENGINE = None

try:
    import pyttsx3
    TTS_AVAILABLE = True
    TTS_ENGINE = "pyttsx3"
except ImportError:
    pass

# Fallback to gTTS if pyttsx3 not available
if not TTS_AVAILABLE:
    try:
        from gtts import gTTS
        import subprocess
        TTS_AVAILABLE = True
        TTS_ENGINE = "gtts"
    except ImportError:
        print("TTS not available. Install pyttsx3 or gtts for voice output.")

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
    BACKGROUND = "#FFFFFF"       # White background
    SURFACE = "#F5F5F5"          # Light gray surface
    TEXT_PRIMARY = "#1A1A1A"     # Dark text
    TEXT_SECONDARY = "#666666"   # Gray text
    SUCCESS = "#4CAF50"          # Green for verified
    ERROR = "#F44336"            # Red for fraud/error
    WARNING = "#FF9800"          # Orange for warnings
    ACCENT = "#00BFA5"           # Teal accent

class KioskState(Enum):
    IDLE = "idle"                      # Waiting for scan
    SCANNING = "scanning"              # Actively scanning
    PROCESSING = "processing"          # Processing QR/OCR data
    DISPLAY_CERTIFICATE = "certificate" # Showing certificate info
    DISPLAY_PRODUCT = "product"        # Showing product info
    ERROR = "error"                    # Error state

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
    
    def __init__(self, base_url: str = None):
        # Default to localhost, can be configured via environment variable
        self.base_url = base_url or os.environ.get('RCV_API_URL', 'http://localhost:3000/api/v1')
        self.timeout = 30  # seconds
    
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
        """
        return self._make_request('GET', f'/certificate-blockchain/pdf/{certificate_id}')
    
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
# TTS Service for Tagalog Voice Output
# ============================================================================
class TTSService:
    def __init__(self):
        self.enabled = TTS_AVAILABLE
        self.is_muted = False
        self.temp_dir = os.path.expanduser("~/kiosk_temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        self.engine = None
        self.is_speaking = False
        
        if TTS_AVAILABLE and TTS_ENGINE == "pyttsx3":
            try:
                self.engine = pyttsx3.init()
                # Configure voice properties
                self.engine.setProperty('rate', 150)  # Speed
                self.engine.setProperty('volume', 1.0)  # Volume
            except Exception as e:
                print(f"pyttsx3 init error: {e}")
                self.enabled = False
    
    def speak(self, text: str, lang: str = "tl"):
        """Speak text - uses pyttsx3 (offline) or gTTS (online with Tagalog)"""
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
            if TTS_ENGINE == "pyttsx3" and self.engine:
                # pyttsx3 doesn't support Tagalog, so we use English
                self.engine.say(text)
                self.engine.runAndWait()
            elif TTS_ENGINE == "gtts":
                # gTTS supports Tagalog (lang="tl")
                temp_file = os.path.join(self.temp_dir, "tts_output.mp3")
                tts = gTTS(text=text, lang=lang, slow=False)
                tts.save(temp_file)
                
                # Play using Windows default player
                if platform.system() == 'Windows':
                    os.startfile(temp_file)
                else:
                    subprocess.run(['mpg123', '-q', temp_file], check=False)
                    
        except Exception as e:
            print(f"TTS playback error: {e}")
        finally:
            self.is_speaking = False
    
    def stop(self):
        """Stop current playback"""
        if TTS_ENGINE == "pyttsx3" and self.engine:
            try:
                self.engine.stop()
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
    DISPLAY_DURATION = 20
    SCAN_COOLDOWN = 2  # Seconds between scans
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("RCV Kiosk - Product Verification")
        
        # Fullscreen for kiosk mode
        self.root.attributes('-fullscreen', True)
        self.root.configure(bg=Colors.BACKGROUND)
        
        # Escape key to exit (for development)
        self.root.bind('<Escape>', lambda e: self.on_closing())
        
        # State management
        self.state = KioskState.IDLE
        self.camera = None
        self.is_running = False
        self.last_scan_time = 0
        self.last_scan_data = ""
        self.display_timer = None
        
        # Services
        self.tts = TTSService()
        self.api = RCVApiService()  # RCV API Service
        
        # Data directory
        self.data_dir = os.path.expanduser("~/kiosk_data")
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Setup UI
        self.setup_ui()
        
        # Check API connection and auto-start camera
        self.root.after(500, self.initialize_kiosk)
    
    def setup_ui(self):
        """Setup the kiosk user interface - no buttons, display only"""
        # Get screen dimensions
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        
        # Main container
        self.main_frame = tk.Frame(self.root, bg=Colors.BACKGROUND)
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header with logo/title
        self.header_frame = tk.Frame(self.main_frame, bg=Colors.PRIMARY, height=80)
        self.header_frame.pack(fill=tk.X)
        self.header_frame.pack_propagate(False)
        
        self.title_label = tk.Label(
            self.header_frame,
            text="RCV Product Verification Kiosk",
            font=("SF Pro Display", 28, "bold"),
            bg=Colors.PRIMARY,
            fg=Colors.BACKGROUND
        )
        self.title_label.pack(expand=True)
        
        # Content area (camera + info panel)
        self.content_frame = tk.Frame(self.main_frame, bg=Colors.BACKGROUND)
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=40, pady=20)
        
        # Left side - Camera feed
        self.camera_container = tk.Frame(
            self.content_frame, 
            bg=Colors.SURFACE,
            highlightbackground=Colors.PRIMARY,
            highlightthickness=3
        )
        self.camera_container.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 20))
        
        self.camera_label = tk.Label(
            self.camera_container,
            text="Initializing Camera...",
            font=("SF Pro Text", 18),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY
        )
        self.camera_label.pack(expand=True, fill=tk.BOTH)
        
        # Right side - Information panel
        self.info_panel = tk.Frame(
            self.content_frame,
            bg=Colors.SURFACE,
            width=450
        )
        self.info_panel.pack(side=tk.RIGHT, fill=tk.Y)
        self.info_panel.pack_propagate(False)
        
        # Info panel content - will be dynamically updated
        self.setup_idle_panel()
        
        # Footer with status
        self.footer_frame = tk.Frame(self.main_frame, bg=Colors.PRIMARY, height=60)
        self.footer_frame.pack(fill=tk.X, side=tk.BOTTOM)
        self.footer_frame.pack_propagate(False)
        
        self.status_label = tk.Label(
            self.footer_frame,
            text="Ready to Scan",
            font=("SF Pro Text", 16),
            bg=Colors.PRIMARY,
            fg=Colors.BACKGROUND
        )
        self.status_label.pack(expand=True)
        
        # Timer indicator
        self.timer_label = tk.Label(
            self.footer_frame,
            text="",
            font=("SF Pro Text", 14),
            bg=Colors.PRIMARY,
            fg=Colors.BACKGROUND
        )
        self.timer_label.pack(side=tk.RIGHT, padx=20)
    
    def setup_idle_panel(self):
        """Setup the idle state information panel"""
        self.clear_info_panel()
        
        # Icon placeholder
        icon_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
        icon_frame.pack(pady=(60, 30))
        
        # Create a simple scan icon using canvas
        canvas = tk.Canvas(icon_frame, width=120, height=120, bg=Colors.SURFACE, highlightthickness=0)
        canvas.pack()
        
        # Draw QR code icon
        canvas.create_rectangle(20, 20, 100, 100, outline=Colors.PRIMARY, width=4)
        canvas.create_rectangle(30, 30, 50, 50, fill=Colors.PRIMARY, outline="")
        canvas.create_rectangle(70, 30, 90, 50, fill=Colors.PRIMARY, outline="")
        canvas.create_rectangle(30, 70, 50, 90, fill=Colors.PRIMARY, outline="")
        canvas.create_rectangle(55, 55, 65, 65, fill=Colors.PRIMARY, outline="")
        
        # Instructions
        tk.Label(
            self.info_panel,
            text="Scan QR Code or Product",
            font=("SF Pro Display", 22, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        ).pack(pady=(0, 20))
        
        instructions = [
            "1. Place QR code in front of camera",
            "2. Hold steady for scanning",
            "3. View results on screen",
            "",
            "I-scan ang QR Code o Produkto",
            "Ilagay sa harap ng camera"
        ]
        
        for instruction in instructions:
            tk.Label(
                self.info_panel,
                text=instruction,
                font=("SF Pro Text", 14),
                bg=Colors.SURFACE,
                fg=Colors.TEXT_SECONDARY
            ).pack(pady=3)
        
        # Animated scanning indicator
        self.scan_indicator = tk.Label(
            self.info_panel,
            text="● Scanning Active",
            font=("SF Pro Text", 16, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.SUCCESS
        )
        self.scan_indicator.pack(pady=(40, 0))
        self.animate_scan_indicator()
    
    def animate_scan_indicator(self):
        """Animate the scanning indicator"""
        if self.state == KioskState.IDLE and hasattr(self, 'scan_indicator') and self.scan_indicator.winfo_exists():
            try:
                current = self.scan_indicator.cget("fg")
                new_color = Colors.SUCCESS if current == Colors.PRIMARY else Colors.PRIMARY
                self.scan_indicator.config(fg=new_color)
                self.root.after(800, self.animate_scan_indicator)
            except tk.TclError:
                pass  # Widget was destroyed
    
    def setup_certificate_panel(self, cert: CertificateData):
        """Display certificate information"""
        self.clear_info_panel()
        
        # Status header
        is_valid = cert.status == "valid"
        status_color = Colors.SUCCESS if is_valid else Colors.ERROR
        status_text = "VERIFIED ✓" if is_valid else "NOT FOUND ✗"
        status_tagalog = "TUNAY" if is_valid else "HINDI NAHANAP"
        
        status_frame = tk.Frame(self.info_panel, bg=status_color, height=80)
        status_frame.pack(fill=tk.X)
        status_frame.pack_propagate(False)
        
        tk.Label(
            status_frame,
            text=f"{status_text} / {status_tagalog}",
            font=("SF Pro Display", 24, "bold"),
            bg=status_color,
            fg=Colors.BACKGROUND
        ).pack(expand=True)
        
        # Blockchain verification badge
        if is_valid and cert.block_index is not None:
            blockchain_frame = tk.Frame(self.info_panel, bg=Colors.PRIMARY_LIGHT)
            blockchain_frame.pack(fill=tk.X, padx=20, pady=(15, 0))
            
            tk.Label(
                blockchain_frame,
                text=f"🔗 Blockchain Verified • Block #{cert.block_index}",
                font=("SF Pro Text", 12, "bold"),
                bg=Colors.PRIMARY_LIGHT,
                fg=Colors.BACKGROUND,
                pady=8
            ).pack()
        
        # Certificate details
        details_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
        details_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        tk.Label(
            details_frame,
            text="Certificate Details",
            font=("SF Pro Display", 18, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        ).pack(anchor=tk.W, pady=(0, 15))
        
        # Build details list based on available data
        details = [
            ("Certificate ID:", cert.certificate_id),
            ("Type:", cert.certificate_type.title() if cert.certificate_type else "N/A"),
            ("Entity:", cert.company_name),
            ("Issued:", cert.issue_date),
        ]
        
        # Add LTO/CFPR if available
        if cert.additional_info:
            if cert.additional_info.get("ltoNumber"):
                details.append(("LTO Number:", cert.additional_info.get("ltoNumber")))
            if cert.additional_info.get("cfprNumber"):
                details.append(("CFPR Number:", cert.additional_info.get("cfprNumber")))
        
        details.append(("Status:", "VERIFIED" if is_valid else "NOT FOUND"))
        
        for label, value in details:
            row = tk.Frame(details_frame, bg=Colors.SURFACE)
            row.pack(fill=tk.X, pady=5)
            
            tk.Label(
                row,
                text=label,
                font=("SF Pro Text", 13),
                bg=Colors.SURFACE,
                fg=Colors.TEXT_SECONDARY,
                width=15,
                anchor=tk.W
            ).pack(side=tk.LEFT)
            
            tk.Label(
                row,
                text=str(value)[:30],  # Truncate long values
                font=("SF Pro Text", 13, "bold"),
                bg=Colors.SURFACE,
                fg=Colors.TEXT_PRIMARY,
                anchor=tk.W
            ).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # PDF URL indicator
        if cert.pdf_url:
            pdf_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
            pdf_frame.pack(fill=tk.X, padx=20, pady=(0, 15))
            
            tk.Label(
                pdf_frame,
                text="📄 PDF Certificate Available",
                font=("SF Pro Text", 12),
                bg=Colors.SURFACE,
                fg=Colors.PRIMARY
            ).pack(anchor=tk.W)
        
        # TTS announcement
        if is_valid:
            self.tts.speak(TagalogMessages.certificate_valid(cert.company_name, cert.company_name))
        else:
            self.tts.speak(TagalogMessages.certificate_invalid())
    
    def setup_product_panel(self, product: ProductData):
        """Display product scan results"""
        self.clear_info_panel()
        
        # Determine authenticity
        is_authentic = product.is_authentic and product.confidence_score >= 0.5 and product.source != "not_found"
        
        # Status header
        if product.source == "not_found":
            status_color = Colors.ERROR
            status_text = "NOT FOUND ✗"
            status_tagalog = "HINDI NAHANAP"
        elif is_authentic:
            status_color = Colors.SUCCESS
            status_text = "REGISTERED ✓"
            status_tagalog = "REHISTRADO"
        else:
            status_color = Colors.WARNING
            status_text = "SUSPICIOUS ⚠"
            status_tagalog = "KAHINA-HINALA"
        
        status_frame = tk.Frame(self.info_panel, bg=status_color, height=80)
        status_frame.pack(fill=tk.X)
        status_frame.pack_propagate(False)
        
        tk.Label(
            status_frame,
            text=f"{status_text} / {status_tagalog}",
            font=("SF Pro Display", 24, "bold"),
            bg=status_color,
            fg=Colors.BACKGROUND
        ).pack(expand=True)
        
        # Source indicator
        source_text = {
            "internal_database": "✓ Found in RCV Database",
            "grounded_search_pdf": "✓ Found in FDA Registry",
            "not_found": "✗ Not in any registry",
            "qr_code": "From QR Code"
        }.get(product.source, "Unknown Source")
        
        source_color = Colors.SUCCESS if product.source in ["internal_database", "grounded_search_pdf"] else Colors.ERROR
        
        source_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
        source_frame.pack(fill=tk.X, padx=20, pady=(15, 0))
        
        tk.Label(
            source_frame,
            text=source_text,
            font=("SF Pro Text", 12, "bold"),
            bg=Colors.SURFACE,
            fg=source_color
        ).pack(anchor=tk.W)
        
        # Confidence score (only show if product was found)
        if product.source != "not_found" and product.confidence_score > 0:
            confidence_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
            confidence_frame.pack(fill=tk.X, padx=20, pady=10)
            
            tk.Label(
                confidence_frame,
                text=f"Confidence: {product.confidence_score * 100:.0f}%",
                font=("SF Pro Text", 14),
                bg=Colors.SURFACE,
                fg=status_color
            ).pack(anchor=tk.W)
            
            # Progress bar for confidence
            bar_width = 380
            bar_height = 15
            canvas = tk.Canvas(confidence_frame, width=bar_width, height=bar_height, 
                              bg=Colors.SURFACE, highlightthickness=0)
            canvas.pack(pady=5, anchor=tk.W)
            
            # Background bar
            canvas.create_rectangle(0, 0, bar_width, bar_height, fill="#E0E0E0", outline="")
            # Filled portion
            fill_width = int(bar_width * product.confidence_score)
            canvas.create_rectangle(0, 0, fill_width, bar_height, fill=status_color, outline="")
        
        # Product details
        details_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
        details_frame.pack(fill=tk.BOTH, expand=True, padx=20)
        
        tk.Label(
            details_frame,
            text="Product Information",
            font=("SF Pro Display", 16, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY
        ).pack(anchor=tk.W, pady=(10, 10))
        
        # Build details based on available data
        details = [("Product:", product.product_name)]
        
        if product.brand and product.brand != "Unknown":
            details.append(("Brand:", product.brand))
        
        if product.lto_number:
            details.append(("LTO Number:", product.lto_number))
        
        if product.cfpr_number:
            details.append(("CFPR Number:", product.cfpr_number))
        
        if product.manufacturer and product.manufacturer != product.brand:
            details.append(("Manufacturer:", product.manufacturer))
        
        if product.batch_number and product.batch_number != "N/A":
            details.append(("Batch No:", product.batch_number))
        
        if product.manufacture_date and product.manufacture_date != "N/A":
            details.append(("Registered:", product.manufacture_date))
        
        if product.expiry_date and product.expiry_date != "N/A":
            details.append(("Valid Until:", product.expiry_date))
        
        for label, value in details:
            row = tk.Frame(details_frame, bg=Colors.SURFACE)
            row.pack(fill=tk.X, pady=3)
            
            tk.Label(
                row,
                text=label,
                font=("SF Pro Text", 12),
                bg=Colors.SURFACE,
                fg=Colors.TEXT_SECONDARY,
                width=12,
                anchor=tk.W
            ).pack(side=tk.LEFT)
            
            # Truncate long values
            display_value = str(value)[:35] + "..." if len(str(value)) > 35 else str(value)
            tk.Label(
                row,
                text=display_value,
                font=("SF Pro Text", 12, "bold"),
                bg=Colors.SURFACE,
                fg=Colors.TEXT_PRIMARY,
                anchor=tk.W
            ).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Warnings if any
        if product.warnings:
            warning_frame = tk.Frame(self.info_panel, bg=Colors.SURFACE)
            warning_frame.pack(fill=tk.X, padx=20, pady=10)
            
            for warning in product.warnings[:3]:  # Limit to 3 warnings
                warning_color = Colors.ERROR if "NOT found" in warning or "counterfeit" in warning else Colors.WARNING
                tk.Label(
                    warning_frame,
                    text=f"⚠ {warning}",
                    font=("SF Pro Text", 11),
                    bg=Colors.SURFACE,
                    fg=warning_color,
                    wraplength=380,
                    anchor=tk.W,
                    justify=tk.LEFT
                ).pack(pady=2, anchor=tk.W)
        
        # TTS announcement
        if is_authentic:
            self.tts.speak(TagalogMessages.product_authentic(product.product_name, product.brand))
        else:
            self.tts.speak(TagalogMessages.product_suspicious(product.product_name))
    
    def setup_processing_panel(self):
        """Display processing indicator"""
        self.clear_info_panel()
        
        tk.Label(
            self.info_panel,
            text="Processing...",
            font=("SF Pro Display", 24, "bold"),
            bg=Colors.SURFACE,
            fg=Colors.PRIMARY
        ).pack(expand=True)
        
        tk.Label(
            self.info_panel,
            text="Pinoproseso...",
            font=("SF Pro Text", 18),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_SECONDARY
        ).pack()
    
    def setup_error_panel(self, message: str):
        """Display error state"""
        self.clear_info_panel()
        
        error_frame = tk.Frame(self.info_panel, bg=Colors.ERROR, height=80)
        error_frame.pack(fill=tk.X)
        error_frame.pack_propagate(False)
        
        tk.Label(
            error_frame,
            text="ERROR / MAY PROBLEMA",
            font=("SF Pro Display", 24, "bold"),
            bg=Colors.ERROR,
            fg=Colors.BACKGROUND
        ).pack(expand=True)
        
        tk.Label(
            self.info_panel,
            text=message,
            font=("SF Pro Text", 14),
            bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY,
            wraplength=400
        ).pack(expand=True, pady=40)
        
        self.tts.speak(TagalogMessages.ERROR_OCCURRED)
    
    def clear_info_panel(self):
        """Clear all widgets from info panel"""
        for widget in self.info_panel.winfo_children():
            widget.destroy()
    
    def initialize_kiosk(self):
        """Initialize kiosk - check API and start camera"""
        # Check API connection in background
        thread = threading.Thread(target=self._check_api_connection, daemon=True)
        thread.start()
        
        # Start camera
        self.start_camera()
    
    def _check_api_connection(self):
        """Check if RCV API is accessible"""
        result = self.api.health_check()
        if result.get("success"):
            print(f"✓ Connected to RCV API: {self.api.base_url}")
        else:
            print(f"⚠ RCV API not accessible: {self.api.base_url}")
            print("  Kiosk will work in offline mode with limited functionality")
    
    def start_camera(self):
        """Initialize and start the camera automatically"""
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
            
            # Set camera resolution
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            
            self.is_running = True
            self.state = KioskState.IDLE
            self.update_status("Ready to Scan / Handa na para mag-scan")
            
            # Start video thread
            self.video_thread = threading.Thread(target=self.video_loop, daemon=True)
            self.video_thread.start()
            
            # Welcome TTS
            self.tts.speak(TagalogMessages.WELCOME)
            
        except Exception as e:
            self.state = KioskState.ERROR
            self.setup_error_panel(f"Camera initialization failed:\n{str(e)}\n\nPlease connect a camera and restart.")
            self.update_status(f"Camera Error: {str(e)}")
    
    def video_loop(self):
        """Main video loop - continuous scanning"""
        while self.is_running and self.camera:
            ret, frame = self.camera.read()
            if not ret:
                continue
            
            # Only process if in scanning state
            if self.state == KioskState.IDLE:
                # Try to detect QR code
                frame, qr_data = self.process_qr_frame(frame)
                
                if qr_data and self.can_process_scan(qr_data):
                    self.handle_qr_detection(qr_data)
            
            # Display frame
            self.display_frame(frame)
    
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
        self.setup_processing_panel()
        self.update_status("Processing scan... / Pinoproseso...")
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
                
                # Check if it contains a certificate ID
                cert_id = data.get("certificateId") or data.get("certificate_id") or data.get("certId")
                if cert_id:
                    self._process_certificate_id(cert_id)
                    return
                
                # Check if it's product data with search criteria
                if any(key in data for key in ["productName", "product_name", "LTONumber", "CFPRNumber"]):
                    self._process_product_search(data)
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
    
    def _process_certificate_id(self, certificate_id: str):
        """Fetch certificate from blockchain API"""
        print(f"🔍 Looking up certificate: {certificate_id}")
        
        # First get certificate details
        cert_response = self.api.get_certificate_by_id(certificate_id)
        
        if cert_response.get("success"):
            cert_data = cert_response.get("certificate", {})
            
            # Also get PDF URL
            pdf_response = self.api.get_certificate_pdf_url(certificate_id)
            pdf_url = None
            if pdf_response.get("success"):
                pdf_url = pdf_response.get("certificate", {}).get("pdfUrl")
            
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
            # Certificate not found in blockchain
            error_msg = cert_response.get("message", "Certificate not found")
            cert = CertificateData(
                certificate_id=certificate_id,
                product_name="Unknown",
                company_name="Unknown",
                issue_date="N/A",
                expiry_date="N/A",
                status="invalid",
                pdf_url=None
            )
            self.root.after(0, lambda: self._show_certificate(cert))
    
    def _process_product_search(self, data: dict):
        """Search for product using API"""
        print(f"🔍 Searching for product: {data}")
        
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
        print(f"🔍 Processing OCR text: {text[:100]}...")
        
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
        self.setup_error_panel(f"Processing Error:\n{message}")
        self.start_display_timer()
    
    def _handle_unknown_qr(self, data: str):
        """Handle unrecognized QR code"""
        self.state = KioskState.ERROR
        self.setup_error_panel(f"Unrecognized QR code format.\n\nData: {data[:100]}...")
        self.start_display_timer()
    
    def _show_certificate(self, cert: CertificateData):
        """Display certificate information"""
        self.state = KioskState.DISPLAY_CERTIFICATE
        self.setup_certificate_panel(cert)
        self.update_status(f"Certificate: {cert.product_name}")
        self.start_display_timer()
        self.log_scan("certificate", cert.__dict__)
    
    def _show_product(self, product: ProductData):
        """Display product information"""
        self.state = KioskState.DISPLAY_PRODUCT
        self.setup_product_panel(product)
        self.update_status(f"Product: {product.product_name}")
        self.start_display_timer()
        self.log_scan("product", product.__dict__)
    
    def start_display_timer(self):
        """Start countdown timer for display"""
        self.remaining_time = self.DISPLAY_DURATION
        self.update_timer()
    
    def update_timer(self):
        """Update the countdown timer"""
        if self.remaining_time > 0:
            self.timer_label.config(text=f"Next scan in: {self.remaining_time}s")
            self.remaining_time -= 1
            self.display_timer = self.root.after(1000, self.update_timer)
        else:
            self.reset_to_idle()
    
    def reset_to_idle(self):
        """Reset kiosk to idle state"""
        if self.display_timer:
            self.root.after_cancel(self.display_timer)
        
        self.state = KioskState.IDLE
        self.timer_label.config(text="")
        self.setup_idle_panel()
        self.update_status("Ready to Scan / Handa na para mag-scan")
        self.tts.speak(TagalogMessages.READY_FOR_NEXT)
    
    def display_frame(self, frame):
        """Display camera frame in UI"""
        try:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Resize to fit display area
            frame_pil = Image.fromarray(frame_rgb)
            
            # Get label size
            label_width = self.camera_label.winfo_width()
            label_height = self.camera_label.winfo_height()
            
            if label_width > 1 and label_height > 1:
                # Maintain aspect ratio
                frame_ratio = frame_pil.width / frame_pil.height
                label_ratio = label_width / label_height
                
                if frame_ratio > label_ratio:
                    new_width = label_width
                    new_height = int(label_width / frame_ratio)
                else:
                    new_height = label_height
                    new_width = int(label_height * frame_ratio)
                
                frame_pil = frame_pil.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            photo = ImageTk.PhotoImage(image=frame_pil)
            self.camera_label.config(image=photo, text='')
            self.camera_label.image = photo
            
        except Exception as e:
            pass  # Ignore display errors to keep loop running
    
    def update_status(self, message: str):
        """Update status bar"""
        self.status_label.config(text=message)
    
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
    
    def on_closing(self):
        """Handle application closing"""
        self.is_running = False
        self.tts.stop()
        
        if self.camera:
            self.camera.release()
        
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