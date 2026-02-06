"""
Health Check Service for RCV Kiosk Machine
Sends periodic heartbeat signals to the backend server
"""

import threading
import time
import requests
import platform
import psutil
from typing import Dict, Any, Optional
import os

class KioskHealthService:
    """
    Service that sends periodic health checks to the backend server
    Reports location, status, and system info
    """
    
    def __init__(self, api_base_url: str, kiosk_id: str, location: Dict[str, Any]):
        """
        Initialize health check service
        
        Args:
            api_base_url: Base URL of the API (e.g., http://localhost:5500/api/v1)
            kiosk_id: Unique identifier for this kiosk
            location: Dict with lat, lng, address, city
        """
        self.api_base_url = api_base_url.rstrip('/')
        self.kiosk_id = kiosk_id
        self.location = location
        self.current_mode = 'idle'
        self.leds = {
            'processing': False,
            'success': False,
            'error': False
        }
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._heartbeat_interval = 30  # seconds
        
    def set_mode(self, mode: str):
        """Update the current kiosk mode"""
        self.current_mode = mode
        
    def set_led_status(self, led_name: str, is_on: bool):
        """Update LED status"""
        if led_name in self.leds:
            self.leds[led_name] = is_on
            
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information"""
        try:
            cpu_temp = None
            
            # Try to get CPU temperature (Raspberry Pi)
            if platform.system() == 'Linux':
                try:
                    with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                        cpu_temp = float(f.read()) / 1000.0
                except:
                    pass
            
            return {
                'cpuTemp': cpu_temp,
                'diskUsage': psutil.disk_usage('/').percent,
                'memoryUsage': psutil.virtual_memory().percent,
                'cpuPercent': psutil.cpu_percent(interval=1),
            }
        except Exception as e:
            print(f"Error getting system info: {e}")
            return {}
    
    def send_heartbeat(self) -> bool:
        """
        Send heartbeat to backend server
        Returns True if successful
        """
        try:
            payload = {
                'kioskId': self.kiosk_id,
                'name': f'Kiosk {self.kiosk_id}',
                'location': self.location,
                'mode': self.current_mode,
                'leds': self.leds,
                'systemInfo': self.get_system_info(),
            }
            
            response = requests.post(
                f'{self.api_base_url}/kiosks/heartbeat',
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✓ Heartbeat sent successfully: {self.current_mode}")
                return True
            else:
                print(f"✗ Heartbeat failed: {response.status_code}")
                return False
                
        except requests.exceptions.Timeout:
            print("✗ Heartbeat timeout")
            return False
        except requests.exceptions.ConnectionError:
            print("✗ Heartbeat connection error - server may be down")
            return False
        except Exception as e:
            print(f"✗ Heartbeat error: {e}")
            return False
    
    def _heartbeat_loop(self):
        """Background thread that sends periodic heartbeats"""
        print(f"Starting heartbeat service for kiosk {self.kiosk_id}")
        print(f"Location: {self.location.get('address', 'Unknown')}")
        print(f"Interval: {self._heartbeat_interval} seconds")
        
        while self._running:
            self.send_heartbeat()
            time.sleep(self._heartbeat_interval)
    
    def start(self):
        """Start the heartbeat service"""
        if self._running:
            print("Heartbeat service already running")
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._thread.start()
        print("Heartbeat service started")
        
    def stop(self):
        """Stop the heartbeat service"""
        if not self._running:
            return
            
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        print("Heartbeat service stopped")


# Example usage in main.py:
"""
# At the top of your main.py, after imports:
from services.health_service import KioskHealthService

# Inside your KioskApp.__init__:
self.health_service = KioskHealthService(
    api_base_url=os.getenv('API_BASE_URL', 'http://localhost:5500/api/v1'),
    kiosk_id='kiosk-001',  # Unique ID for this kiosk
    location={
        'lat': 14.5995,  # Your kiosk latitude
        'lng': 120.9842,  # Your kiosk longitude
        'address': 'SM City Manila, Arroceros St, Ermita',
        'city': 'Manila'
    }
)

# Start health service when app starts:
self.health_service.start()

# Update mode when state changes:
def set_state(self, new_state: KioskState):
    self.state = new_state
    self.health_service.set_mode(new_state.value)

# Update LED status:
def set_led(self, led_name: str, is_on: bool):
    # Your GPIO LED code here
    self.health_service.set_led_status(led_name, is_on)

# Stop when app closes:
def cleanup(self):
    self.health_service.stop()
"""
