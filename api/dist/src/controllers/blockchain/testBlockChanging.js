"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorruptedBlocksSummary = exports.restoreBlockIntegrity = exports.modifyBlockPrecedingHash = exports.modifyBlockHash = exports.modifyBlockData = void 0;
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const Scan_1 = require("../scan/Scan");
const ensureBlockchainInitialized = () => {
    if (!Scan_1.globalProductBlockchain) {
        throw new CustomError_1.default(404, 'Blockchain not initialized', {
            success: false,
            message: 'No blockchain found.'
        });
    }
};
const validateBlockIndex = (index, allowGenesis = true) => {
    const blocks = Scan_1.globalProductBlockchain.blockhain;
    const minIndex = allowGenesis ? 0 : 1;
    if (isNaN(index) || index < minIndex || index >= blocks.length) {
        const message = allowGenesis
            ? `Block index must be between 0 and ${blocks.length - 1}`
            : `Block index must be between 1 and ${blocks.length - 1} (cannot modify genesis block)`;
        throw new CustomError_1.default(400, 'Invalid block index', {
            success: false,
            message
        });
    }
};
const modifyBlockData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const index = parseInt(req.params.blockIndex);
        validateBlockIndex(index);
        const { productName, manufacturerName, distributorName, importerName } = req.body;
        const block = Scan_1.globalProductBlockchain.blockhain[index];
        const originalProductName = block.data.productName;
        if (productName)
            block.data.productName = productName;
        if (manufacturerName)
            block.data.company = manufacturerName;
        // if (distributorName) block.data.distributorName = distributorName;
        // if (importerName) block.data.importerName = importerName;
        res.status(200).json({
            success: true,
            message: `Block ${index} data modified (FRAUDULENT)`,
            warning: 'Blockchain integrity compromised - for testing only!',
            changes: {
                blockIndex: index,
                originalProductName,
                newProductName: block.data.productName
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.modifyBlockData = modifyBlockData;
const modifyBlockHash = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const index = parseInt(req.params.blockIndex);
        validateBlockIndex(index);
        const { newHash } = req.body;
        if (!newHash || typeof newHash !== 'string') {
            throw new CustomError_1.default(400, 'Invalid hash', {
                success: false,
                message: 'Please provide a valid hash string'
            });
        }
        const block = Scan_1.globalProductBlockchain.blockhain[index];
        const originalHash = block.hash;
        block.hash = newHash;
        res.status(200).json({
            success: true,
            message: `Block ${index} hash modified (HANKER!!)`,
            warning: 'Blockchain integrity compromised',
            changes: {
                blockIndex: index,
                originalHash,
                newHash: block.hash,
                computedHash: block.computeHash()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.modifyBlockHash = modifyBlockHash;
const modifyBlockPrecedingHash = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const index = parseInt(req.params.blockIndex);
        validateBlockIndex(index, false);
        const { newPrecedingHash } = req.body;
        if (!newPrecedingHash || typeof newPrecedingHash !== 'string') {
            throw new CustomError_1.default(400, 'Invalid preceding hash', {
                success: false,
                message: 'Please provide a valid preceding hash string'
            });
        }
        const block = Scan_1.globalProductBlockchain.blockhain[index];
        const originalPrecedingHash = block.precedingHash;
        block.precedingHash = newPrecedingHash;
        res.status(200).json({
            success: true,
            message: `Block ${index} preceding hash modified (HANKER!!)`,
            warning: 'Blockchain integrity compromised',
            changes: {
                blockIndex: index,
                originalPrecedingHash,
                newPrecedingHash: block.precedingHash
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.modifyBlockPrecedingHash = modifyBlockPrecedingHash;
const restoreBlockIntegrity = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const index = parseInt(req.params.blockIndex);
        validateBlockIndex(index);
        const block = Scan_1.globalProductBlockchain.blockhain[index];
        const oldHash = block.hash;
        if (index > 0) {
            const precedingBlock = Scan_1.globalProductBlockchain.blockhain[index - 1];
            block.precedingHash = precedingBlock.hash;
        }
        block.hash = block.computeHash();
        res.status(200).json({
            success: true,
            message: `Block ${index} integrity restored`,
            restoration: {
                blockIndex: index,
                oldHash,
                newHash: block.hash,
                isNowValid: block.hash === block.computeHash()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.restoreBlockIntegrity = restoreBlockIntegrity;
const getCorruptedBlocksSummary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const blocks = Scan_1.globalProductBlockchain.blockhain;
        const isChainValid = Scan_1.globalProductBlockchain.checkChainValidity();
        const corruptedBlocks = [];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const isHashValid = block.hash === block.computeHash();
            const isPrecedingHashValid = i === 0 || block.precedingHash === blocks[i - 1].hash;
            if (!isHashValid || !isPrecedingHashValid) {
                corruptedBlocks.push({
                    index: i,
                    productName: block.data.productName,
                    isHashValid,
                    isPrecedingHashValid
                });
            }
        }
        res.status(200).json({
            success: true,
            message: 'Blockchain corruption summary',
            summary: {
                isChainValid,
                totalBlocks: blocks.length,
                corruptedCount: corruptedBlocks.length,
                corruptedBlocks
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getCorruptedBlocksSummary = getCorruptedBlocksSummary;
//# sourceMappingURL=testBlockChanging.js.map