import type { NextFunction, Request, Response } from 'express';
import { generateReport } from '../../utils/reportGeneration';
import CustomError from '../../utils/CustomError';

import { Product } from '../../typeorm/entities/product.entity';

import { searchProductInBlockchain } from '../../utils/ProductChainUtil';
import { User } from '../../typeorm/entities/user.entity';
import bcrypt from 'bcryptjs';
import { ProductBlockchain } from '../../services/productblockchain';
import { Company } from '../../typeorm/entities/company.entity';
import { ProductBlock } from '../../services/productblock';

export const scanQR = async (req: Request, res: Response, next: NextFunction) => {
    // Generates Report
    const report = generateReport(req);
    res.status(200).json({ report });
}

// In-memory lang muna
export let globalProductBlockchain: ProductBlockchain;

export const initializeProductBlockchain = async () => {
    const mockUser = new User();
    mockUser._id = "123213";
    mockUser.firstName = "John";
    mockUser.lastName = "Doe";
    mockUser.email = "john_doe";
    mockUser.phoneNumber = "09123456789";
    mockUser.role = 1; // Admin
    const salt = await bcrypt.genSalt(10);
    mockUser.password = await bcrypt.hash("adminpassword", salt);
    const mockAdmin = mockUser;

    const mockCompany = new Company();
    mockCompany._id = "comp123";
    mockCompany.name = "Sample Manufacturer";
    mockCompany.address = "123 Sample St, Sample City";



    const sampleProduct: Product = {
        _id: "prod123",
        LTONumber: "1234567890",
        CFPRNumber: "0987654321",
        lotNumber: "LOT123456",
        brandName: "Sample Brand",
        productName: "Sample Product",
        productClassification: 0,
        productSubClassification: 0,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        dateOfRegistration: new Date(),
        registeredAt: new Date(),
        registeredBy: mockAdmin,
        company: mockCompany,   
    }
    globalProductBlockchain = new ProductBlockchain(sampleProduct);
    globalProductBlockchain.addNewBlock(new ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), sampleProduct));
    
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

