import { DB } from '../typeorm/data-source';
import { Product } from '../typeorm/entities/product.entity';
import { Company } from '../typeorm/entities/company.entity';
import { ILike } from 'typeorm';

interface ProductResult {
  id: string;
  productName: string;
  brandName: string;
  cfprNumber: string;
  ltoNumber: string;
  lotNumber: string;
  companyName: string;
  companyLicense: string;
  classification: string;
  subClassification: string;
  expirationDate: string;
  registrationDate: string;
  blockchainHash: string | null;
}

interface CompanyResult {
  id: string;
  name: string;
  address: string;
  licenseNumber: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  businessType: string | null;
  registrationDate: string | null;
  blockchainHash: string | null;
  productCount: number;
}

export class ChatDatabaseService {
  /**
   * Search for products based on keywords
   */
  async searchProducts(keywords: string[]): Promise<ProductResult[]> {
    if (keywords.length === 0) return [];

    try {
      const productRepo = DB.getRepository(Product);
      
      // Build where clauses for each keyword
      const whereConditions = keywords.map(keyword => [
        { productName: ILike(`%${keyword}%`), isArchived: false },
        { brandName: ILike(`%${keyword}%`), isArchived: false },
        { CFPRNumber: ILike(`%${keyword}%`), isArchived: false },
        { LTONumber: ILike(`%${keyword}%`), isArchived: false },
        { productClassification: ILike(`%${keyword}%`), isArchived: false },
      ]).flat();

      const products = await productRepo.find({
        where: whereConditions,
        relations: ['company'],
        take: 10,
      });

      return products.map((p: Product) => ({
        id: p._id,
        productName: p.productName,
        brandName: p.brandName,
        cfprNumber: p.CFPRNumber,
        ltoNumber: p.LTONumber,
        lotNumber: p.lotNumber,
        companyName: p.company.name,
        companyLicense: p.company.licenseNumber,
        classification: p.productClassification,
        subClassification: p.productSubClassification,
        expirationDate: p.expirationDate.toISOString().split('T')[0],
        registrationDate: p.dateOfRegistration.toISOString().split('T')[0],
        blockchainHash: p.sepoliaTransactionId || null,
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Search for companies based on keywords
   */
  async searchCompanies(keywords: string[]): Promise<CompanyResult[]> {
    if (keywords.length === 0) return [];

    try {
      const companyRepo = DB.getRepository(Company);
      
      // Build where clauses for each keyword
      const whereConditions = keywords.map(keyword => [
        { name: ILike(`%${keyword}%`), isArchived: false },
        { licenseNumber: ILike(`%${keyword}%`), isArchived: false },
        { address: ILike(`%${keyword}%`), isArchived: false },
        { businessType: ILike(`%${keyword}%`), isArchived: false },
      ]).flat();

      const companies = await companyRepo.find({
        where: whereConditions,
        relations: ['products'],
        take: 10,
      });

      return companies.map((c: Company) => ({
        id: c._id,
        name: c.name,
        address: c.address,
        licenseNumber: c.licenseNumber,
        phone: c.phone || null,
        email: c.email || null,
        website: c.website || null,
        businessType: c.businessType || null,
        registrationDate: c.registrationDate?.toISOString().split('T')[0] || null,
        blockchainHash: c.sepoliaTransactionId || null,
        productCount: c.products?.length || 0,
      }));
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  }

  /**
   * Extract keywords from user query
   */
  extractKeywords(query: string): string[] {
    // Remove common question words
    const cleaned = query
      .toLowerCase()
      .replace(/\b(what|is|the|are|how|when|where|who|which|tell|me|about|show|find|get|cfpr|number|lto|blockchain|hash|product|company)\b/g, '')
      .trim();
    
    // Extract quoted phrases
    const quotedMatches = query.match(/"([^"]+)"|'([^']+)'/g);
    if (quotedMatches) {
      return quotedMatches.map(m => m.replace(/['"]/g, ''));
    }

    // Extract capitalized words (likely product/company names)
    const capitalizedWords = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords && capitalizedWords.length > 0) {
      return capitalizedWords;
    }

    // Fallback: return significant words
    return cleaned.split(/\s+/).filter(w => w.length > 2);
  }

  /**
   * Format product data for AI context
   */
  formatProductData(product: ProductResult): string {
    return `
**${product.productName}** (${product.brandName})
- CFPR Number: ${product.cfprNumber}
- LTO Number: ${product.ltoNumber}
- Lot Number: ${product.lotNumber}
- Company: ${product.companyName} (License: ${product.companyLicense})
- Classification: ${product.classification} > ${product.subClassification}
- Expiration Date: ${product.expirationDate}
- Registration Date: ${product.registrationDate}
${product.blockchainHash ? `- Blockchain Hash: \`${product.blockchainHash}\`` : ''}
    `.trim();
  }

  /**
   * Format company data for AI context
   */
  formatCompanyData(company: CompanyResult): string {
    return `
**${company.name}**
- License Number: ${company.licenseNumber}
- Address: ${company.address}
${company.businessType ? `- Business Type: ${company.businessType}` : ''}
${company.phone ? `- Phone: ${company.phone}` : ''}
${company.email ? `- Email: ${company.email}` : ''}
${company.website ? `- Website: ${company.website}` : ''}
${company.registrationDate ? `- Registration Date: ${company.registrationDate}` : ''}
${company.blockchainHash ? `- Blockchain Hash: \`${company.blockchainHash}\`` : ''}
- Registered Products: ${company.productCount}
    `.trim();
  }
}

export const chatDatabaseService = new ChatDatabaseService();
