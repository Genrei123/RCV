"""
Firebase Service for RCV Kiosk Machine
======================================
Handles real-time command listening, status updates, and log streaming
via Firebase Firestore.

Commands are written to: kiosks/{kioskId}/commands/{commandId}
Status is written to: kiosks/{kioskId}
Logs are written to: kiosks/{kioskId}/logs/{logId}

This replaces the polling mechanism with instant Firebase listeners.
"""

import os
import sys
import io
import threading
import queue
import traceback
from datetime import datetime, timedelta
from typing import Callable, Optional

# Firebase Admin SDK
FIREBASE_AVAILABLE = False
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    print("⚠️ firebase-admin not installed. Run: pip install firebase-admin")


class FirebaseKioskService:
    """
    Firebase service for real-time kiosk command listening.
    
    Features:
    - Instant command execution via Firestore listeners
    - Status updates to Firestore
    - Automatic reconnection on disconnect
    """
    
    def __init__(self, kiosk_id: str, kiosk_app=None):
        self.kiosk_id = kiosk_id
        self.kiosk_app = kiosk_app
        self._db = None
        self._listener = None
        self._running = False
        self._command_callback: Optional[Callable] = None
        
        # Kiosk info (set via update_kiosk_info)
        self.kiosk_name = f"Kiosk {kiosk_id}"
        self.kiosk_location = {
            'lat': 0,
            'lng': 0,
            'address': '',
            'city': ''
        }
        
    def initialize(self, credentials_path: Optional[str] = None) -> bool:
        """
        Initialize Firebase Admin SDK.
        
        Args:
            credentials_path: Path to Firebase service account JSON file.
                            If None, looks for FIREBASE_CREDENTIALS env var or
                            'firebase-credentials.json' in current directory.
        """
        if not FIREBASE_AVAILABLE:
            print("❌ Firebase Admin SDK not available")
            return False
            
        try:
            # Check if already initialized
            try:
                firebase_admin.get_app()
                print("✓ Firebase already initialized")
            except ValueError:
                # Not initialized, do it now
                cred_path = credentials_path or os.getenv('FIREBASE_CREDENTIALS', 'firebase-credentials.json')
                
                if not os.path.exists(cred_path):
                    print(f"❌ Firebase credentials not found at: {cred_path}")
                    print("   Download from Firebase Console > Project Settings > Service Accounts")
                    return False
                
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print(f"✓ Firebase initialized with: {cred_path}")
            
            self._db = firestore.client()
            return True
            
        except Exception as e:
            print(f"❌ Firebase initialization failed: {e}")
            return False
    
    def update_kiosk_info(self, name: str, lat: float, lng: float, address: str, city: str):
        """Update kiosk information for status updates"""
        self.kiosk_name = name
        self.kiosk_location = {
            'lat': lat,
            'lng': lng,
            'address': address,
            'city': city
        }
    
    def start_listening(self, command_callback: Callable):
        """
        Start listening for commands from Firebase.
        
        Args:
            command_callback: Function to call when a command is received.
                            Signature: callback(command: str, payload: dict)
        """
        if not self._db:
            print("❌ Firebase not initialized. Call initialize() first.")
            return
            
        self._command_callback = command_callback
        self._running = True
        
        # Listen to the commands subcollection for this kiosk
        commands_ref = self._db.collection('kiosks').document(self.kiosk_id).collection('commands')
        
        # Set up the listener
        self._listener = commands_ref.on_snapshot(self._on_commands_snapshot)
        
        print(f"🔥 Firebase listener started for kiosk: {self.kiosk_id}")
        print(f"   Listening at: kiosks/{self.kiosk_id}/commands")
        
        # Update status to online
        self.update_status('online', 'idle')
    
    def _on_commands_snapshot(self, doc_snapshot, changes, read_time):
        """Handle incoming command documents from Firebase"""
        for change in changes:
            if change.type.name == 'ADDED':
                doc = change.document
                data = doc.to_dict()
                
                command = data.get('command')
                payload = data.get('payload', {})
                timestamp = data.get('timestamp')
                
                print(f"📥 Firebase command received: {command}")
                
                # Execute the command
                if self._command_callback:
                    try:
                        self._command_callback(command, payload)
                    except Exception as e:
                        print(f"❌ Command execution error: {e}")
                
                # Delete the command after processing
                try:
                    doc.reference.delete()
                    print(f"✓ Command {doc.id} processed and deleted")
                except Exception as e:
                    print(f"⚠️ Could not delete command: {e}")
    
    def stop_listening(self):
        """Stop listening for commands"""
        self._running = False
        
        if self._listener:
            self._listener.unsubscribe()
            self._listener = None
            
        # Update status to offline
        self.update_status('offline', 'idle')
        
        print("🔥 Firebase listener stopped")
    
    def update_status(self, status: str, mode: str, leds: dict = None, system_info: dict = None):
        """
        Update kiosk status in Firebase.
        
        Args:
            status: 'online' or 'offline'
            mode: Current kiosk mode (idle, scanning, etc.)
            leds: LED states dict
            system_info: System resource info dict
        """
        if not self._db:
            return
            
        try:
            kiosk_ref = self._db.collection('kiosks').document(self.kiosk_id)
            
            update_data = {
                'kioskId': self.kiosk_id,
                'name': self.kiosk_name,
                'status': status,
                'mode': mode,
                'location': self.kiosk_location,
                'lastSeen': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            if leds:
                update_data['leds'] = leds
                
            if system_info:
                update_data['systemInfo'] = system_info
            
            kiosk_ref.set(update_data, merge=True)
            
        except Exception as e:
            print(f"⚠️ Status update failed: {e}")
    
    def send_heartbeat(self, mode: str, leds: dict = None, system_info: dict = None):
        """
        Send a heartbeat update to Firebase (for status tracking).
        Called periodically to update lastSeen timestamp.
        """
        self.update_status('online', mode, leds, system_info)
    
    # =========================================================================
    # LOG STREAMING - Send kiosk logs to Firebase in real-time
    # =========================================================================
    
    def send_log(self, level: str, message: str, category: str = 'general', extra_data: dict = None):
        """
        Send a log entry to Firebase Firestore.
        
        Logs are stored at: kiosks/{kioskId}/logs/{auto-id}
        
        Args:
            level: 'info', 'warning', 'error', 'debug'
            message: The log message text
            category: Log category - 'general', 'ocr', 'scan', 'api', 'system', 'gpio', 'command'
            extra_data: Optional dict with extra context data
        """
        if not self._db:
            return
        
        try:
            logs_ref = self._db.collection('kiosks').document(self.kiosk_id).collection('logs')
            
            log_entry = {
                'level': level,
                'message': message,
                'category': category,
                'kioskId': self.kiosk_id,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'localTime': datetime.now().isoformat(),
            }
            
            if extra_data:
                log_entry['data'] = extra_data
            
            logs_ref.add(log_entry)
            
        except Exception as e:
            # Don't recurse - just write to stderr if logging fails
            sys.stderr.write(f"Log send failed: {e}\n")
    
    def send_log_batch(self, log_entries: list):
        """
        Send multiple log entries in a single batch write for efficiency.
        
        Args:
            log_entries: List of dicts with keys: level, message, category, extra_data
        """
        if not self._db or not log_entries:
            return
        
        try:
            batch = self._db.batch()
            logs_ref = self._db.collection('kiosks').document(self.kiosk_id).collection('logs')
            
            for entry in log_entries:
                doc_ref = logs_ref.document()
                log_data = {
                    'level': entry.get('level', 'info'),
                    'message': entry.get('message', ''),
                    'category': entry.get('category', 'general'),
                    'kioskId': self.kiosk_id,
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'localTime': datetime.now().isoformat(),
                }
                if entry.get('extra_data'):
                    log_data['data'] = entry['extra_data']
                batch.set(doc_ref, log_data)
            
            batch.commit()
            
        except Exception as e:
            sys.stderr.write(f"Batch log send failed: {e}\n")
    
    def cleanup_old_logs(self, hours: int = 24):
        """
        Delete logs older than the specified number of hours.
        Called periodically to prevent unbounded Firestore growth.
        
        Args:
            hours: Delete logs older than this many hours (default: 24)
        """
        if not self._db:
            return
        
        try:
            cutoff = datetime.now() - timedelta(hours=hours)
            logs_ref = self._db.collection('kiosks').document(self.kiosk_id).collection('logs')
            
            # Query old logs
            old_logs = logs_ref.where('localTime', '<', cutoff.isoformat()).limit(100).stream()
            
            batch = self._db.batch()
            count = 0
            for doc in old_logs:
                batch.delete(doc.reference)
                count += 1
            
            if count > 0:
                batch.commit()
                sys.stderr.write(f"Cleaned up {count} old log entries\n")
                
        except Exception as e:
            sys.stderr.write(f"Log cleanup failed: {e}\n")
    
    def clear_all_logs(self):
        """Clear all logs for this kiosk (used by debug tool)"""
        if not self._db:
            return
        
        try:
            logs_ref = self._db.collection('kiosks').document(self.kiosk_id).collection('logs')
            
            # Delete in batches of 100
            while True:
                docs = logs_ref.limit(100).stream()
                batch = self._db.batch()
                count = 0
                for doc in docs:
                    batch.delete(doc.reference)
                    count += 1
                
                if count == 0:
                    break
                    
                batch.commit()
                
        except Exception as e:
            sys.stderr.write(f"Clear logs failed: {e}\n")


class FirebaseLogInterceptor:
    """
    Intercepts Python print() output and sends it to Firebase as logs.
    
    This replaces sys.stdout with a wrapper that:
    1. Still prints to the console (for local debugging)
    2. Sends each print line to Firebase as a log entry
    3. Auto-categorizes messages based on content (OCR, API, GPIO, etc.)
    4. Batches log sends for efficiency (every 2 seconds or 10 messages)
    
    Usage:
        interceptor = FirebaseLogInterceptor(firebase_service)
        interceptor.install()
        # Now all print() calls are captured
        interceptor.uninstall()  # Restore original stdout
    """
    
    # Keywords for auto-categorizing log messages
    CATEGORY_PATTERNS = {
        'camera': ['camera', 'Camera', 'autofocus', 'Video loop', 'focus control', 'camera index', 'camera configured'],
        'capture': ['captured', 'Front captured', 'Back captured', 'Front image', 'Back image', 'capture'],
        'ocr': ['OCR', 'Tesseract', 'ocr_text', 'label scan', 'SCAN LABEL', 'OCR EXTRACTION', 'Upscaled from', 'OCR result', 'OCR API Payload', 'blockOfText'],
        'scan': ['QR', 'barcode', 'scanned', 'scan result', 'decoded', 'qr_data', 'compliance result', 'MANUAL SEARCH'],
        'api': ['API', 'POST ', 'GET ', 'Response', 'endpoint', 'api/', 'scanProduct', 'Connection refused', 'API Response', 'Calling POST', 'Payload:'],
        'gpio': ['GPIO', 'LED', 'gpio', 'led_', 'blink'],
        'command': ['Firebase command', 'Executing', 'command', '📥', '🔧'],
        'system': ['heartbeat', 'restart', 'shutdown', 'Heartbeat', 'memory', 'cpu', 'boot', 'maintenance', 'Status update sent'],
    }
    
    LEVEL_PATTERNS = {
        'error': ['❌', 'ERROR', 'error:', 'Error:', 'failed', 'Failed', 'exception', 'Exception'],
        'warning': ['⚠', 'WARNING', 'warning:', 'Warning:'],
        'debug': ['DEBUG', 'debug:'],
    }
    
    def __init__(self, firebase_service: FirebaseKioskService):
        self._firebase = firebase_service
        self._original_stdout = None
        self._original_stderr = None
        self._log_queue = queue.Queue()
        self._flush_thread = None
        self._running = False
        self._batch_size = 10
        self._flush_interval = 2.0  # seconds
    
    def install(self):
        """Install the log interceptor - replaces sys.stdout and sys.stderr"""
        if self._running:
            return
        
        self._running = True
        self._original_stdout = sys.stdout
        self._original_stderr = sys.stderr
        
        sys.stdout = _LogCapture(self._original_stdout, self._enqueue_log, 'info')
        sys.stderr = _LogCapture(self._original_stderr, self._enqueue_log, 'error')
        
        # Start the batch flush thread
        self._flush_thread = threading.Thread(target=self._flush_loop, daemon=True)
        self._flush_thread.start()
    
    def uninstall(self):
        """Restore original stdout/stderr"""
        self._running = False
        
        if self._original_stdout:
            sys.stdout = self._original_stdout
        if self._original_stderr:
            sys.stderr = self._original_stderr
        
        # Flush remaining logs
        self._flush_queue()
    
    def _enqueue_log(self, message: str, default_level: str):
        """Add a log message to the queue for batch sending"""
        if not message.strip():
            return
        
        level = self._detect_level(message, default_level)
        category = self._detect_category(message)
        
        self._log_queue.put({
            'level': level,
            'message': message.strip(),
            'category': category,
        })
    
    def _detect_level(self, message: str, default: str) -> str:
        """Auto-detect log level from message content"""
        for level, patterns in self.LEVEL_PATTERNS.items():
            for pattern in patterns:
                if pattern in message:
                    return level
        return default
    
    def _detect_category(self, message: str) -> str:
        """Auto-detect log category from message content"""
        for category, patterns in self.CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if pattern in message:
                    return category
        return 'general'
    
    def _flush_loop(self):
        """Background thread that batches and flushes logs to Firebase"""
        while self._running:
            try:
                # Wait for flush interval
                import time
                time.sleep(self._flush_interval)
                self._flush_queue()
            except Exception:
                pass
    
    def _flush_queue(self):
        """Send all queued logs to Firebase as a batch"""
        entries = []
        while not self._log_queue.empty():
            try:
                entries.append(self._log_queue.get_nowait())
            except queue.Empty:
                break
        
        if entries and self._firebase:
            # Send in batches of max 500 (Firestore limit)
            for i in range(0, len(entries), 450):
                batch = entries[i:i + 450]
                self._firebase.send_log_batch(batch)


class _LogCapture(io.TextIOBase):
    """
    A file-like object that captures writes and forwards them to both
    the original stream and a callback for Firebase logging.
    """
    
    def __init__(self, original_stream, log_callback, default_level: str):
        self._original = original_stream
        self._callback = log_callback
        self._default_level = default_level
        self._buffer = ''
    
    def write(self, text):
        """Write to original stream AND capture for Firebase"""
        # Always write to original stream
        if self._original:
            self._original.write(text)
        
        # Buffer lines and send complete lines to callback
        self._buffer += text
        while '\n' in self._buffer:
            line, self._buffer = self._buffer.split('\n', 1)
            if line.strip():
                try:
                    self._callback(line, self._default_level)
                except Exception:
                    pass  # Never let logging break the app
        
        return len(text)
    
    def flush(self):
        """Flush the original stream"""
        if self._original:
            self._original.flush()
    
    @property
    def encoding(self):
        return getattr(self._original, 'encoding', 'utf-8')
    
    def fileno(self):
        if self._original:
            return self._original.fileno()
        raise io.UnsupportedOperation("fileno")
    
    def isatty(self):
        if self._original:
            return self._original.isatty()
        return False


# Singleton instances
_firebase_service: Optional[FirebaseKioskService] = None
_log_interceptor: Optional[FirebaseLogInterceptor] = None


def get_firebase_service(kiosk_id: str = None, kiosk_app=None) -> Optional[FirebaseKioskService]:
    """Get or create the Firebase service singleton"""
    global _firebase_service
    
    if _firebase_service is None and kiosk_id:
        _firebase_service = FirebaseKioskService(kiosk_id, kiosk_app)
        
    return _firebase_service


def get_log_interceptor() -> Optional[FirebaseLogInterceptor]:
    """Get the current log interceptor instance"""
    return _log_interceptor


def install_log_interceptor(firebase_service: FirebaseKioskService) -> FirebaseLogInterceptor:
    """
    Install the global log interceptor.
    Must be called AFTER Firebase is initialized.
    
    Returns the FirebaseLogInterceptor instance.
    """
    global _log_interceptor
    
    if _log_interceptor is None:
        _log_interceptor = FirebaseLogInterceptor(firebase_service)
        _log_interceptor.install()
    
    return _log_interceptor
