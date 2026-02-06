const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5500/api/v1";

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

export class KioskManagementService {
  /**
   * Get all registered kiosk machines
   */
  static async getAllKiosks(): Promise<KioskMachine[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch kiosks");
      }

      const data = await response.json();
      return data.kiosks || [];
    } catch (error) {
      console.error("Error fetching kiosks:", error);
      // Return empty array - no mock data
      return [];
    }
  }

  /**
   * Get a specific kiosk by ID
   */
  static async getKioskById(id: string): Promise<KioskMachine | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks/${id}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch kiosk");
      }

      const data = await response.json();
      return data.kiosk;
    } catch (error) {
      console.error("Error fetching kiosk:", error);
      return null;
    }
  }

  /**
   * Restart a kiosk machine
   */
  static async restartKiosk(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks/${id}/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to restart kiosk");
      }

      return true;
    } catch (error) {
      console.error("Error restarting kiosk:", error);
      return false;
    }
  }

  /**
   * Set kiosk mode (slideshow, scanner, ocr, etc.)
   */
  static async setKioskMode(id: string, mode: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks/${id}/mode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        throw new Error("Failed to set kiosk mode");
      }

      return true;
    } catch (error) {
      console.error("Error setting kiosk mode:", error);
      return false;
    }
  }

  /**
   * Toggle LED on a kiosk
   */
  static async toggleLED(id: string, ledName: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks/${id}/led/${ledName}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle LED");
      }

      return true;
    } catch (error) {
      console.error("Error toggling LED:", error);
      return false;
    }
  }

  /**
   * Test all LEDs on a kiosk
   */
  static async testAllLEDs(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks/${id}/led/test-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to test LEDs");
      }

      return true;
    } catch (error) {
      console.error("Error testing LEDs:", error);
      return false;
    }
  }

  /**
   * Shutdown a kiosk machine
   */
  static async shutdownKiosk(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/kiosks/${id}/shutdown`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to shutdown kiosk");
      }

      return true;
    } catch (error) {
      console.error("Error shutting down kiosk:", error);
      return false;
    }
  }
}
