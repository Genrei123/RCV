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
exports.AuditLog = exports.AuditLogValidation = void 0;
const typeorm_1 = require("typeorm");
const zod_1 = require("zod");
const user_entity_1 = require("./user.entity");
exports.AuditLogValidation = zod_1.z.object({
    action: zod_1.z.string().min(1, "Action is required"),
    actionType: zod_1.z.enum([
        'LOGIN',
        'LOGOUT',
        'APPROVE_USER',
        'REJECT_USER',
        'REVOKE_ACCESS',
        'SCAN_PRODUCT',
        'CREATE_USER',
        'UPDATE_USER',
        'DELETE_USER',
        'CREATE_PRODUCT',
        'UPDATE_PRODUCT',
        'DELETE_PRODUCT',
        'UPDATE_PROFILE',
        'CHANGE_PASSWORD',
        'ARCHIVE_ACCOUNT',
        'LOCATION_UPDATE',
        'APP_CLOSED'
    ]),
    userId: zod_1.z.string().uuid().optional(),
    targetUserId: zod_1.z.string().uuid().optional(),
    targetProductId: zod_1.z.string().uuid().optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    platform: zod_1.z.enum(['WEB', 'MOBILE']).default('WEB'),
    location: zod_1.z.object({
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional(),
        address: zod_1.z.string().optional(),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
let AuditLog = class AuditLog {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], AuditLog.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500 }),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            'LOGIN',
            'LOGOUT',
            'APPROVE_USER',
            'REJECT_USER',
            'REVOKE_ACCESS',
            'SCAN_PRODUCT',
            'CREATE_USER',
            'UPDATE_USER',
            'DELETE_USER',
            'CREATE_PRODUCT',
            'UPDATE_PRODUCT',
            'DELETE_PRODUCT',
            'UPDATE_PROFILE',
            'CHANGE_PASSWORD',
            'ARCHIVE_ACCOUNT',
            'LOCATION_UPDATE',
            'APP_CLOSED'
        ],
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "actionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", user_entity_1.User)
], AuditLog.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "targetUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "targetUserId" }),
    __metadata("design:type", user_entity_1.User)
], AuditLog.prototype, "targetUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "targetProductId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 45, nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ['WEB', 'MOBILE'],
        default: 'WEB'
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)("audit_logs")
], AuditLog);
//# sourceMappingURL=auditLog.entity.js.map