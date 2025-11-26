import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');

// ⚙️ CONFIGURATION: Paste your PDF URL here
// This PDF will be the ONLY source for product searches
const PRODUCT_REGISTRY_PDF_URL = process.env.PRODUCT_REGISTRY_PDF_URL || 
  'https://example.com/bai-product-registry.pdf'; // Replace with your actual PDF URL

interface GroundedProductResult {
  productName: string; // NAME OF THE PRODUCT
  brandName: string; // BRAND NAME
  CFPRNumber: string; // CFPR NUMBER
  companyName: string; // COMPANY NAME
  productClassification: string; // PRODUCT CLASSIFICATION
  subClassification: string; // SUB CLASSIFICATION
  validUntil: string; // VALID UNTIL
  confidence: number;
  source: string;
}

export async function searchProductWithGrounding(
  productName?: string,
  LTONumber?: string,
  CFPRNumber?: string,
  brandName?: string,
  manufacturer?: string
): Promise<GroundedProductResult | null> {
  try {
    // Build search query from available OCR data
    const searchParts = [];
    if (CFPRNumber) searchParts.push(`CFPR Number: ${CFPRNumber}`);
    if (LTONumber) searchParts.push(`LTO Number: ${LTONumber}`);
    if (productName) searchParts.push(`Product Name: ${productName}`);
    if (brandName) searchParts.push(`Brand: ${brandName}`);
    if (manufacturer) searchParts.push(`Manufacturer: ${manufacturer}`);

    const searchQuery = `
You are searching ONLY in this specific PDF document:
${PRODUCT_REGISTRY_PDF_URL}

DO NOT search anywhere else. ONLY use information from the PDF above.

Find official Philippines animal feed product registration information for:
${searchParts.join(', ')}

The PDF contains a table with these EXACT columns:
- PRODUCT CLASSIFICATION
- SUB CLASSIFICATION
- CFPR NUMBER
- BRAND NAME
- NAME OF THE PRODUCT
- COMPANY NAME
- VALID UNTIL

Search for matches and return the most accurate and complete product registration details in JSON format with these exact fields:
{
  "found": boolean (true if product found in PDF, false if not),
  "productName": string (from "NAME OF THE PRODUCT" column),
  "brandName": string (from "BRAND NAME" column),
  "CFPRNumber": string (from "CFPR NUMBER" column),
  "companyName": string (from "COMPANY NAME" column),
  "productClassification": string (from "PRODUCT CLASSIFICATION" column),
  "subClassification": string (from "SUB CLASSIFICATION" column),
  "validUntil": string (from "VALID UNTIL" column - expiration/validity date),
  "confidence": number (confidence score from 0.0 to 1.0 based on match quality),
  "source": string (the PDF URL where this information was found)
}

If multiple results are found in the PDF, return ONLY the best match based on CFPR number similarity.
If no match is found in the PDF, set "found" to false and use "Unknown" for missing fields.

Return ONLY valid JSON, no additional text.
    `.trim();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    console.log('🔍 Performing grounded search');
    console.log('📄 Searching PDF:', PRODUCT_REGISTRY_PDF_URL);
    console.log('🔎 Search criteria:', searchParts.join(', '));

    const result = await model.generateContent(searchQuery);
    const response = result.response;
    const text = response.text();

    console.log('✅ Grounded search response:', text);

    const parsed = JSON.parse(text);

    // If not found or low confidence, return null
    if (!parsed.found || parsed.confidence < 0.5) {
      console.log('❌ No confident match found');
      return null;
    }

    // Return the grounded result
    return {
      productName: parsed.productName || 'Unknown',
      brandName: parsed.brandName || 'Unknown',
      CFPRNumber: parsed.CFPRNumber || 'Unknown',
      companyName: parsed.companyName || 'Unknown',
      productClassification: parsed.productClassification || 'Unknown',
      subClassification: parsed.subClassification || 'Unknown',
      validUntil: parsed.validUntil || 'Unknown',
      confidence: parsed.confidence,
      source: parsed.source
    };

  } catch (error: any) {
    console.error('❌ Error in grounded search:', error);
    throw error;
  }
}
