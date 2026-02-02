"""Compliance/OCR results display screen"""

import tkinter as tk
from .screens import BaseScreen
from config import Colors
from typing import Dict, Any


class ComplianceScreen(BaseScreen):
    """Screen for displaying OCR compliance scan results"""
    
    def render(self, canvas: tk.Canvas, result: Dict[str, Any]):
        """
        Render compliance report from OCR scan
        
        Args:
            canvas: Tkinter canvas
            result: OCR scan result from API containing:
                - success: bool
                - message: str
                - data: Dict with product details
                - warnings: List[str]
        """
        self.clear(canvas)
        
        success = result.get('success', False)
        message = result.get('message', 'Scan complete')
        data = result.get('data', {})
        warnings = result.get('warnings', [])
        
        # Background color
        if success:
            bg_color = Colors.SUCCESS_LIGHT
            status_color = Colors.SUCCESS
            status_icon = "✓"
        else:
            bg_color = Colors.ERROR_LIGHT
            status_color = Colors.ERROR
            status_icon = "✗"
        
        canvas.create_rectangle(0, 0, self.width, self.height, fill=bg_color)
        
        # Header
        canvas.create_rectangle(0, 0, self.width, 160, fill=status_color)
        canvas.create_text(
            self.width // 2, 80,
            text=f"{status_icon} OCR SCAN COMPLETE",
            font=("Arial", 52, "bold"),
            fill=Colors.TEXT_WHITE
        )
        
        # Message
        y_pos = 220
        canvas.create_text(
            self.width // 2, y_pos,
            text=message,
            font=("Arial", 30),
            fill=Colors.TEXT_PRIMARY,
            width=self.width - 200
        )
        
        # Extracted data
        if data:
            y_pos += 100
            canvas.create_text(
                150, y_pos,
                text="Extracted Information:",
                font=("Arial", 32, "bold"),
                fill=Colors.TEXT_SECONDARY,
                anchor="w"
            )
            y_pos += 60
            
            for key, value in data.items():
                # Format key to be more readable
                display_key = key.replace('_', ' ').title()
                
                canvas.create_text(
                    200, y_pos,
                    text=f"{display_key}:",
                    font=("Arial", 26, "bold"),
                    fill=Colors.TEXT_SECONDARY,
                    anchor="w"
                )
                canvas.create_text(
                    600, y_pos,
                    text=str(value),
                    font=("Arial", 26),
                    fill=Colors.TEXT_PRIMARY,
                    anchor="w",
                    width=self.width - 650
                )
                y_pos += 55
        
        # Warnings
        if warnings:
            y_pos += 40
            canvas.create_rectangle(100, y_pos, self.width - 100, y_pos + 60,
                                   fill=Colors.WARNING, outline="")
            canvas.create_text(
                self.width // 2, y_pos + 30,
                text="⚠ WARNINGS",
                font=("Arial", 28, "bold"),
                fill=Colors.TEXT_WHITE
            )
            
            y_pos += 80
            for warning in warnings:
                canvas.create_text(
                    150, y_pos,
                    text=f"• {warning}",
                    font=("Arial", 24),
                    fill=Colors.WARNING,
                    anchor="w",
                    width=self.width - 200
                )
                y_pos += 50
        
        # No data found message
        if not data and not warnings:
            y_pos += 80
            canvas.create_text(
                self.width // 2, y_pos,
                text="No product information could be extracted",
                font=("Arial", 28),
                fill=Colors.TEXT_SECONDARY
            )
            y_pos += 60
            canvas.create_text(
                self.width // 2, y_pos,
                text="Please ensure the product label is clearly visible",
                font=("Arial", 24),
                fill=Colors.TEXT_SECONDARY
            )
        
        # Footer instruction
        canvas.create_rectangle(0, self.height - 120, self.width, self.height,
                               fill=Colors.PRIMARY)
        canvas.create_text(
            self.width // 2, self.height - 60,
            text="Press SPACE to return to scanning",
            font=("Arial", 28),
            fill=Colors.TEXT_WHITE
        )
