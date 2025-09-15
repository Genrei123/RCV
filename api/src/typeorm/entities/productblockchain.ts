import { Product } from "./product.entity";
import { ProductBlock } from "./productblock";

export class ProductBlockchain {
    blockhain: ProductBlock[];
    difficulty: number;

    constructor(Product: Product) {
        this.blockhain = [this.startGenesisBlock(Product)];
        this.difficulty = 4;
    }

    startGenesisBlock(Product: Product) {
        return new ProductBlock(0, new Date(), Product , "0");
    }

    obtainLatestBlock() {
        return this.blockhain[this.blockhain.length - 1];
    }

    addNewBlock(newBlock: ProductBlock) {
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