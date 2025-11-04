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
exports.ScanHistory = exports.ScanHistoryValidation = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("./product.entity");
const user_entity_1 = require("./user.entity");
const enums_1 = require("../../types/enums");
const zod_1 = require("zod");
exports.ScanHistoryValidation = zod_1.z.object({
    id: zod_1.z.uuidv4(),
    lat: zod_1.z.string().min(2).max(50),
    long: zod_1.z.string().min(2).max(50),
    product: zod_1.z.instanceof(product_entity_1.Product),
    scannedBy: zod_1.z.instanceof(user_entity_1.User),
    scannedAt: zod_1.z.date(),
    scanResult: zod_1.z.enum(enums_1.ScanResult),
    remarks: zod_1.z.string().min(2).max(255),
});
let ScanHistory = class ScanHistory {
};
exports.ScanHistory = ScanHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScanHistory.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ScanHistory.prototype, "lat", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ScanHistory.prototype, "long", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, product => product._id),
    __metadata("design:type", product_entity_1.Product)
], ScanHistory.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user._id),
    __metadata("design:type", user_entity_1.User)
], ScanHistory.prototype, "scannedBy", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], ScanHistory.prototype, "scannedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.ScanResult }),
    __metadata("design:type", Number)
], ScanHistory.prototype, "scanResult", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ScanHistory.prototype, "remarks", void 0);
exports.ScanHistory = ScanHistory = __decorate([
    (0, typeorm_1.Entity)()
], ScanHistory);
//# sourceMappingURL=scanHistory.js.map