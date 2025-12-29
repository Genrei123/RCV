import { Router } from 'express';
import { 
  createAdminInvite,
  verifyInviteToken,
  verifyBadgeNumber,
  completeRegistration,
  getPendingInvites,
  getAllInvites,
  approveAgent,
  rejectAgent,
  resendInvite,
  deleteInvite,
  revokeInvite,
  archiveInvite,
  updateInvite
} from '../../controllers/admin/AdminInvite';
import { verifyUser } from '../../middleware/verifyUser';
import { verifyAdmin } from '../../middleware/verifyAdmin';

const AdminInviteRouter = Router();

// Public routes (for potential agents)
AdminInviteRouter.get('/verify/:token', verifyInviteToken);
AdminInviteRouter.post('/verify-badge', verifyBadgeNumber);
AdminInviteRouter.post('/complete-registration', completeRegistration);

// Admin protected routes
AdminInviteRouter.post('/create', verifyUser, verifyAdmin, createAdminInvite);
AdminInviteRouter.get('/pending', verifyUser, verifyAdmin, getPendingInvites);
AdminInviteRouter.get('/all', verifyUser, verifyAdmin, getAllInvites);
AdminInviteRouter.post('/approve/:inviteId', verifyUser, verifyAdmin, approveAgent);
AdminInviteRouter.post('/reject/:inviteId', verifyUser, verifyAdmin, rejectAgent);
AdminInviteRouter.post('/resend/:inviteId', verifyUser, verifyAdmin, resendInvite);
AdminInviteRouter.post('/revoke/:inviteId', verifyUser, verifyAdmin, revokeInvite);
AdminInviteRouter.post('/archive/:inviteId', verifyUser, verifyAdmin, archiveInvite);
AdminInviteRouter.put('/:inviteId', verifyUser, verifyAdmin, updateInvite);
AdminInviteRouter.delete('/:inviteId', verifyUser, verifyAdmin, deleteInvite);

export default AdminInviteRouter;
