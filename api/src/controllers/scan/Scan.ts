import type { NextFunction, Request, Response } from "express";
import CustomError from "../../utils/CustomError";
import { Product } from "../../typeorm/entities/product.entity";
import { Company } from "../../typeorm/entities/company.entity";
import {
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
import { FirebaseStorageValidator } from "../../utils/FirebaseStorageValidator";
import { searchProductWithGrounding } from "../../services/groundedSearchService";
import { ILike } from "typeorm";

export const scanProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract OCR text and image URLs from request body
    const { blockOfText, frontImageUrl, backImageUrl } = req.body;

    // Validate input
    if (!blockOfText) {
      return next(
        new CustomError(400, "OCR text is required", {
          data: "Missing blockOfText in request body",
        })
      );
    }

    // Validate image URLs if provided
    if (frontImageUrl && !FirebaseStorageValidator.isValidScanUrl(frontImageUrl)) {
      return next(
        new CustomError(400, "Invalid front image URL", {
          data: "Front image must be from Firebase Storage scans/ folder",
        })
      );
    }

    if (backImageUrl && !FirebaseStorageValidator.isValidScanUrl(backImageUrl)) {
      return next(
        new CustomError(400, "Invalid back image URL", {
          data: "Back image must be from Firebase Storage scans/ folder",
        })
      );
    }

    console.log("Received OCR text length:", blockOfText.length);
    if (frontImageUrl) console.log("Front image URL:", frontImageUrl);
    if (backImageUrl) console.log("Back image URL:", backImageUrl);
    console.log("Processing OCR text with AI...");

    // Process the OCR text with AI to extract product information
    const processedOCRText = await ProcessText(blockOfText);

    console.log("Extracted product information:", processedOCRText);

    // Return the extracted information WITHOUT querying the database
    // User will decide whether to search the database or not
    // Include image URLs in response for audit logging
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
      rawOCRText: blockOfText,
      frontImageUrl: frontImageUrl || null,
      backImageUrl: backImageUrl || null,
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
    const { productName, LTONumber, CFPRNumber, brandName, manufacturer } = req.body;

    // Validate input - at least one search criteria is required
    if (!productName && !LTONumber && !CFPRNumber) {
      return next(
        new CustomError(400, "At least one search criteria is required", {
          data: "Provide productName, LTONumber, or CFPRNumber",
        })
      );
    }

    console.log("🔍 Step 1: Searching for product in OUR database with criteria:", { 
      productName, 
      LTONumber, 
      CFPRNumber,
      brandName,
      manufacturer 
    });

    const { page, limit, skip } = parsePageParams(req, 10);
    
    // Build search criteria for database
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

    // STEP 1: Try to find in OUR database first
    const [products, total] = await ProductRepo.findAndCount({
      where: searchCriteria,
      skip,
      take: limit,
      order: { dateOfRegistration: "DESC" },
      relations: ["company", "registeredBy"],
    });

    // If product found in OUR database, return it immediately
    if (products && products.length > 0) {
      console.log("✅ Product found in OUR database:", products.length, "results");

      const meta = buildPaginationMeta(page, limit, total);
      const links = buildLinks(req, page, limit, meta.total_pages);

      return res.status(200).json({
        success: true,
        found: true,
        message: "Product found in database",
        source: "internal_database",
        data: products,
        pagination: meta,
        links,
        Product: products, // Keep this for compatibility with Flutter app
      });
    }

    // STEP 2: Product NOT found in our database - use GROUNDED SEARCH
    console.log("⚠️ Product NOT found in our database");
    console.log("🌐 Step 2: Performing grounded search with PDF registry...");

    try {
      const groundedResult = await searchProductWithGrounding(
        productName,
        LTONumber,
        CFPRNumber,
        brandName,
        manufacturer
      );

      if (!groundedResult) {
        console.log("❌ No match found in PDF registry either");
        return res.status(200).json({
          success: true,
          found: false,
          message: "Product not found in database or official registry",
          source: "not_found",
          data: null,
        });
      }

      // Format grounded result to match Product structure
      const groundedProduct = {
        _id: `grounded-${Date.now()}`,
        productName: groundedResult.productName,
        brandName: groundedResult.brandName,
        CFPRNumber: groundedResult.CFPRNumber,
        productClassification: groundedResult.productClassification,
        productSubClassification: groundedResult.subClassification,
        expirationDate: groundedResult.validUntil, // Map VALID UNTIL to expirationDate
        company: {
          name: groundedResult.companyName,
          address: 'Philippines',
        },
        isActive: true,
        confidence: groundedResult.confidence,
        sourceUrl: groundedResult.source,
      };

      console.log("✅ Product found via grounded search from PDF registry");

      return res.status(200).json({
        success: true,
        found: true,
        message: "Product found in official PDF registry (not in our database)",
        source: "grounded_search_pdf",
        data: [groundedProduct],
        confidence: groundedResult.confidence,
        Product: [groundedProduct], // Keep this for compatibility with Flutter app
      });

    } catch (groundingError: any) {
      console.error("❌ Error during grounded search:", groundingError);
      
      // Fallback: Return not found if grounding fails
      return res.status(200).json({
        success: true,
        found: false,
        message: "Product not found (database search failed, grounding search unavailable)",
        source: "search_failed",
        data: null,
        error: groundingError.message,
      });
    }

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
