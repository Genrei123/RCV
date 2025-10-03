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
exports.getScansByID = exports.getScans = exports.scanProduct = exports.initializeProductBlockchain = exports.globalProductBlockchain = exports.scanQR = void 0;
const reportGeneration_1 = require("../../utils/reportGeneration");
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const ProductChainUtil_1 = require("../../utils/ProductChainUtil");
const user_entity_1 = require("../../typeorm/entities/user.entity");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const productblockchain_1 = require("../../services/productblockchain");
const company_entity_1 = require("../../typeorm/entities/company.entity");
const productblock_1 = require("../../services/productblock");
const scanHistory_1 = require("../../typeorm/entities/scanHistory");
const data_source_1 = require("../../typeorm/data-source");
const scanQR = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Generates Report
    const report = (0, reportGeneration_1.generateReport)(req);
    res.status(200).json({ report });
});
exports.scanQR = scanQR;
const initializeProductBlockchain = () => __awaiter(void 0, void 0, void 0, function* () {
    const mockUser = new user_entity_1.User();
    mockUser._id = "123213";
    mockUser.firstName = "John";
    mockUser.lastName = "Doe";
    mockUser.email = "john_doe";
    mockUser.phoneNumber = "09123456789";
    mockUser.role = 1; // Admin
    const salt = yield bcryptjs_1.default.genSalt(10);
    mockUser.password = yield bcryptjs_1.default.hash("adminpassword", salt);
    const mockAdmin = mockUser;
    const mockCompany = new company_entity_1.Company();
    mockCompany._id = "comp123";
    mockCompany.name = "Sample Manufacturer";
    mockCompany.address = "123 Sample St, Sample City";
    const sampleProduct = {
        _id: "prod123",
        LTONumber: "1234567890",
        CFPRNumber: "0987654321",
        lotNumber: "LOT123456",
        brandName: "Sample Brand",
        productName: "Sample Product",
        productClassification: 0,
        productSubClassification: 0,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        dateOfRegistration: new Date(),
        registeredAt: new Date(),
        registeredBy: mockAdmin,
        company: mockCompany,
    };
    exports.globalProductBlockchain = new productblockchain_1.ProductBlockchain(sampleProduct);
    exports.globalProductBlockchain.addNewBlock(new productblock_1.ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), sampleProduct));
});
exports.initializeProductBlockchain = initializeProductBlockchain;
const scanProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const scanned = req.body;
        if (!scanned || !scanned.productName) {
            throw new CustomError_1.default(400, 'Invalid scanned data', { success: false });
        }
        // Initialize the blockchain if not already done
        if (!exports.globalProductBlockchain) {
            (0, exports.initializeProductBlockchain)();
        }
        const productInfo = (0, ProductChainUtil_1.searchProductInBlockchain)(scanned.productName);
        if (!productInfo) {
            throw new CustomError_1.default(404, 'Product not found in blockchain', { success: false });
        }
        res.status(200).json({ success: true, productInfo });
    }
    catch (error) {
        next(error);
    }
});
exports.scanProduct = scanProduct;
const getScans = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Scans = yield data_source_1.ScanRepo.find();
        res.status(200).json({ scans: Scans });
    }
    catch (error) {
        next(error);
        return new CustomError_1.default(500, 'Failed to retrieve scans');
    }
});
exports.getScans = getScans;
const getScansByID = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!scanHistory_1.ScanHistoryValidation.parse({ id: req.params.id })) {
        return new CustomError_1.default(400, "Invalid Scan ID");
    }
    try {
        const scan = yield data_source_1.ScanRepo.findOneBy({ _id: req.params.id });
        if (!scan) {
            return new CustomError_1.default(404, 'Scan not found');
        }
        res.status(200).json({ scan });
    }
    catch (error) {
        next(error);
        return new CustomError_1.default(500, 'Failed to retrieve scan');
    }
});
exports.getScansByID = getScansByID;
//# sourceMappingURL=Scan.js.map