import { Router } from "express";
import * as AuditLogController from "../../controllers/auditLog/AuditLog";
import { verifyUser, isAdmin } from "../../middleware/verifyUser";

const AuditLogRouter = Router();

// Get current user's audit logs (requires authentication)
AuditLogRouter.get('/my-logs', verifyUser, AuditLogController.getMyAuditLogs);

// Get audit log by ID (requires authentication)
AuditLogRouter.get('/logs/:id', verifyUser, AuditLogController.getAuditLogById);

// Get all audit logs (admin only)
AuditLogRouter.get('/logs', verifyUser, isAdmin, AuditLogController.getAllAuditLogs);

// Get audit logs by type (requires authentication)
AuditLogRouter.get('/logs/type/:actionType', verifyUser, AuditLogController.getAuditLogsByType);

// Create audit log (for mobile app - requires authentication)
AuditLogRouter.post('/log', verifyUser, AuditLogController.createAuditLog);

export default AuditLogRouter;
