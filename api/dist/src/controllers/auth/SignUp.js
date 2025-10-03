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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const data_source_1 = require("../../typeorm/data-source");
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const validateSignUp_1 = __importDefault(require("../../utils/validateSignUp"));
const user_entity_1 = require("../../typeorm/entities/user.entity");
/**
 * UserSignUp - Controller for creating a New User Account
 * @param req - Request Object from the Client
 * @param res - Response Object to reply to Client
 * @returns void
 */
const UserSignUp = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const data = (0, validateSignUp_1.default)(req);
    // If An error occurs in validation
    if (data.error || !data.form) {
        const error = new CustomError_1.default(400, data.error, { success: false });
        return next(error);
    }
    // Validate user with zod
    if (user_entity_1.UserValidation.safeParse(data.form)) {
        console.log("User data is valid");
    }
    else {
        const error = new CustomError_1.default(400, "Invalid user data", { success: false });
        return next(error);
    }
    try {
        const { form } = data;
        form.password = bcryptjs_1.default.hashSync(form.password, bcryptjs_1.default.genSaltSync(10));
        form.dateOfBirth = new Date(form.dateOfBirth);
        const existingUser = yield data_source_1.UserRepo.findOne({
            where: { email: form.email },
        });
        if (existingUser) {
            const error = new CustomError_1.default(400, 'User already exists.', {
                success: false,
            });
            return next(error);
        }
        // Create new user
        const newUser = data_source_1.UserRepo.create(form);
        const user = yield data_source_1.UserRepo.save(newUser);
        return res
            .status(201)
            .json({ success: true, message: 'User Account created successfully.' });
    }
    catch (error) {
        return res.status(403).json({ success: false, message: error.message });
    }
});
exports.default = UserSignUp;
//# sourceMappingURL=SignUp.js.map