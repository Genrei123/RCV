import { Router } from 'express';
import { createComplianceReport } from '../../controllers/compliance/CreateComplianceReport';
import { searchProduct } from '../../controllers/compliance/SearchProduct';
import { verifyMobileUser } from '../../middleware/verifyMobileUser';

const ComplianceRouter = Router();

// All compliance routes require authentication
ComplianceRouter.use(verifyMobileUser);

// Search for product in database (mock data for now)
ComplianceRouter.post('/search-product', searchProduct);

// Create compliance report
ComplianceRouter.post('/report', createComplianceReport);

export default ComplianceRouter;
