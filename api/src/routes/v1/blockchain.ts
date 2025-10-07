import { Router } from 'express';
import { 
    checkBlockchainValidity, 
    getBlockchainInfo, 
    validateSpecificBlock, 
    getBlockchainStats 
} from '../../controllers/blockchain/Validity';
import {
    modifyBlockData,
    modifyBlockHash,
    modifyBlockPrecedingHash,
    restoreBlockIntegrity,
    getCorruptedBlocksSummary
} from '../../controllers/blockchain/testBlockChanging';

const router = Router();

// Blockchain Validity Routes
router.get('/validity', checkBlockchainValidity);
router.get('/info', getBlockchainInfo);
router.get('/block/:blockIndex/validate', validateSpecificBlock);
router.get('/stats', getBlockchainStats);

// Testing Routes
// Blockchain tampering Routes wag niyo po sirain yung blockchian guiz
router.put('/test/block/:blockIndex/modify-data', modifyBlockData);
router.put('/test/block/:blockIndex/modify-hash', modifyBlockHash);
router.put('/test/block/:blockIndex/modify-preceding-hash', modifyBlockPrecedingHash);
router.put('/test/block/:blockIndex/restore', restoreBlockIntegrity);
router.get('/test/corrupted-summary', getCorruptedBlocksSummary);

export default router;
