export interface KioskCommand {
  action: string;
  led: number;
  state: string;
}

export interface KioskHealth {
  lastPoll: Date | null;
  isOnline: boolean;
  pollCount: number;
  uptime: number; // in seconds
  timeSinceLastPoll: number | null; // in milliseconds
  serverTime: string;
}

export class KioskService {
  private static baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

  // Get current command that ESP32 will poll
  static async getCurrentCommand(): Promise<KioskCommand> {
    try {
      const response = await fetch(`${this.baseURL}/kiosk/command`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get kiosk command:', error);
      throw error;
    }
  }

  // Control LED 1
  static async controlLED1(state: 'on' | 'off' = 'on'): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseURL}/kiosk/led-1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to control LED 1:', error);
      throw error;
    }
  }

  // Control LED 2
  static async controlLED2(state: 'on' | 'off' = 'on'): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseURL}/kiosk/led-2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to control LED 2:', error);
      throw error;
    }
  }

  // Control LED 3
  static async controlLED3(state: 'on' | 'off' = 'on'): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseURL}/kiosk/led-3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to control LED 3:', error);
      throw error;
    }
  }

  // Get kiosk health status
  static async getKioskHealth(): Promise<KioskHealth> {
    try {
      const response = await fetch(`${this.baseURL}/kiosk/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        lastPoll: data.lastPoll ? new Date(data.lastPoll) : null,
      };
    } catch (error) {
      console.error('Failed to get kiosk health:', error);
      // Return offline status if health endpoint fails
      return {
        lastPoll: null,
        isOnline: false,
        pollCount: 0,
        uptime: 0,
        timeSinceLastPoll: null,
        serverTime: '',
      };
    }
  }
}
