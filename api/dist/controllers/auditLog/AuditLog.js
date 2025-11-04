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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogById = exports.createAuditLog = exports.getAuditLogsByType = exports.getAllAuditLogs = exports.getMyAuditLogs = void 0;
const auditLogService_1 = require("../../services/auditLogService");
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
/**
 * Get audit logs for the current user
 */
const getMyAuditLogs = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = yield auditLogService_1.AuditLogService.getUserLogs(userId, page, limit);
        return res.status(200).json(Object.assign({ success: true }, result));
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getMyAuditLogs = getMyAuditLogs;
/**
 * Get all audit logs (admin only)
 */
const getAllAuditLogs = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = yield auditLogService_1.AuditLogService.getAllLogs(page, limit);
        return res.status(200).json(Object.assign({ success: true }, result));
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getAllAuditLogs = getAllAuditLogs;
/**
 * Get audit logs by action type
 */
const getAuditLogsByType = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { actionType } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = yield auditLogService_1.AuditLogService.getLogsByActionType(actionType, page, limit);
        return res.status(200).json(Object.assign({ success: true }, result));
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getAuditLogsByType = getAuditLogsByType;
/**
 * Create audit log (for mobile app)
 */
const createAuditLog = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { action, actionType, targetUserId, targetProductId, platform, location, metadata, } = req.body;
        if (!action || !actionType) {
            return res.status(400).json({
                success: false,
                message: "Action and actionType are required",
            });
        }
        const auditLog = yield auditLogService_1.AuditLogService.createLog({
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
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.createAuditLog = createAuditLog;
/**
 * Get audit log details by ID
 */
const getAuditLogById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { id } = req.params;
        const auditLog = yield auditLogService_1.AuditLogService.getLogById(id, userId);
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
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getAuditLogById = getAuditLogById;
//# sourceMappingURL=AuditLog.js.map