import jwt, { Jwt } from "jsonwebtoken";
import * as dotenv from 'dotenv';
import { Roles } from "../types/enums";
dotenv.config();

interface UserPayload {
    id: string;
    role: Roles;
    iat: number;
}

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

// TO DO
// export function verifyToken(token: string): claims | null {
//     return jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as claims;
// }

// export function decodeToken(token: string): Jwt | null {
//     return jwt.decode(token, { complete: true });
// }