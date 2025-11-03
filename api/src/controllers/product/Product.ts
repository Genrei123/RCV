import { Request, Response, NextFunction } from "express";
import { ProductValidation } from "../../typeorm/entities/product.entity";
import { ProductRepo } from "../../typeorm/data-source";
import CustomError from "../../utils/CustomError";
import { getCompanyById } from "../company/Company";
import {
  parsePageParams,
  buildPaginationMeta,
  buildLinks,
} from "../../utils/pagination";
import { AuditLogService } from "../../services/auditLogService";

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 10);
    const [products, total] = await ProductRepo.findAndCount({
      skip,
      take: limit,
      order: { dateOfRegistration: "DESC" },
      relations: ["company", "registeredBy"],
    });
    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);
    res.status(200).json({ data: products, pagination: meta, links });
  } catch (error) {
    console.error('Error fetching products:', error);
    return next(new CustomError(500, "Failed to retrieve products"));
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!ProductValidation.parse({ id: req.params.id })) {
    return new CustomError(400, "Invalid Product ID");
  }
  try {
    // Logic to get a product by ID
    res.status(200).json({
      message: `Product with ID ${req.params.id} retrieved successfully`,
    });
  } catch (error) {
    return new CustomError(500, "Failed to retrieve product");
  }
  return CustomError.security(400, "Invalid user data");
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get authenticated user from request (set by verifyUser middleware)
    const currentUser = req.user;
    if (!currentUser) {
      return next(new CustomError(401, "User not authenticated"));
    }

    console.log('Creating product, authenticated user:', currentUser._id);

    // Prepare product data with registeredById from JWT
    const productData = {
      ...req.body,
      registeredById: currentUser._id,
      registeredAt: new Date(),
    };

    // Validate product data
    const validatedProduct = ProductValidation.safeParse(productData);
    if (!validatedProduct.success) {
      console.error('Validation errors:', validatedProduct.error);
      return next(
        new CustomError(400, "Invalid Product Data or missing parameters", {
          errors: validatedProduct.error.issues,
          body: req.body,
        })
      );
    }

    // Check if product already exists
    const existingProduct = await ProductRepo.findOneBy({ 
      CFPRNumber: validatedProduct.data.CFPRNumber 
    });
    
    if (existingProduct) {
      return next(
        new CustomError(400, "Product with this CFPR Number already exists", {
          existingProduct: {
            _id: existingProduct._id,
            productName: existingProduct.productName,
            CFPRNumber: existingProduct.CFPRNumber,
          },
        })
      );
    }

    // Verify company exists
    const company = await ProductRepo.manager.findOne('Company', {
      where: { _id: validatedProduct.data.companyId }
    });

    if (!company) {
      return next(
        new CustomError(400, "Company not found", {
          companyId: validatedProduct.data.companyId,
        })
      );
    }

    // Save product
    const savedProduct = await ProductRepo.save(validatedProduct.data);
    
    console.log('Product created successfully:', savedProduct._id);

    // Log product creation
    await AuditLogService.createLog({
      action: `Created product: ${savedProduct.productName} (${savedProduct.CFPRNumber})`,
      actionType: 'CREATE_PRODUCT',
      userId: currentUser._id,
      targetProductId: savedProduct._id,
      platform: 'WEB',
      metadata: {
        productName: savedProduct.productName,
        CFPRNumber: savedProduct.CFPRNumber,
        companyId: savedProduct.companyId,
        productClassification: savedProduct.productClassification,
        productSubClassification: savedProduct.productSubClassification,
        brandName: savedProduct.brandName,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: "Product successfully registered",
      product: savedProduct,
      registeredBy: {
        _id: currentUser._id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return next(new CustomError(500, "Failed to create product"));
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!ProductValidation.parse({ _id: req.params.id, ...req.body })) {
    return new CustomError(400, "Invalid Product Data");
  }
  try {
    const product = await ProductRepo.findOneBy({ _id: req.params.id });
    if (!product) {
      return new CustomError(404, "Product not found");
    }
    ProductRepo.merge(product, req.body);
    await ProductRepo.save(product);
    res.status(200).json({ product });
  } catch (error) {
    return new CustomError(500, "Failed to update product");
  }
};

export const partialUpdateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!ProductValidation.parse({ id: req.params.id, ...req.body })) {
    return new CustomError(400, "Invalid Product Data");
  }
  try {
    const product = await ProductRepo.findOneBy({ _id: req.params.id });
    if (!product) {
      return new CustomError(404, "Product not found");
    }
    ProductRepo.merge(product, req.body);
    await ProductRepo.save(product);
    res.status(200).json({ product });
  } catch (error) {
    return new CustomError(500, "Failed to partially update product");
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!ProductValidation.parse({ id: req.params.id })) {
    return new CustomError(400, "Invalid Product ID");
  }
  try {
    const result = await ProductRepo.delete(req.params.id);
    if (result.affected === 0) {
      return new CustomError(404, "Product not found");
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    return new CustomError(500, "Failed to delete product");
  }
};

export const searchProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { query } = req.query;
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return new CustomError(400, "Invalid search query");
  }
  try {
    const { page, limit, skip } = parsePageParams(req, 10);
    const qb = ProductRepo.createQueryBuilder("product")
      .leftJoinAndSelect("product.companyId", "company")
      .where("product.LTONumber LIKE :query", { query: `%${query}%` })
      .orWhere("product.CFPRNumber LIKE :query", { query: `%${query}%` })
      .orWhere("product.lotNumber LIKE :query", { query: `%${query}%` })
      .orWhere("product.brandName LIKE :query", { query: `%${query}%` })
      .orWhere("product.productName LIKE :query", { query: `%${query}%` });

    const [products, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);
    res.status(200).json({ data: products, pagination: meta, links });
  } catch (error) {
    return new CustomError(500, "Failed to search products");
  }
};

export const searchProductByCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // TO DO if requirements need it
};

export const sortProducType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // TO DO if requirements need it
};
