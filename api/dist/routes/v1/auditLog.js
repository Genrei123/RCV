"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuditLogController = __importStar(require("../../controllers/auditLog/AuditLog"));
const verifyUser_1 = require("../../middleware/verifyUser");
const AuditLogRouter = (0, express_1.Router)();
// Get current user's audit logs (requires authentication)
AuditLogRouter.get('/my-logs', verifyUser_1.verifyUser, AuditLogController.getMyAuditLogs);
// Get audit log by ID (requires authentication)
AuditLogRouter.get('/logs/:id', verifyUser_1.verifyUser, AuditLogController.getAuditLogById);
// Get all audit logs (admin only)
AuditLogRouter.get('/logs', verifyUser_1.verifyUser, verifyUser_1.isAdmin, AuditLogController.getAllAuditLogs);
// Get audit logs by type (requires authentication)
AuditLogRouter.get('/logs/type/:actionType', verifyUser_1.verifyUser, AuditLogController.getAuditLogsByType);
// Create audit log (for mobile app - requires authentication)
AuditLogRouter.post('/log', verifyUser_1.verifyUser, AuditLogController.createAuditLog);
exports.default = AuditLogRouter;
//# sourceMappingURL=auditLog.js.map