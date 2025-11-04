"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductBlockchain = void 0;
const productblock_1 = require("./productblock");
class ProductBlockchain {
    constructor(Product) {
        this.blockhain = [this.startGenesisBlock(Product)];
        this.difficulty = 4;
    }
    startGenesisBlock(Product) {
        return new productblock_1.ProductBlock(0, new Date(), Product, "0");
    }
    obtainLatestBlock() {
        return this.blockhain[this.blockhain.length - 1];
    }
    addNewBlock(newBlock) {
        newBlock.precedingHash = this.obtainLatestBlock().hash;
        // newBlock.hash = newBlock.computeHash();
        newBlock.proofOfWork(this.difficulty);
        this.blockhain.push(newBlock);
    }
    checkChainValidity() {
        for (let i = 1; i < this.blockhain.length; i++) {
            const currentBlock = this.blockhain[i];
            const precedingBlock = this.blockhain[i - 1];
            if (currentBlock.hash !== currentBlock.computeHash()) {
                return false;
            }
            if (currentBlock.precedingHash !== precedingBlock.hash) {
                return false;
            }
        }
        return true;
    }
}
exports.ProductBlockchain = ProductBlockchain;
//# sourceMappingURL=productblockchain.js.map