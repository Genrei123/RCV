"""OCR Capture screen for 2-photo workflow"""

import tkinter as tk
from .screens import BaseScreen
from config import OCRCaptureStep, Colors
from PIL import ImageTk


class OCRCaptureScreen(BaseScreen):
    """Screen for OCR 2-photo capture workflow"""
    
    def render(self, canvas: tk.Canvas, step: OCRCaptureStep, frame_image=None, 
               front_photo=None, back_photo=None):
        """
        Render OCR capture screen
        
        Args:
            canvas: Tkinter canvas
            step: Current OCR capture step
            frame_image: Live camera feed (PIL Image)
            front_photo: Captured front photo (PIL Image)
            back_photo: Captured back photo (PIL Image)
        """
        self.clear(canvas)
        
        if step == OCRCaptureStep.READY_FRONT:
            self._render_ready_screen(canvas, "FRONT", frame_image)
            
        elif step == OCRCaptureStep.PREVIEW_FRONT:
            self._render_preview_screen(canvas, "FRONT", front_photo, 1)
            
        elif step == OCRCaptureStep.READY_BACK:
            self._render_ready_screen(canvas, "BACK", frame_image)
            
        elif step == OCRCaptureStep.PREVIEW_BACK:
            self._render_preview_screen(canvas, "BACK", back_photo, 2, front_photo)
            
        elif step == OCRCaptureStep.SUBMITTING:
            self._render_submitting_screen(canvas)
    
    def _render_ready_screen(self, canvas: tk.Canvas, side: str, frame_image):
        """Render 'ready to capture' screen"""
        if frame_image:
            photo = ImageTk.PhotoImage(frame_image)
            canvas.create_image(self.width // 2, self.height // 2, image=photo)
            canvas.image = photo
        
        # Header
        canvas.create_rectangle(0, 0, self.width, 140, fill=Colors.ACCENT, stipple='gray50')
        canvas.create_text(
            self.width // 2, 70,
            text=f"📸 POSITION {side} OF PRODUCT",
            font=("Arial", 40, "bold"),
            fill=Colors.TEXT_WHITE
        )
        
        # Instructions at bottom
        canvas.create_rectangle(0, self.height - 200, self.width, self.height, 
                               fill=Colors.PRIMARY, stipple='gray50')
        canvas.create_text(
            self.width // 2, self.height - 140,
            text="Press SPACE to capture photo",
            font=("Arial", 32, "bold"),
            fill=Colors.TEXT_WHITE
        )
        canvas.create_text(
            self.width // 2, self.height - 80,
            text="Press ESC to cancel",
            font=("Arial", 24),
            fill=Colors.TEXT_WHITE
        )
    
    def _render_preview_screen(self, canvas: tk.Canvas, side: str, photo, 
                              step_num: int, other_photo=None):
        """Render preview of captured photo"""
        # Show captured photo (large)
        if photo:
            # Resize to fit most of screen
            display_height = int(self.height * 0.6)
            display_width = int(photo.width * (display_height / photo.height))
            resized = photo.resize((display_width, display_height))
            
            photo_tk = ImageTk.PhotoImage(resized)
            canvas.create_image(self.width // 2, self.height // 2 - 80, image=photo_tk)
            canvas.image = photo_tk
        
        # Header
        canvas.create_rectangle(0, 0, self.width, 100, fill=Colors.SUCCESS)
        canvas.create_text(
            self.width // 2, 50,
            text=f"✓ {side} PHOTO CAPTURED ({step_num}/2)",
            font=("Arial", 36, "bold"),
            fill=Colors.TEXT_WHITE
        )
        
        # Show thumbnail of other photo if exists
        if other_photo and step_num == 2:
            thumb_size = 150
            thumb = other_photo.resize((thumb_size, thumb_size))
            thumb_tk = ImageTk.PhotoImage(thumb)
            canvas.create_image(100, self.height - 100, image=thumb_tk)
            canvas.thumb = thumb_tk
            canvas.create_text(100, self.height - 200, text="FRONT", 
                             font=("Arial", 20, "bold"), fill=Colors.TEXT_PRIMARY)
        
        # Action buttons at bottom
        y_base = self.height - 150
        
        # Retake button
        canvas.create_rectangle(100, y_base, 450, y_base + 80, 
                               fill=Colors.WARNING, outline="")
        canvas.create_text(275, y_base + 40, text="RETAKE (R)", 
                          font=("Arial", 28, "bold"), fill=Colors.TEXT_WHITE)
        
        # Continue button
        next_text = "NEXT (SPACE)" if step_num == 1 else "SUBMIT (SPACE)"
        canvas.create_rectangle(self.width - 450, y_base, self.width - 100, y_base + 80,
                               fill=Colors.SUCCESS, outline="")
        canvas.create_text(self.width - 275, y_base + 40, text=next_text,
                          font=("Arial", 28, "bold"), fill=Colors.TEXT_WHITE)
        
        # Cancel button
        canvas.create_rectangle(self.width // 2 - 150, y_base, self.width // 2 + 150, y_base + 80,
                               fill=Colors.ERROR, outline="")
        canvas.create_text(self.width // 2, y_base + 40, text="CANCEL (ESC)",
                          font=("Arial", 28, "bold"), fill=Colors.TEXT_WHITE)
    
    def _render_submitting_screen(self, canvas: tk.Canvas):
        """Render submitting screen"""
        canvas.create_rectangle(0, 0, self.width, self.height, fill=Colors.PRIMARY)
        
        canvas.create_text(
            self.width // 2, self.height // 2 - 80,
            text="📤",
            font=("Arial", 120),
            fill=Colors.TEXT_WHITE
        )
        
        canvas.create_text(
            self.width // 2, self.height // 2 + 80,
            text="PROCESSING IMAGES...",
            font=("Arial", 42, "bold"),
            fill=Colors.TEXT_WHITE
        )
