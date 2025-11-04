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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const user_entity_1 = require("../entities/user.entity");
const product_entity_1 = require("../entities/product.entity");
const company_entity_1 = require("../entities/company.entity");
const scanHistory_1 = require("../entities/scanHistory");
const forgotPassword_entity_1 = require("../entities/forgotPassword.entity");
const auditLog_entity_1 = require("../entities/auditLog.entity");
// import { AuditTrail } from '../entities/audit-trail.entity';
const { DEV_DATABASE_URI, MAIN_DATABASE_URI, DB_PORT, NODE_ENV } = process.env;
const config = {
    type: "mysql",
    url: NODE_ENV === "development" ? DEV_DATABASE_URI : MAIN_DATABASE_URI,
    port: parseInt(DB_PORT, 10),
    entities: [user_entity_1.User, product_entity_1.Product, company_entity_1.Company, scanHistory_1.ScanHistory, forgotPassword_entity_1.ForgotPassword, auditLog_entity_1.AuditLog], // Add yung models na ginagawa
    migrations: ["src/typeorm/migrations/*.ts"],
    subscribers: [],
    // logging: NODE_ENV === 'development' ? true : false,
    logging: false,
    poolSize: 5,
    synchronize: true,
    // ssl: {
    //   rejectUnauthorized: false,
    // },
};
module.exports = config;
//# sourceMappingURL=config.js.map