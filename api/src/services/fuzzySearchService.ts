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
   * Performs a comprehensive fuzzy search against the Product database using OCR text
   * Searches: LTONumber, CFPRNumber, productName, brandName, company name
   */
  static async searchProductsFuzzy(ocrText: string): Promise<{ product: Product | null; searchDetails: any }> {
    const cleanedText = this.cleanText(ocrText);
    const potentialCodes = this.extractPotentialCodes(ocrText);
    const keywords = this.extractKeywords(ocrText);
    
    console.log("🔍 Fuzzy Search Debug:");
    console.log("   Potential Codes:", potentialCodes);
    console.log("   Keywords:", keywords.slice(0, 10)); // First 10

    const queryBuilder = ProductRepo.createQueryBuilder("product")
      .leftJoinAndSelect("product.company", "company")
      .leftJoinAndSelect("product.registeredBy", "registeredBy");

    // STRATEGY 1: Direct code match (highest confidence)
    if (potentialCodes.length > 0) {
      for (const code of potentialCodes) {
        const directMatch = await ProductRepo.createQueryBuilder("product")
          .leftJoinAndSelect("product.company", "company")
          .where("product.LTONumber ILIKE :code", { code: `%${code}%` })
          .orWhere("product.CFPRNumber ILIKE :code", { code: `%${code}%` })
          .getOne();
        
        if (directMatch) {
          console.log("✅ Found direct code match:", directMatch.productName);
          return { product: directMatch, searchDetails: { matchType: 'code', matchedOn: code } };
        }
      }
    }

    // STRATEGY 2: Search by product name or brand name using keywords
    if (keywords.length > 0) {
      // Try combinations of keywords for product name matching
      for (const keyword of keywords) {
        if (keyword.length < 5) continue; // Skip short words
        
        const nameMatch = await ProductRepo.createQueryBuilder("product")
          .leftJoinAndSelect("product.company", "company")
          .where("product.productName ILIKE :kw", { kw: `%${keyword}%` })
          .orWhere("product.brandName ILIKE :kw", { kw: `%${keyword}%` })
          .orWhere("company.companyName ILIKE :kw", { kw: `%${keyword}%` })
          .getOne();
        
        if (nameMatch) {
          console.log("✅ Found keyword match:", nameMatch.productName, "via keyword:", keyword);
          return { product: nameMatch, searchDetails: { matchType: 'keyword', matchedOn: keyword } };
        }
      }
    }

    // STRATEGY 3: Multi-keyword intersection (more lenient)
    // Try finding products where multiple keywords match
    if (keywords.length >= 2) {
      const topKeywords = keywords.slice(0, 5); // Use top 5 keywords
      
      const qb = ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.company", "company");
      
      // Build OR conditions for all keywords across all fields
      qb.where(new Brackets(outer => {
        topKeywords.forEach((kw, i) => {
          outer.orWhere(`product.productName ILIKE :kw${i}`, { [`kw${i}`]: `%${kw}%` });
          outer.orWhere(`product.brandName ILIKE :kw${i}`, { [`kw${i}`]: `%${kw}%` });
        });
      }));
      
      const multiMatch = await qb.getOne();
      if (multiMatch) {
        console.log("✅ Found multi-keyword match:", multiMatch.productName);
        return { product: multiMatch, searchDetails: { matchType: 'multi-keyword', matchedOn: topKeywords } };
      }
    }

    console.log("❌ No product match found in database");
    return { product: null, searchDetails: { matchType: 'none', searchedCodes: potentialCodes, searchedKeywords: keywords.slice(0, 10) } };
  }
}
