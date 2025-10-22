import { Router } from 'express';
import { testFirebaseConnection, getConfig } from '../../controllers/firebase/Firebase';

const router = Router();

// GET /api/v1/firebase/test - Test Firebase Admin connection
router.get('/test', testFirebaseConnection);

// GET /api/v1/firebase/getConfig
router.get('/getConfig', getConfig);

export default router;