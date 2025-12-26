import { Router } from "express";
import * as UserController from "../../controllers/user/User";
import { verifyWebAccess, preventOwnerRemoval } from "../../middleware/verifyEmployeeAccess";

const UserRouter = Router();

UserRouter.get("/users", UserController.getAllUsers);
UserRouter.get("/users/pending", UserController.getPendingUsers);
UserRouter.get("/users/:id", UserController.getUserById);
UserRouter.post("/users", UserController.createUser);
UserRouter.put("/users/:id", UserController.updateEntireUser);
UserRouter.patch("/users/:id", UserController.partialUpdateUser);

// Web Only users can approve/reject employees (but not owners)
UserRouter.patch("/users/:id/approve", verifyWebAccess, preventOwnerRemoval, UserController.approveUser);
UserRouter.patch("/users/:id/reject", verifyWebAccess, preventOwnerRemoval, UserController.rejectUser);
UserRouter.patch("/users/:id/toggle-approval", verifyWebAccess, preventOwnerRemoval, UserController.toggleUserApproval);

// Web Only users cannot delete (especially not owners)
UserRouter.delete("/users/:id", preventOwnerRemoval, UserController.deleteUser);

// User profile management (authenticated user only)
UserRouter.patch("/profile", UserController.updateUserProfile);
UserRouter.post("/profile/avatar", UserController.uploadProfileAvatar);
UserRouter.patch("/archive", UserController.archiveUserAccount);

export default UserRouter;
