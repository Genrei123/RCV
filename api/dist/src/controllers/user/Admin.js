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
exports.deleteUserAdmin = exports.partialUpdateUserAdmin = exports.updateEntireUserAdmin = exports.createUserAdmin = exports.getUserByIdAdmin = exports.getAllUserAdmin = void 0;
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const data_source_1 = require("../../typeorm/data-source");
const user_entity_1 = require("../../typeorm/entities/user.entity");
const enums_1 = require("../../types/enums");
const zod_1 = require("zod");
// Centralized admin role constant (matches enums.ts value "System_Admin")
const ADMIN_ROLE = enums_1.Roles.System_Admin;
// Simple reusable ID schema (the original UserValidation expects an 'id' field, but the entity uses '_id').
const IdSchema = zod_1.z.string().uuid();
// Common select list: avoid selecting computed getter fullName (not a real column).
// TypeORM's FindOptionsSelect typing can be verbose; we use a plain string[] and cast where needed.
const adminSelect = [
    '_id',
    'firstName',
    'lastName',
    'email',
    'role',
    'createdAt',
    'updatedAt'
];
// Utility to ensure a fetched user is an admin.
const ensureIsAdmin = (user) => user && user.role === ADMIN_ROLE;
// Helper to shape response user (adds computed fullName)
const serializeAdmin = (u) => ({
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
});
const getAllUserAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admins = yield data_source_1.UserRepo.find({ where: { role: ADMIN_ROLE }, select: adminSelect });
        return res.status(200).json({ success: true, users: admins.map(serializeAdmin) });
    }
    catch (error) {
        next(error);
    }
});
exports.getAllUserAdmin = getAllUserAdmin;
const getUserByIdAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) {
        return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }
    try {
        const user = yield data_source_1.UserRepo.findOne({ where: { _id: idResult.data }, select: adminSelect });
        if (!user || !ensureIsAdmin(user)) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        return res.status(200).json({ success: true, user: serializeAdmin(user) });
    }
    catch (error) {
        next(error);
    }
});
exports.getUserByIdAdmin = getUserByIdAdmin;
const createUserAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate with original schema, but ignore any incoming role to prevent privilege spoofing.
    const parsed = user_entity_1.UserValidation.safeParse(req.body);
    if (!parsed.success) {
        return next(CustomError_1.default.security(400, 'Invalid user data', parsed.error));
    }
    try {
        const newAdmin = data_source_1.UserRepo.create(Object.assign(Object.assign({}, parsed.data), { role: ADMIN_ROLE }));
        yield data_source_1.UserRepo.save(newAdmin);
        return res.status(201).json({ success: true, user: serializeAdmin(newAdmin) });
    }
    catch (error) {
        next(error);
    }
});
exports.createUserAdmin = createUserAdmin;
const updateEntireUserAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success)
        return next(CustomError_1.default.security(400, 'Invalid User ID'));
    const bodyResult = user_entity_1.UserValidation.safeParse(req.body);
    if (!bodyResult.success)
        return next(CustomError_1.default.security(400, 'Invalid user data', bodyResult.error));
    try {
        const existing = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!existing || !ensureIsAdmin(existing)) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        // Force role to remain admin regardless of payload
        data_source_1.UserRepo.merge(existing, Object.assign(Object.assign({}, bodyResult.data), { role: ADMIN_ROLE }));
        const saved = yield data_source_1.UserRepo.save(existing);
        return res.status(200).json({ success: true, user: serializeAdmin(saved) });
    }
    catch (error) {
        next(error);
    }
});
exports.updateEntireUserAdmin = updateEntireUserAdmin;
const partialUpdateUserAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success)
        return next(CustomError_1.default.security(400, 'Invalid User ID'));
    const bodyResult = user_entity_1.UserValidation.partial().safeParse(req.body);
    if (!bodyResult.success)
        return next(CustomError_1.default.security(400, 'Invalid user data', bodyResult.error));
    try {
        const existing = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!existing || !ensureIsAdmin(existing)) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        data_source_1.UserRepo.merge(existing, Object.assign(Object.assign({}, bodyResult.data), { role: ADMIN_ROLE }));
        const saved = yield data_source_1.UserRepo.save(existing);
        return res.status(200).json({ success: true, user: serializeAdmin(saved) });
    }
    catch (error) {
        next(error);
    }
});
exports.partialUpdateUserAdmin = partialUpdateUserAdmin;
const deleteUserAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success)
        return res.status(400).json({ success: false, message: 'Invalid User ID' });
    try {
        const existing = yield data_source_1.UserRepo.findOneBy({ _id: idResult.data });
        if (!existing || !ensureIsAdmin(existing)) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        yield data_source_1.UserRepo.remove(existing);
        return res.status(200).json({ success: true, message: 'Admin user deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteUserAdmin = deleteUserAdmin;
//# sourceMappingURL=Admin.js.map