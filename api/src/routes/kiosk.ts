import { Router } from 'express';
import {
  getAllKiosks,
  getKioskById,
} from '../controllers/KioskController';

const router = Router();

/**
 * Kiosk Management Routes (Read-only)
 * 
 * NOTE: Kiosk commands now use Firebase Firestore for instant delivery.
 * These endpoints are kept for backwards compatibility and web dashboard viewing.
 * 
 * Firebase Structure:
 * - kiosks/{kioskId} - Kiosk status (updated by kiosk)
 * - kiosks/{kioskId}/commands/{commandId} - Commands (written by admin, read by kiosk)
 */

// Get all kiosks (for web dashboard - reads from API memory cache)
// Note: For real-time data, use Firebase Firestore directly
router.get('/', getAllKiosks);

// Get specific kiosk
router.get('/:id', getKioskById);

// REMOVED: Kiosk command endpoints now use Firebase
// - POST /heartbeat - Kiosk uses Firebase instead
// - GET /:id/commands - Kiosk uses Firebase listeners
// - POST /:id/restart - Admin writes to Firebase
// - POST /:id/mode - Admin writes to Firebase
// - POST /:id/shutdown - Admin writes to Firebase
// - POST /:id/led/:ledName/toggle - Admin writes to Firebase
// - POST /:id/led/test-all - Admin writes to Firebase

export default router;
