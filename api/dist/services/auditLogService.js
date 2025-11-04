"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const data_source_1 = require("../typeorm/data-source");
class AuditLogService {
    /**
     * Create an audit log entry
     */
    static createLog(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { action, actionType, userId, targetUserId, targetProductId, platform = 'WEB', location, metadata, req, } = params;
            const auditLog = data_source_1.AuditLogRepo.create({
                action,
                actionType,
                userId: userId || null,
                targetUserId: targetUserId || null,
                targetProductId: targetProductId || null,
                ipAddress: req ? this.getIpAddress(req) : null,
                userAgent: (req === null || req === void 0 ? void 0 : req.headers['user-agent']) || null,
                platform,
                location: location || null,
                metadata: metadata || null,
            });
            return yield data_source_1.AuditLogRepo.save(auditLog);
        });
    }
    /**
     * Get audit logs for a specific user
     */
    static getUserLogs(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            const [logs, total] = yield data_source_1.AuditLogRepo.findAndCount({
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
        });
    }
    /**
     * Get a single audit log by ID (with access control)
     */
    static getLogById(logId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const log = yield data_source_1.AuditLogRepo.findOne({
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
        });
    }
    /**
     * Get all audit logs (admin only)
     */
    static getAllLogs() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            const [logs, total] = yield data_source_1.AuditLogRepo.findAndCount({
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
        });
    }
    /**
     * Get logs by action type
     */
    static getLogsByActionType(actionType_1) {
        return __awaiter(this, arguments, void 0, function* (actionType, page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            const [logs, total] = yield data_source_1.AuditLogRepo.findAndCount({
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
        });
    }
    /**
     * Extract IP address from request
     */
    static getIpAddress(req) {
        var _a;
        return (((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) ||
            req.headers['x-real-ip'] ||
            req.socket.remoteAddress ||
            'Unknown');
    }
    /**
     * Helper method to log user login
     */
    static logLogin(userId_1, req_1) {
        return __awaiter(this, arguments, void 0, function* (userId, req, platform = 'WEB') {
            return this.createLog({
                action: `User logged in from ${platform}`,
                actionType: 'LOGIN',
                userId,
                platform,
                req,
            });
        });
    }
    /**
     * Helper method to log user logout
     */
    static logLogout(userId_1, req_1) {
        return __awaiter(this, arguments, void 0, function* (userId, req, platform = 'WEB') {
            return this.createLog({
                action: `User logged out from ${platform}`,
                actionType: 'LOGOUT',
                userId,
                platform,
                req,
            });
        });
    }
    /**
     * Helper method to log user approval
     */
    static logApproveUser(userId, targetUserId, req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createLog({
                action: `User approved another user`,
                actionType: 'APPROVE_USER',
                userId,
                targetUserId,
                platform: 'WEB',
                req,
            });
        });
    }
    /**
     * Helper method to log user rejection
     */
    static logRejectUser(userId, targetUserId, req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createLog({
                action: `User rejected another user`,
                actionType: 'REJECT_USER',
                userId,
                targetUserId,
                platform: 'WEB',
                req,
            });
        });
    }
    /**
     * Helper method to log access revocation
     */
    static logRevokeAccess(userId, targetUserId, req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createLog({
                action: `User revoked access for another user`,
                actionType: 'REVOKE_ACCESS',
                userId,
                targetUserId,
                platform: 'WEB',
                req,
            });
        });
    }
    /**
     * Helper method to log product scan (mobile)
     */
    static logProductScan(userId, productId, location, req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createLog({
                action: `Agent scanned product`,
                actionType: 'SCAN_PRODUCT',
                userId,
                targetProductId: productId,
                platform: 'MOBILE',
                location,
                req,
            });
        });
    }
    /**
     * Helper method to log location update (mobile)
     */
    static logLocationUpdate(userId, location, req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createLog({
                action: `Agent location updated`,
                actionType: 'LOCATION_UPDATE',
                userId,
                platform: 'MOBILE',
                location,
                req,
            });
        });
    }
    /**
     * Helper method to log app closed (mobile)
     */
    static logAppClosed(userId, location, req) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}
exports.AuditLogService = AuditLogService;
//# sourceMappingURL=auditLogService.js.map