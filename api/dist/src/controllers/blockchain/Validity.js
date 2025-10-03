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
exports.getBlockchainStats = exports.validateSpecificBlock = exports.getBlockchainInfo = exports.checkBlockchainValidity = void 0;
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
const checkBlockchainValidity = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const isValid = Scan_1.globalProductBlockchain.checkChainValidity();
        res.status(200).json({
            success: true,
            message: isValid ? 'Blockchain is valid' : 'Blockchain integrity compromised',
            isValid,
            totalBlocks: Scan_1.globalProductBlockchain.blockhain.length,
            difficulty: Scan_1.globalProductBlockchain.difficulty
        });
    }
    catch (error) {
        next(error);
    }
});
exports.checkBlockchainValidity = checkBlockchainValidity;
const getBlockchainInfo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const blocks = Scan_1.globalProductBlockchain.blockhain;
        const isValid = Scan_1.globalProductBlockchain.checkChainValidity();
        res.status(200).json({
            success: true,
            message: 'Blockchain information retrieved',
            blockchain: {
                isValid,
                totalBlocks: blocks.length,
                difficulty: Scan_1.globalProductBlockchain.difficulty,
                blocks: blocks.map(block => ({
                    index: block.index,
                    timestamp: block.timestamp,
                    hash: block.hash,
                    productName: block.data.productName,
                    LTONumber: block.data.LTONumber
                }))
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getBlockchainInfo = getBlockchainInfo;
const validateSpecificBlock = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const index = parseInt(req.params.blockIndex);
        const blocks = Scan_1.globalProductBlockchain.blockhain;
        if (isNaN(index) || index < 0 || index >= blocks.length) {
            throw new CustomError_1.default(400, 'Invalid block index', {
                success: false,
                message: `Block index must be between 0 and ${blocks.length - 1}`
            });
        }
        const block = blocks[index];
        const isHashValid = block.hash === block.computeHash();
        const isPrecedingHashValid = index === 0 || block.precedingHash === blocks[index - 1].hash;
        res.status(200).json({
            success: true,
            message: `Block ${index} validation completed`,
            blockValidation: {
                index: block.index,
                isValid: isHashValid && isPrecedingHashValid,
                isHashValid,
                isPrecedingHashValid,
                productName: block.data.productName
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.validateSpecificBlock = validateSpecificBlock;
const getBlockchainStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        ensureBlockchainInitialized();
        const blocks = Scan_1.globalProductBlockchain.blockhain;
        const isValid = Scan_1.globalProductBlockchain.checkChainValidity();
        const totalBlocks = blocks.length;
        res.status(200).json({
            success: true,
            message: 'Blockchain statistics retrieved',
            stats: {
                isValid,
                totalBlocks,
                difficulty: Scan_1.globalProductBlockchain.difficulty,
                latestProduct: blocks[totalBlocks - 1].data.productName,
                genesisProduct: blocks[0].data.productName
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getBlockchainStats = getBlockchainStats;
//# sourceMappingURL=Validity.js.map