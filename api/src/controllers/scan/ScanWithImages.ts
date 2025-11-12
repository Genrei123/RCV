import { Request, Response, NextFunction } from "express";
import { DB as AppDataSource } from "../../typeorm/data-source";
import { ScanHistory } from "../../typeorm/entities/scanHistory";
import CustomError from "../../utils/CustomError";
import { ProcessText } from "../../services/aiProcess";
import { AuditLogService } from "../../services/auditLogService";
import { FirebaseStorageValidator } from "../../utils/FirebaseStorageValidator";

const ScanHistoryRepo = AppDataSource.getRepository(ScanHistory);

/**
 * Scan product with OCR and save images to Firebase Storage
 * 
 * This endpoint processes OCR text and stores Firebase Storage URLs for the images.
 * Images are uploaded client-side to Firebase Storage before calling this endpoint.
 * 
 * Security:
 * - Validates URLs are from Firebase Storage
 * - Validates URLs are from our bucket (rcv-flutter.firebasestorage.app)
 * - Validates URLs point to scans/ folder
 * - Validates URLs point to image files
 * - Requires at least one scan image (front or back)
 * 
 * Request body:
 * {
 *   "ocrText": "Product Name\nLTO-12345\n...",
 *   "frontImageUrl": "https://firebasestorage.googleapis.com/.../scans/{scanId}/front.jpg",
 *   "backImageUrl": "https://firebasestorage.googleapis.com/.../scans/{scanId}/back.jpg"
 * }
 * 
 * @route POST /api/v1/mobile/scan
 */
export const scanProductWithImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { ocrText, frontImageUrl, backImageUrl } = req.body;

    // Type validation
    if (!ocrText || typeof ocrText !== "string" || ocrText.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "OCR text is required and must be a string" });
    }

    if (frontImageUrl !== undefined && typeof frontImageUrl !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Front image URL must be a string" });
    }

    if (backImageUrl !== undefined && typeof backImageUrl !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Back image URL must be a string" });
    }

    // Security validation - validate scan image URLs
    const urlValidation = FirebaseStorageValidator.validateScanUrls(
      frontImageUrl,
      backImageUrl
    );
    
    if (!urlValidation.valid) {
      return res
        .status(400)
        .json({ 
          success: false, 
          message: urlValidation.error || "Invalid scan image URLs"
        });
    }

    // Process OCR text with AI
    let extractedInfo;
    try {
      extractedInfo = await ProcessText(ocrText);
    } catch (aiError: any) {
      console.error("AI Processing failed:", aiError);
      
      // Still save the scan history even if AI fails
      const scanHistory = new ScanHistory();
      scanHistory.userId = userId;
      scanHistory.ocrText = ocrText.substring(0, 5000); // Truncate if too long
      scanHistory.frontImageUrl = frontImageUrl;
      scanHistory.backImageUrl = backImageUrl;
      scanHistory.extractedInfo = { error: "AI processing failed" };
      await ScanHistoryRepo.save(scanHistory);

      return res.status(500).json({
        success: false,
        message: "Failed to process OCR text",
        error: aiError.message,
      });
    }

    // Create scan history record with image URLs
    const scanHistory = new ScanHistory();
    scanHistory.userId = userId;
    scanHistory.ocrText = ocrText.substring(0, 5000); // Truncate if too long
    scanHistory.frontImageUrl = frontImageUrl;
    scanHistory.backImageUrl = backImageUrl;
    scanHistory.extractedInfo = extractedInfo;
    
    const saved = await ScanHistoryRepo.save(scanHistory);

    // Log the scan
    await AuditLogService.createLog({
      action: "Product scanned with images",
      actionType: "SCAN_PRODUCT",
      userId,
      platform: "MOBILE",
      metadata: {
        scanId: saved._id,
        hasImages: !!(frontImageUrl && backImageUrl),
        extractedFields: Object.keys(extractedInfo || {}),
        frontImagePath: frontImageUrl ? FirebaseStorageValidator.extractFilePath(frontImageUrl) : null,
        backImagePath: backImageUrl ? FirebaseStorageValidator.extractFilePath(backImageUrl) : null,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      extractedInfo,
      scanId: saved._id,
      message: "Product scanned successfully",
    });
  } catch (error) {
    console.error("Error scanning product:", error);
    return next(CustomError.security(500, "Failed to scan product"));
  }
};

/**
 * Get scan history with image URLs
 * 
 * @route GET /api/v1/mobile/scan/history
 */
export const getScanHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const scans = await ScanHistoryRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 50, // Limit to last 50 scans
    });

    return res.status(200).json({
      success: true,
      scans: scans.map((scan: ScanHistory) => ({
        id: scan._id,
        ocrText: scan.ocrText,
        frontImageUrl: scan.frontImageUrl,
        backImageUrl: scan.backImageUrl,
        extractedInfo: scan.extractedInfo,
        createdAt: scan.createdAt,
      })),
      count: scans.length,
    });
  } catch (error) {
    console.error("Error fetching scan history:", error);
    return next(CustomError.security(500, "Failed to fetch scan history"));
  }
};

/**
 * Get specific scan by ID
 * 
 * @route GET /api/v1/mobile/scan/:id
 */
export const getScanById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const scanId = req.params.id;
    const scan = await ScanHistoryRepo.findOne({
      where: { _id: scanId, userId },
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: "Scan not found",
      });
    }

    return res.status(200).json({
      success: true,
      scan: {
        id: scan._id,
        ocrText: scan.ocrText,
        frontImageUrl: scan.frontImageUrl,
        backImageUrl: scan.backImageUrl,
        extractedInfo: scan.extractedInfo,
        createdAt: scan.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching scan:", error);
    return next(CustomError.security(500, "Failed to fetch scan"));
  }
};
