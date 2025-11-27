import { Router } from 'express';
import * as AnalyticsController from '../../controllers/analytics/Analytics';
import { verifyUser } from '../../middleware/verifyUser';

const AnalyticsRouter = Router();

// Health check endpoint
AnalyticsRouter.get('/health', AnalyticsController.healthCheck);

// Main analytics endpoint
AnalyticsRouter.get('/analyze', AnalyticsController.analyzeCompliance);

export default AnalyticsRouter;