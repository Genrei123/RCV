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
import { ScanHistory, ScanHistoryValidation } from '../../typeorm/entities/scanHistory';
import { ProductRepo, ScanRepo, CompanyRepo } from '../../typeorm/data-source';
import { OCRBlock } from '../../types/types';
import { ProcessText } from '../../services/AIProcess';
import { ILike } from 'typeorm';
import { success } from 'zod';



export const scanQR = async (req: Request, res: Response, next: NextFunction) => {
    // Generates Report
    const report = generateReport(req);
    res.status(200).json({ report });
}

// In-memory lang muna
export let globalProductBlockchain: ProductBlockchain;

export const initializeProductBlockchain = async () => {
    // const mockUser = new User();
    // mockUser._id = "123213";
    // mockUser.firstName = "John";
    // mockUser.lastName = "Doe";
    // mockUser.email = "john_doe";
    // mockUser.phoneNumber = "09123456789";
    // mockUser.role = 1; // Admin
    // const salt = await bcrypt.genSalt(10);
    // mockUser.password = await bcrypt.hash("adminpassword", salt);
    // const mockAdmin = mockUser;

    // const mockCompany = new Company();
    // mockCompany._id = "comp123";
    // mockCompany.name = "Sample Manufacturer";
    // mockCompany.address = "123 Sample St, Sample City";



    // const sampleProduct: Product = {
    //     _id: "prod123",
    //     LTONumber: "1234567890",
    //     CFPRNumber: "0987654321",
    //     lotNumber: "LOT123456",
    //     brandName: "Sample Brand",
    //     productName: "Sample Product",
    //     productClassification: 0,
    //     productSubClassification: 0,
    //     expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    //     dateOfRegistration: new Date(),
    //     registeredAt: new Date(),
    //     registeredBy: mockAdmin,
    //     company: mockCompany,   
    // }
    // globalProductBlockchain = new ProductBlockchain(sampleProduct);
    // globalProductBlockchain.addNewBlock(new ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), sampleProduct));

}

export const scanProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract OCR text from request body
        const OCRText = req.body as OCRBlock;
        
        // Validate input
        if (!OCRText || !OCRText.blockOfText) {
            return next(new CustomError(400, "OCR text is required", { 
                data: "Missing blockOfText in request body" 
            }));
        }

        console.log('Received OCR text length:', OCRText.blockOfText.length);
        console.log('Processing OCR text with AI...');

        // Process the OCR text with AI to extract product name
        const processedOCRText = await ProcessText(OCRText.blockOfText);
        
        console.log('Extracted product name:', processedOCRText.productName);

        // Search for product in database
        const products = await ProductRepo.find({ 
            where: { productName: ILike(processedOCRText.productName) } 
        });

        if (!products || products.length === 0) {
            // console.log('Product not found in database. Creating sample product...');
            
            // // First, get or create a sample company
            // let sampleCompany = await CompanyRepo.findOne({ 
            //     where: { name: 'Sample Test Company' } 
            // });
            
            // if (!sampleCompany) {
            //     console.log('Creating sample company...');
            //     sampleCompany = new Company();
            //     sampleCompany.name = 'Sample Test Company';
            //     sampleCompany.address = '123 Sample Street, Test City, Philippines';
            //     sampleCompany.licenseNumber = 'LIC-' + Math.floor(Math.random() * 1000000);
            //     sampleCompany = await CompanyRepo.save(sampleCompany);
            //     console.log('Sample company created with ID:', sampleCompany._id);
            // }
            
            // // Create sample product with the extracted name
            // const newProduct = new Product();
            // newProduct.productName = processedOCRText.productName;
            // newProduct.brandName = 'Sample Brand';
            // newProduct.LTONumber = 'LTO-2024-' + Math.floor(Math.random() * 100000);
            // newProduct.CFPRNumber = 'CFPR-2024-' + Math.floor(Math.random() * 100000);
            // newProduct.lotNumber = 'LOT-' + Math.floor(Math.random() * 1000000);
            // newProduct.productClassification = 0; // Default classification
            // newProduct.productSubClassification = 0; // Default sub-classification
            // newProduct.dateOfRegistration = new Date();
            // newProduct.expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
            // newProduct.registeredById = '56c69f46-e5ae-410e-b935-f714fbc6556c';
            // newProduct.registeredAt = new Date();
            // newProduct.companyId = sampleCompany._id; // Use the valid company ID
            
            // // Save the new product
            // const savedProduct = await ProductRepo.save(newProduct);
            // console.log('Sample product created with ID:', savedProduct._id);
            
            // return res.status(200).json({ 
            //     success: true,
            //     message: 'Product not found - created sample product for testing',
            //     extractedName: processedOCRText.productName,
            //     Product: [savedProduct]
            // });
            return res.status(400).json({
                success: false,
                message: 'Product not found'
            });
        }

        console.log('Found products:', products.length);

        res.status(200).json({ 
            success: true,
            message: 'Product found successfully',
            extractedName: processedOCRText.productName,
            Product: products 
        });
    } catch (error) {
        console.error('Error in scanProduct:', error);
        next(error);
    }
}

export const getScans = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const Scans = await ScanRepo.find();
        res.status(200).json({ scans: Scans });
    } catch (error) {
        next(error);
        return new CustomError(500, 'Failed to retrieve scans');
    }
}

export const getScansByID = async (req: Request, res: Response, next: NextFunction) => {
    if (!ScanHistoryValidation.parse({ id: req.params.id })) {
        return new CustomError(400, "Invalid Scan ID");
    }

    try {
        const scan = await ScanRepo.findOneBy({ _id: req.params.id });
        if (!scan) {
            return new CustomError(404, 'Scan not found');
        }
        res.status(200).json({ scan });
    } catch (error) {
        next(error);
        return new CustomError(500, 'Failed to retrieve scan');
    }
}



