"""Certificate display screen - Shows certificate verification results"""

import tkinter as tk
from .screens import BaseScreen
from config import Colors
from models import CertificateData
from typing import Optional


class CertificateScreen(BaseScreen):
    """Screen for displaying certificate information"""
    
    def render(self, canvas: tk.Canvas, cert: CertificateData):
        """Render certificate details"""
        self.clear(canvas)
        
        # Background color based on status
        if cert.status == "valid":
            bg_color = Colors.SUCCESS_LIGHT
            status_color = Colors.SUCCESS
            status_icon = "✓"
            status_text = "VERIFIED"
        elif cert.status == "expired":
            bg_color = Colors.WARNING_LIGHT
            status_color = Colors.WARNING
            status_icon = "⚠"
            status_text = "EXPIRED"
        else:  # revoked or invalid
            bg_color = Colors.ERROR_LIGHT
            status_color = Colors.ERROR
            status_icon = "✗"
            status_text = "INVALID"
        
        canvas.create_rectangle(0, 0, self.width, self.height, fill=bg_color)
        
        # Status header
        canvas.create_rectangle(0, 0, self.width, 180, fill=status_color)
        canvas.create_text(
            self.width // 2, 90,
            text=f"{status_icon} CERTIFICATE {status_text}",
            font=("Arial", 56, "bold"),
            fill=Colors.TEXT_WHITE
        )
        
        # Certificate details
        y_pos = 250
        line_height = 70
        
        details = [
            ("Certificate ID:", cert.certificate_id),
            ("Product:", cert.product_name),
            ("Company:", cert.company_name),
            ("Issue Date:", cert.issue_date),
            ("Expiry Date:", cert.expiry_date),
        ]
        
        if cert.transaction_hash:
            details.append(("Blockchain:", cert.transaction_hash[:16] + "..."))
        
        for label, value in details:
            canvas.create_text(
                150, y_pos,
                text=label,
                font=("Arial", 28, "bold"),
                fill=Colors.TEXT_SECONDARY,
                anchor="w"
            )
            canvas.create_text(
                500, y_pos,
                text=value,
                font=("Arial", 28),
                fill=Colors.TEXT_PRIMARY,
                anchor="w",
                width=self.width - 550
            )
            y_pos += line_height
        
        # Additional info if available
        if cert.additional_info:
            y_pos += 30
            canvas.create_text(
                150, y_pos,
                text="Additional Information:",
                font=("Arial", 24, "bold"),
                fill=Colors.TEXT_SECONDARY,
                anchor="w"
            )
            y_pos += 50
            
            for key, value in cert.additional_info.items():
                canvas.create_text(
                    200, y_pos,
                    text=f"{key}: {value}",
                    font=("Arial", 22),
                    fill=Colors.TEXT_PRIMARY,
                    anchor="w",
                    width=self.width - 250
                )
                y_pos += 45
        
        # Footer instruction
        canvas.create_rectangle(0, self.height - 120, self.width, self.height, 
                               fill=Colors.PRIMARY)
        canvas.create_text(
            self.width // 2, self.height - 60,
            text="Scan another code or press SPACE to continue",
            font=("Arial", 28),
            fill=Colors.TEXT_WHITE
        )
