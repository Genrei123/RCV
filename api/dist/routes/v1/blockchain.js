"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Validity_1 = require("../../controllers/blockchain/Validity");
const testBlockChanging_1 = require("../../controllers/blockchain/testBlockChanging");
const router = (0, express_1.Router)();
// Blockchain Validity Routes
router.get('/validity', Validity_1.checkBlockchainValidity);
router.get('/info', Validity_1.getBlockchainInfo);
router.get('/block/:blockIndex/validate', Validity_1.validateSpecificBlock);
router.get('/stats', Validity_1.getBlockchainStats);
// Testing Routes
// Blockchain tampering Routes wag niyo po sirain yung blockchian guiz
router.put('/test/block/:blockIndex/modify-data', testBlockChanging_1.modifyBlockData);
router.put('/test/block/:blockIndex/modify-hash', testBlockChanging_1.modifyBlockHash);
router.put('/test/block/:blockIndex/modify-preceding-hash', testBlockChanging_1.modifyBlockPrecedingHash);
router.put('/test/block/:blockIndex/restore', testBlockChanging_1.restoreBlockIntegrity);
router.get('/test/corrupted-summary', testBlockChanging_1.getCorruptedBlocksSummary);
exports.default = router;
//# sourceMappingURL=blockchain.js.map