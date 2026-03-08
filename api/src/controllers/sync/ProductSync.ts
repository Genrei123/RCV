import type { NextFunction, Request, Response } from "express";
import CustomError from "../../utils/CustomError";
import { ProductRepo } from "../../typeorm/data-source";
import { MoreThanOrEqual } from "typeorm";

/**
 * GET /api/v1/mobile/products/sync
 * 
 * Returns a lightweight product catalog for local storage on mobile devices.
 * Supports incremental sync via ?since=<ISO timestamp>.
 * 
 * This enables the mobile app to perform OCR fuzzy search LOCALLY,
 * eliminating the round-trip latency to the server for each scan.
 * 
 * Reporting, compliance recording, and scan history still go through
 * the normal server endpoints.
 */
export const syncProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sinceParam = req.query.since as string | undefined;

    // Build query conditions
    const whereConditions: any = {};

    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (isNaN(sinceDate.getTime())) {
        return next(
          new CustomError(400, "Invalid 'since' parameter. Use ISO 8601 format.")
        );
      }
      // TODO: If the Product entity gains an updatedAt column, filter by it.
      // For now, we return all products whenever since is provided
      // because the entity doesn't have updatedAt yet.
    }

    // Fetch all products with their company (lightweight join)
    const products = await ProductRepo.find({
      relations: ["company"],
      order: { dateOfRegistration: "DESC" },
    });

    // Map to a lightweight sync payload (only fields needed for fuzzy search)
    const syncData = products.map((p) => ({
      id: p._id,
      productName: p.productName,
      brandName: p.brandName || null,
      CFPRNumber: p.CFPRNumber || null,
      LTONumber: p.LTONumber || null,
      lotNumber: p.lotNumber || null,
      productClassification: p.productClassification || null,
      productSubClassification: p.productSubClassification || null,
      expirationDate: p.expirationDate
        ? new Date(p.expirationDate).toISOString()
        : null,
      dateOfRegistration: p.dateOfRegistration
        ? new Date(p.dateOfRegistration).toISOString()
        : null,
      companyId: p.companyId || null,
      companyName: p.company?.name || null,
      productImageFront: p.productImageFront || null,
      productImageBack: p.productImageBack || null,
      isArchived: p.isArchived || false,
    }));

    const now = new Date().toISOString();

    return res.status(200).json({
      success: true,
      message: `Synced ${syncData.length} products`,
      syncTimestamp: now,
      totalProducts: syncData.length,
      data: syncData,
    });
  } catch (error) {
    console.error("Error in syncProducts:", error);
    next(error);
  }
};
