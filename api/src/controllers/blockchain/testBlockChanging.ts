import type { NextFunction, Request, Response } from 'express';
import CustomError from '../../utils/CustomError';
import { globalProductBlockchain } from '../scan/Scan';

export const modifyBlockData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { blockIndex } = req.params;
        const { productName, manufacturerName, distributorName, importerName } = req.body;
        const index = parseInt(blockIndex);

        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.'  
            });
        }

        if (isNaN(index) || index < 0 || index >= globalProductBlockchain.blockhain.length) {
            throw new CustomError(400, 'Invalid block index', { 
                success: false,
                message: `Block index must be between 0 and ${globalProductBlockchain.blockhain.length - 1}` 
            });
        }

        const block = globalProductBlockchain.blockhain[index];
        const originalData = { ...block.data };
        const originalHash = block.hash;

        if (productName) block.data.productName = productName;
        if (manufacturerName) block.data.manufacturerName = manufacturerName;
        if (distributorName) block.data.distributorName = distributorName;
        if (importerName) block.data.importerName = importerName;

        // Note: We're NOT recalculating the hash, which makes this fraudulent
        
        res.status(200).json({
            success: true,
            message: `Block ${index} data modified successfully (fraudulent modification)`,
            warning: 'This modification corrupts blockchain integrity - use for testing only',
            modification: {
                blockIndex: index,
                originalData: {
                    productName: originalData.productName,
                    manufacturerName: originalData.manufacturerName,
                    distributorName: originalData.distributorName,
                    importerName: originalData.importerName
                },
                newData: {
                    productName: block.data.productName,
                    manufacturerName: block.data.manufacturerName,
                    distributorName: block.data.distributorName,
                    importerName: block.data.importerName
                },
                originalHash,
                currentHash: block.hash,
                hashesMatch: originalHash === block.hash
            }
        });
    } catch (error) {
        next(error);
    }
};

export const modifyBlockHash = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { blockIndex } = req.params;
        const { newHash } = req.body;
        const index = parseInt(blockIndex);

        // Check if blockchain is initialized
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.' 
            });
        }

        // Validate block index
        if (isNaN(index) || index < 0 || index >= globalProductBlockchain.blockhain.length) {
            throw new CustomError(400, 'Invalid block index', { 
                success: false,
                message: `Block index must be between 0 and ${globalProductBlockchain.blockhain.length - 1}` 
            });
        }

        if (!newHash || typeof newHash !== 'string') {
            throw new CustomError(400, 'Invalid hash', { 
                success: false,
                message: 'Please provide a valid hash string' 
            });
        }

        const block = globalProductBlockchain.blockhain[index];
        const originalHash = block.hash;
        const computedHash = block.computeHash();

        // Modify the hash (fraudulent modification)
        block.hash = newHash;

        res.status(200).json({
            success: true,
            message: `Block ${index} hash modified successfully (fraudulent modification)`,
            warning: 'This modification corrupts blockchain integrity - use for testing only',
            modification: {
                blockIndex: index,
                originalHash,
                newHash: block.hash,
                computedHash,
                wasValidBefore: originalHash === computedHash,
                isValidNow: block.hash === computedHash
            }
        });
    } catch (error) {
        next(error);
    }
};

export const modifyBlockPrecedingHash = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { blockIndex } = req.params;
        const { newPrecedingHash } = req.body;
        const index = parseInt(blockIndex);

        // Check if blockchain is initialized
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.' 
            });
        }

        // Validate block index (cannot modify genesis block's preceding hash)
        if (isNaN(index) || index <= 0 || index >= globalProductBlockchain.blockhain.length) {
            throw new CustomError(400, 'Invalid block index', { 
                success: false,
                message: `Block index must be between 1 and ${globalProductBlockchain.blockhain.length - 1} (cannot modify genesis block)` 
            });
        }

        if (!newPrecedingHash || typeof newPrecedingHash !== 'string') {
            throw new CustomError(400, 'Invalid preceding hash', { 
                success: false,
                message: 'Please provide a valid preceding hash string' 
            });
        }

        const block = globalProductBlockchain.blockhain[index];
        const precedingBlock = globalProductBlockchain.blockhain[index - 1];
        const originalPrecedingHash = block.precedingHash;

        block.precedingHash = newPrecedingHash;

        res.status(200).json({
            success: true,
            message: `Block ${index} preceding hash modified successfully (fraudulent modification)`,
            warning: 'This modification corrupts blockchain integrity - use for testing only',
            modification: {
                blockIndex: index,
                originalPrecedingHash,
                newPrecedingHash: block.precedingHash,
                actualPrecedingBlockHash: precedingBlock.hash,
                wasValidBefore: originalPrecedingHash === precedingBlock.hash,
                isValidNow: block.precedingHash === precedingBlock.hash
            }
        });
    } catch (error) {
        next(error);
    }
};

export const restoreBlockIntegrity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { blockIndex } = req.params;
        const index = parseInt(blockIndex);

        // Check if blockchain is initialized
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.' 
            });
        }

        // Validate block index
        if (isNaN(index) || index < 0 || index >= globalProductBlockchain.blockhain.length) {
            throw new CustomError(400, 'Invalid block index', { 
                success: false,
                message: `Block index must be between 0 and ${globalProductBlockchain.blockhain.length - 1}` 
            });
        }

        const block = globalProductBlockchain.blockhain[index];
        const oldHash = block.hash;
        
        // Restore preceding hash if it's not the genesis block
        if (index > 0) {
            const precedingBlock = globalProductBlockchain.blockhain[index - 1];
            block.precedingHash = precedingBlock.hash;
        }

        // Recalculate and restore the correct hash
        const newHash = block.computeHash();
        block.hash = newHash;

        res.status(200).json({
            success: true,
            message: `Block ${index} integrity restored successfully`,
            restoration: {
                blockIndex: index,
                oldHash,
                newHash,
                precedingHash: block.precedingHash,
                isNowValid: block.hash === block.computeHash()
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getCorruptedBlocksSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.' 
            });
        }

        const blocks = globalProductBlockchain.blockhain;
        const corruptedBlocks = [];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const isHashValid = block.hash === block.computeHash();
            let isPrecedingHashValid = true;
            
            if (i > 0) {
                const precedingBlock = blocks[i - 1];
                isPrecedingHashValid = block.precedingHash === precedingBlock.hash;
            }
            
            if (!isHashValid || !isPrecedingHashValid) {
                corruptedBlocks.push({
                    index: i,
                    isHashValid,
                    isPrecedingHashValid,
                    currentHash: block.hash,
                    computedHash: block.computeHash(),
                    currentPrecedingHash: block.precedingHash,
                    expectedPrecedingHash: i > 0 ? blocks[i - 1].hash : 'N/A (Genesis)',
                    productName: block.data.productName
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Corrupted blocks summary retrieved successfully',
            summary: {
                totalBlocks: blocks.length,
                corruptedBlocksCount: corruptedBlocks.length,
                blockchainIsValid: corruptedBlocks.length === 0,
                corruptedBlocks
            }
        });
    } catch (error) {
        next(error);
    }
};
