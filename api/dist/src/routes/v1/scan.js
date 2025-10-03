"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Scan_1 = require("../../controllers/scan/Scan");
const ScanRouter = (0, express_1.Router)();
ScanRouter.post('/scanProduct', Scan_1.scanProduct);
exports.default = ScanRouter;
//# sourceMappingURL=scan.js.map