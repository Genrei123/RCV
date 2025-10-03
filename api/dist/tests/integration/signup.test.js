"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setUpApp_1 = __importDefault(require("../../src/setUpApp"));
const data_source_1 = require("../../src/typeorm/data-source");
/**
 * Testing the Sign Up Route
 */
describe('POST /api/v1/auth/signup', () => {
    let app;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        app = yield (0, setUpApp_1.default)();
    }));
    it('should create a new user', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const formData = {
            fullName: 'Fillipe Doe',
            email: 'fillipedoe@example.com',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            password: 'password123',
        };
        const response = yield (0, supertest_1.default)(app)
            .post('/api/v1/auth/signup')
            .set('Content-Type', 'application/json')
            .send(formData);
        expect(response.status).toBe(201);
        expect((_a = response.body) === null || _a === void 0 ? void 0 : _a.success).toBe(true);
        expect((_b = response.body) === null || _b === void 0 ? void 0 : _b.message).toBe('User Account created successfully.');
    }));
    it('should return error if user already exists', () => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d;
        const formData = {
            fullName: 'John Doe',
            email: 'janedoe@example.com',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            password: 'password123',
        };
        const response = yield (0, supertest_1.default)(app)
            .post('/api/v1/auth/signup')
            .set('Content-Type', 'application/json')
            .send(formData);
        expect(response.status).toBe(400);
        expect((_c = response.body) === null || _c === void 0 ? void 0 : _c.success).toBe(false);
        expect((_d = response.body) === null || _d === void 0 ? void 0 : _d.message).toBe('User already exists.');
    }));
    it('should return error if form data is invalid', () => __awaiter(void 0, void 0, void 0, function* () {
        const formData = {
            FULLNAME: 'A name',
            email: 'testing@gmail.com',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            password: 'password123',
        };
        const response = yield (0, supertest_1.default)(app)
            .post('/api/v1/auth/signup')
            .set('Content-Type', 'application/json')
            .send(formData);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Required');
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield data_source_1.DB.destroy();
    }));
});
//# sourceMappingURL=signup.test.js.map