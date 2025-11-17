import { NextFunction, Request, Response, Router } from 'express';
import { getScans, getScansByID, scanProduct, searchScannedProduct } from '../../controllers/scan/Scan';

const ScanRouter = Router();

ScanRouter.post('/scanProduct', scanProduct);
ScanRouter.post('/searchProduct', searchScannedProduct);
ScanRouter.get('/getScans/:id', getScansByID);
ScanRouter.get('/getScans' , getScans);

export default ScanRouter;
