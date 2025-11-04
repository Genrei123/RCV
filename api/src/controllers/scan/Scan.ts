import type { NextFunction, Request, Response } from "express";
import { generateReport } from "../../utils/reportGeneration";
import CustomError from "../../utils/CustomError";
import { Product } from "../../typeorm/entities/product.entity";
import { searchProductInBlockchain } from "../../utils/ProductChainUtil";
import { User } from "../../typeorm/entities/user.entity";
import bcrypt from "bcryptjs";
import { ProductBlockchain } from "../../services/productblockchain";
import { Company } from "../../typeorm/entities/company.entity";
import { ProductBlock } from "../../services/productblock";
import {
  ScanHistory,
  ScanHistoryValidation,
} from "../../typeorm/entities/scanHistory";
import { ProductRepo, ScanRepo, CompanyRepo } from "../../typeorm/data-source";
import {
  parsePageParams,
  buildPaginationMeta,
  buildLinks,
} from "../../utils/pagination";
import { OCRBlock } from "../../types/types";
import { ProcessText } from "../../services/aiProcess";
import { ILike } from "typeorm";
import { success } from "zod";

export const scanQR = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generates Report
  const report = generateReport(req);
  res.status(200).json({ report });
};

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
  //     productClassification: "Processed Product",
  //     productSubClassification: "Gamecock Feeds",
  //     expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  //     dateOfRegistration: new Date(),
  //     registeredAt: new Date(),
  //     registeredBy: mockAdmin,
  //     company: mockCompany,
  // }
  // globalProductBlockchain = new ProductBlockchain(sampleProduct);
  // globalProductBlockchain.addNewBlock(new ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), sampleProduct));
};

export const scanProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract OCR text from request body
    const OCRText = req.body as OCRBlock;

    // Validate input
    if (!OCRText || !OCRText.blockOfText) {
      return next(
        new CustomError(400, "OCR text is required", {
          data: "Missing blockOfText in request body",
        })
      );
    }

    console.log("Received OCR text length:", OCRText.blockOfText.length);
    console.log("Processing OCR text with AI...");

    // Process the OCR text with AI to extract product information
    const processedOCRText = await ProcessText(OCRText.blockOfText);

    console.log("Extracted product information:", processedOCRText);

    // Return the extracted information WITHOUT querying the database
    // User will decide whether to search the database or not
    res.status(200).json({
      success: true,
      message: "OCR text processed successfully",
      extractedInfo: {
        productName: processedOCRText.productName || "Unknown",
        LTONumber: processedOCRText.LTONum || null,
        CFPRNumber: processedOCRText.CFPRNum || null,
        expirationDate: processedOCRText.ExpiryDate || null,
        manufacturer: processedOCRText.ManufacturedBy || null,
      },
      rawOCRText: OCRText.blockOfText,
    });
  } catch (error) {
    console.error("Error in scanProduct:", error);
    next(error);
  }
};

// New endpoint to search for product in database
export const searchScannedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productName, LTONumber, CFPRNumber } = req.body;

    // Validate input - at least one search criteria is required
    if (!productName && !LTONumber && !CFPRNumber) {
      return next(
        new CustomError(400, "At least one search criteria is required", {
          data: "Provide productName, LTONumber, or CFPRNumber",
        })
      );
    }

    console.log("Searching for product with criteria:", { productName, LTONumber, CFPRNumber });

    const { page, limit, skip } = parsePageParams(req, 10);
    
    // Build search criteria
    const searchCriteria: any = {};
    if (productName) {
      searchCriteria.productName = ILike(`%${productName}%`);
    }
    if (LTONumber) {
      searchCriteria.LTONumber = LTONumber;
    }
    if (CFPRNumber) {
      searchCriteria.CFPRNumber = CFPRNumber;
    }

    const [products, total] = await ProductRepo.findAndCount({
      where: searchCriteria,
      skip,
      take: limit,
      order: { dateOfRegistration: "DESC" },
      relations: ["company", "registeredBy"],
    });

    if (!products || products.length === 0) {
      console.log("Product not found in database. Creating sample product...");

      // First, get or create a sample company
      let sampleCompany = await CompanyRepo.findOne({
        where: { name: "Sample Test Company" },
      });

      if (!sampleCompany) {
        console.log("Creating sample company...");
        sampleCompany = new Company();
        sampleCompany.name = "Sample Test Company";
        sampleCompany.address = "123 Sample Street, Test City, Philippines";
        sampleCompany.licenseNumber =
          "LIC-" + Math.floor(Math.random() * 1000000);
        sampleCompany = await CompanyRepo.save(sampleCompany);
        console.log("Sample company created with ID:", sampleCompany._id);
      }

      // Create sample product with the extracted data
      const newProduct = new Product();
      newProduct.productName = productName || "Unknown Product";
      newProduct.brandName = req.body.brandName || "Sample Brand";
      newProduct.LTONumber = LTONumber || "LTO-2024-" + Math.floor(Math.random() * 100000);
      newProduct.CFPRNumber = CFPRNumber || "CFPR-2024-" + Math.floor(Math.random() * 100000);
      newProduct.lotNumber = req.body.lotNumber || "LOT-" + Math.floor(Math.random() * 1000000);
      newProduct.productClassification = req.body.productClassification || "Unclassified";
      newProduct.productSubClassification = req.body.productSubClassification || "General";
      newProduct.dateOfRegistration = new Date();
      newProduct.expirationDate = req.body.expirationDate 
        ? new Date(req.body.expirationDate)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      newProduct.registeredById = "56c69f46-e5ae-410e-b935-f714fbc6556c";
      newProduct.registeredAt = new Date();
      newProduct.companyId = sampleCompany._id;

      // Save the new product
      const savedProduct = await ProductRepo.save(newProduct);
      console.log("Sample product created with ID:", savedProduct._id);

      return res.status(200).json({
        success: true,
        message: "Product not found - created sample product for testing",
        Product: [savedProduct],
      });
    }

    console.log("Found products:", products.length);

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);

    res.status(200).json({
      success: true,
      message: "Product found successfully",
      data: products,
      pagination: meta,
      links,
      Product: products, // Keep this for compatibility with Flutter app
    });
  } catch (error) {
    console.error("Error in searchScannedProduct:", error);
    next(error);
  }
};

export const getScans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 10);
    const [scans, total] = await ScanRepo.findAndCount({
      skip,
      take: limit,
      order: { scannedAt: "DESC" },
    });
    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);
    res.status(200).json({ data: scans, pagination: meta, links });
  } catch (error) {
    next(error);
    return new CustomError(500, "Failed to retrieve scans");
  }
};

export const getScansByID = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!ScanHistoryValidation.parse({ id: req.params.id })) {
    return new CustomError(400, "Invalid Scan ID");
  }

  try {
    const scan = await ScanRepo.findOneBy({ _id: req.params.id });
    if (!scan) {
      return new CustomError(404, "Scan not found");
    }
    res.status(200).json({ scan });
  } catch (error) {
    next(error);
    return new CustomError(500, "Failed to retrieve scan");
  }
};
