"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Scan_1 = require("../../controllers/scan/Scan");
const ScanRouter = (0, express_1.Router)();
ScanRouter.post('/scanProduct', Scan_1.scanProduct);
ScanRouter.post('/searchProduct', Scan_1.searchScannedProduct);
ScanRouter.get('/getScans/:id', Scan_1.getScansByID);
ScanRouter.get('/getScans', Scan_1.getScans);
exports.default = ScanRouter;
//# sourceMappingURL=scan.js.map