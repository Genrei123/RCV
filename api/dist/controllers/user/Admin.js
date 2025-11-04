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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullBlockchain = exports.addProductRecord = void 0;
const Scan_1 = require("../scan/Scan");
const productblock_1 = require("../../services/productblock");
const addProductRecord = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newProduct = req.body;
        // const ProductSchema = z.object({ Product });
        // const parsed = ProductSchema.safeParse(newProduct);
        if (!Scan_1.globalProductBlockchain) {
            (0, Scan_1.initializeProductBlockchain)();
        }
        // Parse newProduct
        Scan_1.globalProductBlockchain.addNewBlock(new productblock_1.ProductBlock(3, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), newProduct));
        res.status(201).json({ success: true, message: 'Product record added successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.addProductRecord = addProductRecord;
const getFullBlockchain = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!Scan_1.globalProductBlockchain) {
            (0, Scan_1.initializeProductBlockchain)();
        }
        res.status(200).json({ success: true, blockchain: Scan_1.globalProductBlockchain });
    }
    catch (error) {
        next(error);
    }
});
exports.getFullBlockchain = getFullBlockchain;
//# sourceMappingURL=Admin.js.map