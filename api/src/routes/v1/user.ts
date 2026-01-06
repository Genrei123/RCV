import { Router } from "express";
import * as UserController from "../../controllers/user/User";

const UserRouter = Router();

UserRouter.get("/users", UserController.getAllUsers);
UserRouter.get("/users/pending", UserController.getPendingUsers);
UserRouter.get("/users/:id", UserController.getUserById);
UserRouter.post("/users", UserController.createUser);
UserRouter.put("/users/:id", UserController.updateEntireUser);
UserRouter.patch("/users/:id", UserController.partialUpdateUser);
UserRouter.patch("/users/:id/approve", UserController.approveUser);
UserRouter.patch("/users/:id/reject", UserController.rejectUser);
UserRouter.patch("/users/:id/access", UserController.updateUserAccess);
UserRouter.patch("/users/:id/toggle-approval", UserController.toggleUserApproval);
UserRouter.delete("/users/:id", UserController.deleteUser);

// User profile management (authenticated user only)
UserRouter.patch("/profile", UserController.updateUserProfile);
UserRouter.post("/profile/avatar", UserController.uploadProfileAvatar);
UserRouter.patch("/archive", UserController.archiveUserAccount);

export default UserRouter;
