"""State manager for RCV Kiosk - Handles state transitions and business logic"""

from config import KioskState, OCRCaptureStep
from typing import Optional, Callable
import time
from threading import Timer


class KioskStateManager:
    """Manages state transitions and timeouts for the kiosk"""
    
    def __init__(self):
        self.current_state = KioskState.CAMERA_OFF
        self.ocr_capture_step = OCRCaptureStep.READY_FRONT
        self._timeout_timer: Optional[Timer] = None
        self._state_change_callbacks = []
        
    def add_state_change_callback(self, callback: Callable[[KioskState], None]):
        """Register a callback to be called when state changes"""
        self._state_change_callbacks.append(callback)
        
    def change_state(self, new_state: KioskState, auto_reset_seconds: Optional[int] = None):
        """
        Change to a new state and optionally set auto-reset timeout
        
        Args:
            new_state: The state to transition to
            auto_reset_seconds: If provided, automatically reset to IDLE after this many seconds
        """
        # Cancel any existing timeout
        self.cancel_timeout()
        
        # Update state
        old_state = self.current_state
        self.current_state = new_state
        
        # Notify callbacks
        for callback in self._state_change_callbacks:
            try:
                callback(new_state)
            except Exception as e:
                print(f"Error in state change callback: {e}")
        
        print(f"State changed: {old_state.value} -> {new_state.value}")
        
        # Set auto-reset timeout if specified
        if auto_reset_seconds:
            self._timeout_timer = Timer(auto_reset_seconds, self._auto_reset_to_idle)
            self._timeout_timer.start()
            
    def _auto_reset_to_idle(self):
        """Internal method to reset to IDLE state"""
        print(f"Auto-reset timeout triggered from {self.current_state.value}")
        self.change_state(KioskState.IDLE)
        
    def cancel_timeout(self):
        """Cancel any pending auto-reset timeout"""
        if self._timeout_timer:
            self._timeout_timer.cancel()
            self._timeout_timer = None
            
    def reset_to_idle(self):
        """Reset to IDLE state"""
        self.cancel_timeout()
        self.change_state(KioskState.IDLE)
        
    def start_ocr_capture(self):
        """Start OCR capture flow"""
        self.ocr_capture_step = OCRCaptureStep.READY_FRONT
        self.change_state(KioskState.OCR_CAPTURE)
        
    def advance_ocr_step(self):
        """Advance to next step in OCR capture"""
        step_order = [
            OCRCaptureStep.READY_FRONT,
            OCRCaptureStep.PREVIEW_FRONT,
            OCRCaptureStep.READY_BACK,
            OCRCaptureStep.PREVIEW_BACK,
            OCRCaptureStep.SUBMITTING
        ]
        
        current_index = step_order.index(self.ocr_capture_step)
        if current_index < len(step_order) - 1:
            self.ocr_capture_step = step_order[current_index + 1]
            return True
        return False
        
    def is_idle(self) -> bool:
        """Check if in IDLE state"""
        return self.current_state == KioskState.IDLE
        
    def is_scanning(self) -> bool:
        """Check if in scanning mode (IDLE or SCANNING)"""
        return self.current_state in [KioskState.IDLE, KioskState.SCANNING]
        
    def is_ocr_mode(self) -> bool:
        """Check if in OCR capture mode"""
        return self.current_state == KioskState.OCR_CAPTURE
        
    def can_scan(self) -> bool:
        """Check if kiosk can scan QR codes"""
        return self.current_state in [KioskState.IDLE, KioskState.SCANNING, KioskState.OCR_CAPTURE]
