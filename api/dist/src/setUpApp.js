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
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
// Load Environment Variables with dotenv package
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { COOKIE_SECRET } = process.env;
// Import Middleware
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./routes/v1/auth"));
const connectDB_1 = __importDefault(require("./typeorm/connectDB"));
const customErrorHandler_1 = __importDefault(require("./middleware/customErrorHandler"));
const securityConfig_1 = require("./middleware/securityConfig");
const scan_1 = __importDefault(require("./routes/v1/scan"));
const admin_1 = __importDefault(require("./routes/v1/admin"));
const blockchain_1 = __importDefault(require("./routes/v1/blockchain"));
const user_1 = __importDefault(require("./routes/v1/user"));
// Instantiate the express app
const setUpApp = () => __awaiter(void 0, void 0, void 0, function* () {
    const app = (0, express_1.default)();
    // Register middlewares on the app
    app.use((0, cors_1.default)({ origin: '*' }));
    app.use((0, cookie_parser_1.default)(COOKIE_SECRET));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Security Middlewares
    app.use(securityConfig_1.rateLimit);
    // app.use(validateToken);
    // API VERSIONING - Version 1.0
    app.use('/api/v1/auth', auth_1.default);
    app.use('/api/v1/scan', scan_1.default);
    app.use('/api/v1/admin', admin_1.default);
    app.use('/api/v1/blockchain', blockchain_1.default);
    app.use('/api/v1/user', user_1.default);
    // Root Health Check
    app.get('/', (req, res) => {
        res
            .status(200)
            .json({ success: true, message: 'Yaaaay! You have hit the API root.' });
    });
    // Custom Error handler placed after all other routes
    app.use(customErrorHandler_1.default);
    // Connect to Database and on success, return the app instance
    yield (0, connectDB_1.default)();
    // Start Server
    return app;
});
exports.default = setUpApp;
//# sourceMappingURL=setUpApp.js.map