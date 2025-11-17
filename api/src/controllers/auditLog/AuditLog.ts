import type { NextFunction, Request, Response } from "express";
import { AuditLogService } from "../../services/auditLogService";
import CustomError from "../../utils/CustomError";

/**
 * Get audit logs for the current user
 */
export const getMyAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await AuditLogService.getUserLogs(userId, page, limit);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

/**
 * Get all audit logs (admin only)
 */
export const getAllAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await AuditLogService.getAllLogs(page, limit);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

/**
 * Get audit logs by action type
 */
export const getAuditLogsByType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { actionType } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await AuditLogService.getLogsByActionType(
      actionType,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

/**
 * Create audit log (for mobile app)
 */
export const createAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      action,
      actionType,
      targetUserId,
      targetProductId,
      platform,
      location,
      metadata,
    } = req.body;

    if (!action || !actionType) {
      return res.status(400).json({
        success: false,
        message: "Action and actionType are required",
      });
    }

    const auditLog = await AuditLogService.createLog({
      action,
      actionType,
      userId,
      targetUserId,
      targetProductId,
      platform: platform || 'MOBILE',
      location,
      metadata,
      req,
    });

    return res.status(201).json({
      success: true,
      data: auditLog,
      message: "Audit log created successfully",
    });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

/**
 * Get audit log details by ID
 */
export const getAuditLogById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    
    const auditLog = await AuditLogService.getLogById(id, userId);
    
    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};
