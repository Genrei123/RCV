"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProductsInBlockchain = exports.searchProductInBlockchain = void 0;
const Scan_1 = require("../controllers/scan/Scan");
const searchProductInBlockchain = (searchTerm) => {
    // Blockchain must already be implemented
    if (!Scan_1.globalProductBlockchain) {
        return null;
    }
    const blockchain = Scan_1.globalProductBlockchain.blockhain;
    for (let i = 0; i < blockchain.length; i++) {
        const block = blockchain[i];
        const product = block.data.productName;
        if (product.toLowerCase() === searchTerm.toLowerCase()) {
            return block;
        }
    }
    return null;
};
exports.searchProductInBlockchain = searchProductInBlockchain;
const getAllProductsInBlockchain = () => {
    if (!Scan_1.globalProductBlockchain) {
        return [];
    }
    return Scan_1.globalProductBlockchain.blockhain;
};
exports.getAllProductsInBlockchain = getAllProductsInBlockchain;
//# sourceMappingURL=ProductChainUtil.js.map