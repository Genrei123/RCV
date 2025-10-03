"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductController = __importStar(require("../../controllers/product/Product"));
const ProductRouter = (0, express_1.Router)();
ProductRouter.get('/products', ProductController.getAllProducts);
ProductRouter.get('/products/:id', ProductController.getProductById);
ProductRouter.post('/products', ProductController.createProduct);
ProductRouter.put('/products/:id', ProductController.updateProduct);
ProductRouter.patch('/products/:id', ProductController.partialUpdateProduct);
ProductRouter.delete('/products/:id', ProductController.deleteProduct);
// ProductRouter.get('/products/search?query=', ProductController.searchProducts);
// ProductRouter.get('/products/filter?type=&subtype=&company=');
// ProductRouter.get('/products/sort?by=&order=');
exports.default = ProductRouter;
//# sourceMappingURL=product.js.map