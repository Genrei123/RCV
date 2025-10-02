import { SecurityCode } from "./enums";

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
    retryAfter?: number; 
    totalRequests?: number;
}

declare global {
  interface WebRequest {
    user?: TUser;
  }
}
