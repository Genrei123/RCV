#!/usr/bin/env python3
"""
RCV Kiosk Machine - Refactored Main Application
Modular architecture with separated concerns

This is the main entry point that orchestrates all components:
- UI screens (ui/)
- Services (services/)
- Camera management
- State management
"""

import tkinter as tk
from PIL import Image, ImageTk
import threading
import time
from typing import Optional

# Configuration and models
from config import Colors, KioskState, OCRCaptureStep, Timing
from models import CertificateData, ProductData

# Services
from services import RCVApiService, TTSService, GPIOLEDService, OCRCameraHandler

# UI Components
from ui import (
    IdleScreen, ScanningScreen, OCRCaptureScreen, ProcessingScreen,
    CertificateScreen, ProductScreen, ComplianceScreen, ErrorScreen,
    MaintenanceScreen, KioskStateManager
)

# Camera management
from camera_manager import CameraManager


class RCVKioskApp:
    """Main application class for RCV Kiosk"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("RCV Kiosk - Certificate Verification")
        
        # Display settings
        self.width = 1024
        self.height = 1024
        self.root.geometry(f"{self.width}x{self.height}")
        
        # Fullscreen mode (comment out for development)
        # self.root.attributes('-fullscreen', True)
        
        # Initialize components
        self.state_manager = KioskStateManager()
        self.camera = CameraManager(camera_index=0)
        self.api_service = RCVApiService()
        self.tts_service = TTSService()
        self.led_service = GPIOLEDService()
        self.ocr_handler = OCRCameraHandler()
        
        # Initialize UI screens
        self._init_screens()
        
        # Canvas for rendering
        self.canvas = tk.Canvas(root, width=self.width, height=self.height, 
                               bg=Colors.PRIMARY, highlightthickness=0)
        self.canvas.pack()
        
        # Bind keyboard events
        self.root.bind('<Key>', self._handle_key_press)
        self.root.bind('<Escape>', lambda e: self._exit_app())
        
        # State management
        self.last_scanned_qr = ""
        self.scan_cooldown_until = 0
        
        # Start health check
        self._check_api_health()
        
        # Start main loop
        self.state_manager.change_state(KioskState.IDLE)
        self._update_display()
    
    def _init_screens(self):
        """Initialize all UI screens"""
        self.screens = {
            'idle': IdleScreen(self.root, self.width, self.height),
            'scanning': ScanningScreen(self.root, self.width, self.height),
            'ocr_capture': OCRCaptureScreen(self.root, self.width, self.height),
            'processing': ProcessingScreen(self.root, self.width, self.height),
            'certificate': CertificateScreen(self.root, self.width, self.height),
            'product': ProductScreen(self.root, self.width, self.height),
            'compliance': ComplianceScreen(self.root, self.width, self.height),
            'error': ErrorScreen(self.root, self.width, self.height),
            'maintenance': MaintenanceScreen(self.root, self.width, self.height),
        }
    
    def _check_api_health(self):
        """Check if API is reachable"""
        def check():
            try:
                result = self.api_service.health_check()
                if not result.get('success'):
                    if self.state_manager.current_state != KioskState.MAINTENANCE:
                        self.state_manager.change_state(KioskState.MAINTENANCE)
                        self.tts_service.speak_tagalog("maintenance")
                else:
                    # Recovered from maintenance
                    if self.state_manager.current_state == KioskState.MAINTENANCE:
                        self.state_manager.change_state(KioskState.IDLE)
                        self.tts_service.speak_tagalog("ready")
            except Exception as e:
                print(f"Health check failed: {e}")
                if self.state_manager.current_state != KioskState.MAINTENANCE:
                    self.state_manager.change_state(KioskState.MAINTENANCE)
            
            # Check again in 10 seconds
            self.root.after(10000, self._check_api_health)
        
        threading.Thread(target=check, daemon=True).start()
    
    def _handle_key_press(self, event):
        """Handle keyboard input"""
        key = event.char.lower()
        
        # OCR mode trigger
        if key == 'o' and self.state_manager.is_idle():
            self._start_ocr_capture()
        
        # Space - Continue/Submit
        elif event.keysym == 'space':
            self._handle_space_key()
        
        # R - Retake photo in OCR mode
        elif key == 'r' and self.state_manager.is_ocr_mode():
            self._retake_ocr_photo()
        
        # ESC - Cancel OCR mode
        elif event.keysym == 'Escape' and self.state_manager.is_ocr_mode():
            self.state_manager.reset_to_idle()
    
    def _handle_space_key(self):
        """Handle space key based on current state"""
        state = self.state_manager.current_state
        
        if state in [KioskState.DISPLAY_CERTIFICATE, KioskState.DISPLAY_PRODUCT, 
                     KioskState.DISPLAY_COMPLIANCE, KioskState.ERROR]:
            self.state_manager.reset_to_idle()
        
        elif state == KioskState.OCR_CAPTURE:
            step = self.state_manager.ocr_capture_step
            
            if step == OCRCaptureStep.READY_FRONT:
                self._capture_ocr_photo('front')
            elif step == OCRCaptureStep.PREVIEW_FRONT:
                self.state_manager.advance_ocr_step()
            elif step == OCRCaptureStep.READY_BACK:
                self._capture_ocr_photo('back')
            elif step == OCRCaptureStep.PREVIEW_BACK:
                self._submit_ocr_scan()
    
    def _start_ocr_capture(self):
        """Start OCR 2-photo capture flow"""
        if not self.camera.is_available():
            self.camera.start()
        
        self.ocr_handler.reset()
        self.state_manager.start_ocr_capture()
        self.tts_service.speak_tagalog("ocr_front")
    
    def _capture_ocr_photo(self, side: str):
        """Capture OCR photo (front or back)"""
        frame = self.camera.capture_photo()
        if frame is None:
            self._show_error("Camera Error", "Failed to capture photo")
            return
        
        # Convert to RGB for PIL
        rgb_frame = self.camera.bgr_to_rgb(frame)
        img = Image.fromarray(rgb_frame)
        
        # Save photo
        self.ocr_handler.capture_photo(side, img)
        
        # Advance to preview
        self.state_manager.advance_ocr_step()
        
        # TTS feedback
        if side == 'front':
            self.tts_service.speak_tagalog("ocr_back")
        else:
            self.tts_service.speak_tagalog("ocr_complete")
    
    def _retake_ocr_photo(self):
        """Retake current OCR photo"""
        step = self.state_manager.ocr_capture_step
        
        if step == OCRCaptureStep.PREVIEW_FRONT:
            self.ocr_handler.retake_current()
            self.state_manager.ocr_capture_step = OCRCaptureStep.READY_FRONT
        elif step == OCRCaptureStep.PREVIEW_BACK:
            self.ocr_handler.retake_current()
            self.state_manager.ocr_capture_step = OCRCaptureStep.READY_BACK
    
    def _submit_ocr_scan(self):
        """Submit OCR photos to API"""
        if not self.ocr_handler.can_submit():
            self._show_error("OCR Error", "Both photos required")
            return
        
        self.state_manager.change_state(KioskState.PROCESSING)
        self.led_service.set_processing()
        
        def process():
            try:
                # Get combined OCR text
                ocr_text = self.ocr_handler.get_combined_ocr_text()
                
                # Send to API
                result = self.api_service.scan_product_ocr(ocr_text)
                
                # Display result
                self.root.after(0, lambda: self._show_compliance_result(result))
                
            except Exception as e:
                print(f"OCR processing error: {e}")
                self.root.after(0, lambda: self._show_error("Processing Error", str(e)))
        
        threading.Thread(target=process, daemon=True).start()
    
    def _show_compliance_result(self, result: dict):
        """Display OCR compliance result"""
        self.state_manager.change_state(KioskState.DISPLAY_COMPLIANCE, auto_reset_seconds=15)
        
        if result.get('success'):
            self.led_service.set_success()
            self.tts_service.speak_tagalog("success")
        else:
            self.led_service.set_error()
            self.tts_service.speak_tagalog("error")
    
    def _show_error(self, title: str, message: str):
        """Display error screen"""
        self.state_manager.change_state(KioskState.ERROR, auto_reset_seconds=10)
        self.led_service.set_error()
        self.tts_service.speak_tagalog("error")
    
    def _update_display(self):
        """Main display update loop"""
        try:
            state = self.state_manager.current_state
            
            # Handle camera states
            if state in [KioskState.IDLE, KioskState.SCANNING, KioskState.OCR_CAPTURE]:
                if not self.camera.is_available():
                    self.camera.start()
                
                success, frame = self.camera.read_frame()
                if success and frame is not None:
                    # Check for QR codes if in scanning mode
                    if state == KioskState.IDLE:
                        qr_results = self.camera.detect_qr_codes(frame)
                        if qr_results and time.time() > self.scan_cooldown_until:
                            qr_data, _ = qr_results[0]
                            if qr_data != self.last_scanned_qr:
                                self._process_qr_code(qr_data)
                        
                        # Draw QR overlay
                        if qr_results:
                            frame = self.camera.draw_qr_overlay(frame, qr_results)
                    
                    # Convert and display frame
                    rgb_frame = self.camera.bgr_to_rgb(frame)
                    img = Image.fromarray(rgb_frame)
                    
                    # Render appropriate screen with camera feed
                    if state == KioskState.OCR_CAPTURE:
                        front_img = self.ocr_handler.get_image('front')
                        back_img = self.ocr_handler.get_image('back')
                        self.screens['ocr_capture'].render(
                            self.canvas,
                            self.state_manager.ocr_capture_step,
                            img, front_img, back_img
                        )
                    else:
                        self.screens['idle'].render(self.canvas, show_camera=True, frame_image=img)
            
            # Handle non-camera states
            elif state == KioskState.PROCESSING:
                self.screens['processing'].render(self.canvas, "Verifying Certificate...")
            
            elif state == KioskState.MAINTENANCE:
                self.screens['maintenance'].render(self.canvas)
            
            # Schedule next update
            self.root.after(33, self._update_display)  # ~30 FPS
            
        except Exception as e:
            print(f"Display update error: {e}")
            self.root.after(100, self._update_display)
    
    def _process_qr_code(self, qr_data: str):
        """Process scanned QR code"""
        self.last_scanned_qr = qr_data
        self.scan_cooldown_until = time.time() + Timing.SCAN_COOLDOWN
        
        self.state_manager.change_state(KioskState.PROCESSING)
        self.led_service.set_processing()
        self.tts_service.speak_tagalog("scanning")
        
        def process():
            try:
                result = self.api_service.get_certificate_by_id(qr_data)
                
                if result.get('success'):
                    cert_data = CertificateData(**result.get('data', {}))
                    self.root.after(0, lambda: self._show_certificate(cert_data))
                else:
                    self.root.after(0, lambda: self._show_error("Verification Failed", 
                                                                result.get('message', 'Unknown error')))
            except Exception as e:
                print(f"QR processing error: {e}")
                self.root.after(0, lambda: self._show_error("Processing Error", str(e)))
        
        threading.Thread(target=process, daemon=True).start()
    
    def _show_certificate(self, cert: CertificateData):
        """Display certificate details"""
        self.state_manager.change_state(KioskState.DISPLAY_CERTIFICATE, auto_reset_seconds=15)
        
        if cert.status == "valid":
            self.led_service.set_success()
            self.tts_service.speak_tagalog("success")
        else:
            self.led_service.set_error()
            self.tts_service.speak_tagalog("fraud")
    
    def _exit_app(self):
        """Clean up and exit"""
        self.camera.stop()
        self.led_service.cleanup()
        self.root.quit()


def main():
    """Main entry point"""
    root = tk.Tk()
    app = RCVKioskApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
