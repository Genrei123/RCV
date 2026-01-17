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
        console.log("   Found CFPR in OCR:", cleaned);
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
        console.log("   Found LTO in OCR:", cleaned);
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
   * This prevents returning a product when required information is missing from the scanned label
   */
  private static validateMatchAgainstOCR(product: Product, ocrText: string): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    const upperText = ocrText.toUpperCase();
    
    // Check if CFPR from product is in OCR text (required field)
    if (product.CFPRNumber) {
      const cfprClean = product.CFPRNumber.replace(/[-\s]/g, '').toUpperCase();
      const cfprVariants = [
        product.CFPRNumber.toUpperCase(),
        cfprClean,
        cfprClean.replace(/^FR/, 'FR-'),
        cfprClean.replace(/^CFPR/, 'CFPR-'),
      ];
      
      const cfprFound = cfprVariants.some(variant => 
        upperText.includes(variant) || 
        upperText.replace(/[-\s]/g, '').includes(variant)
      );
      
      if (!cfprFound) {
        console.log(`   ⚠️ CFPR ${product.CFPRNumber} NOT found in OCR text`);
        missingFields.push('CFPRNumber');
      }
    } else {
      // Product has no CFPR - this is unusual, flag it
      console.log("   ⚠️ Product has no CFPR number in database");
    }

    // Check if LTO from product is in OCR text (optional but helpful)
    if (product.LTONumber) {
      const ltoClean = product.LTONumber.replace(/[-\s]/g, '').toUpperCase();
      const ltoVariants = [
        product.LTONumber.toUpperCase(),
        ltoClean,
      ];
      
      const ltoFound = ltoVariants.some(variant => 
        upperText.includes(variant) || 
        upperText.replace(/[-\s]/g, '').includes(variant)
      );
      
      if (!ltoFound) {
        console.log(`   ⚠️ LTO ${product.LTONumber} NOT found in OCR text`);
        missingFields.push('LTONumber');
      }
    }

    // Product is only valid if CFPR is found (or product has no CFPR)
    // Having missing LTO is okay, but missing CFPR is a deal breaker
    const valid = !missingFields.includes('CFPRNumber');
    
    return { valid, missingFields };
  }

  /**
   * Performs a comprehensive fuzzy search against the Product database using OCR text
   * Searches: LTONumber, CFPRNumber, productName, brandName, company name
   * 
   * IMPORTANT: Will only return a product if critical fields (CFPR) are found in OCR text
   */
  static async searchProductsFuzzy(ocrText: string): Promise<{ product: Product | null; searchDetails: any }> {
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
        console.log("✅ Found direct CFPR match:", cfprMatch.productName);
        return { product: cfprMatch, searchDetails: { matchType: 'cfpr', matchedOn: extractedCFPR } };
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
        // Validate that this match's CFPR is also in the OCR text
        const validation = this.validateMatchAgainstOCR(ltoMatch, ocrText);
        
        if (validation.valid) {
          console.log("✅ Found LTO match (validated):", ltoMatch.productName);
          return { product: ltoMatch, searchDetails: { matchType: 'lto', matchedOn: extractedLTO } };
        } else {
          console.log("❌ LTO match rejected - CFPR not found in OCR:", validation.missingFields);
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
          // Validate match - CFPR must be in OCR
          const validation = this.validateMatchAgainstOCR(directMatch, ocrText);
          
          if (validation.valid) {
            console.log("✅ Found direct code match (validated):", directMatch.productName);
            return { product: directMatch, searchDetails: { matchType: 'code', matchedOn: code } };
          } else {
            console.log("❌ Code match rejected - critical fields missing:", validation.missingFields);
          }
        }
      }
    }

    // STRATEGY 4: Search by product name or brand name using keywords
    // Only use this if we found some identifying codes in OCR
    if (keywords.length > 0 && (extractedCFPR || extractedLTO)) {
      for (const keyword of keywords) {
        if (keyword.length < 5) continue; // Skip short words
        
        const nameMatch = await ProductRepo.createQueryBuilder("product")
          .leftJoinAndSelect("product.company", "company")
          .where("product.productName ILIKE :kw", { kw: `%${keyword}%` })
          .orWhere("product.brandName ILIKE :kw", { kw: `%${keyword}%` })
          .orWhere("company.companyName ILIKE :kw", { kw: `%${keyword}%` })
          .getOne();
        
        if (nameMatch) {
          // Validate match - CFPR must be in OCR
          const validation = this.validateMatchAgainstOCR(nameMatch, ocrText);
          
          if (validation.valid) {
            console.log("✅ Found keyword match (validated):", nameMatch.productName, "via keyword:", keyword);
            return { product: nameMatch, searchDetails: { matchType: 'keyword', matchedOn: keyword } };
          } else {
            console.log("❌ Keyword match rejected - critical fields missing:", validation.missingFields);
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
