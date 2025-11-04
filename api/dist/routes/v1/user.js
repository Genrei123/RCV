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
const UserController = __importStar(require("../../controllers/user/User"));
const verifyUser_1 = require("../../middleware/verifyUser");
const UserRouter = (0, express_1.Router)();
UserRouter.get("/users", UserController.getAllUsers);
UserRouter.get("/users/pending", UserController.getPendingUsers);
UserRouter.get("/users/:id", UserController.getUserById);
UserRouter.post("/users", UserController.createUser);
UserRouter.put("/users/:id", UserController.updateEntireUser);
UserRouter.patch("/users/:id", UserController.partialUpdateUser);
UserRouter.patch("/users/:id/approve", UserController.approveUser);
UserRouter.patch("/users/:id/reject", UserController.rejectUser);
UserRouter.patch("/users/:id/toggle-approval", UserController.toggleUserApproval);
UserRouter.delete("/users/:id", UserController.deleteUser);
// User profile management (authenticated user only)
UserRouter.patch("/profile", verifyUser_1.verifyUser, UserController.updateUserProfile);
UserRouter.post("/profile/avatar", verifyUser_1.verifyUser, UserController.uploadProfileAvatar);
UserRouter.patch("/archive", verifyUser_1.verifyUser, UserController.archiveUserAccount);
exports.default = UserRouter;
//# sourceMappingURL=user.js.map