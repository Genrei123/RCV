import { Router } from "express";
import * as AuditLogController from "../../controllers/auditLog/AuditLog";

const AuditLogRouter = Router();

// Get current user's audit logs (requires authentication)
AuditLogRouter.get('/my-logs', AuditLogController.getMyAuditLogs);

// Get audit log by ID (requires authentication)
AuditLogRouter.get('/logs/:id', AuditLogController.getAuditLogById);

// Get all audit logs (admin only)
AuditLogRouter.get('/logs', AuditLogController.getAllAuditLogs);

// Get audit logs by type (requires authentication)
AuditLogRouter.get('/logs/type/:actionType', AuditLogController.getAuditLogsByType);

// Create audit log (for mobile app - requires authentication)
AuditLogRouter.post('/log', AuditLogController.createAuditLog);

export default AuditLogRouter;
