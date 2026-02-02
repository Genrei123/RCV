"""
Configuration and Constants for RCV Kiosk
"""
import os
from enum import Enum

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
    PROCESSING = "processing"          # Processing QR/OCR data
    DISPLAY_CERTIFICATE = "certificate" # Showing certificate info
    DISPLAY_PRODUCT = "product"        # Showing product info
    DISPLAY_COMPLIANCE = "compliance"  # Showing OCR compliance report
    ERROR = "error"                    # Error state - 10 second timeout
    MAINTENANCE = "maintenance"        # Server offline/unreachable

class OCRCaptureStep(Enum):
    """Steps in the OCR 2-photo capture flow"""
    READY_FRONT = "ready_front"        # Ready to capture front
    PREVIEW_FRONT = "preview_front"    # Previewing front photo
    READY_BACK = "ready_back"          # Ready to capture back
    PREVIEW_BACK = "preview_back"      # Previewing back photo  
    SUBMITTING = "submitting"          # Sending to backend

# Display duration in seconds
class Timing:
    RESULT_DISPLAY_DURATION = 30   # 30 seconds for results
    ERROR_DISPLAY_DURATION = 10    # 10 seconds for errors
    SCAN_COOLDOWN = 2              # Seconds between scans
    CONNECTIVITY_POLL_INTERVAL = 10000      # Check every 10 seconds when offline
    CONNECTIVITY_POLL_INTERVAL_ONLINE = 60000  # Check every 60 seconds when online
    MAX_FAILURES_BEFORE_MAINTENANCE = 3     # Enter maintenance after 3 failures

# API Configuration
class APIConfig:
    BASE_URL = os.environ.get('RCV_API_URL', 'http://localhost:3000/api/v1')
    TIMEOUT = 30  # seconds
    FIREBASE_BUCKET = "rcv-flutter.firebasestorage.app"

# Camera Configuration
class CameraConfig:
    DISPLAY_WIDTH = 640
    DISPLAY_HEIGHT = 480
    FRAME_SKIP_RATE = 2  # Process every Nth frame for display

# Tagalog Messages
class TagalogMessages:
    WELCOME = "Magandang araw! Handa na ang kiosk para sa pag-scan."
    SCAN_DETECTED = "May na-detect na scan. Pinoproseso..."
    READY_FOR_NEXT = "Handa na ulit para sa susunod na scan."
    ERROR_OCCURRED = "May nangyaring error. Subukan muli."
    
    @staticmethod
    def certificate_valid(product_name: str, company: str) -> str:
        return f"Ang sertipiko para sa {product_name} mula sa {company} ay totoo at balido."
    
    @staticmethod
    def certificate_expired(product_name: str) -> str:
        return f"Babala: Ang sertipiko para sa {product_name} ay nag-expire na."
    
    @staticmethod
    def certificate_invalid() -> str:
        return "Ang sertipiko ay hindi balido o hindi mahanap sa blockchain."
    
    @staticmethod
    def product_authentic(product_name: str, brand: str) -> str:
        return f"Ang produktong {product_name} mula sa {brand} ay totoo at rehistrado."
    
    @staticmethod
    def product_suspicious(product_name: str) -> str:
        return f"Babala: Ang produktong {product_name} ay hindi mahanap sa database."

# TTS Configuration
class TTSConfig:
    FILIPINO_VOICE = "fil-PH-BlessicaNeural"  # Female Filipino voice
    FILIPINO_VOICE_MALE = "fil-PH-AngeloNeural"  # Male Filipino voice
    ENGLISH_VOICE = "en-US-JennyNeural"  # Fallback English voice
