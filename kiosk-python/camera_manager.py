"""Camera manager for RCV Kiosk - Handles camera operations"""

import cv2
import numpy as np
from pyzbar import pyzbar
from typing import Optional, Tuple, List
import threading
import time


class CameraManager:
    """Manages camera capture and QR code detection"""
    
    def __init__(self, camera_index: int = 0):
        self.camera_index = camera_index
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self._lock = threading.Lock()
        
    def start(self) -> bool:
        """Start camera capture"""
        with self._lock:
            if self.cap is not None:
                return True  # Already running
                
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                print(f"Error: Could not open camera {self.camera_index}")
                return False
                
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.is_running = True
            print(f"Camera {self.camera_index} started successfully")
            return True
    
    def stop(self):
        """Stop camera capture"""
        with self._lock:
            self.is_running = False
            if self.cap:
                self.cap.release()
                self.cap = None
                print("Camera stopped")
    
    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """
        Read a frame from the camera
        
        Returns:
            Tuple of (success, frame) where frame is BGR numpy array
        """
        with self._lock:
            if not self.cap or not self.is_running:
                return False, None
            return self.cap.read()
    
    def capture_photo(self) -> Optional[np.ndarray]:
        """
        Capture a single photo from camera
        
        Returns:
            BGR numpy array of captured image, or None if failed
        """
        success, frame = self.read_frame()
        if success and frame is not None:
            return frame.copy()
        return None
    
    def detect_qr_codes(self, frame: np.ndarray) -> List[Tuple[str, np.ndarray]]:
        """
        Detect QR codes in a frame
        
        Args:
            frame: BGR image from camera
            
        Returns:
            List of tuples (decoded_data, polygon_points)
        """
        if frame is None:
            return []
        
        # Decode QR codes
        decoded_objects = pyzbar.decode(frame)
        
        results = []
        for obj in decoded_objects:
            # Extract data
            data = obj.data.decode('utf-8')
            
            # Extract polygon points for visualization
            points = np.array([[point.x, point.y] for point in obj.polygon], dtype=np.int32)
            
            results.append((data, points))
        
        return results
    
    def draw_qr_overlay(self, frame: np.ndarray, qr_results: List[Tuple[str, np.ndarray]]) -> np.ndarray:
        """
        Draw QR code detection overlay on frame
        
        Args:
            frame: Original BGR frame
            qr_results: List of (data, polygon) tuples from detect_qr_codes
            
        Returns:
            Frame with overlay drawn
        """
        frame_with_overlay = frame.copy()
        
        for data, points in qr_results:
            # Draw polygon around QR code
            cv2.polylines(frame_with_overlay, [points], True, (0, 255, 0), 3)
            
            # Draw detected data text
            x, y = points[0]
            cv2.putText(frame_with_overlay, "QR Detected", (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return frame_with_overlay
    
    def resize_for_display(self, frame: np.ndarray, target_width: int, target_height: int) -> np.ndarray:
        """
        Resize frame to fit display area while maintaining aspect ratio
        
        Args:
            frame: Original frame
            target_width: Target display width
            target_height: Target display height
            
        Returns:
            Resized frame
        """
        h, w = frame.shape[:2]
        
        # Calculate scaling factor to fit within target while maintaining aspect ratio
        scale_w = target_width / w
        scale_h = target_height / h
        scale = min(scale_w, scale_h)
        
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Create canvas with target size
        canvas = np.zeros((target_height, target_width, 3), dtype=np.uint8)
        
        # Center the resized image on canvas
        y_offset = (target_height - new_h) // 2
        x_offset = (target_width - new_w) // 2
        canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        return canvas
    
    def bgr_to_rgb(self, frame: np.ndarray) -> np.ndarray:
        """Convert BGR frame to RGB for PIL/Tkinter"""
        return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    def is_available(self) -> bool:
        """Check if camera is available and running"""
        with self._lock:
            return self.cap is not None and self.is_running
