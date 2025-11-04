"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Firebase_1 = require("../../controllers/firebase/Firebase");
const router = (0, express_1.Router)();
// GET /api/v1/firebase/test - Test Firebase Admin connection
router.get('/test', Firebase_1.testFirebaseConnection);
// GET /api/v1/firebase/getConfig
router.get('/getConfig', Firebase_1.getConfig);
// POST /api/v1/firebase/publishConfig
router.post('/publishConfig', Firebase_1.publishConfig);
exports.default = router;
//# sourceMappingURL=firebase.js.map