import { ProductRepo } from "../typeorm/data-source";
import { ILike, Brackets } from "typeorm";
import { Product } from "../typeorm/entities/product.entity";

// =========================================================================
// LEARNED PATTERN CACHE - Dynamically generated from database
// =========================================================================
interface LearnedPatterns {
  cfprPrefixes: string[];      // e.g., ['IM', 'FR', 'CFPR']
  ltoPrefixes: string[];       // e.g., ['LTO', 'DR']
  cfprPattern: RegExp | null;  // Dynamic regex for CFPR
  ltoPattern: RegExp | null;   // Dynamic regex for LTO
  productCache: Map<string, Product>;  // Normalized code -> Product
  lastUpdated: Date;
}

export class FuzzySearchService {
  private static learnedPatterns: LearnedPatterns | null = null;
  private static readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Initializes the fuzzy search service by learning patterns from the database
   * Call this on server startup or periodically to refresh patterns
   */
  static async initialize(): Promise<void> {
    try {
      // Fetch ALL products from database
      const allProducts = await ProductRepo.find({
        relations: ['company'],
      });

      if (allProducts.length === 0) {
        console.warn("⚠️ [FuzzySearch] No products in database - using fallback patterns");
        this.learnedPatterns = {
          cfprPrefixes: ['CFPR', 'FR'],
          ltoPrefixes: ['LTO', 'DR'],
          cfprPattern: null,
          ltoPattern: null,
          productCache: new Map(),
          lastUpdated: new Date(),
        };
        return;
      }

      // Analyze CFPR numbers to learn patterns
      const cfprNumbers = allProducts
        .filter(p => p.CFPRNumber)
        .map(p => p.CFPRNumber!.toUpperCase().trim());

      // Analyze LTO numbers to learn patterns
      const ltoNumbers = allProducts
        .filter(p => p.LTONumber)
        .map(p => p.LTONumber!.toUpperCase().trim());

      // Extract prefixes (letters before numbers/hyphens)
      const cfprPrefixes = this.extractPrefixes(cfprNumbers);
      const ltoPrefixes = this.extractPrefixes(ltoNumbers);

      // Generate dynamic regex patterns
      const cfprPattern = this.generatePattern(cfprPrefixes);
      const ltoPattern = this.generatePattern(ltoPrefixes);

      // Build cache: normalized code -> Product
      const productCache = new Map<string, Product>();
      
      for (const product of allProducts) {
        if (product.CFPRNumber) {
          const normalized = this.normalizeOCRCharacters(
            product.CFPRNumber.replace(/[-\s]/g, '').toUpperCase()
          );
          productCache.set(`CFPR:${normalized}`, product);
        }
        if (product.LTONumber) {
          const normalized = this.normalizeOCRCharacters(
            product.LTONumber.replace(/[-\s]/g, '').toUpperCase()
          );
          productCache.set(`LTO:${normalized}`, product);
        }
      }

      this.learnedPatterns = {
        cfprPrefixes,
        ltoPrefixes,
        cfprPattern,
        ltoPattern,
        productCache,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("❌ [FuzzySearch] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Extracts unique prefixes from a list of codes
   * Example: ['IM-603', 'IM-702', 'FR-1234'] => ['IM', 'FR']
   */
  private static extractPrefixes(codes: string[]): string[] {
    const prefixes = new Set<string>();

    for (const code of codes) {
      // Match letters at the start, before numbers or hyphens
      const match = code.match(/^([A-Z]+)/);
      if (match && match[1]) {
        prefixes.add(match[1]);
      }
    }

    return Array.from(prefixes).sort();
  }

  /**
   * Generates a regex pattern from learned prefixes
   * Example: ['IM', 'FR'] => /(?:IM|FR)[-\s]?[A-Z0-9]{2,}/gi
   */
  private static generatePattern(prefixes: string[]): RegExp | null {
    if (prefixes.length === 0) return null;

    const prefixGroup = prefixes.join('|');
    // Pattern: (PREFIX1|PREFIX2)[-\s]?[alphanumeric]{2,}
    return new RegExp(`(?:${prefixGroup})[-\\s]?[A-Z0-9]{2,}`, 'gi');
  }

  /**
   * Ensures patterns are loaded and fresh
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.learnedPatterns) {
      await this.initialize();
      return;
    }

    // Check if cache is stale
    const age = Date.now() - this.learnedPatterns.lastUpdated.getTime();
    if (age > this.CACHE_DURATION_MS) {
      await this.initialize();
    }
  }

  /**
   * Normalizes common OCR character mistakes
   * Handles: I/1, O/0, S/5, Z/2, B/8, etc.
   * ENHANCED: Now handles many more OCR error patterns including $ ! @ # etc.
   */
  private static normalizeOCRCharacters(text: string): string {
    let normalized = text.toUpperCase();
    
    // ENHANCED OCR substitutions - normalize ALL variations to a canonical form
    // This makes comparison much more forgiving for low-quality OCR
    normalized = normalized
      // Letters that look like numbers
      .replace(/[I|l!]/g, '1')   // I, |, l, ! → 1
      .replace(/[O]/g, '0')       // O → 0
      .replace(/[S$]/g, '5')      // S, $ → 5
      .replace(/[Z]/g, '2')       // Z → 2
      .replace(/[B]/g, '8')       // B → 8
      .replace(/[G]/g, '6')       // G → 6
      .replace(/[T]/g, '7')       // T → 7
      .replace(/[A@]/g, 'A')      // @ → A
      .replace(/[E€3]/g, 'E')     // €, 3 → E
      // Numbers that look like letters
      .replace(/[1]/g, '1')       // Keep 1 as 1 (already normalized)
      .replace(/[0]/g, '0')       // Keep 0 as 0
      // Remove all non-alphanumeric characters for comparison
      .replace(/[^A-Z0-9]/g, '');
    
    return normalized;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy matching of OCR errors
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create matrix
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * Calculate similarity ratio between two strings (0 to 1)
   * 1 = identical, 0 = completely different
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const norm1 = this.normalizeOCRCharacters(str1);
    const norm2 = this.normalizeOCRCharacters(str2);
    
    if (norm1 === norm2) return 1;
    
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    
    if (maxLen === 0) return 1;
    
    return 1 - (distance / maxLen);
  }

  /**
   * Check if two codes are similar enough to be considered a match
   * Uses Levenshtein distance with OCR normalization
   * threshold: minimum similarity (0-1), default 0.7 (70% similar)
   */
  private static isSimilarCode(ocrCode: string, dbCode: string, threshold: number = 0.65): boolean {
    const similarity = this.calculateSimilarity(ocrCode, dbCode);
    
    if (similarity >= threshold) {
      console.log(`   [Similarity] "${ocrCode}" vs "${dbCode}": ${(similarity * 100).toFixed(1)}% (threshold: ${threshold * 100}%)`);
      return true;
    }
    
    return false;
  }

  /**
   * Cleans the OCR text to remove special characters and noise
   */
  private static cleanText(text: string): string {
    return text.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  /**
   * Extract CFPR number specifically from OCR text using LEARNED patterns
   * Returns null if not found
   */
  private static extractCFPRNumber(text: string): string | null {
    const upperText = text.toUpperCase();
    
    // FALLBACK PATTERNS - Common CFPR formats (catches codes even if prefix not in database)
    // These patterns are more generic and will catch most CFPR-style codes
    const fallbackPatterns = [
      // Pattern: 2-4 letters + hyphen + 2 digits + hyphen + 4+ digits (e.g., DFI-21-5913, FR-12-3456)
      /\b([A-Z]{2,4})-(\d{2})-(\d{4,})\b/g,
      // Pattern: 2-4 letters + hyphen + digits (e.g., IM-603, CFPR-12345)
      /\b([A-Z]{2,4})-(\d{3,})\b/g,
      // Pattern: Letters followed by numbers with optional hyphen (e.g., FR123456, IM603)
      /\b([A-Z]{2,4})[\s-]?(\d{3,})\b/g,
    ];
    
    // Try fallback patterns first (more reliable)
    for (const pattern of fallbackPatterns) {
      const matches = upperText.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first match, cleaned up
        const cleaned = matches[0].replace(/\s+/g, '-').toUpperCase();
        console.log(`[FuzzySearch] CFPR extracted via fallback pattern: ${cleaned}`);
        return cleaned;
      }
    }
    
    // Then try learned patterns
    if (this.learnedPatterns?.cfprPattern) {
      const normalizedText = this.normalizeOCRCharacters(text);
      
      let match = normalizedText.match(this.learnedPatterns.cfprPattern);
      if (match && match[0]) {
        const cleaned = match[0].replace(/\s+/g, '-').toUpperCase();
        return cleaned;
      }

      match = text.match(this.learnedPatterns.cfprPattern);
      if (match && match[0]) {
        const cleaned = match[0].replace(/\s+/g, '-').toUpperCase();
        return cleaned;
      }
    }

    return null;
  }

  /**
   * Extract LTO number specifically from OCR text using LEARNED patterns
   * Returns null if not found
   */
  private static extractLTONumber(text: string): string | null {
    if (!this.learnedPatterns?.ltoPattern) {
      return null;
    }

    // First try with normalized text
    const normalizedText = this.normalizeOCRCharacters(text);
    
    let match = normalizedText.match(this.learnedPatterns.ltoPattern);
    if (match && match[0]) {
      const cleaned = match[0].replace(/\s+/g, '-').toUpperCase();
      return cleaned;
    }

    // Also try original text
    match = text.match(this.learnedPatterns.ltoPattern);
    if (match && match[0]) {
      const cleaned = match[0].replace(/\s+/g, '-').toUpperCase();
      return cleaned;
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
      console.warn("[FuzzySearch] WARNING: Product has NO CFPR number in database (potentially illegal product)");
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
        missingFields.push('LTONumber');
      }
    } else {
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
    } else if (cfprFound || ltoFound) {
      // GOOD CASE: At least one code verified
      confidence = 'medium';
      valid = true;
    } else if (!productHasCFPR && !productHasLTO) {
      // ACCEPT: Product has no codes in database (name match only)
      // This is OK for identification, compliance check happens later
      confidence = 'low';
      valid = true;
      warnings.push('Product identified by name only - no registration codes to verify');
    } else {
      // ACCEPT ANYWAY: Product has codes but they're not in OCR
      // This is OK - we identified the product, compliance check will catch missing codes
      confidence = 'low';
      valid = true;
      warnings.push('Product identified but registration codes not found in OCR');
    }
    
    return { valid, missingFields, confidence, warnings };
  }

  /**
   * Performs a comprehensive fuzzy search against the Product database using OCR text
   * Searches: LTONumber, CFPRNumber, productName, brandName, company name
   * 
   * ENHANCED: Much more forgiving OCR matching using Levenshtein distance
   * ENHANCED: Product name now gets higher priority alongside codes
   * USES: Dynamically learned patterns from database
   */
  static async searchProductsFuzzy(ocrText: string): Promise<{ 
    product: Product | null; 
    searchDetails: any;
    warnings?: string[];
  }> {
    // Ensure patterns are loaded
    await this.ensureInitialized();

    const cleanedText = this.cleanText(ocrText);
    const potentialCodes = this.extractPotentialCodes(ocrText);
    const keywords = this.extractKeywords(ocrText);
    
    // Extract specific codes from OCR using LEARNED patterns
    const extractedCFPR = this.extractCFPRNumber(ocrText);
    const extractedLTO = this.extractLTONumber(ocrText);
    
    console.log(`[FuzzySearch] Extracted codes - CFPR: ${extractedCFPR || 'none'}, LTO: ${extractedLTO || 'none'}`);
    console.log(`[FuzzySearch] Keywords found: ${keywords.slice(0, 5).join(', ')}`);

    // FAST PATH: Try CFPR cache lookup first with fuzzy matching
    if (extractedCFPR && this.learnedPatterns?.productCache) {
      const normalized = this.normalizeOCRCharacters(extractedCFPR);
      
      // Try exact match first
      const cached = this.learnedPatterns.productCache.get(`CFPR:${normalized}`);
      if (cached) {
        console.log(`[FuzzySearch] ✅ CFPR cache hit: ${cached.productName}`);
        const validation = this.validateMatchAgainstOCR(cached, ocrText);
        return { 
          product: cached, 
          searchDetails: { matchType: 'cfpr-cache', matchedOn: extractedCFPR, confidence: 'high' },
          warnings: validation.warnings
        };
      }
      
      // Try fuzzy match against all cached products
      for (const [key, product] of this.learnedPatterns.productCache.entries()) {
        if (key.startsWith('CFPR:')) {
          const dbCFPR = key.replace('CFPR:', '');
          if (this.isSimilarCode(normalized, dbCFPR, 0.70)) {
            console.log(`[FuzzySearch] ✅ CFPR fuzzy cache hit: ${product.productName}`);
            const validation = this.validateMatchAgainstOCR(product, ocrText);
            return { 
              product: product, 
              searchDetails: { matchType: 'cfpr-fuzzy-cache', matchedOn: extractedCFPR, confidence: 'high' },
              warnings: validation.warnings
            };
          }
        }
      }
    }

    // NEW STRATEGY: Search ALL products and score them based on multiple factors
    // This allows product name to contribute even when codes are garbled
    console.log(`[FuzzySearch] Performing comprehensive fuzzy search...`);
    
    const allProducts = await ProductRepo.find({
      relations: ['company'],
    });
    
    let bestMatch: Product | null = null;
    let bestScore = 0;
    let matchDetails: any = {};
    
    const ocrTextUpper = ocrText.toUpperCase();
    
    for (const product of allProducts) {
      let score = 0;
      let matchReasons: string[] = [];
      
      // === CFPR MATCHING (HIGHEST PRIORITY - UNIQUE IDENTIFIER) ===
      if (product.CFPRNumber && extractedCFPR) {
        const similarity = this.calculateSimilarity(extractedCFPR, product.CFPRNumber);
        
        if (similarity >= 0.95) {
          // Near-exact CFPR match - this is almost certainly the product
          score += 1000;
          matchReasons.push(`CFPR exact match (${(similarity * 100).toFixed(0)}%)`);
        } else if (similarity >= 0.70) {
          // Good CFPR similarity - likely the right product
          score += Math.round(500 * similarity);
          matchReasons.push(`CFPR similar (${(similarity * 100).toFixed(0)}%)`);
        } else if (similarity >= 0.50) {
          // Moderate CFPR similarity - might be OCR errors
          score += Math.round(200 * similarity);
          matchReasons.push(`CFPR partial (${(similarity * 100).toFixed(0)}%)`);
        }
      }
      
      // === LTO MATCHING (MEDIUM-HIGH PRIORITY - NOT UNIQUE) ===
      if (product.LTONumber && extractedLTO) {
        const similarity = this.calculateSimilarity(extractedLTO, product.LTONumber);
        
        if (similarity >= 0.95) {
          score += 200;  // LTO is not unique, so lower than CFPR
          matchReasons.push(`LTO exact match (${(similarity * 100).toFixed(0)}%)`);
        } else if (similarity >= 0.70) {
          score += Math.round(100 * similarity);
          matchReasons.push(`LTO similar (${(similarity * 100).toFixed(0)}%)`);
        }
      }
      
      // === PRODUCT NAME MATCHING (MEDIUM PRIORITY - IMPORTANT FOR OCR) ===
      const productNameUpper = product.productName.toUpperCase();
      const productWords = productNameUpper.split(/\s+/).filter(w => w.length >= 3);
      let nameWordMatches = 0;
      
      for (const word of productWords) {
        if (ocrTextUpper.includes(word)) {
          nameWordMatches++;
        }
      }
      
      if (productWords.length > 0) {
        const nameMatchRatio = nameWordMatches / productWords.length;
        
        if (nameMatchRatio >= 0.8) {
          // Most words match - strong product name match
          score += 150;
          matchReasons.push(`Product name strong match (${nameWordMatches}/${productWords.length} words)`);
        } else if (nameMatchRatio >= 0.5) {
          // Half or more words match
          score += 80;
          matchReasons.push(`Product name partial match (${nameWordMatches}/${productWords.length} words)`);
        } else if (nameWordMatches >= 2) {
          // At least 2 words match
          score += 40;
          matchReasons.push(`Product name ${nameWordMatches} words match`);
        }
      }
      
      // Check for exact product name substring
      if (ocrTextUpper.includes(productNameUpper) || productNameUpper.includes(ocrTextUpper.substring(0, 20))) {
        score += 100;
        matchReasons.push('Product name substring match');
      }
      
      // === BRAND NAME MATCHING ===
      if (product.brandName) {
        const brandUpper = product.brandName.toUpperCase();
        if (ocrTextUpper.includes(brandUpper)) {
          score += 50;
          matchReasons.push(`Brand "${product.brandName}" found`);
        }
      }
      
      // === COMPANY NAME MATCHING ===
      if (product.company?.name) {
        const companyUpper = product.company.name.toUpperCase();
        const companyWords = companyUpper.split(/\s+/).filter(w => w.length >= 4);
        
        for (const word of companyWords) {
          if (ocrTextUpper.includes(word)) {
            score += 20;
            matchReasons.push(`Company word "${word}" found`);
            break;  // Only count once
          }
        }
      }
      
      // Update best match
      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
        matchDetails = {
          score: score,
          reasons: matchReasons,
          cfprMatch: extractedCFPR ? this.calculateSimilarity(extractedCFPR, product.CFPRNumber || '') : 0,
          ltoMatch: extractedLTO ? this.calculateSimilarity(extractedLTO, product.LTONumber || '') : 0,
        };
      }
    }
    
    // Return best match if score is high enough
    // Threshold: 50 points minimum (at least some evidence of match)
    if (bestMatch && bestScore >= 50) {
      console.log(`[FuzzySearch] ✅ Best match: ${bestMatch.productName} (score: ${bestScore})`);
      console.log(`   Reasons: ${matchDetails.reasons.join(', ')}`);
      
      const validation = this.validateMatchAgainstOCR(bestMatch, ocrText);
      
      // Determine confidence based on score
      let confidence: 'high' | 'medium' | 'low';
      if (bestScore >= 500) {
        confidence = 'high';
      } else if (bestScore >= 150) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
      
      return { 
        product: bestMatch, 
        searchDetails: { 
          matchType: 'comprehensive-fuzzy', 
          matchedOn: matchDetails.reasons.join(', '), 
          confidence: confidence,
          score: bestScore,
          ...matchDetails
        },
        warnings: validation.warnings
      };
    }

    // No validated match found
    console.warn("[FuzzySearch] No product match found in database");
    return { 
      product: null, 
      searchDetails: { 
        matchType: 'none', 
        extractedCFPR,
        extractedLTO,
        searchedCodes: potentialCodes, 
        searchedKeywords: keywords.slice(0, 10),
        bestScore: bestScore,
        reason: bestScore > 0 ? 'Best match score too low' : 'No matching evidence found'
      } 
    };
  }
}
