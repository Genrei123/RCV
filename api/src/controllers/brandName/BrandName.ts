import { Request, Response, NextFunction } from "express";
import { BrandNameValidation } from "../../typeorm/entities/brandName.entity";
import { BrandNameRepo, ProductRepo } from "../../typeorm/data-source";
import CustomError from "../../utils/CustomError";
import {
  parsePageParams,
  buildPaginationMeta,
  buildLinks,
} from "../../utils/pagination";
import { AuditLogService } from "../../services/auditLogService";
import { In } from "typeorm";

// Get all brand names with pagination
export const getAllBrandNames = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 50);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    let brandNames: any[] = [];
    let total = 0;

    if (search) {
      const qb = BrandNameRepo.createQueryBuilder("brandName")
        .where("LOWER(brandName.name) LIKE LOWER(:q)", { q: `%${search}%` })
        .andWhere("brandName.isActive = :isActive", { isActive: true })
        .orderBy("brandName.name", "ASC")
        .skip(skip)
        .take(limit);
      [brandNames, total] = await qb.getManyAndCount();
    } else {
      [brandNames, total] = await BrandNameRepo.findAndCount({
        where: { isActive: true },
        skip,
        take: limit,
        order: { name: "ASC" },
      });
    }

    // Get product counts for each brand name
    const brandNamesWithCounts = await Promise.all(
      brandNames.map(async (brandName) => {
        const productCount = await ProductRepo.count({
          where: { brandNameId: brandName._id },
        });
        return { ...brandName, productCount };
      })
    );

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);

    res.status(200).json({
      success: true,
      data: brandNamesWithCounts,
      pagination: meta,
      links,
    });
  } catch (error) {
    console.error("Error fetching brand names:", error);
    return next(new CustomError(500, "Failed to retrieve brand names"));
  }
};

// Get brand name by ID with its products
export const getBrandNameById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const brandName = await BrandNameRepo.findOne({
      where: { _id: id },
      relations: ["products"],
    });

    if (!brandName) {
      return next(new CustomError(404, "Brand name not found"));
    }

    // Get product count
    const productCount = await ProductRepo.count({
      where: { brandNameId: id },
    });

    res.status(200).json({
      success: true,
      data: { ...brandName, productCount },
    });
  } catch (error) {
    console.error("Error fetching brand name:", error);
    return next(new CustomError(500, "Failed to retrieve brand name"));
  }
};

// Get products by brand name ID
export const getProductsByBrandName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { page, limit, skip } = parsePageParams(req, 10);

    const [products, total] = await ProductRepo.findAndCount({
      where: { brandNameId: id },
      skip,
      take: limit,
      order: { dateOfRegistration: "DESC" },
      relations: ["company", "registeredBy"],
    });

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);

    res.status(200).json({
      success: true,
      data: products,
      pagination: meta,
      links,
    });
  } catch (error) {
    console.error("Error fetching products by brand name:", error);
    return next(new CustomError(500, "Failed to retrieve products"));
  }
};

// Create a new brand name
export const createBrandName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return next(new CustomError(401, "User not authenticated"));
    }

    const validatedData = BrandNameValidation.safeParse(req.body);
    if (!validatedData.success) {
      return next(
        new CustomError(400, "Invalid brand name data", {
          errors: validatedData.error.issues,
        })
      );
    }

    // Check if brand name already exists
    const existingBrandName = await BrandNameRepo.findOne({
      where: { name: validatedData.data.name },
    });

    if (existingBrandName) {
      return next(
        new CustomError(400, "Brand name already exists", {
          existingBrandName: {
            _id: existingBrandName._id,
            name: existingBrandName.name,
          },
        })
      );
    }

    const savedBrandName = await BrandNameRepo.save(validatedData.data);

    // Log the action
    await AuditLogService.createLog({
      action: `Created brand name: ${savedBrandName.name}`,
      actionType: "CREATE_BRAND_NAME",
      userId: currentUser._id,
      platform: "WEB",
      metadata: { brandNameId: savedBrandName._id, name: savedBrandName.name },
      req,
    });

    res.status(201).json({
      success: true,
      message: "Brand name created successfully",
      data: savedBrandName,
    });
  } catch (error) {
    console.error("Error creating brand name:", error);
    return next(new CustomError(500, "Failed to create brand name"));
  }
};

// Update a brand name
export const updateBrandName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return next(new CustomError(401, "User not authenticated"));
    }

    const { id } = req.params;

    const brandName = await BrandNameRepo.findOne({ where: { _id: id } });
    if (!brandName) {
      return next(new CustomError(404, "Brand name not found"));
    }

    const validatedData = BrandNameValidation.safeParse({
      ...brandName,
      ...req.body,
    });
    if (!validatedData.success) {
      return next(
        new CustomError(400, "Invalid brand name data", {
          errors: validatedData.error.issues,
        })
      );
    }

    // Check if new name conflicts with existing brand name
    if (req.body.name && req.body.name !== brandName.name) {
      const existingBrandName = await BrandNameRepo.findOne({
        where: { name: req.body.name },
      });
      if (existingBrandName) {
        return next(new CustomError(400, "Brand name already exists"));
      }
    }

    BrandNameRepo.merge(brandName, validatedData.data);
    const updatedBrandName = await BrandNameRepo.save(brandName);

    // Log the action
    await AuditLogService.createLog({
      action: `Updated brand name: ${updatedBrandName.name}`,
      actionType: "UPDATE_BRAND_NAME",
      userId: currentUser._id,
      platform: "WEB",
      metadata: { brandNameId: updatedBrandName._id, changes: req.body },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Brand name updated successfully",
      data: updatedBrandName,
    });
  } catch (error) {
    console.error("Error updating brand name:", error);
    return next(new CustomError(500, "Failed to update brand name"));
  }
};

// Delete a brand name with product re-routing
export const deleteBrandName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return next(new CustomError(401, "User not authenticated"));
    }

    const { id } = req.params;
    const { newBrandNameId, confirm } = req.body;

    const brandName = await BrandNameRepo.findOne({ where: { _id: id } });
    if (!brandName) {
      return next(new CustomError(404, "Brand name not found"));
    }

    // Get products associated with this brand name
    const products = await ProductRepo.find({
      where: { brandNameId: id },
    });

    // If there are products and no re-routing target specified
    if (products.length > 0 && !newBrandNameId) {
      return res.status(200).json({
        success: false,
        requiresRerouting: true,
        message: `This brand name has ${products.length} product(s) associated with it. Please specify a new brand name to re-route these products.`,
        productCount: products.length,
        products: products.map((p) => ({
          _id: p._id,
          productName: p.productName,
          brandName: p.brandName,
        })),
      });
    }

    // If there are products and re-routing is specified
    if (products.length > 0 && newBrandNameId) {
      // Verify the new brand name exists
      const newBrandName = await BrandNameRepo.findOne({
        where: { _id: newBrandNameId },
      });
      if (!newBrandName) {
        return next(new CustomError(400, "Target brand name not found"));
      }

      if (!confirm) {
        return res.status(200).json({
          success: false,
          requiresConfirmation: true,
          message: `This action is irreversible. ${products.length} product(s) will be re-routed to "${newBrandName.name}". Please confirm.`,
          productCount: products.length,
          targetBrandName: newBrandName.name,
        });
      }

      // Re-route products to new brand name
      await ProductRepo.update(
        { brandNameId: id },
        { brandNameId: newBrandNameId, brandName: newBrandName.name }
      );
    }

    // Soft delete (set isActive to false) or hard delete
    brandName.isActive = false;
    await BrandNameRepo.save(brandName);

    // Log the action
    await AuditLogService.createLog({
      action: `Deleted brand name: ${brandName.name}${
        products.length > 0
          ? ` (re-routed ${products.length} products)`
          : ""
      }`,
      actionType: "DELETE_BRAND_NAME",
      userId: currentUser._id,
      platform: "WEB",
      metadata: {
        brandNameId: brandName._id,
        name: brandName.name,
        productsRerouted: products.length,
        newBrandNameId: newBrandNameId || null,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Brand name deleted successfully${
        products.length > 0
          ? `. ${products.length} product(s) were re-routed.`
          : ""
      }`,
    });
  } catch (error) {
    console.error("Error deleting brand name:", error);
    return next(new CustomError(500, "Failed to delete brand name"));
  }
};

// Get brand name statistics (for dashboard)
export const getBrandNameStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const brandNames = await BrandNameRepo.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });

    const statsPromises = brandNames.map(async (brandName) => {
      const productCount = await ProductRepo.count({
        where: { brandNameId: brandName._id },
      });
      return {
        _id: brandName._id,
        name: brandName.name,
        description: brandName.description,
        productCount,
      };
    });

    const stats = await Promise.all(statsPromises);

    // Sort by product count descending
    stats.sort((a, b) => b.productCount - a.productCount);

    res.status(200).json({
      success: true,
      data: stats,
      total: brandNames.length,
    });
  } catch (error) {
    console.error("Error fetching brand name stats:", error);
    return next(new CustomError(500, "Failed to retrieve brand name statistics"));
  }
};
