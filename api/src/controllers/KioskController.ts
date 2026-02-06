import { Request, Response } from 'express';

/**
 * Kiosk Controller - Manages kiosk machines registration, health checks, and control
 * 
 * Flow:
 * 1. Kiosk sends heartbeat every 30 seconds with location/status
 * 2. API stores kiosk data and returns any pending commands
 * 3. Web fetches kiosk list from API
 * 4. Web can queue commands (restart, mode change) via API
 * 5. Kiosk receives commands in next heartbeat response and executes them
 */

// In-memory store for demo (replace with actual database)
const kiosks = new Map();

// Pending commands queue - kiosk checks this on each heartbeat
// Format: { kioskId: [{ command: 'restart', timestamp: Date }] }
const pendingCommands = new Map<string, Array<{ command: string; payload?: any; timestamp: Date }>>();

/**
 * Health Check / Status Update Endpoint
 * POST /api/v1/kiosks/heartbeat
 * 
 * Kiosk machines call this every 30 seconds to report their status
 */
export const kioskHeartbeat = async (req: Request, res: Response) => {
  try {
    const {
      kioskId,
      name,
      location,
      mode,
      leds,
      systemInfo,
    } = req.body;

    // Validate required fields
    if (!kioskId || !location) {
      return res.status(400).json({
        success: false,
        error: 'kioskId and location are required',
      });
    }

    // Update or create kiosk record
    const now = new Date();
    const kioskData = {
      kioskId: kioskId,
      name: name || `Kiosk ${kioskId}`,
      status: 'online',
      lastSeen: now,
      mode: mode || 'idle',
      location: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
        city: location.city || '',
      },
      leds: leds || {
        processing: false,
        success: false,
        error: false,
      },
      systemInfo: systemInfo || {},
      updatedAt: now,
    };

    kiosks.set(kioskId, kioskData);

    // Check for pending commands for this kiosk
    const commands = pendingCommands.get(kioskId) || [];
    // Clear the pending commands after sending
    if (commands.length > 0) {
      pendingCommands.delete(kioskId);
      console.log(`Sending ${commands.length} command(s) to kiosk ${kioskId}`);
    }

    res.json({
      success: true,
      message: 'Heartbeat received',
      kiosk: kioskData,
      commands: commands, // Return any pending commands
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get All Kiosks
 * GET /api/v1/kiosks
 */
export const getAllKiosks = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Convert map to array and update online status
    const kioskList = Array.from(kiosks.values()).map((kiosk: any) => {
      const lastSeen = new Date(kiosk.lastSeen);
      const isOnline = lastSeen > fiveMinutesAgo;
      
      return {
        ...kiosk,
        status: isOnline ? 'online' : 'offline',
      };
    });

    res.json({
      success: true,
      kiosks: kioskList,
    });
  } catch (error) {
    console.error('Get kiosks error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get Specific Kiosk
 * GET /api/v1/kiosks/:id
 */
export const getKioskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kiosk = kiosks.get(id);

    if (!kiosk) {
      return res.status(404).json({
        success: false,
        error: 'Kiosk not found',
      });
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const lastSeen = new Date(kiosk.lastSeen);
    const isOnline = lastSeen > fiveMinutesAgo;

    res.json({
      success: true,
      kiosk: {
        ...kiosk,
        status: isOnline ? 'online' : 'offline',
      },
    });
  } catch (error) {
    console.error('Get kiosk error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Restart Kiosk
 * POST /api/v1/kiosks/:id/restart
 * 
 * Sends restart command to kiosk machine via its local HTTP server
 */
export const restartKiosk = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kiosk = kiosks.get(id);

    if (!kiosk) {
      return res.status(404).json({
        success: false,
        error: 'Kiosk not found',
      });
    }

    // Queue restart command - kiosk will receive it on next heartbeat
    const commands = pendingCommands.get(id) || [];
    commands.push({
      command: 'restart',
      timestamp: new Date(),
    });
    pendingCommands.set(id, commands);
    
    console.log(`Restart command queued for kiosk ${id}`);

    // Check if kiosk is online (responded within 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const lastSeen = new Date(kiosk.lastSeen);
    const isOnline = lastSeen > fiveMinutesAgo;

    res.json({
      success: true,
      message: isOnline 
        ? `Restart command queued for ${kiosk.name}. Will execute on next heartbeat.`
        : `Kiosk ${kiosk.name} is offline. Command queued but may not be received.`,
      isOnline,
      queuedAt: new Date(),
    });
  } catch (error) {
    console.error('Restart kiosk error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart kiosk',
    });
  }
};

/**
 * Set Kiosk Mode
 * POST /api/v1/kiosks/:id/mode
 */
export const setKioskMode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mode } = req.body;

    if (!mode) {
      return res.status(400).json({
        success: false,
        error: 'Mode is required',
      });
    }

    const kiosk = kiosks.get(id);
    if (!kiosk) {
      return res.status(404).json({
        success: false,
        error: 'Kiosk not found',
      });
    }

    // Queue mode change command
    const commands = pendingCommands.get(id) || [];
    commands.push({
      command: 'set_mode',
      payload: { mode },
      timestamp: new Date(),
    });
    pendingCommands.set(id, commands);
    
    console.log(`Mode change to ${mode} queued for kiosk ${id}`);

    res.json({
      success: true,
      message: `Mode change to ${mode} queued. Will execute on next heartbeat.`,
    });
  } catch (error) {
    console.error('Set mode error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set mode',
    });
  }
};

/**
 * Toggle LED
 * POST /api/v1/kiosks/:id/led/:ledName/toggle
 */
export const toggleLED = async (req: Request, res: Response) => {
  try {
    const { id, ledName } = req.params;
    const kiosk = kiosks.get(id);

    if (!kiosk) {
      return res.status(404).json({
        success: false,
        error: 'Kiosk not found',
      });
    }

    // Queue LED toggle command
    const commands = pendingCommands.get(id) || [];
    commands.push({
      command: 'toggle_led',
      payload: { ledName },
      timestamp: new Date(),
    });
    pendingCommands.set(id, commands);
    
    console.log(`LED toggle ${ledName} queued for kiosk ${id}`);

    res.json({
      success: true,
      ledName,
      message: `LED ${ledName} toggle queued.`,
    });
  } catch (error) {
    console.error('Toggle LED error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle LED',
    });
  }
};

/**
 * Test All LEDs
 * POST /api/v1/kiosks/:id/led/test-all
 */
export const testAllLEDs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kiosk = kiosks.get(id);

    if (!kiosk) {
      return res.status(404).json({
        success: false,
        error: 'Kiosk not found',
      });
    }

    // Queue LED test command
    const commands = pendingCommands.get(id) || [];
    commands.push({
      command: 'test_all_leds',
      timestamp: new Date(),
    });
    pendingCommands.set(id, commands);
    
    console.log(`LED test queued for kiosk ${id}`);

    res.json({
      success: true,
      message: 'LED test sequence queued. Will execute on next heartbeat.',
    });
  } catch (error) {
    console.error('Test LEDs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test LEDs',
    });
  }
};

/**
 * Shutdown Kiosk
 * POST /api/v1/kiosks/:id/shutdown
 */
export const shutdownKiosk = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kiosk = kiosks.get(id);

    if (!kiosk) {
      return res.status(404).json({
        success: false,
        error: 'Kiosk not found',
      });
    }

    // Queue shutdown command
    const commands = pendingCommands.get(id) || [];
    commands.push({
      command: 'shutdown',
      timestamp: new Date(),
    });
    pendingCommands.set(id, commands);
    
    console.log(`Shutdown command queued for kiosk ${id}`);

    res.json({
      success: true,
      message: `Shutdown command queued for ${kiosk.name}.`,
    });
  } catch (error) {
    console.error('Shutdown kiosk error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to shutdown kiosk',
    });
  }
};
