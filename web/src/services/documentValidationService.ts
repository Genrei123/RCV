import Tesseract from 'tesseract.js';

export interface DocumentValidationResult {
  isValid: boolean;
  hasDTI: boolean;
  hasTRN: boolean;
  foundDTI?: string;
  foundTRN?: string;
  errors: string[];
  warnings: string[];
  confidence: number;
  extractedText?: string;
}

/**
 * Service for validating business permits and other documents using OCR
 */
export class DocumentValidationService {
  /**
   * Validates a business permit document by checking for DTI registration and TRN number
   * @param file The document file (image) to validate
   * @returns Validation result with details
   */
  static async validateBusinessPermit(file: File): Promise<DocumentValidationResult> {
    const result: DocumentValidationResult = {
      isValid: false,
      hasDTI: false,
      hasTRN: false,
      errors: [],
      warnings: [],
      confidence: 0,
    };

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        result.errors.push('Document must be an image file (JPG, PNG, etc.)');
        return result;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        result.errors.push('Document file size must be less than 10MB');
        return result;
      }

      // Perform OCR on the document
      const ocrResult = await this.performOCR(file);
      result.extractedText = ocrResult.text;
      result.confidence = ocrResult.confidence;

      if (!ocrResult.text || ocrResult.text.trim().length < 50) {
        result.errors.push('Unable to extract sufficient text from document. Please ensure the image is clear and well-lit.');
        return result;
      }

      // Check for DTI (Department of Trade and Industry) indicators
      const dtiCheck = this.checkForDTI(ocrResult.text);
      result.hasDTI = dtiCheck.found;
      result.foundDTI = dtiCheck.value;

      if (!dtiCheck.found) {
        result.errors.push('DTI (Department of Trade and Industry) registration not found in document');
      }

      // Check for TRN (Tax Registration Number)
      const trnCheck = this.checkForTRN(ocrResult.text);
      result.hasTRN = trnCheck.found;
      result.foundTRN = trnCheck.value;

      if (!trnCheck.found) {
        result.errors.push('TRN (Tax Registration Number) not found in document');
      }

      // Add warnings if confidence is low
      if (result.confidence < 70) {
        result.warnings.push(`OCR confidence is ${result.confidence.toFixed(0)}%. Consider uploading a clearer image.`);
      }

      // Document is valid only if both DTI and TRN are found
      result.isValid = result.hasDTI && result.hasTRN;

      // Add suggestions if validation failed
      if (!result.isValid) {
        result.warnings.push('Please ensure you are uploading a valid Philippine business permit with DTI registration and TRN number clearly visible.');
      }

    } catch (error) {
      console.error('Document validation error:', error);
      result.errors.push('An error occurred while validating the document. Please try again.');
    }

    return result;
  }

  /**
   * Performs OCR on an image file
   */
  private static async performOCR(file: File): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          // Optional: log progress
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error('Failed to perform OCR on document');
    }
  }

  /**
   * Checks if the text contains DTI (Department of Trade and Industry) indicators
   */
  private static checkForDTI(text: string): { found: boolean; value?: string } {
    const upperText = text.toUpperCase();

    // Look for various DTI patterns
    const dtiPatterns = [
      /DTI/i,
      /DEPARTMENT\s+OF\s+TRADE\s+AND\s+INDUSTRY/i,
      /D\.T\.I/i,
      /TRADE\s+AND\s+INDUSTRY/i,
    ];

    for (const pattern of dtiPatterns) {
      if (pattern.test(upperText)) {
        // Try to extract the full DTI reference
        const contextMatch = text.match(new RegExp(`(.{0,50})(${pattern.source})(.{0,50})`, 'i'));
        if (contextMatch) {
          return {
            found: true,
            value: contextMatch[0].trim(),
          };
        }
        return { found: true };
      }
    }

    return { found: false };
  }

  /**
   * Checks if the text contains TRN (Tax Registration Number)
   */
  private static checkForTRN(text: string): { found: boolean; value?: string } {
    const upperText = text.toUpperCase();

    // TRN patterns - Philippine TRN is typically a sequence of numbers
    // Common formats: XXX-XXX-XXX-XXX or XXXXXXXXX
    const trnPatterns = [
      /TRN[\s:]*(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3})/i,
      /TRN[\s:]*(\d{9,12})/i,
      /TAX\s+REGISTRATION\s+NUMBER[\s:]*(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3})/i,
      /TAX\s+REGISTRATION\s+NUMBER[\s:]*(\d{9,12})/i,
      /T\.R\.N[\s:]*(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3})/i,
      /T\.R\.N[\s:]*(\d{9,12})/i,
    ];

    for (const pattern of trnPatterns) {
      const match = upperText.match(pattern);
      if (match) {
        return {
          found: true,
          value: match[0].trim(),
        };
      }
    }

    // Also check for just "TRN" text (even without a number visible)
    if (/\bTRN\b/i.test(upperText) || /TAX\s+REGISTRATION/i.test(upperText)) {
      // Found the label but couldn't extract number
      // Look around the TRN label for any number sequence
      const trnContextMatch = text.match(/TRN[\s:]*[^\d]*(\d+)/i);
      if (trnContextMatch) {
        return {
          found: true,
          value: trnContextMatch[0].trim(),
        };
      }
      return { found: true }; // Label found, assume number is there but OCR couldn't read it perfectly
    }

    return { found: false };
  }

  /**
   * Validates multiple document types
   */
  static async validateDocument(
    file: File,
    documentType: string
  ): Promise<DocumentValidationResult> {
    // Currently only business permits require validation
    if (documentType === 'business-permit') {
      return await this.validateBusinessPermit(file);
    }

    // Other document types pass validation by default
    return {
      isValid: true,
      hasDTI: false,
      hasTRN: false,
      errors: [],
      warnings: [],
      confidence: 100,
    };
  }

  /**
   * Helper function to format validation errors for display
   */
  static formatValidationErrors(result: DocumentValidationResult): string {
    const messages: string[] = [];

    if (result.errors.length > 0) {
      messages.push('❌ Validation Failed:');
      result.errors.forEach((error) => {
        messages.push(`  • ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      messages.push('\n⚠️ Warnings:');
      result.warnings.forEach((warning) => {
        messages.push(`  • ${warning}`);
      });
    }

    if (result.hasDTI && result.foundDTI) {
      messages.push(`\n✓ DTI Found: ${result.foundDTI}`);
    }

    if (result.hasTRN && result.foundTRN) {
      messages.push(`✓ TRN Found: ${result.foundTRN}`);
    }

    return messages.join('\n');
  }
}
