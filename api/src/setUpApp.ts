import 'reflect-metadata';
import express from 'express';

// Load Environment Variables with dotenv package
import dotenv from 'dotenv';
dotenv.config();
const { COOKIE_SECRET } = process.env;

// Import Middleware
import cors from 'cors';
import cookieParser from 'cookie-parser';
import AuthRouter from './routes/v1/auth';
import ConnectDatabase from './typeorm/connectDB';
import customErrorHandler from './middleware/customErrorHandler';
import { rateLimit, validateToken } from './middleware/securityConfig';
import ScanRouter from './routes/v1/scan';
import AdminRouter from './routes/v1/admin';
import BlockchainRouter from './routes/v1/blockchain';

// Instantiate the express app
const setUpApp = async () => {
  const app = express();
  
  // Register middlewares on the app
  app.use(cors({ origin: '*' }));
  app.use(cookieParser(COOKIE_SECRET!));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Security Middlewares
  app.use(rateLimit);
  // app.use(validateToken);

  // API VERSIONING - Version 1.0
  app.use('/api/v1/auth', AuthRouter);
  app.use('/api/v1/scan', ScanRouter);
  app.use('/api/v1/admin', AdminRouter);
  app.use('/api/v1/blockchain', BlockchainRouter);

  // Root Health Check
  app.get('/', (req, res) => {
    res
      .status(200)
      .json({ success: true, message: 'Yaaaay! You have hit the API root.' });
  });

  // Custom Error handler placed after all other routes
  app.use(customErrorHandler);

  // Connect to Database and on success, return the app instance
  await ConnectDatabase();


  // Start Server
  return app;
};

export default setUpApp;
