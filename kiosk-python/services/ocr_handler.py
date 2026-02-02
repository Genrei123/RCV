"""
OCR Camera Handler - Handles 2-photo capture and OCR processing
"""
import os
import cv2
import base64
from PIL import Image
from io import BytesIO
from datetime import datetime
from config import OCRCaptureStep

class OCRCameraHandler:
    """Handles OCR product scanning with 2-photo capture"""
    
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        os.makedirs(os.path.join(data_dir, "ocr_scans"), exist_ok=True)
        
        self.reset()
    
    def reset(self):
        """Reset capture state"""
        self.step = OCRCaptureStep.READY_FRONT
        self.front_image = None  # PIL Image
        self.back_image = None   # PIL Image
        self.front_frame = None  # OpenCV frame (for display)
        self.back_frame = None   # OpenCV frame (for display)
        self.front_path = None
        self.back_path = None
    
    def capture_photo(self, frame) -> bool:
        """
        Capture a photo based on current step
        Returns True if capture successful
        """
        if frame is None:
            return False
        
        # Convert BGR to RGB for PIL
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_frame)
        
        if self.step == OCRCaptureStep.READY_FRONT:
            # Capture front image
            self.front_frame = frame.copy()
            self.front_image = pil_image
            
            # Save to disk immediately with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.front_path = os.path.join(
                self.data_dir,
                "ocr_scans",
                f"front_{timestamp}.jpg"
            )
            pil_image.save(self.front_path, "JPEG", quality=90)
            print(f"✅ Front image saved: {self.front_path}")
            
            self.step = OCRCaptureStep.PREVIEW_FRONT
            return True
            
        elif self.step == OCRCaptureStep.READY_BACK:
            # Capture back image
            self.back_frame = frame.copy()
            self.back_image = pil_image
            
            # Save to disk immediately with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.back_path = os.path.join(
                self.data_dir,
                "ocr_scans",
                f"back_{timestamp}.jpg"
            )
            pil_image.save(self.back_path, "JPEG", quality=90)
            print(f"✅ Back image saved: {self.back_path}")
            
            self.step = OCRCaptureStep.PREVIEW_BACK
            return True
        
        return False
    
    def retake_current(self):
        """Retake current photo"""
        if self.step == OCRCaptureStep.PREVIEW_FRONT:
            # Delete front image
            if self.front_path and os.path.exists(self.front_path):
                try:
                    os.remove(self.front_path)
                    print(f"🗑️ Deleted front image: {self.front_path}")
                except:
                    pass
            
            self.front_image = None
            self.front_frame = None
            self.front_path = None
            self.step = OCRCaptureStep.READY_FRONT
            
        elif self.step == OCRCaptureStep.PREVIEW_BACK:
            # Delete back image
            if self.back_path and os.path.exists(self.back_path):
                try:
                    os.remove(self.back_path)
                    print(f"🗑️ Deleted back image: {self.back_path}")
                except:
                    pass
            
            self.back_image = None
            self.back_frame = None
            self.back_path = None
            self.step = OCRCaptureStep.READY_BACK
    
    def can_submit(self) -> bool:
        """Check if both images are captured"""
        return (self.front_image is not None and 
                self.back_image is not None and
                self.front_path is not None and
                self.back_path is not None)
    
    def get_front_base64(self) -> str:
        """Get front image as base64 string"""
        if not self.front_image:
            return None
        
        buffer = BytesIO()
        self.front_image.save(buffer, format="JPEG", quality=85)
        img_bytes = buffer.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')
    
    def get_back_base64(self) -> str:
        """Get back image as base64 string"""
        if not self.back_image:
            return None
        
        buffer = BytesIO()
        self.back_image.save(buffer, format="JPEG", quality=85)
        img_bytes = buffer.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')
    
    def get_combined_ocr_text(self) -> str:
        """Extract text from both images using OCR"""
        try:
            import pytesseract
            
            text_parts = []
            
            # Extract from front
            if self.front_image:
                front_text = pytesseract.image_to_string(self.front_image)
                if front_text.strip():
                    text_parts.append(f"FRONT LABEL:\n{front_text.strip()}")
            
            # Extract from back
            if self.back_image:
                back_text = pytesseract.image_to_string(self.back_image)
                if back_text.strip():
                    text_parts.append(f"BACK LABEL:\n{back_text.strip()}")
            
            combined = "\n\n".join(text_parts)
            print(f"📝 OCR extracted {len(combined)} characters")
            return combined
            
        except Exception as e:
            print(f"OCR extraction error: {e}")
            return ""
    
    def move_to_next_step(self):
        """Move to next capture step after successful preview"""
        if self.step == OCRCaptureStep.PREVIEW_FRONT:
            self.step = OCRCaptureStep.READY_BACK
        elif self.step == OCRCaptureStep.PREVIEW_BACK:
            self.step = OCRCaptureStep.SUBMITTING
