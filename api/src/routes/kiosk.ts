import { Router } from 'express';
import {
  kioskHeartbeat,
  getAllKiosks,
  getKioskById,
  restartKiosk,
  setKioskMode,
  toggleLED,
  testAllLEDs,
  shutdownKiosk,
} from '../controllers/KioskController';

const router = Router();

/**
 * Kiosk Management Routes
 * 
 * These endpoints manage kiosk machines, health checks, and remote control
 */

// Health check endpoint - called by kiosk machines every 30 seconds
router.post('/heartbeat', kioskHeartbeat);

// Get all kiosks
router.get('/', getAllKiosks);

// Get specific kiosk
router.get('/:id', getKioskById);

// Control endpoints
router.post('/:id/restart', restartKiosk);
router.post('/:id/mode', setKioskMode);
router.post('/:id/shutdown', shutdownKiosk);

// LED control
router.post('/:id/led/:ledName/toggle', toggleLED);
router.post('/:id/led/test-all', testAllLEDs);

export default router;
