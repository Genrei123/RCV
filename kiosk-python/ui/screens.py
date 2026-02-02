"""Base screen classes for RCV Kiosk UI"""

import tkinter as tk
from abc import ABC, abstractmethod
from PIL import Image, ImageTk, ImageDraw, ImageFont
from typing import Optional


class BaseScreen(ABC):
    """Base class for all kiosk screens"""
    
    def __init__(self, parent: tk.Tk, width: int, height: int):
        self.parent = parent
        self.width = width
        self.height = height
        self.canvas: Optional[tk.Canvas] = None
        
    @abstractmethod
    def render(self, canvas: tk.Canvas, **kwargs):
        """Render the screen on the given canvas"""
        pass
        
    def clear(self, canvas: tk.Canvas):
        """Clear the canvas"""
        canvas.delete("all")
        
    def _draw_gradient_background(self, canvas: tk.Canvas, color1: str, color2: str):
        """Draw a gradient background"""
        # Simple vertical gradient
        for i in range(self.height):
            ratio = i / self.height
            # Simple linear interpolation between colors
            r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
            r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
            
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            
            color = f"#{r:02x}{g:02x}{b:02x}"
            canvas.create_line(0, i, self.width, i, fill=color)


class IdleScreen(BaseScreen):
    """Screen shown when kiosk is idle and ready to scan"""
    
    def render(self, canvas: tk.Canvas, show_camera: bool = False, frame_image=None):
        """
        Render idle/scanning screen
        
        Args:
            canvas: Tkinter canvas to draw on
            show_camera: Whether to show camera feed
            frame_image: PIL Image of current camera frame
        """
        from config import Colors
        
        self.clear(canvas)
        
        if show_camera and frame_image:
            # Display camera feed
            photo = ImageTk.PhotoImage(frame_image)
            canvas.create_image(self.width // 2, self.height // 2, image=photo)
            canvas.image = photo  # Keep reference
            
            # Overlay scanning instruction
            canvas.create_rectangle(0, 0, self.width, 120, fill=Colors.PRIMARY, stipple='gray50')
            canvas.create_text(
                self.width // 2, 60,
                text="🔍 HOLD QR CODE TO CAMERA",
                font=("Arial", 36, "bold"),
                fill=Colors.TEXT_WHITE
            )
        else:
            # Show branded idle screen
            self._draw_gradient_background(canvas, Colors.GRADIENT_START, Colors.GRADIENT_END)
            
            # RCV Logo/Title
            canvas.create_text(
                self.width // 2, 200,
                text="RCV KIOSK",
                font=("Arial", 72, "bold"),
                fill=Colors.TEXT_WHITE
            )
            
            canvas.create_text(
                self.width // 2, 320,
                text="Certificate Verification System",
                font=("Arial", 36),
                fill=Colors.TEXT_WHITE
            )
            
            # Instruction
            canvas.create_rectangle(
                100, 500, self.width - 100, 620,
                fill=Colors.ACCENT,
                outline=""
            )
            canvas.create_text(
                self.width // 2, 560,
                text="Scan QR Code to Verify Certificate",
                font=("Arial", 32, "bold"),
                fill=Colors.TEXT_WHITE
            )
            
            # OCR button
            canvas.create_rectangle(
                100, 680, self.width - 100, 800,
                fill=Colors.SECONDARY,
                outline=""
            )
            canvas.create_text(
                self.width // 2, 740,
                text="OR Press 'O' for OCR Scan",
                font=("Arial", 28),
                fill=Colors.TEXT_WHITE
            )


class ScanningScreen(BaseScreen):
    """Screen shown during active scanning"""
    
    def render(self, canvas: tk.Canvas, frame_image=None):
        """Render scanning screen with camera feed"""
        from config import Colors
        
        self.clear(canvas)
        
        if frame_image:
            photo = ImageTk.PhotoImage(frame_image)
            canvas.create_image(self.width // 2, self.height // 2, image=photo)
            canvas.image = photo
            
        # Scanning overlay
        canvas.create_rectangle(0, 0, self.width, 120, fill=Colors.WARNING, stipple='gray50')
        canvas.create_text(
            self.width // 2, 60,
            text="📸 SCANNING...",
            font=("Arial", 42, "bold"),
            fill=Colors.TEXT_WHITE
        )


class ProcessingScreen(BaseScreen):
    """Large loading screen shown during API processing"""
    
    def render(self, canvas: tk.Canvas, message: str = "Processing..."):
        """Render processing screen"""
        from config import Colors
        
        self.clear(canvas)
        self._draw_gradient_background(canvas, Colors.PRIMARY, Colors.PRIMARY_DARK)
        
        # Large spinner/loading indicator
        canvas.create_text(
            self.width // 2, self.height // 2 - 100,
            text="⏳",
            font=("Arial", 120),
            fill=Colors.TEXT_WHITE
        )
        
        canvas.create_text(
            self.width // 2, self.height // 2 + 80,
            text=message,
            font=("Arial", 48, "bold"),
            fill=Colors.TEXT_WHITE
        )
        
        canvas.create_text(
            self.width // 2, self.height // 2 + 160,
            text="Please wait...",
            font=("Arial", 32),
            fill=Colors.TEXT_WHITE
        )


class ErrorScreen(BaseScreen):
    """Screen shown for errors"""
    
    def render(self, canvas: tk.Canvas, error_message: str, error_code: Optional[str] = None):
        """Render error screen"""
        from config import Colors
        
        self.clear(canvas)
        canvas.create_rectangle(0, 0, self.width, self.height, fill=Colors.ERROR_LIGHT)
        
        # Error icon
        canvas.create_text(
            self.width // 2, 200,
            text="❌",
            font=("Arial", 120),
            fill=Colors.ERROR
        )
        
        # Error title
        canvas.create_text(
            self.width // 2, 380,
            text="ERROR",
            font=("Arial", 56, "bold"),
            fill=Colors.ERROR
        )
        
        # Error message
        canvas.create_text(
            self.width // 2, 480,
            text=error_message,
            font=("Arial", 32),
            fill=Colors.TEXT_PRIMARY,
            width=self.width - 200
        )
        
        if error_code:
            canvas.create_text(
                self.width // 2, 580,
                text=f"Code: {error_code}",
                font=("Arial", 24),
                fill=Colors.TEXT_SECONDARY
            )
        
        # Auto-reset message
        canvas.create_text(
            self.width // 2, self.height - 100,
            text="Screen will reset in 10 seconds...",
            font=("Arial", 28),
            fill=Colors.TEXT_SECONDARY
        )


class MaintenanceScreen(BaseScreen):
    """Screen shown when API is unavailable"""
    
    def render(self, canvas: tk.Canvas):
        """Render maintenance screen"""
        from config import Colors
        
        self.clear(canvas)
        canvas.create_rectangle(0, 0, self.width, self.height, fill=Colors.WARNING_LIGHT)
        
        # Warning icon
        canvas.create_text(
            self.width // 2, 200,
            text="⚠️",
            font=("Arial", 120),
            fill=Colors.WARNING
        )
        
        # Title
        canvas.create_text(
            self.width // 2, 380,
            text="SYSTEM MAINTENANCE",
            font=("Arial", 56, "bold"),
            fill=Colors.WARNING
        )
        
        # Message
        canvas.create_text(
            self.width // 2, 500,
            text="Unable to connect to verification server",
            font=("Arial", 32),
            fill=Colors.TEXT_PRIMARY
        )
        
        canvas.create_text(
            self.width // 2, 580,
            text="Please try again later",
            font=("Arial", 32),
            fill=Colors.TEXT_PRIMARY
        )


# Import other specialized screens
from .certificate_screen import CertificateScreen
from .product_screen import ProductScreen
from .compliance_screen import ComplianceScreen
from .ocr_capture_screen import OCRCaptureScreen
