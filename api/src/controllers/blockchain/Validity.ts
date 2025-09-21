import type { NextFunction, Request, Response } from 'express';
import CustomError from '../../utils/CustomError';
import { globalProductBlockchain } from '../scan/Scan';

const ensureBlockchainInitialized = () => {
    if (!globalProductBlockchain) {
        throw new CustomError(404, 'Blockchain not initialized', { 
            success: false,
            message: 'No blockchain found.' 
        });
    }
};


export const checkBlockchainValidity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        ensureBlockchainInitialized();
        
        const isValid = globalProductBlockchain.checkChainValidity();
        
        res.status(200).json({
            success: true,
            message: isValid ? 'Blockchain is valid' : 'Blockchain integrity compromised',
            isValid,
            totalBlocks: globalProductBlockchain.blockhain.length,
            difficulty: globalProductBlockchain.difficulty
        });
    } catch (error) {
        next(error);
    }
};

export const getBlockchainInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        ensureBlockchainInitialized();

        const blocks = globalProductBlockchain.blockhain;
        const isValid = globalProductBlockchain.checkChainValidity();

        res.status(200).json({
            success: true,
            message: 'Blockchain information retrieved',
            blockchain: {
                isValid,
                totalBlocks: blocks.length,
                difficulty: globalProductBlockchain.difficulty,
                blocks: blocks.map(block => ({
                    index: block.index,
                    timestamp: block.timestamp,
                    hash: block.hash,
                    productName: block.data.productName,
                    LTONumber: block.data.LTONumber
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

export const validateSpecificBlock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        ensureBlockchainInitialized();
        
        const index = parseInt(req.params.blockIndex);
        const blocks = globalProductBlockchain.blockhain;

        if (isNaN(index) || index < 0 || index >= blocks.length) {
            throw new CustomError(400, 'Invalid block index', { 
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
    } catch (error) {
        next(error);
    }
};


export const getBlockchainStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        ensureBlockchainInitialized();

        const blocks = globalProductBlockchain.blockhain;
        const isValid = globalProductBlockchain.checkChainValidity();
        const totalBlocks = blocks.length;

        res.status(200).json({
            success: true,
            message: 'Blockchain statistics retrieved',
            stats: {
                isValid,
                totalBlocks,
                difficulty: globalProductBlockchain.difficulty,
                latestProduct: blocks[totalBlocks - 1].data.productName,
                genesisProduct: blocks[0].data.productName
            }
        });
    } catch (error) {
        next(error);
    }
};
