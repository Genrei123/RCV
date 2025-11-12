import { Request, Response, NextFunction } from 'express';
import CustomError from '../../utils/CustomError';

/**
 * Search for product in database (MOCK DATA FOR NOW)
 * POST /api/v1/mobile/compliance/search-product
 */
export const searchProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productName, LTONumber, CFPRNumber, brandName } = req.body;

    // Mock database - In real implementation, this would query the actual database
    const mockProducts = [
      {
        _id: '550e8400-e29b-41d4-a716-446655440001',
        productName: 'Premium Layer Feed',
        brandName: 'Vitarich',
        LTONumber: 'LTO-2024-001',
        CFPRNumber: 'CFPR-2024-001',
        lotNumber: 'LOT-20240115',
        productClassification: 'Processed Product',
        productSubClassification: 'Layer Feeds',
        expirationDate: '2025-06-30',
        dateOfRegistration: '2024-01-15',
        company: {
          name: 'Vitarich Corporation',
          address: 'Manila, Philippines',
        },
        registeredBy: {
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan.delacruz@vitarich.com',
        },
        isActive: true,
      },
      {
        _id: '550e8400-e29b-41d4-a716-446655440002',
        productName: 'Gamecock Champion Feed',
        brandName: 'San Miguel',
        LTONumber: 'LTO-2024-002',
        CFPRNumber: 'CFPR-2024-002',
        lotNumber: 'LOT-20240120',
        productClassification: 'Processed Product',
        productSubClassification: 'Gamecock Feeds',
        expirationDate: '2025-07-15',
        dateOfRegistration: '2024-01-20',
        company: {
          name: 'San Miguel Foods Inc.',
          address: 'Quezon City, Philippines',
        },
        registeredBy: {
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'maria.santos@smf.com',
        },
        isActive: true,
      },
      {
        _id: '550e8400-e29b-41d4-a716-446655440003',
        productName: 'Organic Broiler Feed',
        brandName: 'Nescafe Agriventures',
        LTONumber: 'LTO-2024-003',
        CFPRNumber: 'CFPR-2024-003',
        lotNumber: 'LOT-20240125',
        productClassification: 'Processed Product',
        productSubClassification: 'Layer Feeds',
        expirationDate: '2025-08-01',
        dateOfRegistration: '2024-01-25',
        company: {
          name: 'Nescafe Agriventures Corp.',
          address: 'Laguna, Philippines',
        },
        registeredBy: {
          firstName: 'Pedro',
          lastName: 'Reyes',
          email: 'pedro.reyes@nescafe.com',
        },
        isActive: true,
      },
    ];

    // Search logic - match by any of the fields
    const results = mockProducts.filter(product => {
      if (CFPRNumber && product.CFPRNumber.toLowerCase().includes(CFPRNumber.toLowerCase())) {
        return true;
      }
      if (LTONumber && product.LTONumber.toLowerCase().includes(LTONumber.toLowerCase())) {
        return true;
      }
      if (productName && product.productName.toLowerCase().includes(productName.toLowerCase())) {
        return true;
      }
      if (brandName && product.brandName.toLowerCase().includes(brandName.toLowerCase())) {
        return true;
      }
      return false;
    });

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'No products found matching the search criteria',
        data: null,
      });
    }

    // Return the first match (or you can return all matches)
    res.status(200).json({
      success: true,
      found: true,
      message: 'Product found in database',
      data: results[0],
      totalMatches: results.length,
    });
  } catch (error: any) {
    console.error('Error searching product:', error);
    return next(new CustomError(500, 'Failed to search product'));
  }
};
