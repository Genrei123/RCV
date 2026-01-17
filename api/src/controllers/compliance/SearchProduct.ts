import { Request, Response, NextFunction } from 'express';
import CustomError from '../../utils/CustomError';
import { ProductRepo } from '../../typeorm/data-source';
import { ILike } from 'typeorm';
import { searchProductWithGrounding } from '../../services/groundedSearchService';

/**
 * Search for product in database first, then use grounded search if not found
 * POST /api/v1/mobile/compliance/search-product
 */
export const searchProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productName, LTONumber, CFPRNumber, brandName, manufacturer } = req.body;

    console.log('🔍 Step 1: Searching for product in OUR database with criteria:', {
      productName,
      LTONumber,
      CFPRNumber,
      brandName,
      manufacturer
    });

    // Build search criteria for database query
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
    const products = await ProductRepo.find({
      where: searchCriteria,
      relations: ['company', 'registeredBy'],
      take: 5, // Limit results
      order: { dateOfRegistration: 'DESC' },
    });

    // If product found in OUR database, return it immediately
    if (products && products.length > 0) {
      console.log('✅ Product found in OUR database:', products.length, 'results');

      // Check for missing registration numbers
      const warnings: string[] = [];
      const firstProduct = products[0];
      
      if (!firstProduct.CFPRNumber) {
        warnings.push('⚠️ CRITICAL: This product has NO CFPR registration number. This may be an unregistered or illegal product.');
      }
      
      if (!firstProduct.LTONumber) {
        warnings.push('⚠️ This product has NO LTO number.');
      }
      
      // If multiple products match, warn about it
      if (products.length > 1) {
        warnings.push(`⚠️ Multiple products found (${products.length} matches). LTO/CFPR numbers are more reliable identifiers than product names.`);
      }

      return res.status(200).json({
        success: true,
        found: true,
        message: warnings.length > 0 
          ? 'Product found but has registration issues' 
          : 'Product found in database',
        source: 'internal_database',
        warnings: warnings.length > 0 ? warnings : undefined,
        product: firstProduct, // Return first match for compatibility
        data: firstProduct,
        allMatches: products.length > 1 ? products : undefined, // Include all matches if multiple
        totalMatches: products.length,
      });
    }

    // STEP 2: Product NOT found in our database - use GROUNDED SEARCH
    console.log('⚠️ Product NOT found in our database');
    console.log('🌐 Step 2: Performing grounded search with PDF registry...');

    try {
      const groundedResult = await searchProductWithGrounding(
        productName,
        LTONumber,
        CFPRNumber,
        brandName,
        manufacturer
      );

      if (!groundedResult) {
        console.log('❌ No match found in PDF registry either');
        return res.status(200).json({
          success: true,
          found: false,
          message: 'No products found in database or official registry',
          source: 'not_found',
          product: null,
          data: null,
        });
      }

      // Format grounded result to match expected structure
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

      console.log('✅ Product found via grounded search from PDF registry');

      return res.status(200).json({
        success: true,
        found: true,
        message: 'Product found in official PDF registry',
        source: 'grounded_search_pdf',
        product: groundedProduct,
        data: groundedProduct,
        confidence: groundedResult.confidence,
      });

    } catch (groundingError: any) {
      console.error('❌ Error during grounded search:', groundingError);

      // Fallback: Return not found if grounding fails
      return res.status(200).json({
        success: true,
        found: false,
        message: 'Product not found (grounding search unavailable)',
        source: 'search_failed',
        product: null,
        data: null,
        error: groundingError.message,
      });
    }

  } catch (error: any) {
    console.error('Error searching product:', error);
    return next(new CustomError(500, 'Failed to search product'));
  }
};
