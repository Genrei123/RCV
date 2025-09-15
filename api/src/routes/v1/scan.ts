import { NextFunction, Request, Response, Router } from 'express';
import { scanProduct } from '../../controllers/scan/Scan';

const ScanRouter = Router();

ScanRouter.post('/scanProduct', scanProduct);

export default ScanRouter;
