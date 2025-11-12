import { Request } from "express";
import { AuditLogRepo } from "../typeorm/data-source";
import { AuditLog } from "../typeorm/entities/auditLog.entity";

interface CreateAuditLogParams {
  action: string;
  actionType: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'APPROVE_USER'
    | 'REJECT_USER'
    | 'REVOKE_ACCESS'
    | 'SCAN_PRODUCT'
    | 'CREATE_USER'
    | 'UPDATE_USER'
    | 'DELETE_USER'
    | 'CREATE_PRODUCT'
    | 'UPDATE_PRODUCT'
    | 'DELETE_PRODUCT'
    | 'UPDATE_PROFILE'
    | 'CHANGE_PASSWORD'
    | 'ARCHIVE_ACCOUNT'
    | 'LOCATION_UPDATE'
    | 'APP_CLOSED'
    | 'COMPLIANCE_REPORT';
  userId?: string;
  targetUserId?: string;
  targetProductId?: string;
  platform?: 'WEB' | 'MOBILE';
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  metadata?: Record<string, any>;
  req?: Request;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  /**
   * Create an audit log entry
   */
  static async createLog(params: CreateAuditLogParams): Promise<AuditLog> {
    const {
      action,
      actionType,
      userId,
      targetUserId,
      targetProductId,
      platform = 'WEB',
      location,
      metadata,
      req,
    } = params;

    const auditLog = AuditLogRepo.create({
      action,
      actionType,
      userId: userId || null,
      targetUserId: targetUserId || null,
      targetProductId: targetProductId || null,
      ipAddress: req ? this.getIpAddress(req) : null,
      userAgent: req?.headers['user-agent'] || null,
      platform,
      location: location || null,
      metadata: metadata || null,
    });

    return await AuditLogRepo.save(auditLog);
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserLogs(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [logs, total] = await AuditLogRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['targetUser'],
    });

    return {
      data: logs,
      pagination: {
        current_page: page,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
        total_items: total,
      },
    };
  }

  /**
   * Get a single audit log by ID (with access control)
   */
  static async getLogById(logId: string, userId: string) {
    const log = await AuditLogRepo.findOne({
      where: { _id: logId },
      relations: ['user', 'targetUser'],
    });

    // Return null if log doesn't exist
    if (!log) {
      return null;
    }

    // Users can only view their own logs unless they're admin
    // For now, just check if the log belongs to the user
    if (log.userId !== userId) {
      return null; // Access denied
    }

    return log;
  }

  /**
   * Get all audit logs (admin only)
   */
  static async getAllLogs(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await AuditLogRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['user', 'targetUser'],
    });

    return {
      data: logs,
      pagination: {
        current_page: page,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
        total_items: total,
      },
    };
  }

  /**
   * Get logs by action type
   */
  static async getLogsByActionType(
    actionType: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [logs, total] = await AuditLogRepo.findAndCount({
      where: { actionType },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['user', 'targetUser'],
    });

    return {
      data: logs,
      pagination: {
        current_page: page,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
        total_items: total,
      },
    };
  }

  /**
   * Extract IP address from request
   */
  private static getIpAddress(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'Unknown'
    );
  }

  /**
   * Helper method to log user login
   */
  static async logLogin(userId: string, req: Request, platform: 'WEB' | 'MOBILE' = 'WEB') {
    return this.createLog({
      action: `User logged in from ${platform}`,
      actionType: 'LOGIN',
      userId,
      platform,
      req,
    });
  }

  /**
   * Helper method to log user logout
   */
  static async logLogout(userId: string, req: Request, platform: 'WEB' | 'MOBILE' = 'WEB') {
    return this.createLog({
      action: `User logged out from ${platform}`,
      actionType: 'LOGOUT',
      userId,
      platform,
      req,
    });
  }

  /**
   * Helper method to log user approval
   */
  static async logApproveUser(userId: string, targetUserId: string, req: Request) {
    return this.createLog({
      action: `User approved another user`,
      actionType: 'APPROVE_USER',
      userId,
      targetUserId,
      platform: 'WEB',
      req,
    });
  }

  /**
   * Helper method to log user rejection
   */
  static async logRejectUser(userId: string, targetUserId: string, req: Request) {
    return this.createLog({
      action: `User rejected another user`,
      actionType: 'REJECT_USER',
      userId,
      targetUserId,
      platform: 'WEB',
      req,
    });
  }

  /**
   * Helper method to log access revocation
   */
  static async logRevokeAccess(userId: string, targetUserId: string, req: Request) {
    return this.createLog({
      action: `User revoked access for another user`,
      actionType: 'REVOKE_ACCESS',
      userId,
      targetUserId,
      platform: 'WEB',
      req,
    });
  }

  /**
   * Helper method to log product scan (mobile)
   */
  static async logProductScan(
    userId: string,
    productId: string,
    location: { latitude: number; longitude: number; address?: string },
    req: Request
  ) {
    return this.createLog({
      action: `Agent scanned product`,
      actionType: 'SCAN_PRODUCT',
      userId,
      targetProductId: productId,
      platform: 'MOBILE',
      location,
      req,
    });
  }

  /**
   * Helper method to log location update (mobile)
   */
  static async logLocationUpdate(
    userId: string,
    location: { latitude: number; longitude: number; address?: string },
    req: Request
  ) {
    return this.createLog({
      action: `Agent location updated`,
      actionType: 'LOCATION_UPDATE',
      userId,
      platform: 'MOBILE',
      location,
      req,
    });
  }

  /**
   * Helper method to log app closed (mobile)
   */
  static async logAppClosed(
    userId: string,
    location: { latitude: number; longitude: number; address?: string },
    req: Request
  ) {
    return this.createLog({
      action: `Agent closed the app`,
      actionType: 'APP_CLOSED',
      userId,
      platform: 'MOBILE',
      location,
      metadata: {
        lastKnownLocation: location,
        timestamp: new Date().toISOString(),
      },
      req,
    });
  }
}
