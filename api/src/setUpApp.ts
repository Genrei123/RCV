import "reflect-metadata";
import express from "express";
import path from "path";

// Load Environment Variables with dotenv package
import dotenv from "dotenv";
dotenv.config();
const { COOKIE_SECRET } = process.env;

// Import Middleware
import cors from "cors";
import cookieParser from "cookie-parser";
import AuthRouter from "./routes/v1/auth";
import ConnectDatabase from "./typeorm/connectDB";
import customErrorHandler from "./middleware/customErrorHandler";
import { rateLimit, validateToken } from "./middleware/securityConfig";
import ScanRouter from "./routes/v1/scan";
import AdminRouter from "./routes/v1/admin";
import BlockchainRouter from "./routes/v1/blockchain";
import UserRouter from "./routes/v1/user";
import ProductRouter from "./routes/v1/product";
import CompanyRouter from "./routes/v1/company";
import FirebaseRouter from "./routes/v1/firebase";
import AuditLogRouter from "./routes/v1/auditLog";
import CertificateBlockchainRouter from "./routes/v1/certificateBlockchain";

// Instantiate the express app
const setUpApp = async () => {
  const app = express();

  // Register middlewares on the app
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
  app.use(cookieParser(COOKIE_SECRET!));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Security Middlewares
  app.use(rateLimit);
  // app.use(validateToken);

  // API VERSIONING - Version 1.0
  app.use("/api/v1/auth", AuthRouter);
  app.use("/api/v1/scan", ScanRouter);
  app.use("/api/v1/admin", AdminRouter);
  app.use("/api/v1/blockchain", BlockchainRouter);
  app.use("/api/v1/user", UserRouter);
  app.use("/api/v1/product", ProductRouter);
  app.use("/api/v1/company", CompanyRouter);
  app.use("/api/v1/firebase", FirebaseRouter);
  app.use("/api/v1/audit", AuditLogRouter);
  app.use("/api/v1/certificate-blockchain", CertificateBlockchainRouter);

  // Serve static uploads (avatars, etc.)
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsPath));
  app.use("/api/v1/uploads", express.static(uploadsPath));

  // Root Health Check
  app.get("/", (req, res) => {
    res
      .status(200)
      .json({ success: true, message: "Yaaaay! You have hit the API root." });
  });

  // Custom Error handler placed after all other routes
  app.use(customErrorHandler);

  // Kiosk Health Tracking
  let kioskHealth = {
    lastPoll: null as Date | null,
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
    const uptime = Math.floor(
      (now.getTime() - kioskHealth.startTime.getTime()) / 1000
    );

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
  // app.get("/kiosk/command", (req, res) => {
  //   // Update health tracking every time ESP32 polls
  //   kioskHealth.lastPoll = new Date();
  //   kioskHealth.pollCount++;

  //   console.log(
  //     `[Kiosk] Poll #${
  //       kioskHealth.pollCount
  //     } at ${kioskHealth.lastPoll.toISOString()}`
  //   );

  //   res.json(currentCommand);
  //   // Reset command after sending to ESP32
  //   currentCommand = { action: "none", led: 0, state: "off" };
  // });

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

  await ConnectDatabase();

  // Start Server
  return app;
};

export default setUpApp;
