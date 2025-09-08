import type { NextFunction, Request, Response } from 'express';
import { generateReport } from '../../utils/reportGeneration';
import CustomError from '../../utils/CustomError';
import { ProductBlockchain } from '../../typeorm/entities/productblockchain';
import { Product } from '../../typeorm/entities/product.entity';
import { ProductBlock } from '../../typeorm/entities/productblock';
import { searchProductInBlockchain } from '../../utils/ProductChainUtil';
import { AdminRepo, DB } from '../../typeorm/data-source';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Admin } from '../../typeorm/entities/admin.entity';

export const scanQR = async (req: Request, res: Response, next: NextFunction) => {
    // Generates Report
    const report = generateReport(req);
    res.status(200).json({ report });
}

// In-memory lang muna
export let globalProductBlockchain: ProductBlockchain;

export const initializeProductBlockchain = async () => {
    const mockAdmin = await DB.getRepository('Admin').findOneBy({ fullName: 'System Administrato' });
    if (!mockAdmin) {
        throw new Error('Mock admin user not found. Ensure createMockUsers is called first.');
    }
    const sampleProduct: Product = {
        LTONumber: "1234567890",
        CFPRNumber: "0987654321",
        productName: "Sample Product",
        productType: 0,
        manufacturerName: "Sample Manufacturer",
        distributorName: "Sample Distributor",
        importerName: "Sample Importer",
        addedAt: new Date(),
        addedByAdmin: mockAdmin as Admin
    }
    const sampleProduct2: Product = {
        LTONumber: "2234567890",
        CFPRNumber: "2987654321",
        productName: "Another Product",
        productType: 1,
        manufacturerName: "Another Manufacturer",
        distributorName: "Another Distributor",
        importerName: "Another Importer",
        addedAt: new Date(),
        addedByAdmin: mockAdmin as Admin,  
    }
    globalProductBlockchain = new ProductBlockchain(sampleProduct);
    globalProductBlockchain.addNewBlock(new ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), sampleProduct));
    globalProductBlockchain.addNewBlock(new ProductBlock(2, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), sampleProduct2));
}

export const scanProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const scanned = req.body as Product;
        if (!scanned || !scanned.productName) {
            throw new CustomError(400, 'Invalid scanned data', { success: false });
        }

        // Initialize the blockchain if not already done
        if (!globalProductBlockchain) {
            initializeProductBlockchain();
        }

        const productInfo = searchProductInBlockchain(scanned.productName);
        if (!productInfo) {
            throw new CustomError(404, 'Product not found in blockchain', { success: false });
        }
        res.status(200).json({ success: true, productInfo });
    } catch (error) {
        next(error);
    }
}

