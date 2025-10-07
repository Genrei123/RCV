import { SecurityCode } from "./enums";

export type TSignupForm = {
  firstName: string;
  middleName?: string;
  lastName: string;
  extName?: string;
  fullName: string;
  email: string;
  location: string;
  dateOfBirth: string;
  phoneNumber: string;
  password: string;
  badgeId: string;
};

export type TSigninForm = {
  email: string;
  password: string;
};

export type TUser = {
  _id: string;
  role: 'AGENT' | 'ADMIN' | 'USER';
  status: 'Archived' | 'Active' | 'Pending';
  avatarUrl?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extName?: string;
  fullName: string;
  email: string;
  location: string;
  currentLocation?: {
    latitude: string;
    longitude: string;
  };
  dateOfBirth: string;
  phoneNumber: string;
  password?: string;
  badgeId: string;
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
// Change nalang name ng TUser since ginamit na yung properties neto
export interface user {
  _id: UUID; // tentative
  role: 'AGENT' | 'ADMIN' | 'USER'; // tentative 
  status: 'Archived' | 'Active' | 'Pending';
  avatarUrl: string;
  firstName: string; // first name
  middleName?: string; // middle name, optional
  lastName: string; // last name
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
  badgeId: string; // tentative
}

export interface auditLog {
  _id: UUID; //tentative
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


export interface SignupForm {
  firstName: string;
  middleName?: string;
  lastName: string;
  extName?: string;
  password: string;
  phoneNumber: string;
  email: string;
  location: string;
  dateOfBirth: string;
  badgeId: string;
}