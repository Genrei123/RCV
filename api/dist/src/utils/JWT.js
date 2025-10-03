"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.createToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN || !process.env.JWT_ALGORITHM) {
    throw new Error("JWT Environment is not defined");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM;
function createToken(User) {
    return jsonwebtoken_1.default.sign(User, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        expiresIn: JWT_EXPIRES_IN,
    });
}
exports.createToken = createToken;
function verifyToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    console.log('Decoded Token: ', decoded);
    return decoded;
}
exports.verifyToken = verifyToken;
// export function decodeToken(token: string): Jwt | null {
//     return jwt.decode(token, { complete: true });
// }
//# sourceMappingURL=JWT.js.map