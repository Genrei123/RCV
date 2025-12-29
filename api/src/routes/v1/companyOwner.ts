import { Router } from "express";
import * as CompanyOwnerController from "../../controllers/company/CompanyOwner";
import * as CompanyOwnerVerificationController from "../../controllers/company/CompanyOwnerVerification";
import { verifyAdmin, verifySuperAdmin } from "../../middleware/verifyAdmin";
import { verifyUser } from "../../middleware/verifyUser";

const CompanyOwnerRouter = Router();

CompanyOwnerRouter.post('/register', CompanyOwnerController.registerCompanyOwner);
CompanyOwnerRouter.post('/login', CompanyOwnerController.loginCompanyOwner);

CompanyOwnerRouter.post('/forgot-password', CompanyOwnerController.forgotPasswordCompanyOwner);
CompanyOwnerRouter.post('/verify-reset-code', CompanyOwnerController.verifyResetCodeCompanyOwner);
CompanyOwnerRouter.post('/reset-password', CompanyOwnerController.resetPasswordCompanyOwner);

CompanyOwnerRouter.post('/send-verification-email', CompanyOwnerVerificationController.sendVerificationEmail);
CompanyOwnerRouter.post('/verify-email', CompanyOwnerVerificationController.verifyEmail);

CompanyOwnerRouter.post('/generate-invite-link', CompanyOwnerVerificationController.generateEmployeeInviteLink);
CompanyOwnerRouter.post('/bulk-invite', CompanyOwnerVerificationController.bulkInviteEmployees);
CompanyOwnerRouter.get('/pending-invites/:companyOwnerId', CompanyOwnerVerificationController.getPendingInvites);
CompanyOwnerRouter.delete('/invite/:inviteId', CompanyOwnerVerificationController.cancelInvite);
CompanyOwnerRouter.post('/invite/:inviteId/resend', CompanyOwnerVerificationController.resendInvite);
CompanyOwnerRouter.get('/validate-invite/:token', CompanyOwnerVerificationController.validateInviteToken);
CompanyOwnerRouter.post('/mark-invite-used', CompanyOwnerVerificationController.markInviteTokenAsUsed);

CompanyOwnerRouter.get('/all', verifyUser, verifySuperAdmin, CompanyOwnerController.getAllCompanyOwners);
CompanyOwnerRouter.patch('/:id/approve', verifyUser, verifySuperAdmin, CompanyOwnerController.approveCompanyOwner);
CompanyOwnerRouter.patch('/:id/reject', verifyUser, verifySuperAdmin, CompanyOwnerController.rejectCompanyOwner);

CompanyOwnerRouter.get('/wallet/:walletAddress', verifyUser, CompanyOwnerController.getCompanyOwnerByWallet);
CompanyOwnerRouter.get('/:companyOwnerId/employees', CompanyOwnerController.getEmployeesByCompanyOwner);
CompanyOwnerRouter.patch('/employees/:employeeId/access', CompanyOwnerController.updateEmployeeAccess);
CompanyOwnerRouter.patch('/employees/:employeeId/approve', CompanyOwnerController.approveEmployeeByCompanyOwner);
CompanyOwnerRouter.patch('/employees/:employeeId/reject', CompanyOwnerController.rejectEmployeeByCompanyOwner);

export default CompanyOwnerRouter;
