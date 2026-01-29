import { ProductRepo } from "../typeorm/data-source";
import { ILike, Brackets } from "typeorm";
import { Product } from "../typeorm/entities/product.entity";

export class FuzzySearchService {
  /**
   * Cleans the OCR text to remove special characters and noise
   */
  private static cleanText(text: string): string {
    return text.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  /**
   * Extract CFPR number specifically from OCR text
   * Returns null if not found - this is a REQUIRED field
   */
  private static extractCFPRNumber(text: string): string | null {
    // Common CFPR patterns: FR-XXXX, FR XXXX, FRXXXX, etc.
    const cfprPatterns = [
      /FR[-\s]?[0-9]{4,}/gi,
      /CFPR[-\s]?[0-9]{4,}/gi,
      /(?:CFPR|FR)[-\s]?[A-Z0-9]{4,}/gi,
    ];
    
    for (const pattern of cfprPatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        const cleaned = match[0].replace(/\s+/g, '-').toUpperCase();

        return cleaned;
      }
    }
    return null;
  }

  /**
   * Extract LTO number specifically from OCR text
   * Returns null if not found
   */
  private static extractLTONumber(text: string): string | null {
    // Common LTO patterns: LTO-XXXX, DR-XXXX, LTO XXXX, etc.
    const ltoPatterns = [
      /LTO[-\s]?[0-9]{4,}/gi,
      /DR[-\s]?[A-Z0-9]{4,}/gi,
      /(?:LTO|DR)[-\s]?[A-Z0-9\-]{4,}/gi,
    ];
    
    for (const pattern of ltoPatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        const cleaned = match[0].replace(/\s+/g, '-').toUpperCase();

        return cleaned;
      }
    }
    return null;
  }

  /**
   * Extracts potential codes (LTO, CFPR) from text
   * Looks for patterns like "LTO-..." or "CFPR-..." or numeric sequences
   */
  private static extractPotentialCodes(text: string): string[] {
    // Various code patterns
    const codeRegex = /[a-zA-Z]{0,4}[-\s]?[0-9]{3,}[-\s]?[a-zA-Z0-9]*/gi;
    const matches = text.match(codeRegex) || [];
    
    // Also extract alphanumeric sequences with hyphens
    const hyphenatedCodes = text.match(/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/g) || [];
    
    // Any word with numbers that is 5+ chars
    const words = text.split(/\s+/).filter(w => w.length > 4 && /[0-9]/.test(w));
    
    return [...new Set([...matches, ...hyphenatedCodes, ...words])].map(c => c.trim()).filter(c => c.length > 3);
  }

  /**
   * Extracts potential product/brand names (longer text fragments)
   */
  private static extractKeywords(text: string): string[] {
    const cleaned = this.cleanText(text);
    // Extract words 4+ characters, excluding common filler words
    const fillerWords = new Set(['with', 'from', 'that', 'this', 'have', 'been', 'more', 'your', 'date', 'best', 'before', 'after', 'made', 'label', 'front', 'back', 'product', 'ingredients', 'contains']);
    const words = cleaned.split(/\s+/)
      .filter(w => w.length >= 4)
      .filter(w => !fillerWords.has(w.toLowerCase()))
      .map(w => w.toLowerCase());
    
    return [...new Set(words)];
  }

  /**
   * Validates that the matched product's critical codes are present in the OCR text
   * NEW: Accepts products even if CFPR is missing (flags as warning)
   * Prioritizes LTO/CFPR verification over product name matches
   */
  private static validateMatchAgainstOCR(product: Product, ocrText: string): { 
    valid: boolean; 
    missingFields: string[]; 
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    const upperText = ocrText.toUpperCase();
    let cfprFound = false;
    let ltoFound = false;
    let productHasCFPR = false;
    let productHasLTO = false;
    
    // Check if product HAS CFPR in database
    if (product.CFPRNumber) {
      productHasCFPR = true;
      const cfprClean = product.CFPRNumber.replace(/[-\s]/g, '').toUpperCase();
      const cfprVariants = [
        product.CFPRNumber.toUpperCase(),
        cfprClean,
        cfprClean.replace(/^FR/, 'FR-'),
        cfprClean.replace(/^CFPR/, 'CFPR-'),
      ];
      
      cfprFound = cfprVariants.some(variant => 
        upperText.includes(variant) || 
        upperText.replace(/[-\s]/g, '').includes(variant)
      );
      
      if (!cfprFound) {
        missingFields.push('CFPRNumber');
      } 
    } else {
      // CRITICAL: Product has NO CFPR in database - this is ILLEGAL
      warnings.push('Product is missing CFPR registration number - may be unregistered/illegal');
    }

    // Check if product HAS LTO in database
    if (product.LTONumber) {
      productHasLTO = true;
      const ltoClean = product.LTONumber.replace(/[-\s]/g, '').toUpperCase();
      const ltoVariants = [
        product.LTONumber.toUpperCase(),
        ltoClean,
      ];
      
      ltoFound = ltoVariants.some(variant => 
        upperText.includes(variant) || 
        upperText.replace(/[-\s]/g, '').includes(variant)
      );
      
      if (!ltoFound) {
        console.log(`   ⚠️ LTO ${product.LTONumber} NOT found in OCR text`);
        missingFields.push('LTONumber');
      } else {
        console.log(`   ✅ LTO ${product.LTONumber} FOUND in OCR text`);
      }
    } else {
      console.log("   ⚠️ Product has NO LTO number in database");
      warnings.push('Product is missing LTO number');
    }

    // NEW VALIDATION LOGIC - MORE LENIENT for product identification:
    // We want to IDENTIFY the product, compliance checking happens separately
    // Priority: LTO/CFPR codes are MORE IMPORTANT than product names
    let confidence: 'high' | 'medium' | 'low';
    let valid: boolean;
    
    if (cfprFound && ltoFound) {
      // BEST CASE: Both codes found and match
      confidence = 'high';
      valid = true;
      console.log('   ✅ HIGH confidence: Both CFPR and LTO verified');
    } else if (cfprFound || ltoFound) {
      // GOOD CASE: At least one code verified
      confidence = 'medium';
      valid = true;
      console.log(`   ✅ MEDIUM confidence: ${cfprFound ? 'CFPR' : 'LTO'} verified`);
    } else if (!productHasCFPR && !productHasLTO) {
      // ACCEPT: Product has no codes in database (name match only)
      // This is OK for identification, compliance check happens later
      confidence = 'low';
      valid = true;
      warnings.push('Product identified by name only - no registration codes to verify');
      console.log('   ⚠️ LOW confidence: Product identified by name (no codes to verify)');
    } else {
      // ACCEPT ANYWAY: Product has codes but they're not in OCR
      // This is OK - we identified the product, compliance check will catch missing codes
      confidence = 'low';
      valid = true;
      warnings.push('Product identified but registration codes not found in OCR');
      console.log('   ⚠️ LOW confidence: Product identified but codes not verified');
    }
    
    return { valid, missingFields, confidence, warnings };
  }

  /**
   * Performs a comprehensive fuzzy search against the Product database using OCR text
   * Searches: LTONumber, CFPRNumber, productName, brandName, company name
   * 
   * PRIORITY: LTO/CFPR codes are MORE IMPORTANT than product names
   * ACCEPTS: Products without CFPR (flags as warning)
   */
  static async searchProductsFuzzy(ocrText: string): Promise<{ 
    product: Product | null; 
    searchDetails: any;
    warnings?: string[];
  }> {
    const cleanedText = this.cleanText(ocrText);
    const potentialCodes = this.extractPotentialCodes(ocrText);
    const keywords = this.extractKeywords(ocrText);
    
    // Extract specific codes from OCR
    const extractedCFPR = this.extractCFPRNumber(ocrText);
    const extractedLTO = this.extractLTONumber(ocrText);
    
    console.log("🔍 Fuzzy Search Debug:");
    console.log("   Extracted CFPR:", extractedCFPR || "NOT FOUND");
    console.log("   Extracted LTO:", extractedLTO || "NOT FOUND");
    console.log("   Potential Codes:", potentialCodes);
    console.log("   Keywords:", keywords.slice(0, 10)); // First 10

    // STRATEGY 1: Direct CFPR match (highest confidence - CFPR is unique identifier)
    if (extractedCFPR) {
      const cfprClean = extractedCFPR.replace(/[-\s]/g, '');
      const cfprMatch = await ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.company", "company")
        .where("REPLACE(REPLACE(product.CFPRNumber, '-', ''), ' ', '') ILIKE :cfpr", { cfpr: `%${cfprClean}%` })
        .getOne();
      
      if (cfprMatch) {
        // Validate match - either CFPR or LTO must be in OCR
        const validation = this.validateMatchAgainstOCR(cfprMatch, ocrText);
        
        if (validation.valid) {
          console.log(`✅ Found direct CFPR match (${validation.confidence} confidence):`, cfprMatch.productName);
          return { 
            product: cfprMatch, 
            searchDetails: { matchType: 'cfpr', matchedOn: extractedCFPR, confidence: validation.confidence },
            warnings: validation.warnings
          };
        } else {
          console.log("❌ CFPR match rejected - insufficient verification:", validation.missingFields);
        }
      }
    }

    // STRATEGY 2: Direct LTO match
    if (extractedLTO) {
      const ltoClean = extractedLTO.replace(/[-\s]/g, '');
      const ltoMatch = await ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.company", "company")
        .where("REPLACE(REPLACE(product.LTONumber, '-', ''), ' ', '') ILIKE :lto", { lto: `%${ltoClean}%` })
        .getOne();
      
      if (ltoMatch) {
        // Validate match - either CFPR or LTO must be in OCR
        const validation = this.validateMatchAgainstOCR(ltoMatch, ocrText);
        
        if (validation.valid) {
          console.log(`✅ Found LTO match (${validation.confidence} confidence):`, ltoMatch.productName);
          return { 
            product: ltoMatch, 
            searchDetails: { matchType: 'LTO', matchedOn: extractedLTO, confidence: validation.confidence },
            warnings: validation.warnings
          };
        } else {
          console.log("❌ LTO match rejected - insufficient verification:", validation.missingFields);
        }
      }
    }

    // STRATEGY 3: Try other potential codes
    if (potentialCodes.length > 0) {
      for (const code of potentialCodes) {
        const directMatch = await ProductRepo.createQueryBuilder("product")
          .leftJoinAndSelect("product.company", "company")
          .where("product.LTONumber ILIKE :code", { code: `%${code}%` })
          .orWhere("product.CFPRNumber ILIKE :code", { code: `%${code}%` })
          .getOne();
        
        if (directMatch) {
          // Validate match - either CFPR or LTO must be in OCR
          const validation = this.validateMatchAgainstOCR(directMatch, ocrText);
          
          if (validation.valid) {
            console.log(`✅ Found direct code match (${validation.confidence} confidence):`, directMatch.productName);
            return { 
              product: directMatch, 
              searchDetails: { matchType: 'code', matchedOn: code, confidence: validation.confidence },
              warnings: validation.warnings
            };
          } else {
            console.log("❌ Code match rejected - insufficient verification:", validation.missingFields);
          }
        }
      }
    }

    // STRATEGY 4: Search by product name or brand name using keywords
    // ONLY use this if we found some identifying codes in OCR (lower priority than code matches)
    // This is a fallback when exact code matches fail
    if (keywords.length > 0 && (extractedCFPR || extractedLTO)) {
      console.log("⚠️ Falling back to keyword search (lower priority than code matches)");
      for (const keyword of keywords) {
        if (keyword.length < 5) continue; // Skip short words
        
        const nameMatch = await ProductRepo.createQueryBuilder("product")
          .leftJoinAndSelect("product.company", "company")
          .where("product.productName ILIKE :kw", { kw: `%${keyword}%` })
          .orWhere("product.brandName ILIKE :kw", { kw: `%${keyword}%` })
          .orWhere("company.name ILIKE :kw", { kw: `%${keyword}%` })
          .getOne();
        
        if (nameMatch) {
          // Validate match - either CFPR or LTO must be in OCR
          const validation = this.validateMatchAgainstOCR(nameMatch, ocrText);
          
          if (validation.valid) {
            console.log(`✅ Found keyword match (${validation.confidence} confidence):`, nameMatch.productName, "via keyword:", keyword);
            validation.warnings.push('Match based on product name - LTO/CFPR codes have higher priority');
            return { 
              product: nameMatch, 
              searchDetails: { matchType: 'keyword', matchedOn: keyword, confidence: validation.confidence },
              warnings: validation.warnings
            };
          } else {
            console.log("❌ Keyword match rejected - insufficient verification:", validation.missingFields);
            // Continue searching - maybe another keyword will find a better match
          }
        }
      }
    }

    // No validated match found
    console.log("❌ No product match found in database (or all matches failed validation)");
    return { 
      product: null, 
      searchDetails: { 
        matchType: 'none', 
        extractedCFPR,
        extractedLTO,
        searchedCodes: potentialCodes, 
        searchedKeywords: keywords.slice(0, 10),
        reason: !extractedCFPR ? 'CFPR number not found in label' : 'No matching product in database'
      } 
    };
  }
}
