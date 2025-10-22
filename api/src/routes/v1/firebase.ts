import { Router } from 'express';
import { testFirebaseConnection, getConfig, publishConfig } from '../../controllers/firebase/Firebase';

const router = Router();

// GET /api/v1/firebase/test - Test Firebase Admin connection
router.get('/test', testFirebaseConnection);

// GET /api/v1/firebase/getConfig
router.get('/getConfig', getConfig);

// POST /api/v1/firebase/publishConfig
router.post('/publishConfig', publishConfig);

export default router;