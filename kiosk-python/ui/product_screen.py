"""Product display screen - Shows product verification results"""

import tkinter as tk
from .screens import BaseScreen
from config import Colors
from models import ProductData


class ProductScreen(BaseScreen):
    """Screen for displaying product information"""
    
    def render(self, canvas: tk.Canvas, product: ProductData):
        """Render product details"""
        self.clear(canvas)
        
        # Background color based on authenticity
        if product.is_authentic:
            bg_color = Colors.SUCCESS_LIGHT
            status_color = Colors.SUCCESS
            status_icon = "✓"
            status_text = "AUTHENTIC PRODUCT"
        else:
            bg_color = Colors.ERROR_LIGHT
            status_color = Colors.ERROR
            status_icon = "✗"
            status_text = "UNVERIFIED PRODUCT"
        
        canvas.create_rectangle(0, 0, self.width, self.height, fill=bg_color)
        
        # Status header
        canvas.create_rectangle(0, 0, self.width, 180, fill=status_color)
        canvas.create_text(
            self.width // 2, 90,
            text=f"{status_icon} {status_text}",
            font=("Arial", 52, "bold"),
            fill=Colors.TEXT_WHITE
        )
        
        # Confidence score if available
        if product.confidence_score > 0:
            canvas.create_text(
                self.width // 2, 150,
                text=f"Confidence: {product.confidence_score:.1%}",
                font=("Arial", 24),
                fill=Colors.TEXT_WHITE
            )
        
        # Product details
        y_pos = 240
        line_height = 65
        
        details = [
            ("Product Name:", product.product_name),
            ("Brand:", product.brand),
            ("Batch Number:", product.batch_number),
            ("Manufacture Date:", product.manufacture_date),
            ("Expiry Date:", product.expiry_date),
        ]
        
        if product.lto_number:
            details.append(("LTO Number:", product.lto_number))
        if product.cfpr_number:
            details.append(("CFPR Number:", product.cfpr_number))
        if product.manufacturer:
            details.append(("Manufacturer:", product.manufacturer))
        
        for label, value in details:
            canvas.create_text(
                150, y_pos,
                text=label,
                font=("Arial", 26, "bold"),
                fill=Colors.TEXT_SECONDARY,
                anchor="w"
            )
            canvas.create_text(
                520, y_pos,
                text=str(value),
                font=("Arial", 26),
                fill=Colors.TEXT_PRIMARY,
                anchor="w",
                width=self.width - 570
            )
            y_pos += line_height
        
        # Data source indicator
        source_text = {
            "internal_database": "✓ Verified from Internal Database",
            "grounded_search_pdf": "📄 Verified from PDF Documents",
            "not_found": "⚠ No matching records found"
        }.get(product.source, "Unknown Source")
        
        canvas.create_text(
            self.width // 2, y_pos + 40,
            text=source_text,
            font=("Arial", 24, "italic"),
            fill=Colors.TEXT_SECONDARY
        )
        
        # Warnings if any
        if product.warnings:
            y_pos += 120
            canvas.create_rectangle(100, y_pos, self.width - 100, y_pos + 60,
                                   fill=Colors.WARNING, outline="")
            canvas.create_text(
                self.width // 2, y_pos + 30,
                text="⚠ WARNINGS",
                font=("Arial", 28, "bold"),
                fill=Colors.TEXT_WHITE
            )
            
            y_pos += 80
            for warning in product.warnings:
                canvas.create_text(
                    150, y_pos,
                    text=f"• {warning}",
                    font=("Arial", 22),
                    fill=Colors.WARNING,
                    anchor="w",
                    width=self.width - 200
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
