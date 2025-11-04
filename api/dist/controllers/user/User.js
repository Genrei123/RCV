"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveUserAccount = exports.uploadProfileAvatar = exports.updateUserProfile = exports.toggleUserApproval = exports.rejectUser = exports.approveUser = exports.getPendingUsers = exports.deleteUser = exports.partialUpdateUser = exports.updateEntireUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const data_source_1 = require("../../typeorm/data-source");
const user_entity_1 = require("../../typeorm/entities/user.entity");
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const zod_1 = require("zod");
const pagination_1 = require("../../utils/pagination");
const auditLogService_1 = require("../../services/auditLogService");
const IdSchema = zod_1.z.string().uuid();
//para sa updateEntireUser
const Required_Fields = [
    "firstName",
    "lastName",
    "middleName",
    "fullName",
    "dateOfBirth",
    "phoneNumber",
    "password",
    "stationedAt",
    "role",
];
// ididisplay yung selected values pag nag get all users
const getAllUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, limit, skip } = (0, pagination_1.parsePageParams)(req, 10);
        const [users, total] = yield data_source_1.UserRepo.findAndCount({
            select: [
                "_id",
                "firstName",
                "middleName",
                "lastName",
                "extName",
                "fullName",
                "email",
                "phoneNumber",
                "dateOfBirth",
                "location",
                "badgeId",
                "approved",
                "status",
                "role",
                "createdAt",
                "updatedAt",
            ],
            skip,
            take: limit,
            order: { createdAt: "DESC" },
        });
        const meta = (0, pagination_1.buildPaginationMeta)(page, limit, total);
        const links = (0, pagination_1.buildLinks)(req, page, limit, meta.total_pages);
        return res
            .status(200)
            .json({ success: true, data: users, pagination: meta, links });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getAllUsers = getAllUsers;
function hasAllRequiredPutFields(body) {
    return Required_Fields.every((f) => Object.prototype.hasOwnProperty.call(body, f));
}
const getUserById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    try {
        const user = yield data_source_1.UserRepo.findOne({
            where: { _id: req.params.id },
            select: [
                "_id",
                "email",
                "role",
                "approved",
                "status",
                "createdAt",
                "updatedAt",
            ],
        });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, user });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getUserById = getUserById;
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = user_entity_1.UserValidation.safeParse(req.body);
    if (!userData.success) {
        return CustomError_1.default.security(400, "Invalid user data", userData.error);
    }
    try {
        const newUser = data_source_1.UserRepo.create(userData.data);
        yield data_source_1.UserRepo.save(newUser);
        return res.status(201).json({
            success: true,
            user: newUser,
            message: "User created successfully",
        });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.createUser = createUser;
const updateEntireUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    if (!hasAllRequiredPutFields(req.body)) {
        return res.status(400).json({
            success: false,
            message: "Full user payload required for PUT. Missing fields detected. Use PATCH for partial updates.",
        });
    }
    const parsed = user_entity_1.UserValidation.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid user data",
            errors: parsed.error.flatten ? parsed.error.flatten() : parsed.error,
        });
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        data_source_1.UserRepo.merge(user, parsed.data);
        const saved = yield data_source_1.UserRepo.save(user);
        return res.status(200).json({
            success: true,
            user: saved,
            message: "User updated successfully",
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.updateEntireUser = updateEntireUser;
const partialUpdateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            success: false,
            message: "No fields supplied for partial update",
        });
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        const partialSchema = user_entity_1.UserValidation.partial
            ? user_entity_1.UserValidation.partial()
            : null;
        if (partialSchema) {
            const subsetParse = partialSchema.safeParse(req.body);
            if (!subsetParse.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user data",
                    errors: subsetParse.error.flatten
                        ? subsetParse.error.flatten()
                        : subsetParse.error,
                });
            }
            data_source_1.UserRepo.merge(user, subsetParse.data);
        }
        else {
            data_source_1.UserRepo.merge(user, req.body);
            const fullParse = user_entity_1.UserValidation.safeParse(user);
            if (!fullParse.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user data",
                    errors: fullParse.error.flatten
                        ? fullParse.error.flatten()
                        : fullParse.error,
                });
            }
        }
        const saved = yield data_source_1.UserRepo.save(user);
        return res.status(200).json({
            success: true,
            user: saved,
            message: "User updated successfully (partial)",
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.partialUpdateUser = partialUpdateUser;
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        yield data_source_1.UserRepo.remove(user);
        return res
            .status(200)
            .json({ success: true, message: "User deleted successfully" });
    }
    catch (err) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.deleteUser = deleteUser;
// Get all pending (unapproved) users
const getPendingUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, limit, skip } = (0, pagination_1.parsePageParams)(req, 10);
        const [users, total] = yield data_source_1.UserRepo.findAndCount({
            where: { approved: false },
            select: [
                "_id",
                "firstName",
                "lastName",
                "email",
                "role",
                "status",
                "approved",
                "createdAt",
            ],
            skip,
            take: limit,
            order: { createdAt: "DESC" },
        });
        const meta = (0, pagination_1.buildPaginationMeta)(page, limit, total);
        const links = (0, pagination_1.buildLinks)(req, page, limit, meta.total_pages);
        return res
            .status(200)
            .json({ success: true, data: users, pagination: meta, links });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, "Server Error");
    }
});
exports.getPendingUsers = getPendingUsers;
// Approve a user
const approveUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        user.approved = true;
        // Optionally set status to Active when approved
        if (user.status === "Pending") {
            user.status = "Active";
        }
        const saved = yield data_source_1.UserRepo.save(user);
        // Log the approval action
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (currentUserId) {
            yield auditLogService_1.AuditLogService.logApproveUser(currentUserId, user._id, req);
        }
        return res.status(200).json({
            success: true,
            user: saved,
            message: "User approved successfully",
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.approveUser = approveUser;
// Reject/unapprove a user
const rejectUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        user.approved = false;
        // Optionally set status back to Pending when rejected
        if (user.status === "Active") {
            user.status = "Pending";
        }
        const saved = yield data_source_1.UserRepo.save(user);
        // Log the rejection action
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (currentUserId) {
            yield auditLogService_1.AuditLogService.logRejectUser(currentUserId, user._id, req);
        }
        return res.status(200).json({
            success: true,
            user: saved,
            message: "User approval revoked successfully",
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.rejectUser = rejectUser;
// Toggle user approval status
const toggleUserApproval = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: "Invalid User ID" });
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        user.approved = !user.approved;
        // Update status based on approval
        if (user.approved && user.status === "Pending") {
            user.status = "Active";
        }
        else if (!user.approved && user.status === "Active") {
            user.status = "Pending";
        }
        const saved = yield data_source_1.UserRepo.save(user);
        // Log the toggle action
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (currentUserId) {
            if (user.approved) {
                yield auditLogService_1.AuditLogService.logApproveUser(currentUserId, user._id, req);
            }
            else {
                yield auditLogService_1.AuditLogService.logRevokeAccess(currentUserId, user._id, req);
            }
        }
        return res.status(200).json({
            success: true,
            user: saved,
            message: `User ${user.approved ? "approved" : "unapproved"} successfully`,
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.toggleUserApproval = toggleUserApproval;
// Update user's own profile
const updateUserProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const user = yield data_source_1.UserRepo.findOneBy({ _id: userId });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        // Only allow updating certain fields
        const allowedFields = [
            "firstName",
            "middleName",
            "lastName",
            "dateOfBirth",
            "phoneNumber",
            "location",
            "badgeId",
            "email",
            "avatarUrl",
        ];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        // Update fullName if name fields changed
        if (updates.firstName || updates.middleName || updates.lastName) {
            const firstName = updates.firstName || user.firstName;
            const middleName = updates.middleName || user.middleName || "";
            const lastName = updates.lastName || user.lastName;
            updates.fullName = `${firstName} ${middleName} ${lastName}`
                .replace(/\s+/g, " ")
                .trim();
        }
        Object.assign(user, updates);
        const saved = yield data_source_1.UserRepo.save(user);
        // Log profile update
        yield auditLogService_1.AuditLogService.createLog({
            action: "User updated their profile",
            actionType: "UPDATE_PROFILE",
            userId,
            platform: "WEB",
            metadata: { updatedFields: Object.keys(updates) },
            req,
        });
        return res.status(200).json({
            success: true,
            data: saved,
            message: "Profile updated successfully",
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.updateUserProfile = updateUserProfile;
// Upload and set user's profile avatar (expects base64 image string in body.image)
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadProfileAvatar = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { image } = req.body;
        if (!image || typeof image !== "string") {
            return res
                .status(400)
                .json({ success: false, message: "Missing image data" });
        }
        // Strip data URI prefix if present
        const base64 = image.replace(/^data:image\/[^;]+;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        // Ensure uploads/avatars directory exists (at project root)
        const uploadsRoot = path_1.default.resolve(process.cwd(), "uploads");
        const avatarsDir = path_1.default.join(uploadsRoot, "avatars");
        fs_1.default.mkdirSync(avatarsDir, { recursive: true });
        // Save as PNG named by user id
        const filePath = path_1.default.join(avatarsDir, `${userId}.png`);
        fs_1.default.writeFileSync(filePath, Buffer.from(base64, "base64"));
        // Compute public URL (served by static /uploads)
        const publicUrl = `/uploads/avatars/${userId}.png`;
        // Update user record
        const user = yield data_source_1.UserRepo.findOneBy({ _id: userId });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        user.avatarUrl = publicUrl;
        const saved = yield data_source_1.UserRepo.save(user);
        // Log profile update
        yield auditLogService_1.AuditLogService.createLog({
            action: "User updated their avatar",
            actionType: "UPDATE_PROFILE",
            userId,
            platform: "WEB",
            metadata: { avatarUrl: publicUrl },
            req,
        });
        return res
            .status(200)
            .json({ success: true, data: saved, avatarUrl: publicUrl });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.uploadProfileAvatar = uploadProfileAvatar;
// Archive user's own account
const archiveUserAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const user = yield data_source_1.UserRepo.findOneBy({ _id: userId });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        // Set account to archived status
        user.status = "Archived";
        user.approved = false;
        const saved = yield data_source_1.UserRepo.save(user);
        // Log account archive
        yield auditLogService_1.AuditLogService.createLog({
            action: "User archived their account",
            actionType: "ARCHIVE_ACCOUNT",
            userId,
            platform: "WEB",
            req,
        });
        return res.status(200).json({
            success: true,
            data: saved,
            message: "Account archived successfully",
        });
    }
    catch (error) {
        return next(CustomError_1.default.security(500, "Server Error"));
    }
});
exports.archiveUserAccount = archiveUserAccount;
//# sourceMappingURL=User.js.map