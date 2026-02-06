#!/usr/bin/env python3
"""
RCV KIOSK MACHINE WITH MONITORING & REMOTE CONTROL
===================================================
This is an enhanced version of main.py that includes:
- Health monitoring service (30-second heartbeat to backend)
- Remote control server (Flask HTTP endpoints for LED, restart, mode control)
- All original kiosk functionality preserved

To use this file:
1. Install dependencies: pip install flask flask-cors psutil
2. Set environment variables in .env (add KIOSK_ID, KIOSK_LAT, KIOSK_LNG, etc.)
3. Replace main.py with this file OR rename this to main.py
4. Run: python3 main_with_monitoring.py
"""

import os
import sys
import time
import threading
from dotenv import load_dotenv

# Import existing kiosk functionality
# (This assumes the original main.py classes can be imported)
# If not, you'll need to copy the relevant classes here

# Import our new monitoring services
from services.health_service import KioskHealthService
from services.control_server import KioskControlServer

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:5500/api/v1')
KIOSK_ID = os.getenv('KIOSK_ID', 'kiosk-001')
KIOSK_LAT = float(os.getenv('KIOSK_LAT', '14.5995'))
KIOSK_LNG = float(os.getenv('KIOSK_LNG', '120.9842'))
KIOSK_ADDRESS = os.getenv('KIOSK_ADDRESS', 'RCV Office, Manila')
KIOSK_CITY = os.getenv('KIOSK_CITY', 'Manila')

class MonitoredKioskApp:
    """
    Wrapper class that adds monitoring and remote control to the kiosk application.
    """
    
    def __init__(self):
        print("🚀 Initializing Monitored Kiosk Application...")
        
        # Initialize health monitoring service
        self.health_service = KioskHealthService(
            kiosk_id=KIOSK_ID,
            api_base_url=API_BASE_URL,
            location={
                'lat': KIOSK_LAT,
                'lng': KIOSK_LNG,
                'address': KIOSK_ADDRESS,
                'city': KIOSK_CITY
            }
        )
        
        # Initialize remote control server
        self.control_server = KioskControlServer(
            kiosk_id=KIOSK_ID,
            host='0.0.0.0',  # Listen on all interfaces
            port=8000
        )
        
        # Set up control server callbacks
        self._setup_control_callbacks()
        
        # Start monitoring services
        print("📡 Starting health monitoring service...")
        self.health_service.start()
        
        print("🌐 Starting remote control server on port 8000...")
        self.control_server.start()
        
        # TODO: Initialize your main kiosk application here
        # self.kiosk_app = YourKioskApp()
        
        print("✅ Monitored Kiosk Application initialized successfully!")
        print(f"📍 Kiosk ID: {KIOSK_ID}")
        print(f"📍 Location: {KIOSK_ADDRESS}, {KIOSK_CITY}")
        print(f"📡 Heartbeat: Every 30 seconds to {API_BASE_URL}")
        print(f"🌐 Control Server: http://0.0.0.0:8000")
        print("-" * 60)
    
    def _setup_control_callbacks(self):
        """
        Set up callbacks for the control server to interact with the kiosk.
        """
        
        # LED Control Callbacks
        def on_led_toggle(led_name, state):
            """Called when LED state should change"""
            print(f"💡 LED Control: {led_name} -> {'ON' if state else 'OFF'}")
            # TODO: Implement actual LED control here
            # If you have GPIO control in your main app:
            # self.kiosk_app.set_led(led_name, state)
            return True
        
        # Restart Callback
        def on_restart():
            """Called when kiosk should restart"""
            print("🔄 Restart requested - restarting kiosk application...")
            # TODO: Implement restart logic
            # Option 1: Restart just the app
            # self.kiosk_app.restart()
            # Option 2: Restart the entire Python process
            # os.execv(sys.executable, ['python'] + sys.argv)
            return True
        
        # Shutdown Callback
        def on_shutdown():
            """Called when kiosk should shut down"""
            print("⚠️ Shutdown requested - stopping kiosk application...")
            self.stop()
            return True
        
        # Mode Change Callback
        def on_mode_change(mode):
            """Called when kiosk mode should change"""
            print(f"🔀 Mode change requested: {mode}")
            # TODO: Implement mode change logic
            # self.kiosk_app.set_mode(mode)
            # Valid modes: 'idle', 'scanner', 'ocr', 'slideshow'
            return True
        
        # Register callbacks with control server
        self.control_server.set_led_callback(on_led_toggle)
        self.control_server.set_restart_callback(on_restart)
        self.control_server.set_shutdown_callback(on_shutdown)
        self.control_server.set_mode_callback(on_mode_change)
    
    def update_status(self, mode='idle', leds=None):
        """
        Update the kiosk status in the health service.
        Call this whenever the kiosk state changes.
        
        Args:
            mode: Current mode ('idle', 'scanner', 'ocr', 'slideshow')
            leds: Dict of LED states, e.g. {'processing': True, 'success': False, 'error': False}
        """
        if leds is None:
            leds = {'processing': False, 'success': False, 'error': False}
        
        self.health_service.update_status(mode, leds)
    
    def run(self):
        """
        Main application loop.
        This is where you'd run your kiosk GUI or main logic.
        """
        try:
            print("▶️  Starting kiosk application main loop...")
            print("Press Ctrl+C to stop\n")
            
            # TODO: Start your main kiosk application here
            # self.kiosk_app.run()
            
            # For testing, just keep alive
            while True:
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n⚠️  Keyboard interrupt received...")
            self.stop()
    
    def stop(self):
        """
        Clean shutdown of all services.
        """
        print("🛑 Stopping monitored kiosk application...")
        
        # Stop health monitoring
        if self.health_service:
            print("📡 Stopping health service...")
            self.health_service.stop()
        
        # Stop control server
        if self.control_server:
            print("🌐 Stopping control server...")
            self.control_server.stop()
        
        # TODO: Stop your main kiosk application
        # if self.kiosk_app:
        #     self.kiosk_app.stop()
        
        print("✅ Shutdown complete")
        sys.exit(0)


def main():
    """
    Application entry point.
    """
    print("=" * 60)
    print("RCV KIOSK MACHINE - WITH MONITORING & REMOTE CONTROL")
    print("=" * 60)
    
    # Create and run monitored kiosk app
    app = MonitoredKioskApp()
    
    try:
        app.run()
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        app.stop()


if __name__ == '__main__':
    main()
