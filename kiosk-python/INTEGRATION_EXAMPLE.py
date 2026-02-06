"""
INTEGRATION EXAMPLE - Add to main.py

This shows how to integrate the health service and control server into your existing kiosk app.
"""

# ============================================================================
# Step 1: Add imports at the top of main.py (after existing imports)
# ============================================================================

from services.health_service import KioskHealthService
from services.control_server import KioskControlServer

# ============================================================================
# Step 2: Inside KioskApp.__init__ (after self.root = root)
# ============================================================================

def __init__(self, root):
    self.root = root
    # ... existing initialization code ...
    
    # Initialize health service
    try:
        self.health_service = KioskHealthService(
            api_base_url=os.getenv('API_BASE_URL', 'http://localhost:5500/api/v1'),
            kiosk_id=os.getenv('KIOSK_ID', 'kiosk-001'),
            location={
                'lat': float(os.getenv('KIOSK_LAT', '14.5995')),
                'lng': float(os.getenv('KIOSK_LNG', '120.9842')),
                'address': os.getenv('KIOSK_ADDRESS', 'SM City Manila'),
                'city': os.getenv('KIOSK_CITY', 'Manila'),
            }
        )
        self.health_service.start()
        print("Health service started")
    except Exception as e:
        print(f"Failed to start health service: {e}")
        self.health_service = None
    
    # Initialize control server
    try:
        self.control_server = KioskControlServer(self, port=8000)
        self.control_server.start()
        print("Control server started")
    except Exception as e:
        print(f"Failed to start control server: {e}")
        self.control_server = None
    
    # ... rest of your initialization ...

# ============================================================================
# Step 3: Update state changes to notify health service
# ============================================================================

# Find your set_state or change_state method and add:

def set_state(self, new_state):
    """Change kiosk state"""
    self.state = new_state
    
    # Update health service
    if hasattr(self, 'health_service') and self.health_service:
        self.health_service.set_mode(new_state.value)
    
    # ... rest of your state change code ...

# ============================================================================
# Step 4: Update GPIO LED service to notify health service
# ============================================================================

# Inside GPIOLEDService class, modify LED control methods:

class GPIOLEDService:
    def __init__(self, kiosk_app=None):
        self.kiosk_app = kiosk_app
        # ... existing init code ...
    
    def turn_on_processing(self):
        """Turn on processing LED"""
        # Your existing GPIO code
        if GPIO_AVAILABLE:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.HIGH)
        self.led_states['processing'] = True
        
        # Notify health service
        if self.kiosk_app and hasattr(self.kiosk_app, 'health_service'):
            self.kiosk_app.health_service.set_led_status('processing', True)
    
    def turn_off_processing(self):
        """Turn off processing LED"""
        # Your existing GPIO code
        if GPIO_AVAILABLE:
            GPIO.output(LEDPins.PIN_PROCESSING, GPIO.LOW)
        self.led_states['processing'] = False
        
        # Notify health service
        if self.kiosk_app and hasattr(self.kiosk_app, 'health_service'):
            self.kiosk_app.health_service.set_led_status('processing', False)
    
    # Repeat for turn_on_success, turn_off_success, turn_on_error, turn_off_error
    
    def get_led_state(self, led_name):
        """Get LED state"""
        return self.led_states.get(led_name, False)

# ============================================================================
# Step 5: Add cleanup on exit
# ============================================================================

# In your cleanup or on_closing method:

def cleanup(self):
    """Cleanup before closing"""
    print("Cleaning up...")
    
    # Stop health service
    if hasattr(self, 'health_service') and self.health_service:
        self.health_service.stop()
    
    # Stop control server
    if hasattr(self, 'control_server') and self.control_server:
        self.control_server.stop()
    
    # ... rest of cleanup code ...

# ============================================================================
# Step 6: Update requirements.txt
# ============================================================================

# Add these to kiosk-python/requirements.txt:
# flask==3.0.0
# flask-cors==4.0.0
# psutil==5.9.0

# Then run: pip install -r requirements.txt

# ============================================================================
# Step 7: Update .env file
# ============================================================================

# Add to kiosk-python/.env:
# API_BASE_URL=http://localhost:5500/api/v1
# KIOSK_ID=kiosk-001
# KIOSK_LAT=14.5995
# KIOSK_LNG=120.9842
# KIOSK_ADDRESS=SM City Manila, Arroceros St, Ermita
# KIOSK_CITY=Manila

# ============================================================================
# TESTING
# ============================================================================

# 1. Start the kiosk app:
#    python main.py
#
# 2. You should see:
#    Starting heartbeat service for kiosk kiosk-001
#    Health service started
#    Starting kiosk control server on port 8000
#    Control server started
#
# 3. Test status endpoint:
#    curl http://localhost:8000/status
#
# 4. Test LED toggle:
#    curl -X POST http://localhost:8000/led/processing/toggle
#
# 5. Test LED test sequence:
#    curl -X POST http://localhost:8000/led/test-all
#
# 6. Watch console for heartbeat messages:
#    ✓ Heartbeat sent successfully: idle

print("Integration complete!")
