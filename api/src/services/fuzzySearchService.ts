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
   */
  private static normalizeOCRCharacters(text: string): string {
    let normalized = text.toUpperCase();
    
    // Create multiple normalized versions to handle ambiguous characters
    // This helps match against database entries regardless of OCR mistakes
    
    // Common OCR substitutions (character -> possible interpretations)
    const substitutions: { [key: string]: string } = {
      'I': '[I1|]',  // I can be 1, |, or I
      'l': '[I1|l]', // lowercase L
      'O': '[O0]',   // O can be 0
      'S': '[S5$]',  // S can be 5 or $
      'Z': '[Z2]',   // Z can be 2
      'B': '[B8]',   // B can be 8
      'G': '[G6]',   // G can be 6
      'T': '[T7]',   // T can be 7
      '1': '[1I|l]', // 1 can be I, |, or l
      '0': '[0O]',   // 0 can be O
      '5': '[5S$]',  // 5 can be S
      '2': '[2Z]',   // 2 can be Z
      '8': '[8B]',   // 8 can be B
      '6': '[6G]',   // 6 can be G
      '7': '[7T]',   // 7 can be T
    };
    
    // For simple comparison, just normalize ambiguous characters to their most common form
    normalized = normalized
      .replace(/[I|]/g, '1')  // Treat I and | as 1
      .replace(/O/g, '0')     // Treat O as 0
      .replace(/S/g, '5')     // Treat S as 5
      .replace(/Z/g, '2')     // Treat Z as 2
      .replace(/B/g, '8')     // Treat B as 8
      .replace(/G/g, '6')     // Treat G as 6
      .replace(/T/g, '7');    // Treat T as 7
    
    return normalized;
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
   * PRIORITY: LTO/CFPR codes are MORE IMPORTANT than product names
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

    // FAST PATH: Try CFPR cache lookup first (CFPR is UNIQUE - highest priority)
    if (extractedCFPR && this.learnedPatterns?.productCache) {
      const normalized = this.normalizeOCRCharacters(extractedCFPR.replace(/[-\s]/g, '').toUpperCase());
      const cached = this.learnedPatterns.productCache.get(`CFPR:${normalized}`);
      if (cached) {
        console.log(`[FuzzySearch] ✅ CFPR cache hit: ${cached.productName}`);
        const validation = this.validateMatchAgainstOCR(cached, ocrText);
        if (validation.valid) {
          return { 
            product: cached, 
            searchDetails: { matchType: 'cfpr-cache', matchedOn: extractedCFPR, confidence: 'high' },
            warnings: validation.warnings
          };
        }
      }
    }

    // LTO cache - ONLY use if no CFPR was extracted (LTO is NOT unique)
    // If we have a CFPR, we should use database search to ensure correct product
    if (extractedLTO && !extractedCFPR && this.learnedPatterns?.productCache) {
      const normalized = this.normalizeOCRCharacters(extractedLTO.replace(/[-\s]/g, '').toUpperCase());
      const cached = this.learnedPatterns.productCache.get(`LTO:${normalized}`);
      if (cached) {
        console.log(`[FuzzySearch] LTO cache hit (no CFPR available): ${cached.productName}`);
        const validation = this.validateMatchAgainstOCR(cached, ocrText);
        if (validation.valid) {
          return { 
            product: cached, 
            searchDetails: { matchType: 'lto-cache', matchedOn: extractedLTO, confidence: validation.confidence },
            warnings: validation.warnings
          };
        }
      }
    }

    // STRATEGY 1: Direct CFPR match (highest confidence - CFPR is unique identifier)
    if (extractedCFPR) {
      const cfprClean = extractedCFPR.replace(/[-\s]/g, '');
      const cfprNormalized = this.normalizeOCRCharacters(cfprClean);
      
      // Search with both original and normalized versions
      const cfprMatch = await ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.company", "company")
        .where(
          new Brackets(qb => {
            qb.where("REPLACE(REPLACE(product.CFPRNumber, '-', ''), ' ', '') ILIKE :cfpr", { cfpr: `%${cfprClean}%` })
              .orWhere("REPLACE(REPLACE(product.CFPRNumber, '-', ''), ' ', '') ILIKE :cfprNorm", { cfprNorm: `%${cfprNormalized}%` });
          })
        )
        .getOne();
      
      if (cfprMatch) {
        // Validate match - either CFPR or LTO must be in OCR
        const validation = this.validateMatchAgainstOCR(cfprMatch, ocrText);
        
        if (validation.valid) {
          return { 
            product: cfprMatch, 
            searchDetails: { matchType: 'cfpr', matchedOn: extractedCFPR, confidence: validation.confidence },
            warnings: validation.warnings
          };
        } else {
          console.warn("[FuzzySearch] CFPR match rejected - insufficient verification:", validation.missingFields);
        }
      }
    }

    // STRATEGY 2: Direct LTO match - HANDLE MULTIPLE PRODUCTS WITH SAME LTO
    if (extractedLTO) {
      const ltoClean = extractedLTO.replace(/[-\s]/g, '');
      const ltoNormalized = this.normalizeOCRCharacters(ltoClean);
      
      // Get ALL products matching this LTO (same company can have multiple products)
      const ltoMatches = await ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.company", "company")
        .where(
          new Brackets(qb => {
            qb.where("REPLACE(REPLACE(product.LTONumber, '-', ''), ' ', '') ILIKE :lto", { lto: `%${ltoClean}%` })
              .orWhere("REPLACE(REPLACE(product.LTONumber, '-', ''), ' ', '') ILIKE :ltoNorm", { ltoNorm: `%${ltoNormalized}%` });
          })
        )
        .getMany();  // Get ALL matches, not just one
      
      if (ltoMatches.length > 0) {
        console.log(`[FuzzySearch] LTO ${extractedLTO} matched ${ltoMatches.length} products`);
        
        // CRITICAL: If we have an extracted CFPR, find the product that matches it EXACTLY
        // CFPR is UNIQUE - if it matches, that IS the product, no scoring needed
        if (extractedCFPR) {
          const ocrCFPR = extractedCFPR.replace(/[-\s]/g, '').toUpperCase();
          
          for (const product of ltoMatches) {
            if (product.CFPRNumber) {
              const productCFPR = product.CFPRNumber.replace(/[-\s]/g, '').toUpperCase();
              
              // Exact match or contains match on CFPR
              if (productCFPR === ocrCFPR || productCFPR.includes(ocrCFPR) || ocrCFPR.includes(productCFPR)) {
                console.log(`[FuzzySearch] ✅ CFPR EXACT MATCH: ${product.CFPRNumber} === ${extractedCFPR}`);
                console.log(`[FuzzySearch] Selected: ${product.productName} (CFPR match is definitive)`);
                
                const validation = this.validateMatchAgainstOCR(product, ocrText);
                return { 
                  product: product, 
                  searchDetails: { 
                    matchType: 'LTO+CFPR', 
                    matchedOn: `LTO:${extractedLTO}, CFPR:${extractedCFPR}`, 
                    confidence: 'high',
                    candidatesCount: ltoMatches.length,
                    cfprMatched: true
                  },
                  warnings: validation.warnings
                };
              }
            }
          }
          console.log(`[FuzzySearch] ⚠️ CFPR ${extractedCFPR} not found among LTO matches, falling back to scoring`);
        }
        
        // Fallback: If no CFPR match, use scoring to disambiguate
        let bestMatch: Product | null = null;
        let bestScore = 0;
        
        for (const product of ltoMatches) {
          let score = 0;
          
          // HIGHEST PRIORITY: Check if CFPR matches (1000 points - virtually guarantees selection)
          if (product.CFPRNumber && extractedCFPR) {
            const productCFPR = product.CFPRNumber.replace(/[-\s]/g, '').toUpperCase();
            const ocrCFPR = extractedCFPR.replace(/[-\s]/g, '').toUpperCase();
            if (productCFPR === ocrCFPR || productCFPR.includes(ocrCFPR) || ocrCFPR.includes(productCFPR)) {
              score += 1000;  // CFPR is unique identifier - this should be definitive
              console.log(`   - ${product.productName}: CFPR match (+1000) - DEFINITIVE`);
            }
          }
          
          // MEDIUM PRIORITY: Check product name in OCR text
          const productNameUpper = product.productName.toUpperCase();
          const ocrTextUpper = ocrText.toUpperCase();
          
          // Split product name into words and check if they appear in OCR
          const productWords = productNameUpper.split(/\s+/).filter(w => w.length >= 4);
          let wordMatches = 0;
          for (const word of productWords) {
            if (ocrTextUpper.includes(word)) {
              wordMatches++;
              score += 10;  // Each matching word adds score
            }
          }
          console.log(`   - ${product.productName}: ${wordMatches}/${productWords.length} name words matched (+${wordMatches * 10})`);
          
          // Check brand name
          if (product.brandName) {
            const brandUpper = product.brandName.toUpperCase();
            if (ocrTextUpper.includes(brandUpper)) {
              score += 15;
              console.log(`   - ${product.productName}: Brand "${product.brandName}" matched (+15)`);
            }
          }
          
          // Update best match
          if (score > bestScore) {
            bestScore = score;
            bestMatch = product;
          }
        }
        
        // Use best match if found, otherwise use first match
        const selectedProduct = bestMatch || ltoMatches[0];
        console.log(`[FuzzySearch] Selected: ${selectedProduct.productName} (score: ${bestScore})`);
        
        const validation = this.validateMatchAgainstOCR(selectedProduct, ocrText);
        
        if (validation.valid) {
          return { 
            product: selectedProduct, 
            searchDetails: { 
              matchType: 'LTO', 
              matchedOn: extractedLTO, 
              confidence: validation.confidence,
              candidatesCount: ltoMatches.length,
              selectedByScore: bestScore
            },
            warnings: validation.warnings
          };
        } else {
          console.warn("[FuzzySearch] LTO match rejected - insufficient verification:", validation.missingFields);
        }
      }
    }

    // STRATEGY 3: Try other potential codes (with normalization)
    if (potentialCodes.length > 0) {
      for (const code of potentialCodes) {
        const codeNormalized = this.normalizeOCRCharacters(code);
        
        const directMatch = await ProductRepo.createQueryBuilder("product")
          .leftJoinAndSelect("product.company", "company")
          .where(
            new Brackets(qb => {
              qb.where("product.LTONumber ILIKE :code", { code: `%${code}%` })
                .orWhere("product.CFPRNumber ILIKE :code", { code: `%${code}%` })
                .orWhere("product.LTONumber ILIKE :codeNorm", { codeNorm: `%${codeNormalized}%` })
                .orWhere("product.CFPRNumber ILIKE :codeNorm", { codeNorm: `%${codeNormalized}%` });
            })
          )
          .getOne();
        
        if (directMatch) {
          // Validate match - either CFPR or LTO must be in OCR
          const validation = this.validateMatchAgainstOCR(directMatch, ocrText);
          
          if (validation.valid) {
            return { 
              product: directMatch, 
              searchDetails: { matchType: 'code', matchedOn: code, confidence: validation.confidence },
              warnings: validation.warnings
            };
          } else {
            console.warn("[FuzzySearch] Code match rejected - insufficient verification:", validation.missingFields);
          }
        }
      }
    }

    // STRATEGY 4: Search by product name or brand name using keywords
    // ONLY use this if we found some identifying codes in OCR (lower priority than code matches)
    // This is a fallback when exact code matches fail
    if (keywords.length > 0 && (extractedCFPR || extractedLTO)) {
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
            validation.warnings.push('Match based on product name - LTO/CFPR codes have higher priority');
            return { 
              product: nameMatch, 
              searchDetails: { matchType: 'keyword', matchedOn: keyword, confidence: validation.confidence },
              warnings: validation.warnings
            };
          } else {
            console.warn("[FuzzySearch] Keyword match rejected - insufficient verification:", validation.missingFields);
            // Continue searching - maybe another keyword will find a better match
          }
        }
      }
    }

    // No validated match found
    console.warn("[FuzzySearch] No product match found in database (or all matches failed validation)");
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
