import { Router } from "express";
import * as UserController from "../../controllers/user/User";
import { verifyUser } from "../../middleware/verifyUser";
import { verifyAdmin } from "../../middleware/verifyAdmin";
import { verifySuperAdmin } from "../../middleware/verifySuperAdmin";

const UserRouter = Router();

UserRouter.get("/users", UserController.getAllUsers);
UserRouter.get("/users/pending", UserController.getPendingUsers);
UserRouter.get("/users/:id", UserController.getUserById);
UserRouter.post("/users", UserController.createUser);
UserRouter.put("/users/:id", UserController.updateEntireUser);
UserRouter.patch("/users/:id", UserController.partialUpdateUser);
UserRouter.patch("/users/:id/approve", UserController.approveUser);
UserRouter.patch("/users/:id/reject", UserController.rejectUser);
UserRouter.patch("/users/:id/revoke", UserController.revokeUser);
UserRouter.patch("/users/:id/unreject", verifyUser, verifySuperAdmin, UserController.unrejectUser);
UserRouter.patch("/users/:id/unrevoke", verifyUser, verifySuperAdmin, UserController.unrevokeUser);
UserRouter.patch("/users/:id/archive", verifyUser, verifySuperAdmin, UserController.archiveUserById);
UserRouter.patch("/users/:id/unarchive", verifyUser, verifySuperAdmin, UserController.unarchiveUserById);
UserRouter.patch("/users/:id/access", UserController.updateUserAccess);
UserRouter.patch("/users/:id/toggle-approval", UserController.toggleUserApproval);
UserRouter.delete("/users/:id", UserController.deleteUser);

// Admin only - Promote agent to admin
UserRouter.post("/promote-to-admin", verifyUser, verifyAdmin, UserController.promoteAgentToAdmin);

// Super Admin only - Demote admin to agent
UserRouter.post("/demote-to-agent", verifyUser, verifySuperAdmin, UserController.demoteAdminToAgent);

// User profile management (authenticated user only)
UserRouter.patch("/profile", UserController.updateUserProfile);
UserRouter.post("/profile/avatar", UserController.uploadProfileAvatar);
UserRouter.patch("/archive", UserController.archiveUserAccount);

export default UserRouter;
