import type { NextFunction, Request, Response } from 'express';
import CustomError from '../../utils/CustomError';
// import { globalProductBlockchain } from '../scan/Scan';

const ensureBlockchainInitialized = () => {
    // if (!globalProductBlockchain) {
    //     throw new CustomError(404, 'Blockchain not initialized', { 
    //         success: false,
    //         message: 'No blockchain found.' 
    //     });
    // }
};

const validateBlockIndex = (index: number, allowGenesis = true) => {
    // const blocks = globalProductBlockchain.blockhain;
    // const minIndex = allowGenesis ? 0 : 1;
    
    // if (isNaN(index) || index < minIndex || index >= blocks.length) {
    //     const message = allowGenesis 
    //         ? `Block index must be between 0 and ${blocks.length - 1}`
    //         : `Block index must be between 1 and ${blocks.length - 1} (cannot modify genesis block)`;
        
    //     throw new CustomError(400, 'Invalid block index', { 
    //         success: false,
    //         message 
    //     });
    // }
};

export const modifyBlockData = async (req: Request, res: Response, next: NextFunction) => {
    // try {
    //     ensureBlockchainInitialized();
        
    //     const index = parseInt(req.params.blockIndex);
    //     validateBlockIndex(index);

    //     const { productName, manufacturerName, distributorName, importerName } = req.body;
    //     const block = globalProductBlockchain.blockhain[index];
    //     const originalProductName = block.data.productName;

    //     if (productName) block.data.productName = productName;
    //     if (manufacturerName) block.data.company = manufacturerName;
    //     // if (distributorName) block.data.distributorName = distributorName;
    //     // if (importerName) block.data.importerName = importerName;

    //     res.status(200).json({
    //         success: true,
    //         message: `Block ${index} data modified (FRAUDULENT)`,
    //         warning: 'Blockchain integrity compromised - for testing only!',
    //         changes: {
    //             blockIndex: index,
    //             originalProductName,
    //             newProductName: block.data.productName
    //         }
    //     });
    // } catch (error) {
    //     next(error);
    // }
};

export const modifyBlockHash = async (req: Request, res: Response, next: NextFunction) => {
    // try {
    //     ensureBlockchainInitialized();
        
    //     const index = parseInt(req.params.blockIndex);
    //     validateBlockIndex(index);

    //     const { newHash } = req.body;
    //     if (!newHash || typeof newHash !== 'string') {
    //         throw new CustomError(400, 'Invalid hash', { 
    //             success: false,
    //             message: 'Please provide a valid hash string' 
    //         });
    //     }

    //     const block = globalProductBlockchain.blockhain[index];
    //     const originalHash = block.hash;
        
    //     block.hash = newHash;

    //     res.status(200).json({
    //         success: true,
    //         message: `Block ${index} hash modified (HANKER!!)`,
    //         warning: 'Blockchain integrity compromised',
    //         changes: {
    //             blockIndex: index,
    //             originalHash,
    //             newHash: block.hash,
    //             computedHash: block.computeHash()
    //         }
    //     });
    // } catch (error) {
    //     next(error);
    // }
};

export const modifyBlockPrecedingHash = async (req: Request, res: Response, next: NextFunction) => {
    // try {
    //     ensureBlockchainInitialized();
        
    //     const index = parseInt(req.params.blockIndex);
    //     validateBlockIndex(index, false);

    //     const { newPrecedingHash } = req.body;
    //     if (!newPrecedingHash || typeof newPrecedingHash !== 'string') {
    //         throw new CustomError(400, 'Invalid preceding hash', { 
    //             success: false,
    //             message: 'Please provide a valid preceding hash string' 
    //         });
    //     }

    //     const block = globalProductBlockchain.blockhain[index];
    //     const originalPrecedingHash = block.precedingHash;
        
    //     block.precedingHash = newPrecedingHash;

    //     res.status(200).json({
    //         success: true,
    //         message: `Block ${index} preceding hash modified (HANKER!!)`,
    //         warning: 'Blockchain integrity compromised',
    //         changes: {
    //             blockIndex: index,
    //             originalPrecedingHash,
    //             newPrecedingHash: block.precedingHash
    //         }
    //     });
    // } catch (error) {
    //     next(error);
    // }
};

export const restoreBlockIntegrity = async (req: Request, res: Response, next: NextFunction) => {
    // try {
    //     ensureBlockchainInitialized();
        
    //     const index = parseInt(req.params.blockIndex);
    //     validateBlockIndex(index);

    //     const block = globalProductBlockchain.blockhain[index];
    //     const oldHash = block.hash;
        
    //     if (index > 0) {
    //         const precedingBlock = globalProductBlockchain.blockhain[index - 1];
    //         block.precedingHash = precedingBlock.hash;
    //     }

    //     block.hash = block.computeHash();

    //     res.status(200).json({
    //         success: true,
    //         message: `Block ${index} integrity restored`,
    //         restoration: {
    //             blockIndex: index,
    //             oldHash,
    //             newHash: block.hash,
    //             isNowValid: block.hash === block.computeHash()
    //         }
    //     });
    // } catch (error) {
    //     next(error);
    // }
};

export const getCorruptedBlocksSummary = async (req: Request, res: Response, next: NextFunction) => {
    // try {
    //     ensureBlockchainInitialized();

    //     const blocks = globalProductBlockchain.blockhain;
    //     const isChainValid = globalProductBlockchain.checkChainValidity();
    //     const corruptedBlocks = [];

    //     for (let i = 0; i < blocks.length; i++) {
    //         const block = blocks[i];
    //         const isHashValid = block.hash === block.computeHash();
    //         const isPrecedingHashValid = i === 0 || block.precedingHash === blocks[i - 1].hash;
            
    //         if (!isHashValid || !isPrecedingHashValid) {
    //             corruptedBlocks.push({
    //                 index: i,
    //                 productName: block.data.productName,
    //                 isHashValid,
    //                 isPrecedingHashValid
    //             });
    //         }
    //     }

    //     res.status(200).json({
    //         success: true,
    //         message: 'Blockchain corruption summary',
    //         summary: {
    //             isChainValid,
    //             totalBlocks: blocks.length,
    //             corruptedCount: corruptedBlocks.length,
    //             corruptedBlocks
    //         }
    //     });
    // } catch (error) {
    //     next(error);
    // }
};