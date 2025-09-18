import type { NextFunction, Request, Response } from 'express';
import CustomError from '../../utils/CustomError';
import { globalProductBlockchain } from '../scan/Scan';
import { getAllProductsInBlockchain } from '../../utils/ProductChainUtil';

export const checkBlockchainValidity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if blockchain is initialized
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No blockchain found. Please initialize the blockchain first.' 
            });
        }

        // Check blockchain validity
        const isValid = globalProductBlockchain.checkChainValidity();
        
        if (isValid) {
            res.status(200).json({
                success: true,
                message: 'Blockchain is valid',
                isValid: true,
                totalBlocks: globalProductBlockchain.blockhain.length,
                difficulty: globalProductBlockchain.difficulty
            });
        } else {
            res.status(200).json({
                success: true,
                message: 'Blockchain bad inegrity',
                isValid: false,
                totalBlocks: globalProductBlockchain.blockhain.length,
                difficulty: globalProductBlockchain.difficulty
            });
        }
    } catch (error) {
        next(error);
    }
};

export const getBlockchainInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if blockchain is initialized
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.' 
            });
        }

        const blocks = getAllProductsInBlockchain();
        const isValid = globalProductBlockchain.checkChainValidity();

        res.status(200).json({
            success: true,
            message: 'Blockchain information retrieved successfully',
            blockchain: {
                isValid,
                totalBlocks: blocks.length,
                difficulty: globalProductBlockchain.difficulty,
                blocks: blocks.map(block => ({
                    index: block.index,
                    timestamp: block.timestamp,
                    hash: block.hash,
                    precedingHash: block.precedingHash,
                    nonce: block.nonce,
                    product: {
                        LTONumber: block.data.LTONumber,
                        CFPRNumber: block.data.CFPRNumber,
                        productName: block.data.productName,
                        productType: block.data.productType,
                        manufacturerName: block.data.manufacturerName,
                        distributorName: block.data.distributorName,
                        importerName: block.data.importerName,
                        addedAt: block.data.addedAt
                    }
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

export const validateSpecificBlock = async (req: Request, res: Response, next: NextFunction) => {
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

        if (isNaN(index) || index < 0 || index >= globalProductBlockchain.blockhain.length) {
            throw new CustomError(400, 'Invalid block index', { 
                success: false,
                message: `Block index must be between 0 and ${globalProductBlockchain.blockhain.length - 1}` 
            });
        }

        const block = globalProductBlockchain.blockhain[index];
        const isHashValid = block.hash === block.computeHash();
        let isPrecedingHashValid = true;

        if (index > 0) {
            const precedingBlock = globalProductBlockchain.blockhain[index - 1];
            isPrecedingHashValid = block.precedingHash === precedingBlock.hash;
        }

        const isBlockValid = isHashValid && isPrecedingHashValid;

        res.status(200).json({
            success: true,
            message: `Block ${index} validation completed`,
            blockValidation: {
                index: block.index,
                isValid: isBlockValid,
                isHashValid,
                isPrecedingHashValid,
                hash: block.hash,
                computedHash: block.computeHash(),
                precedingHash: block.precedingHash,
                timestamp: block.timestamp,
                nonce: block.nonce,
                product: {
                    LTONumber: block.data.LTONumber,
                    CFPRNumber: block.data.CFPRNumber,
                    productName: block.data.productName
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getBlockchainStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if blockchain has genesis block
        if (!globalProductBlockchain) {
            throw new CustomError(404, 'Blockchain not initialized', { 
                success: false,
                message: 'No genesis block located.' 
            });
        }

        const blocks = globalProductBlockchain.blockhain;
        const isValid = globalProductBlockchain.checkChainValidity();
        
        // Check chain stats
        const totalBlocks = blocks.length;
        const averageNonce = blocks.reduce((sum, block) => sum + block.nonce, 0) / totalBlocks;
        const latestBlock = blocks[blocks.length - 1];
        const oldestBlock = blocks[0];

        // Invalid checker
        const invalidBlocks = [];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const isHashValid = block.hash === block.computeHash();
            let isPrecedingHashValid = true;
            
            if (i > 0) {
                const precedingBlock = blocks[i - 1];
                isPrecedingHashValid = block.precedingHash === precedingBlock.hash;
            }
            
            if (!isHashValid || !isPrecedingHashValid) {
                invalidBlocks.push({
                    index: i,
                    isHashValid,
                    isPrecedingHashValid
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Blockchain statistics retrieved successfully',
            stats: {
                isValid,
                totalBlocks,
                difficulty: globalProductBlockchain.difficulty,
                averageNonce: Math.round(averageNonce * 100) / 100,
                invalidBlocksCount: invalidBlocks.length,
                invalidBlocks,
                latestBlock: {
                    index: latestBlock.index,
                    timestamp: latestBlock.timestamp,
                    hash: latestBlock.hash,
                    productName: latestBlock.data.productName
                },
                genesisBlock: {
                    index: oldestBlock.index,
                    timestamp: oldestBlock.timestamp,
                    hash: oldestBlock.hash,
                    productName: oldestBlock.data.productName
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
