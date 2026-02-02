"""
GPIO LED Control Service for Raspberry Pi
"""
import threading
import time
from config import LEDPins

# Check GPIO availability
GPIO_AVAILABLE = False
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    print("RPi.GPIO not available. LED indicators disabled.")

class GPIOLEDService:
    """Service to control status LEDs via GPIO on Raspberry Pi"""
    
    def __init__(self):
        self.enabled = GPIO_AVAILABLE
        self.blink_thread = None
        self.is_blinking = False
        self.blink_stop_event = threading.Event()
        
        if self.enabled:
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            GPIO.setup(LEDPins.PIN_PROCESSING, GPIO.OUT)
            GPIO.setup(LEDPins.PIN_SUCCESS, GPIO.OUT)
            GPIO.setup(LEDPins.PIN_ERROR, GPIO.OUT)
            self.all_off()
            print("✅ GPIO LED service initialized")
    
    def all_off(self):
        """Turn off all LEDs"""
        if not self.enabled:
            return
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
        except Exception as e:
            print(f"GPIO error: {e}")
    
    def start_processing(self):
        """Start blinking processing LED"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        
        try:
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
        except:
            pass
        
        self.is_blinking = True
        self.blink_stop_event.clear()
        self.blink_thread = threading.Thread(target=self._blink_processing, daemon=True)
        self.blink_thread.start()
        print("🔄 Processing LED blinking")
    
    def _blink_processing(self):
        """Blink the processing LED at 2Hz"""
        try:
            while self.is_blinking and not self.blink_stop_event.is_set():
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.HIGH)
                time.sleep(0.25)
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
                time.sleep(0.25)
        except Exception as e:
            print(f"LED blink error: {e}")
        finally:
            try:
                GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            except:
                pass
    
    def stop_blinking(self):
        """Stop blinking processing LED"""
        if not self.enabled:
            return
        
        self.is_blinking = False
        self.blink_stop_event.set()
        
        if self.blink_thread and self.blink_thread.is_alive():
            self.blink_thread.join(timeout=1)
        
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
        except:
            pass
    
    def show_success(self):
        """Show success - solid green LED"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.LOW)
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.HIGH)
            print("✅ Success LED ON")
        except Exception as e:
            print(f"GPIO error: {e}")
    
    def show_error(self):
        """Show error - solid red LED"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        try:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
            GPIO.output(LEDPins.PIN_SUCCESS, GPIO.LOW)
            GPIO.output(LEDPins.PIN_ERROR, GPIO.HIGH)
            print("❌ Error LED ON")
        except Exception as e:
            print(f"GPIO error: {e}")
    
    def show_idle(self):
        """Show idle state - all LEDs off"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        self.all_off()
        print("💤 All LEDs OFF (idle)")
    
    def cleanup(self):
        """Cleanup GPIO on exit"""
        if not self.enabled:
            return
        
        self.stop_blinking()
        self.all_off()
        try:
            GPIO.cleanup()
            print("GPIO cleanup complete")
        except:
            pass
