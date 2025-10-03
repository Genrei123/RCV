"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanRepo = exports.CompanyRepo = exports.AuditTrailRepo = exports.ProductRepo = exports.UserRepo = exports.DB = void 0;
const typeorm_1 = require("typeorm");
const config_1 = __importDefault(require("./config/config"));
const user_entity_1 = require("./entities/user.entity");
const product_entity_1 = require("./entities/product.entity");
const audit_trail_entity_1 = require("./entities/audit-trail.entity");
const company_entity_1 = require("./entities/company.entity");
const scanHistory_1 = require("./entities/scanHistory");
// Initialize the datasource/database connection
exports.DB = new typeorm_1.DataSource(config_1.default);
// Export Repository for the Entities
// https://typeorm.io/working-with-repository
const UserRepo = exports.DB.getRepository(user_entity_1.User);
exports.UserRepo = UserRepo;
const ProductRepo = exports.DB.getRepository(product_entity_1.Product);
exports.ProductRepo = ProductRepo;
const AuditTrailRepo = exports.DB.getRepository(audit_trail_entity_1.AuditTrail);
exports.AuditTrailRepo = AuditTrailRepo;
const CompanyRepo = exports.DB.getRepository(company_entity_1.Company);
exports.CompanyRepo = CompanyRepo;
const ScanRepo = exports.DB.getRepository(scanHistory_1.ScanHistory);
exports.ScanRepo = ScanRepo;
//# sourceMappingURL=data-source.js.map