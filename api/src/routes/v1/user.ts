import { Router } from "express";
import * as UserController from "../../controllers/user/User";

const UserRouter = Router();

UserRouter.get('/users', UserController.getAllUsers);
UserRouter.get('/users/:id', UserController.getUserById);
UserRouter.post('/users', UserController.createUser);
UserRouter.put('/users/:id', UserController.updateEntireUser);
UserRouter.patch('/users/:id', UserController.partialUpdateUser);
UserRouter.delete('/users/:id', UserController.deleteUser);

export default UserRouter;

    