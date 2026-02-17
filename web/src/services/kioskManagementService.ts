import { db } from '../utils/firebase';
import { collection, getDocs, addDoc, Timestamp, onSnapshot } from 'firebase/firestore';

export interface KioskMachine {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeen?: string | Date;
  currentMode: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  leds?: {
    processing: boolean;
    success: boolean;
    error: boolean;
  };
}

/**
 * Kiosk Management Service - Firebase Firestore based
 * 
 * Uses Firebase Firestore for:
 * - Reading kiosk status (real-time)
 * - Sending commands (instant delivery)
 * - Checking online/offline status based on lastSeen timestamp
 * 
 * Firestore Structure:
 * - kiosks/{kioskId} - Kiosk status document
 * - kiosks/{kioskId}/commands/{commandId} - Command documents
 */
export class KioskManagementService {
  // How long before a kiosk is considered offline (10 minutes)
  private static readonly OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

  /**
   * Calculate if kiosk is online based on lastSeen timestamp
   */
  private static isKioskOnline(lastSeen: Date | Timestamp | string | undefined): boolean {
    if (!lastSeen) return false;
    
    let lastSeenDate: Date;
    if (lastSeen instanceof Timestamp) {
      lastSeenDate = lastSeen.toDate();
    } else if (lastSeen instanceof Date) {
      lastSeenDate = lastSeen;
    } else {
      lastSeenDate = new Date(lastSeen);
    }
    
    const now = new Date();
    const timeDiff = now.getTime() - lastSeenDate.getTime();
    return timeDiff < this.OFFLINE_THRESHOLD_MS;
  }

  /**
   * Parse kiosk document from Firestore
   */
  private static parseKioskDoc(docId: string, data: any): KioskMachine {
    const lastSeen = data.lastSeen;
    let lastSeenDate: Date | undefined;
    
    if (lastSeen instanceof Timestamp) {
      lastSeenDate = lastSeen.toDate();
    } else if (lastSeen) {
      lastSeenDate = new Date(lastSeen);
    }
    
    return {
      id: docId,
      name: data.name || `Kiosk ${docId}`,
      status: this.isKioskOnline(lastSeen) ? "online" : "offline",
      lastSeen: lastSeenDate,
      currentMode: data.mode || 'idle',
      location: {
        lat: data.location?.lat || 0,
        lng: data.location?.lng || 0,
        address: data.location?.address || 'Unknown',
        city: data.location?.city || 'Unknown',
      },
      leds: data.leds ? {
        processing: data.leds.processing || false,
        success: data.leds.success || false,
        error: data.leds.error || false,
      } : undefined,
    };
  }

  /**
   * Get all registered kiosk machines from Firebase
   */
  static async getAllKiosks(): Promise<KioskMachine[]> {
    try {
      const kiosksCollection = collection(db, 'kiosks');
      const snapshot = await getDocs(kiosksCollection);
      
      return snapshot.docs.map(doc => this.parseKioskDoc(doc.id, doc.data()));
    } catch (error) {
      console.error("Error fetching kiosks from Firebase:", error);
      return [];
    }
  }

  /**
   * Subscribe to real-time kiosk updates
   */
  static subscribeToKiosks(callback: (kiosks: KioskMachine[]) => void): () => void {
    const kiosksCollection = collection(db, 'kiosks');
    
    const unsubscribe = onSnapshot(kiosksCollection, (snapshot) => {
      const kiosks = snapshot.docs.map(doc => this.parseKioskDoc(doc.id, doc.data()));
      callback(kiosks);
    }, (error) => {
      console.error("Error listening to kiosks:", error);
    });
    
    return unsubscribe;
  }

  /**
   * Get a specific kiosk by ID from Firebase
   */
  static async getKioskById(id: string): Promise<KioskMachine | null> {
    try {
      const kiosksCollection = collection(db, 'kiosks');
      const snapshot = await getDocs(kiosksCollection);
      const kioskDoc = snapshot.docs.find(doc => doc.id === id);
      
      if (!kioskDoc) return null;
      return this.parseKioskDoc(kioskDoc.id, kioskDoc.data());
    } catch (error) {
      console.error("Error fetching kiosk from Firebase:", error);
      return null;
    }
  }

  /**
   * Send a command to a kiosk via Firebase
   * Commands are written to kiosks/{kioskId}/commands subcollection
   * The kiosk's Firebase listener picks them up instantly
   */
  private static async sendCommand(kioskId: string, command: string, payload: Record<string, any> = {}): Promise<boolean> {
    try {
      const commandsRef = collection(db, 'kiosks', kioskId, 'commands');
      await addDoc(commandsRef, {
        command,
        payload,
        timestamp: Timestamp.now(),
      });
      console.log(`Command '${command}' sent to kiosk ${kioskId}`);
      return true;
    } catch (error) {
      console.error(`Error sending command '${command}' to kiosk:`, error);
      return false;
    }
  }

  /**
   * Restart a kiosk machine
   */
  static async restartKiosk(id: string): Promise<boolean> {
    return this.sendCommand(id, 'restart');
  }

  /**
   * Set kiosk mode (slideshow, scanner, ocr, etc.)
   */
  static async setKioskMode(id: string, mode: string): Promise<boolean> {
    return this.sendCommand(id, 'set_mode', { mode });
  }

  /**
   * Toggle LED on a kiosk
   */
  static async toggleLED(id: string, ledName: string): Promise<boolean> {
    return this.sendCommand(id, 'toggle_led', { ledName });
  }

  /**
   * Test all LEDs on a kiosk
   */
  static async testAllLEDs(id: string): Promise<boolean> {
    return this.sendCommand(id, 'test_all_leds');
  }

  /**
   * Shutdown a kiosk machine (allows auto-restart)
   */
  static async shutdownKiosk(id: string): Promise<boolean> {
    return this.sendCommand(id, 'shutdown');
  }

  /**
   * Close kiosk application for maintenance (will NOT auto-restart)
   */
  static async closeApp(id: string): Promise<boolean> {
    return this.sendCommand(id, 'close_app');
  }
}
