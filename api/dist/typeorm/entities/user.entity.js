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
exports.User = exports.UserValidation = void 0;
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
// Helper to coerce date strings
const coerceDate = (val) => typeof val === 'string' ? new Date(val) : val;
exports.UserValidation = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    role: zod_1.z.enum(['AGENT', 'ADMIN', 'USER']).optional(),
    status: zod_1.z.enum(['Archived', 'Active', 'Pending']).default('Pending'),
    approved: zod_1.z.boolean().optional().default(false),
    avatarUrl: zod_1.z.string().optional(),
    firstName: zod_1.z.string().min(2).max(50),
    middleName: zod_1.z.string().min(2).max(50).optional(),
    lastName: zod_1.z.string().min(2).max(50),
    extName: zod_1.z.string().max(10).optional(),
    fullName: zod_1.z.string().min(2).max(150),
    email: zod_1.z.string().email().min(5).max(100),
    location: zod_1.z.string().min(2).max(100),
    currentLocation: zod_1.z.object({
        latitude: zod_1.z.string(),
        longitude: zod_1.z.string()
    }).optional(),
    dateOfBirth: zod_1.z.string(),
    phoneNumber: zod_1.z.string().min(10).max(15),
    password: zod_1.z.string().min(6).max(100),
    badgeId: zod_1.z.string().min(2).max(50),
    createdAt: zod_1.z.preprocess(v => (v === undefined ? new Date() : coerceDate(v)), zod_1.z.date()).optional(),
    updatedAt: zod_1.z.preprocess(v => (v === undefined ? new Date() : coerceDate(v)), zod_1.z.date()).optional()
});
let User = class User {
    assignId() {
        if (!this._id)
            this._id = (0, uuid_1.v4)();
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['AGENT', 'ADMIN', 'USER'], default: 'AGENT' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['Archived', 'Active', 'Pending'], default: 'Pending' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "approved", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "middleName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "extName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "currentLocation", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "dateOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "badgeId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], User.prototype, "assignId", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)()
], User);
//# sourceMappingURL=user.entity.js.map