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
 * Testing the Index Page Layout
 * - GET /
 */
describe('GET /', () => {
    let app;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        app = yield (0, setUpApp_1.default)();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield data_source_1.DB.destroy();
    }));
    it('It should return Status 200', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app).get('/');
        expect(response.status).toBe(200);
    }));
    it('It should contain certain values in the response.body', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const response = yield (0, supertest_1.default)(app).get('/');
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('message');
        expect((_a = response.body) === null || _a === void 0 ? void 0 : _a.message).toBe('Yaaaay! You have hit the API root.');
    }));
});
//# sourceMappingURL=app.test.js.map