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
exports.deleteUser = exports.partialUpdateUser = exports.updateEntireUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const data_source_1 = require("../../typeorm/data-source");
const user_entity_1 = require("../../typeorm/entities/user.entity");
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const getAllUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield data_source_1.UserRepo.find({
            select: ['_id', 'firstName', 'lastName', 'fullName', 'email', 'role', 'createdAt', 'updatedAt']
        });
        return res.status(200).json({ success: true, users });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, 'Server Error');
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user_entity_1.UserValidation.parse({ id: req.params.id })) {
        return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }
    try {
        const user = yield data_source_1.UserRepo.findOne({
            where: { _id: req.params.id },
            select: ['_id', 'fullName', 'email', 'role', 'createdAt', 'updatedAt']
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, user });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, 'Server Error');
    }
});
exports.getUserById = getUserById;
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = user_entity_1.UserValidation.safeParse(req.body);
    if (!userData.success) {
        return CustomError_1.default.security(400, 'Invalid user data', userData.error);
    }
    try {
        const newUser = data_source_1.UserRepo.create(userData.data);
        yield data_source_1.UserRepo.save(newUser);
        return res.status(201).json({ success: true, user: newUser });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, 'Server Error');
    }
});
exports.createUser = createUser;
const updateEntireUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user_entity_1.UserValidation.parse({ id: req.params.id })) {
        return CustomError_1.default.security(400, 'Invalid User ID');
    }
    const userData = user_entity_1.UserValidation.safeParse(req.body);
    if (!userData.success) {
        return CustomError_1.default.security(400, 'Invalid user data', userData.error);
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        data_source_1.UserRepo.merge(user, userData.data);
        const result = yield data_source_1.UserRepo.save(user);
        return res.status(200).json({ success: true, user: result });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, 'Server Error');
    }
});
exports.updateEntireUser = updateEntireUser;
const partialUpdateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user_entity_1.UserValidation.parse({ id: req.params.id })) {
        return CustomError_1.default.security(400, 'Invalid User ID');
    }
    const userData = user_entity_1.UserValidation.partial().safeParse(req.body);
    if (!userData.success) {
        return CustomError_1.default.security(400, 'Invalid user data', userData.error);
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        data_source_1.UserRepo.merge(user, userData.data);
        const result = yield data_source_1.UserRepo.save(user);
        return res.status(200).json({ success: true, user: result });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, 'Server Error');
    }
});
exports.partialUpdateUser = partialUpdateUser;
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user_entity_1.UserValidation.parse({ id: req.params.id })) {
        return CustomError_1.default.security(400, 'Invalid User ID');
    }
    try {
        const user = yield data_source_1.UserRepo.findOneBy({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        yield data_source_1.UserRepo.remove(user);
        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
        return CustomError_1.default.security(500, 'Server Error');
    }
});
exports.deleteUser = deleteUser;
//# sourceMappingURL=User.js.map