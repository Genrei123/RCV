"""
HTTP Control Server for Kiosk Machine
Allows remote control of kiosk functions (restart, mode change, LED control)
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import os
import sys

class KioskControlServer:
    """
    HTTP server that listens for control commands from the debug tool
    Runs on port 8000 by default
    """
    
    def __init__(self, kiosk_app, port=8000):
        """
        Initialize control server
        
        Args:
            kiosk_app: Reference to main KioskApp instance
            port: Port to run server on (default 8000)
        """
        self.kiosk_app = kiosk_app
        self.port = port
        self.app = Flask(__name__)
        CORS(self.app)  # Allow cross-origin requests
        
        self._setup_routes()
        self._server_thread = None
        
    def _setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/status', methods=['GET'])
        def get_status():
            """Get current kiosk status"""
            try:
                return jsonify({
                    'mode': self.kiosk_app.state.value if hasattr(self.kiosk_app, 'state') else 'unknown',
                    'leds': {
                        'processing': self.kiosk_app.gpio_service.get_led_state('processing') if hasattr(self.kiosk_app, 'gpio_service') else False,
                        'success': self.kiosk_app.gpio_service.get_led_state('success') if hasattr(self.kiosk_app, 'gpio_service') else False,
                        'error': self.kiosk_app.gpio_service.get_led_state('error') if hasattr(self.kiosk_app, 'gpio_service') else False,
                    }
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/led/<led_name>/toggle', methods=['POST'])
        def toggle_led(led_name):
            """Toggle an LED"""
            try:
                if not hasattr(self.kiosk_app, 'gpio_service'):
                    return jsonify({'error': 'GPIO service not available'}), 503
                
                valid_leds = ['processing', 'success', 'error']
                if led_name not in valid_leds:
                    return jsonify({'error': f'Invalid LED name. Must be one of: {valid_leds}'}), 400
                
                # Get current state and toggle
                current_state = self.kiosk_app.gpio_service.get_led_state(led_name)
                new_state = not current_state
                
                # Set LED
                if led_name == 'processing':
                    if new_state:
                        self.kiosk_app.gpio_service.turn_on_processing()
                    else:
                        self.kiosk_app.gpio_service.turn_off_processing()
                elif led_name == 'success':
                    if new_state:
                        self.kiosk_app.gpio_service.turn_on_success()
                    else:
                        self.kiosk_app.gpio_service.turn_off_success()
                elif led_name == 'error':
                    if new_state:
                        self.kiosk_app.gpio_service.turn_on_error()
                    else:
                        self.kiosk_app.gpio_service.turn_off_error()
                
                # Update health service
                if hasattr(self.kiosk_app, 'health_service'):
                    self.kiosk_app.health_service.set_led_status(led_name, new_state)
                
                return jsonify({
                    'success': True,
                    'led': led_name,
                    'state': new_state
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/led/test-all', methods=['POST'])
        def test_all_leds():
            """Test all LEDs in sequence"""
            try:
                if not hasattr(self.kiosk_app, 'gpio_service'):
                    return jsonify({'error': 'GPIO service not available'}), 503
                
                # Test sequence
                def test_sequence():
                    import time
                    leds = ['processing', 'success', 'error']
                    for led in leds:
                        # Turn on
                        if led == 'processing':
                            self.kiosk_app.gpio_service.turn_on_processing()
                        elif led == 'success':
                            self.kiosk_app.gpio_service.turn_on_success()
                        elif led == 'error':
                            self.kiosk_app.gpio_service.turn_on_error()
                        time.sleep(1)
                        
                        # Turn off
                        if led == 'processing':
                            self.kiosk_app.gpio_service.turn_off_processing()
                        elif led == 'success':
                            self.kiosk_app.gpio_service.turn_off_success()
                        elif led == 'error':
                            self.kiosk_app.gpio_service.turn_off_error()
                        time.sleep(0.5)
                
                # Run in background thread
                threading.Thread(target=test_sequence, daemon=True).start()
                
                return jsonify({'success': True, 'message': 'LED test sequence started'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/control/restart', methods=['POST'])
        def restart_kiosk():
            """Restart kiosk application"""
            try:
                print("Restart command received from remote control")
                
                def do_restart():
                    import time
                    time.sleep(1)  # Give time to send response
                    os.execv(sys.executable, ['python'] + sys.argv)
                
                # Run restart in background thread
                threading.Thread(target=do_restart, daemon=True).start()
                
                return jsonify({'success': True, 'message': 'Restarting kiosk application...'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/control/shutdown', methods=['POST'])
        def shutdown_kiosk():
            """Shutdown kiosk machine"""
            try:
                print("Shutdown command received from remote control")
                
                def do_shutdown():
                    import time
                    time.sleep(1)  # Give time to send response
                    if os.name == 'posix':  # Linux/Raspberry Pi
                        os.system('sudo shutdown -h now')
                    else:  # Windows (for testing)
                        print("Shutdown command (would execute on Raspberry Pi)")
                
                # Run shutdown in background thread
                threading.Thread(target=do_shutdown, daemon=True).start()
                
                return jsonify({'success': True, 'message': 'Shutting down kiosk...'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/control/mode', methods=['POST'])
        def set_mode():
            """Change kiosk operating mode"""
            try:
                data = request.json
                if not data or 'mode' not in data:
                    return jsonify({'error': 'mode is required'}), 400
                
                mode = data['mode']
                valid_modes = ['idle', 'scanner', 'ocr', 'slideshow']
                
                if mode not in valid_modes:
                    return jsonify({'error': f'Invalid mode. Must be one of: {valid_modes}'}), 400
                
                # Update mode in kiosk app
                # This would need to be implemented in your KioskApp
                print(f"Mode change requested: {mode}")
                
                # Update health service
                if hasattr(self.kiosk_app, 'health_service'):
                    self.kiosk_app.health_service.set_mode(mode)
                
                return jsonify({'success': True, 'mode': mode})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
    
    def start(self):
        """Start the control server in a background thread"""
        if self._server_thread and self._server_thread.is_alive():
            print("Control server already running")
            return
        
        def run_server():
            print(f"Starting kiosk control server on port {self.port}")
            print(f"Endpoints available:")
            print(f"  GET  http://localhost:{self.port}/status")
            print(f"  POST http://localhost:{self.port}/led/<name>/toggle")
            print(f"  POST http://localhost:{self.port}/led/test-all")
            print(f"  POST http://localhost:{self.port}/control/restart")
            print(f"  POST http://localhost:{self.port}/control/shutdown")
            print(f"  POST http://localhost:{self.port}/control/mode")
            self.app.run(host='0.0.0.0', port=self.port, debug=False, use_reloader=False)
        
        self._server_thread = threading.Thread(target=run_server, daemon=True)
        self._server_thread.start()
        print(f"Control server started on http://0.0.0.0:{self.port}")
    
    def stop(self):
        """Stop the control server"""
        # Flask doesn't have a clean way to stop from code
        # But since we're using daemon thread, it will stop when main thread stops
        print("Control server stopping...")
