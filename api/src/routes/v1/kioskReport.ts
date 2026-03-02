import { Router } from 'express';
import { createKioskReport } from '../../controllers/compliance/CreateKioskReport';

const KioskReportRouter = Router();

// Public endpoint — no auth required (kiosk is a public device)
KioskReportRouter.post('/report', createKioskReport);

export default KioskReportRouter;
