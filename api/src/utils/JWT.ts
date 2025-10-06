import jwt, { Jwt } from "jsonwebtoken";
import * as dotenv from 'dotenv';
import { Roles } from "../types/enums";
import z from "zod";
dotenv.config();

interface UserPayload {
    sub: string;
    isAdmin: boolean;
    iat: number;
}

export const JWT_USERPAYLOAD = z.object({
    sub: z.string(),
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

export function verifyToken(token: string) {
    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
        return JWT_USERPAYLOAD.safeParse(decoded);
    } catch (error) {
        console.error(error);
    }
}