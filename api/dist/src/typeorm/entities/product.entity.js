"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = exports.ProductValidation = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("../../types/enums");
const user_entity_1 = require("./user.entity");
const company_entity_1 = require("./company.entity");
const zod_1 = require("zod");
exports.ProductValidation = zod_1.z.object({
    id: zod_1.z.uuidv4(),
    LTONumber: zod_1.z.string().min(2).max(50),
    CFPRNumber: zod_1.z.string().min(2).max(50),
    lotNumber: zod_1.z.string().min(2).max(50),
    brandName: zod_1.z.string().min(2).max(100),
    productName: zod_1.z.string().min(2).max(100),
    productClassification: zod_1.z.enum(enums_1.ProductType),
    productSubClassification: zod_1.z.enum(enums_1.ProductSubClassification),
    expirationDate: zod_1.z.date(),
    dateOfRegistration: zod_1.z.date(),
    registeredBy: zod_1.z.instanceof(user_entity_1.User),
    registeredAt: zod_1.z.date(),
    company: zod_1.z.instanceof(company_entity_1.Company),
});
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Product.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "LTONumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "CFPRNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "lotNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "brandName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.ProductType }),
    __metadata("design:type", Number)
], Product.prototype, "productClassification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.ProductSubClassification }),
    __metadata("design:type", Number)
], Product.prototype, "productSubClassification", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Product.prototype, "expirationDate", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Product.prototype, "dateOfRegistration", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user._id),
    __metadata("design:type", user_entity_1.User)
], Product.prototype, "registeredBy", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Product.prototype, "registeredAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, company => company.products),
    __metadata("design:type", company_entity_1.Company)
], Product.prototype, "company", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)()
], Product);
//# sourceMappingURL=product.entity.js.map