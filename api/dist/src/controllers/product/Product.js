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
exports.sortProducType = exports.searchProductByCompany = exports.searchProduct = exports.deleteProduct = exports.partialUpdateProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const product_entity_1 = require("../../typeorm/entities/product.entity");
const data_source_1 = require("../../typeorm/data-source");
const CustomError_1 = __importDefault(require("../../utils/CustomError"));
const getAllProducts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield data_source_1.ProductRepo.find();
        res.status(200).json({ products });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to retrieve products');
    }
});
exports.getAllProducts = getAllProducts;
const getProductById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!product_entity_1.ProductValidation.parse({ id: req.params.id })) {
        return new CustomError_1.default(400, 'Invalid Product ID');
    }
    try {
        // Logic to get a product by ID
        res.status(200).json({ message: `Product with ID ${req.params.id} retrieved successfully` });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to retrieve product');
    }
    return CustomError_1.default.security(400, 'Invalid user data');
});
exports.getProductById = getProductById;
const createProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!product_entity_1.ProductValidation.parse(req.body)) {
        return new CustomError_1.default(400, 'Invalid Product Data');
    }
    try {
        const newProduct = data_source_1.ProductRepo.create(req.body);
        yield data_source_1.ProductRepo.save(newProduct);
        res.status(201).json({ product: newProduct });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to create product');
    }
});
exports.createProduct = createProduct;
const updateProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!product_entity_1.ProductValidation.parse(Object.assign({ _id: req.params.id }, req.body))) {
        return new CustomError_1.default(400, 'Invalid Product Data');
    }
    try {
        const product = yield data_source_1.ProductRepo.findOneBy({ _id: req.params.id });
        if (!product) {
            return new CustomError_1.default(404, 'Product not found');
        }
        data_source_1.ProductRepo.merge(product, req.body);
        yield data_source_1.ProductRepo.save(product);
        res.status(200).json({ product });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to update product');
    }
});
exports.updateProduct = updateProduct;
const partialUpdateProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!product_entity_1.ProductValidation.parse(Object.assign({ id: req.params.id }, req.body))) {
        return new CustomError_1.default(400, 'Invalid Product Data');
    }
    try {
        const product = yield data_source_1.ProductRepo.findOneBy({ _id: req.params.id });
        if (!product) {
            return new CustomError_1.default(404, 'Product not found');
        }
        data_source_1.ProductRepo.merge(product, req.body);
        yield data_source_1.ProductRepo.save(product);
        res.status(200).json({ product });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to partially update product');
    }
});
exports.partialUpdateProduct = partialUpdateProduct;
const deleteProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!product_entity_1.ProductValidation.parse({ id: req.params.id })) {
        return new CustomError_1.default(400, 'Invalid Product ID');
    }
    try {
        const result = yield data_source_1.ProductRepo.delete(req.params.id);
        if (result.affected === 0) {
            return new CustomError_1.default(404, 'Product not found');
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to delete product');
    }
});
exports.deleteProduct = deleteProduct;
const searchProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return new CustomError_1.default(400, 'Invalid search query');
    }
    try {
        const products = yield data_source_1.ProductRepo.createQueryBuilder('product')
            .where('product.LTONumber LIKE :query', { query: `%${query}%` })
            .orWhere('product.CFPRNumber LIKE :query', { query: `%${query}%` })
            .orWhere('product.lotNumber LIKE :query', { query: `%${query}%` })
            .orWhere('product.brandName LIKE :query', { query: `%${query}%` })
            .orWhere('product.productName LIKE :query', { query: `%${query}%` })
            .getMany();
        res.status(200).json({ products });
    }
    catch (error) {
        return new CustomError_1.default(500, 'Failed to search products');
    }
});
exports.searchProduct = searchProduct;
const searchProductByCompany = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // TO DO if requirements need it
});
exports.searchProductByCompany = searchProductByCompany;
const sortProducType = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // TO DO if requirements need it
});
exports.sortProducType = sortProducType;
//# sourceMappingURL=Product.js.map