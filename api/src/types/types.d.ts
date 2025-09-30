import { UUID } from "crypto";
import { SecurityCode } from "./enums";
import { date } from "zod";

export type TSignupForm = {
  fullName: string;
  email: string;
  dateOfBirth: Date;
  phoneNumber: string;
  password: string;
};

export type TSigninForm = {
  email: string;
  password: string;
};

export type TUser = {
  _id: string;
  fullName: string;
  email: string;
  dateOfBirth: Date;
  phoneNumber: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TReportData = {
  productName: string;
  productType: string;
  manufacturerName: string;
  distributorName: string;
  importerName: string;
  totalScans: number;
  firstScannedAt: Date | null;
  lastScannedAt: Date | null;
  aiReport: string;
  aiSuggestions: string;
}

export interface SecurityErrorResponse {
    message: string;
    code: SecurityCode;
    shouldLogout?: boolean;
}

export interface RateLimitResult {
    isRateLimited: boolean;
    retryAfter?: number; // in seconds
    totalRequests?: number;
}

// Extend the Express Request type to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: TUser;
    }
  }
}


//Finalize ==============================================================================================

export interface user {
  id: UUID; // tentative
  role: 'AGENT' | 'ADMIN' | 'USER'; // tentative 
  status: 'Archived' | 'Active' | 'Pending';
  avatarUrl: string;
  fName: string; // first name
  mName?: string; // middle name, optional
  lName: string; // last name
  extName?: string; // extension name, optional
  fullName: string; // full name
  email: string;
  location: string; // declared sa pag gawa ng account/ designated location / City 
  currentLocation?: currentLocation
  dateOfBirth: string;
  phoneNumber: string; // 00-000-000000
  password: string; // hashed password
  createdAt: Date; 
  updatedAt: Date;
}

export interface auditLog {
  id: UUID; //tentative
  userId: UUID; // current id ng user na gumagamit
  fullName: string; // current full name ng user na gumagamit
  type: 'Logged In' | 'Scanned' | 'Logged Out' | 'Reported' | 'Archived' | 'Created' | 'Updated'; // Archived counts during deletion
  action: string;
  description: string;
  productDetails?: product
  dateAndTime: Date;
  currentLocation?: currentLocation
}


export interface product {
  LTONumber: string;
  CFPRNumber: string;
  lotNumber: string;
  brandName: string;
  productName: string;
  expiryrationDate: Date;
  dateOfRegistration: Date;
  registedBy?: user
  registeredAt?: currentLocation
}

export interface currentLocation {
  latitude: string;
  longitude: string;
}

export interface report {
  userId: UUID;
  user: user.fullName;
  type: string;
  dateAndTime: Date;
  location: user.location; // Location ng account ng user
  productDetails: product;
}
