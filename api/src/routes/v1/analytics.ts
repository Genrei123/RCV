import { Router } from 'express';
import * as AnalyticsController from '../../controllers/analytics/Analytics';
import { resolveReport } from '../../controllers/compliance/ResolveReport';
import { verifyUser } from '../../middleware/verifyUser';

const AnalyticsRouter = Router();

// Health check endpoint
AnalyticsRouter.get('/health', AnalyticsController.healthCheck);

// Main analytics endpoint
AnalyticsRouter.get('/analyze', AnalyticsController.analyzeCompliance);

// Resolve compliance report
AnalyticsRouter.post('/reports/:id/resolve', verifyUser, resolveReport);

export default AnalyticsRouter;