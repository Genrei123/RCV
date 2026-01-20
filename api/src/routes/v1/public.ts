import { Router, Request, Response, NextFunction } from "express";
import { ProductRepo, CompanyRepo } from "../../typeorm/data-source";
import { Not, IsNull } from "typeorm";
import CustomError from "../../utils/CustomError";
import * as UserController from "../../controllers/user/User";

const PublicRouter = Router();

/**
 * Get publicly visible verified products (those registered on blockchain)
 * This endpoint is public - no authentication required
 */
PublicRouter.get('/verified-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50); // Max 50 for public API
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    // Only return products that have been verified on blockchain
    const [products, total] = await ProductRepo.findAndCount({
      where: {
        sepoliaTransactionId: Not(IsNull()),
      },
      select: [
        '_id',
        'productName',
        'brandName',
        'lotNumber',
        'productClassification',
        'productSubClassification',
        'expirationDate',
        'dateOfRegistration',
        'sepoliaTransactionId',
      ],
      relations: ['company'],
      order: { dateOfRegistration: 'DESC' },
      skip,
      take: limit,
    });

    // Map to public-safe data (hide internal IDs where appropriate)
    const publicProducts = products.map(product => ({
      id: product._id,
      productName: product.productName,
      brandName: product.brandName,
      lotNumber: product.lotNumber,
      classification: product.productClassification,
      subClassification: product.productSubClassification,
      expirationDate: product.expirationDate,
      registrationDate: product.dateOfRegistration,
      companyName: product.company?.name || 'N/A',
      blockchainTxHash: product.sepoliaTransactionId,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${product.sepoliaTransactionId}`,
    }));

    res.status(200).json({
      success: true,
      data: publicProducts,
      pagination: {
        current_page: page,
        total_items: total,
        total_pages: Math.ceil(total / limit),
        items_per_page: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching public products:', error);
    return next(new CustomError(500, 'Failed to retrieve verified products'));
  }
});

/**
 * Get publicly visible verified companies (those registered on blockchain)
 * This endpoint is public - no authentication required
 */
PublicRouter.get('/verified-companies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50); // Max 50 for public API
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    // Only return companies that have been verified on blockchain
    const [companies, total] = await CompanyRepo.findAndCount({
      where: {
        sepoliaTransactionId: Not(IsNull()),
      },
      select: [
        '_id',
        'name',
        'address',
        'licenseNumber',
        'businessType',
        'registrationDate',
        'sepoliaTransactionId',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Get product counts for each company
    const companiesWithCounts = await Promise.all(
      companies.map(async (company) => {
        const productCount = await ProductRepo.count({
          where: { companyId: company._id },
        });
        return {
          id: company._id,
          name: company.name,
          address: company.address,
          licenseNumber: company.licenseNumber,
          businessType: company.businessType || 'N/A',
          registrationDate: company.registrationDate,
          productCount,
          blockchainTxHash: company.sepoliaTransactionId,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${company.sepoliaTransactionId}`,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: companiesWithCounts,
      pagination: {
        current_page: page,
        total_items: total,
        total_pages: Math.ceil(total / limit),
        items_per_page: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching public companies:', error);
    return next(new CustomError(500, 'Failed to retrieve verified companies'));
  }
});

/**
 * Get public statistics for the landing page
 */
PublicRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [verifiedProducts, verifiedCompanies, totalProducts, totalCompanies] = await Promise.all([
      ProductRepo.count({ where: { sepoliaTransactionId: Not(IsNull()) } }),
      CompanyRepo.count({ where: { sepoliaTransactionId: Not(IsNull()) } }),
      ProductRepo.count(),
      CompanyRepo.count(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        verifiedProducts,
        verifiedCompanies,
        totalProducts,
        totalCompanies,
      },
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return next(new CustomError(500, 'Failed to retrieve statistics'));
  }
});

PublicRouter.post('/users/sync/:firebaseUid', UserController.syncUserFromFirebase);

export default PublicRouter;
