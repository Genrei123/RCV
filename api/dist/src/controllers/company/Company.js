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
exports.deleteCompany = exports.partialUpdateCompany = exports.updateCompany = exports.createCompany = exports.getCompanyById = exports.getAllCompanies = void 0;
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const company_entity_1 = require("../../typeorm/entities/company.entity");
const data_source_1 = require("../../typeorm/data-source");
const getAllCompanies = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companies = yield data_source_1.CompanyRepo.find();
        res.status(200).json({ companies });
    }
    catch (error) {
        return new CustomError_1.default(500, "Failed to all retrieve companies");
    }
});
exports.getAllCompanies = getAllCompanies;
const getCompanyById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!company_entity_1.CompanyValidation.parse({ id: req.params.id })) {
        return new CustomError_1.default(400, "Invalid Company ID");
    }
    try {
        // Logic to get a company by ID
        res.status(200).json({ message: `Company with ID ${req.params.id} retrieved successfully` });
    }
    catch (error) {
        return new CustomError_1.default(500, "Failed to retrieve company");
    }
    return CustomError_1.default.security(400, 'Invalid user data');
});
exports.getCompanyById = getCompanyById;
const createCompany = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!company_entity_1.CompanyValidation.parse(req.body)) {
        return new CustomError_1.default(400, "Invalid Company Data");
    }
    try {
        const newCompany = data_source_1.CompanyRepo.create(req.body);
        yield data_source_1.CompanyRepo.save(newCompany);
        res.status(201).json({ company: newCompany });
    }
    catch (error) {
        return new CustomError_1.default(500, "Failed to create company");
    }
});
exports.createCompany = createCompany;
const updateCompany = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!company_entity_1.CompanyValidation.parse(Object.assign({ _id: req.params.id }, req.body))) {
        return new CustomError_1.default(400, "Invalid Company Data");
    }
    try {
        const company = yield data_source_1.CompanyRepo.findOneBy({ _id: req.params.id });
        if (!company) {
            return new CustomError_1.default(404, "Company not found");
        }
        data_source_1.CompanyRepo.merge(company, req.body);
        yield data_source_1.CompanyRepo.save(company);
        res.status(200).json({ company });
    }
    catch (error) {
        return new CustomError_1.default(500, "Failed to update company");
    }
});
exports.updateCompany = updateCompany;
const partialUpdateCompany = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!company_entity_1.CompanyValidation.parse(Object.assign({ id: req.params.id }, req.body))) {
        return new CustomError_1.default(400, "Invalid Company Data");
    }
    try {
        const company = yield data_source_1.CompanyRepo.findOneBy({ _id: req.params.id });
        if (!company) {
            return new CustomError_1.default(404, "Company not found");
        }
        data_source_1.CompanyRepo.merge(company, req.body);
        yield data_source_1.CompanyRepo.save(company);
        res.status(200).json({ company });
    }
    catch (error) {
        return new CustomError_1.default(500, "Failed to partially update company");
    }
});
exports.partialUpdateCompany = partialUpdateCompany;
const deleteCompany = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!company_entity_1.CompanyValidation.parse({ id: req.params.id })) {
        return new CustomError_1.default(400, "Invalid Company ID");
    }
    try {
        const result = yield data_source_1.CompanyRepo.delete(req.params.id);
        if (result.affected === 0) {
            return new CustomError_1.default(404, "Company not found");
        }
        res.status(200).json({ message: "Company deleted successfully" });
    }
    catch (error) {
        return new CustomError_1.default(500, "Failed to delete company");
    }
});
exports.deleteCompany = deleteCompany;
//# sourceMappingURL=Company.js.map