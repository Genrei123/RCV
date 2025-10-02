import { NextFunction, Request, Response, Router } from 'express';
import { getScans, getScansByID, scanProduct } from '../../controllers/scan/Scan';

const ScanRouter = Router();

ScanRouter.post('/scanProduct', scanProduct);
ScanRouter.get('/getScans/:id', getScansByID);
ScanRouter.get('/getScans' , getScans);

export default ScanRouter;
