"""
Firebase Service for RCV Kiosk Machine
======================================
Handles real-time command listening and status updates via Firebase Firestore.

Commands are written to: kiosks/{kioskId}/commands/{commandId}
Status is written to: kiosks/{kioskId}

This replaces the polling mechanism with instant Firebase listeners.
"""

import os
import threading
from datetime import datetime
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


# Singleton instance
_firebase_service: Optional[FirebaseKioskService] = None


def get_firebase_service(kiosk_id: str = None, kiosk_app=None) -> Optional[FirebaseKioskService]:
    """Get or create the Firebase service singleton"""
    global _firebase_service
    
    if _firebase_service is None and kiosk_id:
        _firebase_service = FirebaseKioskService(kiosk_id, kiosk_app)
        
    return _firebase_service
