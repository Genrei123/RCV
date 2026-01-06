import jwt, { Jwt } from "jsonwebtoken";
import * as dotenv from 'dotenv';
import z from "zod";
import bcryptjs from 'bcryptjs';
import CryptoJS from 'crypto-js'
dotenv.config();

interface UserPayload {
  sub: string;
  isAdmin: boolean;
  iat: number;
}

interface MobileUserPayload {
  sub: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  extName?: string | null;
  fullName: string;
  role: string;
  status: string;
  badgeId?: string | null;
  location?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
  iat: number;
}

interface ForgotPasswordPayload {
  email: string;
  iat: number;
}

export const JWT_USERPAYLOAD = z.object({
  sub: z.string(),
  isAdmin: z.boolean(),
});

export const JWT_MOBILE_USERPAYLOAD = z.object({
  sub: z.string(),
  email: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable().optional(),
  lastName: z.string(),
  extName: z.string().nullable().optional(),
  fullName: z.string(),
  role: z.string(),
  status: z.string(),
  badgeId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  isAdmin: z.boolean(),
});

if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN || !process.env.JWT_ALGORITHM) {
  throw new Error("JWT Environment is not defined");
}
const JWT_SECRET = process.env.JWT_SECRET as any;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as any;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM as any;

export function createToken(User: UserPayload): string {
  return jwt.sign(User, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function createMobileToken(User: MobileUserPayload): string {
  return jwt.sign(User, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function createForgotPasswordToken(UserEmail: ForgotPasswordPayload): string {
  return jwt.sign(UserEmail, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
        expiresIn: JWT_EXPIRES_IN
  });
}

export function decryptToken(encryptedToken: string): string {
  try {
    const decryptedBytes = CryptoJS.DES.decrypt(
      encryptedToken,
      process.env.COOKIE_SECRET || "key"
    );
    const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error("Decryption produced empty result");
    }
    return decrypted;
  } catch (error) {
    console.error("Token decryption error:", error);
    throw new Error("Failed to decrypt token");
  }
}

export function verifyToken(token: string) {
  try {
    // Token comes already decrypted or is a plain JWT
    const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });
    return JWT_USERPAYLOAD.safeParse(decoded);
  } catch (error) {
    console.error(error);
  }
}
