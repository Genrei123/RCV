import { Router } from "express";
import * as CompanyOwnerController from "../../controllers/company/CompanyOwner";
import * as CompanyOwnerVerificationController from "../../controllers/company/CompanyOwnerVerification";
import { verifyAdmin, verifySuperAdmin } from "../../middleware/verifyAdmin";
import { verifyUser } from "../../middleware/verifyUser";

const CompanyOwnerRouter = Router();

// Public routes
CompanyOwnerRouter.post('/register', CompanyOwnerController.registerCompanyOwner);
CompanyOwnerRouter.post('/login', CompanyOwnerController.loginCompanyOwner);

// Email verification routes
CompanyOwnerRouter.post('/send-verification-email', CompanyOwnerVerificationController.sendVerificationEmail);
CompanyOwnerRouter.post('/verify-email', CompanyOwnerVerificationController.verifyEmail);

// Employee invite routes
CompanyOwnerRouter.post('/generate-invite-link', CompanyOwnerVerificationController.generateEmployeeInviteLink);
CompanyOwnerRouter.get('/validate-invite/:token', CompanyOwnerVerificationController.validateInviteToken);
CompanyOwnerRouter.post('/mark-invite-used', CompanyOwnerVerificationController.markInviteTokenAsUsed);

// Protected routes - SuperAdmin only
CompanyOwnerRouter.get('/all', verifyUser, verifySuperAdmin, CompanyOwnerController.getAllCompanyOwners);
CompanyOwnerRouter.patch('/:id/approve', verifyUser, verifySuperAdmin, CompanyOwnerController.approveCompanyOwner);
CompanyOwnerRouter.patch('/:id/reject', verifyUser, verifySuperAdmin, CompanyOwnerController.rejectCompanyOwner);

// Protected routes - Any authenticated user
CompanyOwnerRouter.get('/wallet/:walletAddress', verifyUser, CompanyOwnerController.getCompanyOwnerByWallet);
CompanyOwnerRouter.get('/:companyOwnerId/employees', CompanyOwnerController.getEmployeesByCompanyOwner);
CompanyOwnerRouter.patch('/employees/:employeeId/access', CompanyOwnerController.updateEmployeeAccess);
CompanyOwnerRouter.patch('/employees/:employeeId/approve', CompanyOwnerController.approveEmployeeByCompanyOwner);
CompanyOwnerRouter.patch('/employees/:employeeId/reject', CompanyOwnerController.rejectEmployeeByCompanyOwner);

export default CompanyOwnerRouter;
