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
const path_1 = __importDefault(require("path"));
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
const scan_1 = __importDefault(require("./routes/v1/scan"));
const admin_1 = __importDefault(require("./routes/v1/admin"));
const blockchain_1 = __importDefault(require("./routes/v1/blockchain"));
const user_1 = __importDefault(require("./routes/v1/user"));
const product_1 = __importDefault(require("./routes/v1/product"));
const company_1 = __importDefault(require("./routes/v1/company"));
const firebase_1 = __importDefault(require("./routes/v1/firebase"));
const auditLog_1 = __importDefault(require("./routes/v1/auditLog"));
// Instantiate the express app
const setUpApp = () => __awaiter(void 0, void 0, void 0, function* () {
    const app = (0, express_1.default)();
    // Register middlewares on the app
    app.use((0, cors_1.default)({ origin: "*" }));
    app.use((0, cookie_parser_1.default)(COOKIE_SECRET));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Security Middlewares
    // app.use(rateLimit);
    // app.use(validateToken);
    // API VERSIONING - Version 1.0
    app.use("/api/v1/auth", auth_1.default);
    app.use("/api/v1/scan", scan_1.default);
    app.use("/api/v1/admin", admin_1.default);
    app.use("/api/v1/blockchain", blockchain_1.default);
    app.use("/api/v1/user", user_1.default);
    app.use("/api/v1/product", product_1.default);
    app.use("/api/v1/company", company_1.default);
    app.use("/api/v1/firebase", firebase_1.default);
    app.use("/api/v1/audit", auditLog_1.default);
    // Serve static uploads (avatars, etc.)
    const uploadsPath = path_1.default.resolve(process.cwd(), "uploads");
    app.use("/uploads", express_1.default.static(uploadsPath));
    app.use("/api/v1/uploads", express_1.default.static(uploadsPath));
    // Root Health Check
    app.get("/", (req, res) => {
        res
            .status(200)
            .json({ success: true, message: "Yaaaay! You have hit the API root." });
    });
    // Custom Error handler placed after all other routes
    app.use(customErrorHandler_1.default);
    // Kiosk Health Tracking
    let kioskHealth = {
        lastPoll: null,
        pollCount: 0,
        startTime: new Date(),
    };
    let currentCommand = { action: "none", led: 0, state: "off" };
    // Health endpoint - returns current kiosk status
    app.get("/kiosk/health", (req, res) => {
        const now = new Date();
        // Calculate time since last poll in milliseconds
        const timeSinceLastPoll = kioskHealth.lastPoll
            ? now.getTime() - kioskHealth.lastPoll.getTime()
            : null;
        // Device is online if it polled within the last 30 seconds (30000ms)
        const isOnline = timeSinceLastPoll !== null && timeSinceLastPoll < 30000;
        // Calculate uptime
        const uptime = Math.floor((now.getTime() - kioskHealth.startTime.getTime()) / 1000);
        res.json({
            lastPoll: kioskHealth.lastPoll,
            isOnline,
            pollCount: kioskHealth.pollCount,
            uptime,
            timeSinceLastPoll: timeSinceLastPoll, // in milliseconds, for debugging
            serverTime: now.toISOString(),
        });
    });
    // Command endpoint - ESP32 polls this to get commands
    app.get("/kiosk/command", (req, res) => {
        // Update health tracking every time ESP32 polls
        kioskHealth.lastPoll = new Date();
        kioskHealth.pollCount++;
        console.log(`[Kiosk] Poll #${kioskHealth.pollCount} at ${kioskHealth.lastPoll.toISOString()}`);
        res.json(currentCommand);
        // Reset command after sending to ESP32
        currentCommand = { action: "none", led: 0, state: "off" };
    });
    app.post("/kiosk/led-1", (req, res) => {
        currentCommand = { action: "control", led: 1, state: "on" };
        res.json({ success: true });
    });
    app.post("/kiosk/led-2", (req, res) => {
        currentCommand = { action: "control", led: 2, state: "on" };
        res.json({ success: true });
    });
    app.post("/kiosk/led-3", (req, res) => {
        currentCommand = { action: "control", led: 3, state: "on" };
        res.json({ success: true });
    });
    yield (0, connectDB_1.default)();
    // Start Server
    return app;
});
exports.default = setUpApp;
//# sourceMappingURL=setUpApp.js.map