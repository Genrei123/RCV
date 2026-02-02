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
        """Extract text from both images using OCR (legacy method)"""
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
    
    def get_ocr_data_for_api(self) -> dict:
        """
        Get structured OCR data optimized for fuzzy search backend
        Returns dictionary with extracted text, images, and metadata
        """
        if not self.can_submit():
            return None
        
        try:
            import pytesseract
            import re
            
            # Extract text from both images
            front_text = pytesseract.image_to_string(self.front_image) if self.front_image else ""
            back_text = pytesseract.image_to_string(self.back_image) if self.back_image else ""
            
            # Combine text for main search
            combined_text = f"FRONT:\n{front_text}\n\nBACK:\n{back_text}"
            
            # Extract potential product information
            product_info = self._extract_product_info(combined_text)
            
            # Structure data for fuzzy search API
            ocr_data = {
                'blockOfText': combined_text,
                'frontText': front_text.strip(),
                'backText': back_text.strip(),
                'extractedFields': product_info,
                'frontImageBase64': self.get_front_base64(),
                'backImageBase64': self.get_back_base64(),
                'captureTimestamp': datetime.now().isoformat()
            }
            
            print(f"📦 OCR data prepared: {len(combined_text)} chars, {len(product_info)} fields")
            return ocr_data
            
        except Exception as e:
            print(f"Error preparing OCR data: {e}")
            return {
                'blockOfText': f"Error: {str(e)}",
                'error': str(e)
            }
    
    def _extract_product_info(self, text: str) -> dict:
        """
        Extract structured fields from OCR text
        Helps fuzzy search by pre-identifying key information
        """
        import re
        
        info = {}
        
        # Common patterns for FDA product labels
        patterns = {
            'lto_number': r'LTO[:\s#-]*([A-Z0-9-]+)',
            'cfpr_number': r'CFPR[:\s#-]*([A-Z0-9-]+)',
            'batch_number': r'(?:BATCH|LOT|LOTE)[:\s#-]*([A-Z0-9-]+)',
            'expiry_date': r'(?:EXP|EXPIRY|EXPIRATION|EXPIRES)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'mfg_date': r'(?:MFG|MANUFACTURED|MFD|DOM)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info[key] = match.group(1).strip()
        
        # Extract potential product name (first substantial line)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            skip_words = ['front', 'back', 'label', 'warning', 'caution', 'ingredients']
            for line in lines[:5]:
                if len(line) > 3 and not any(word in line.lower() for word in skip_words):
                    info['potential_product_name'] = line
                    break
        
        return info
    
    def move_to_next_step(self):
        """Move to next capture step after successful preview"""
        if self.step == OCRCaptureStep.PREVIEW_FRONT:
            self.step = OCRCaptureStep.READY_BACK
        elif self.step == OCRCaptureStep.PREVIEW_BACK:
            self.step = OCRCaptureStep.SUBMITTING
