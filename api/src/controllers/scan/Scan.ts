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
import { FuzzySearchService } from "../../services/fuzzySearchService";

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

    console.log("Received OCR text length:", blockOfText.length);
    console.log("🔍 Performing Fuzzy Search on Database...");

    // perform fuzzy search - now returns { product, searchDetails }
    const { product: matchedProduct, searchDetails } = await FuzzySearchService.searchProductsFuzzy(blockOfText);

    if (matchedProduct) {
      console.log("✅ Product found via Fuzzy Search:", matchedProduct.productName);
      console.log("   Match type:", searchDetails.matchType, "on:", searchDetails.matchedOn);
      
      // Return the found product directly
      return res.status(200).json({
        success: true,
        found: true,
        message: "Product found in database",
        matchDetails: searchDetails,
        extractedInfo: {
          productName: matchedProduct.productName,
          brandName: matchedProduct.brandName || null,
          LTONumber: matchedProduct.LTONumber,
          CFPRNumber: matchedProduct.CFPRNumber,
          expirationDate: matchedProduct.expirationDate ? new Date(matchedProduct.expirationDate).toISOString().split('T')[0] : null,
          manufacturer: matchedProduct.company?.name || "Unknown",
          companyName: matchedProduct.company?.name || null,
        },
        product: matchedProduct, // Include full product object
        rawOCRText: blockOfText,
        frontImageUrl: frontImageUrl || null,
        backImageUrl: backImageUrl || null,
      });
    } else {
      console.log("❌ No matching product found in database.");
      console.log("   Search details:", JSON.stringify(searchDetails));
      
      // Return found: false so the UI can show "No Result"
      return res.status(200).json({
        success: true,
        found: false,
        message: "No results found. Please ensure the label is clear and try again.",
        searchDetails: searchDetails, // Include what we searched for (helps debugging)
        rawOCRText: blockOfText,
        frontImageUrl: frontImageUrl || null,
        backImageUrl: backImageUrl || null,
      });
    }

  } catch (error) {
    console.error("Error in scanProduct:", error);
    next(error);
  }
};

// New endpoint for "More Details" / AI Summary
export const summarizeScannedProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { blockOfText } = req.body;

    if (!blockOfText) {
      return next(new CustomError(400, "OCR text is required"));
    }

    console.log("🧠 Generative AI Summary requested...");
    
    // Use the original AI process logic
    const processedOCRText = await ProcessText(blockOfText);

    // Also perform a grounded search if needed, or just return the AI extraction
    // The user asked to "search the net", so grounded search is appropriate here too
    // But ProcessText is what we had before. Let's stick to ProcessText as the "AI Thinking" 
    // and maybe add grounded search if ProcessText is weak. 
    // For now, let's return the ProcessText result as the "AI Analysis".

    res.status(200).json({
      success: true,
      message: "AI Summary generated",
      aiSummary: processedOCRText
    });

  } catch (error) {
    console.error("Error in summarizeScannedProduct:", error);
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
