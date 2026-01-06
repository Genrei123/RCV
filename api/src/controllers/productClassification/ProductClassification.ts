import { Request, Response, NextFunction } from "express";
import { ProductClassificationValidation } from "../../typeorm/entities/productClassification.entity";
import { ProductClassificationRepo, ProductRepo } from "../../typeorm/data-source";
import CustomError from "../../utils/CustomError";
import {
  parsePageParams,
  buildPaginationMeta,
  buildLinks,
} from "../../utils/pagination";
import { AuditLogService } from "../../services/auditLogService";
import { IsNull } from "typeorm";

// Get all classifications (parent classifications only by default)
export const getAllClassifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 50);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const includeSubClassifications = req.query.includeSubClassifications === "true";

    let classifications: any[] = [];
    let total = 0;

    const whereCondition: any = { isActive: true };
    if (!includeSubClassifications) {
      whereCondition.parentId = IsNull();
    }

    if (search) {
      const qb = ProductClassificationRepo.createQueryBuilder("classification")
        .leftJoinAndSelect("classification.children", "children")
        .where("LOWER(classification.name) LIKE LOWER(:q)", { q: `%${search}%` })
        .andWhere("classification.isActive = :isActive", { isActive: true });
      
      if (!includeSubClassifications) {
        qb.andWhere("classification.parentId IS NULL");
      }
      
      qb.orderBy("classification.name", "ASC").skip(skip).take(limit);
      [classifications, total] = await qb.getManyAndCount();
    } else {
      [classifications, total] = await ProductClassificationRepo.findAndCount({
        where: whereCondition,
        skip,
        take: limit,
        order: { name: "ASC" },
        relations: ["children"],
      });
    }

    // Get product counts for each classification
    const classificationsWithCounts = await Promise.all(
      classifications.map(async (classification) => {
        const productCount = await ProductRepo.count({
          where: { classificationId: classification._id },
        });
        const subClassificationProductCount = await ProductRepo.count({
          where: { subClassificationId: classification._id },
        });
        
        // Get counts for children too
        const childrenWithCounts = classification.children
          ? await Promise.all(
              classification.children.map(async (child: any) => {
                const childProductCount = await ProductRepo.count({
                  where: { subClassificationId: child._id },
                });
                return { ...child, productCount: childProductCount };
              })
            )
          : [];
        
        return {
          ...classification,
          productCount,
          subClassificationProductCount,
          children: childrenWithCounts,
        };
      })
    );

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);

    res.status(200).json({
      success: true,
      data: classificationsWithCounts,
      pagination: meta,
      links,
    });
  } catch (error) {
    console.error("Error fetching classifications:", error);
    return next(new CustomError(500, "Failed to retrieve classifications"));
  }
};

// Get sub-classifications for a parent classification
export const getSubClassifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { parentId } = req.params;

    const subClassifications = await ProductClassificationRepo.find({
      where: { parentId, isActive: true },
      order: { name: "ASC" },
    });

    // Get product counts
    const subClassificationsWithCounts = await Promise.all(
      subClassifications.map(async (subClass) => {
        const productCount = await ProductRepo.count({
          where: { subClassificationId: subClass._id },
        });
        return { ...subClass, productCount };
      })
    );

    res.status(200).json({
      success: true,
      data: subClassificationsWithCounts,
    });
  } catch (error) {
    console.error("Error fetching sub-classifications:", error);
    return next(new CustomError(500, "Failed to retrieve sub-classifications"));
  }
};

// Get classification by ID with its products
export const getClassificationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const classification = await ProductClassificationRepo.findOne({
      where: { _id: id },
      relations: ["parent", "children"],
    });

    if (!classification) {
      return next(new CustomError(404, "Classification not found"));
    }

    // Get product counts
    const productCount = await ProductRepo.count({
      where: { classificationId: id },
    });
    const subClassificationProductCount = await ProductRepo.count({
      where: { subClassificationId: id },
    });

    res.status(200).json({
      success: true,
      data: {
        ...classification,
        productCount,
        subClassificationProductCount,
      },
    });
  } catch (error) {
    console.error("Error fetching classification:", error);
    return next(new CustomError(500, "Failed to retrieve classification"));
  }
};

// Get products by classification ID
export const getProductsByClassification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // "classification" or "subClassification"
    const { page, limit, skip } = parsePageParams(req, 10);

    const whereCondition =
      type === "subClassification"
        ? { subClassificationId: id }
        : { classificationId: id };

    const [products, total] = await ProductRepo.findAndCount({
      where: whereCondition,
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
    console.error("Error fetching products by classification:", error);
    return next(new CustomError(500, "Failed to retrieve products"));
  }
};

// Create a new classification
export const createClassification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return next(new CustomError(401, "User not authenticated"));
    }

    const validatedData = ProductClassificationValidation.safeParse(req.body);
    if (!validatedData.success) {
      return next(
        new CustomError(400, "Invalid classification data", {
          errors: validatedData.error.issues,
        })
      );
    }

    // Check if classification already exists with same name and parent
    const existingClassification = await ProductClassificationRepo.findOne({
      where: {
        name: validatedData.data.name,
        parentId: validatedData.data.parentId || IsNull(),
      },
    });

    if (existingClassification) {
      return next(
        new CustomError(400, "Classification already exists", {
          existingClassification: {
            _id: existingClassification._id,
            name: existingClassification.name,
          },
        })
      );
    }

    // If parentId is provided, verify parent exists
    if (validatedData.data.parentId) {
      const parent = await ProductClassificationRepo.findOne({
        where: { _id: validatedData.data.parentId },
      });
      if (!parent) {
        return next(new CustomError(400, "Parent classification not found"));
      }
    }

    // Prepare data for saving (convert null parentId to undefined)
    const classificationData = {
      ...validatedData.data,
      parentId: validatedData.data.parentId || undefined,
    };

    const savedClassification = await ProductClassificationRepo.save(
      classificationData
    );

    // Log the action
    await AuditLogService.createLog({
      action: `Created ${
        validatedData.data.parentId ? "sub-" : ""
      }classification: ${savedClassification}`,
      actionType: "CREATE_CLASSIFICATION",
      userId: currentUser._id,
      platform: "WEB",
      metadata: {
        classificationId: savedClassification._id,
        name: savedClassification.name,
        parentId: savedClassification.parentId,
      },
      req,
    });

    res.status(201).json({
      success: true,
      message: "Classification created successfully",
      data: savedClassification,
    });
  } catch (error) {
    console.error("Error creating classification:", error);
    return next(new CustomError(500, "Failed to create classification"));
  }
};

// Update a classification
export const updateClassification = async (
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

    const classification = await ProductClassificationRepo.findOne({
      where: { _id: id },
    });
    if (!classification) {
      return next(new CustomError(404, "Classification not found"));
    }

    const validatedData = ProductClassificationValidation.safeParse({
      ...classification,
      ...req.body,
    });
    if (!validatedData.success) {
      return next(
        new CustomError(400, "Invalid classification data", {
          errors: validatedData.error.issues,
        })
      );
    }

    // Check if new name conflicts
    if (req.body.name && req.body.name !== classification.name) {
      const existingClassification = await ProductClassificationRepo.findOne({
        where: {
          name: req.body.name,
          parentId: classification.parentId || IsNull(),
        },
      });
      if (existingClassification) {
        return next(new CustomError(400, "Classification name already exists"));
      }
    }

    // Prepare update data (convert null parentId to undefined)
    const updateData = {
      ...validatedData.data,
      parentId: validatedData.data.parentId === null ? undefined : validatedData.data.parentId,
    };

    ProductClassificationRepo.merge(classification, updateData);
    const updatedClassification = await ProductClassificationRepo.save(
      classification
    );

    // Log the action
    await AuditLogService.createLog({
      action: `Updated classification: ${updatedClassification.name}`,
      actionType: "UPDATE_CLASSIFICATION",
      userId: currentUser._id,
      platform: "WEB",
      metadata: {
        classificationId: updatedClassification._id,
        changes: req.body,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Classification updated successfully",
      data: updatedClassification,
    });
  } catch (error) {
    console.error("Error updating classification:", error);
    return next(new CustomError(500, "Failed to update classification"));
  }
};

// Delete a classification with product re-routing
export const deleteClassification = async (
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
    const { newClassificationId, confirm, type } = req.body;
    // type: "classification" or "subClassification"

    const classification = await ProductClassificationRepo.findOne({
      where: { _id: id },
      relations: ["children"],
    });
    if (!classification) {
      return next(new CustomError(404, "Classification not found"));
    }

    // Get products associated with this classification
    const isSubClassification = !!classification.parentId;
    const whereCondition = isSubClassification
      ? { subClassificationId: id }
      : { classificationId: id };

    const products = await ProductRepo.find({ where: whereCondition });

    // Check for children (only for parent classifications)
    if (!isSubClassification && classification.children && classification.children.length > 0) {
      return next(
        new CustomError(
          400,
          "Cannot delete a classification with sub-classifications. Please delete or re-assign sub-classifications first."
        )
      );
    }

    // If there are products and no re-routing target specified
    if (products.length > 0 && !newClassificationId) {
      return res.status(200).json({
        success: false,
        requiresRerouting: true,
        message: `This classification has ${products.length} product(s) associated with it. Please specify a new classification to re-route these products.`,
        productCount: products.length,
        isSubClassification,
        products: products.map((p) => ({
          _id: p._id,
          productName: p.productName,
          productClassification: p.productClassification,
          productSubClassification: p.productSubClassification,
        })),
      });
    }

    // If there are products and re-routing is specified
    if (products.length > 0 && newClassificationId) {
      // Verify the new classification exists
      const newClassification = await ProductClassificationRepo.findOne({
        where: { _id: newClassificationId },
      });
      if (!newClassification) {
        return next(new CustomError(400, "Target classification not found"));
      }

      if (!confirm) {
        return res.status(200).json({
          success: false,
          requiresConfirmation: true,
          message: `This action is irreversible. ${products.length} product(s) will be re-routed to "${newClassification.name}". Please confirm.`,
          productCount: products.length,
          targetClassification: newClassification.name,
        });
      }

      // Re-route products to new classification
      if (isSubClassification) {
        await ProductRepo.update(
          { subClassificationId: id },
          {
            subClassificationId: newClassificationId,
            productSubClassification: newClassification.name,
          }
        );
      } else {
        await ProductRepo.update(
          { classificationId: id },
          {
            classificationId: newClassificationId,
            productClassification: newClassification.name,
          }
        );
      }
    }

    // Soft delete
    classification.isActive = false;
    await ProductClassificationRepo.save(classification);

    // Log the action
    await AuditLogService.createLog({
      action: `Deleted ${isSubClassification ? "sub-" : ""}classification: ${
        classification.name
      }${products.length > 0 ? ` (re-routed ${products.length} products)` : ""}`,
      actionType: "DELETE_CLASSIFICATION",
      userId: currentUser._id,
      platform: "WEB",
      metadata: {
        classificationId: classification._id,
        name: classification.name,
        productsRerouted: products.length,
        newClassificationId: newClassificationId || null,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Classification deleted successfully${
        products.length > 0
          ? `. ${products.length} product(s) were re-routed.`
          : ""
      }`,
    });
  } catch (error) {
    console.error("Error deleting classification:", error);
    return next(new CustomError(500, "Failed to delete classification"));
  }
};

// Get classification statistics (for dashboard)
export const getClassificationStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get parent classifications
    const classifications = await ProductClassificationRepo.find({
      where: { isActive: true, parentId: IsNull() },
      relations: ["children"],
      order: { name: "ASC" },
    });

    const statsPromises = classifications.map(async (classification) => {
      const productCount = await ProductRepo.count({
        where: { classificationId: classification._id },
      });

      // Get sub-classification stats
      const childrenStats = classification.children
        ? await Promise.all(
            classification.children
              .filter((c: any) => c.isActive)
              .map(async (child: any) => {
                const childProductCount = await ProductRepo.count({
                  where: { subClassificationId: child._id },
                });
                return {
                  _id: child._id,
                  name: child.name,
                  productCount: childProductCount,
                };
              })
          )
        : [];

      return {
        _id: classification._id,
        name: classification.name,
        description: classification.description,
        productCount,
        subClassifications: childrenStats,
        totalSubClassificationProducts: childrenStats.reduce(
          (sum, c) => sum + c.productCount,
          0
        ),
      };
    });

    const stats = await Promise.all(statsPromises);

    // Sort by total product count descending
    stats.sort(
      (a, b) =>
        b.productCount +
        b.totalSubClassificationProducts -
        (a.productCount + a.totalSubClassificationProducts)
    );

    res.status(200).json({
      success: true,
      data: stats,
      total: classifications.length,
    });
  } catch (error) {
    console.error("Error fetching classification stats:", error);
    return next(
      new CustomError(500, "Failed to retrieve classification statistics")
    );
  }
};
