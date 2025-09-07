import { CryptoBlock } from "./cryptoblock";

export class CryptoBlockChain {
    blockhain: CryptoBlock[];
    difficulty: number;

    constructor() {
        this.blockhain = [this.startGenesisBlock()];
        this.difficulty = 4;
    }

    startGenesisBlock() {
        return new CryptoBlock(0, new Date(), "Initial Block in the Chain", "0");
    }

    obtainLatestBlock() {
        return this.blockhain[this.blockhain.length - 1];
    }

    addNewBlock(newBlock: CryptoBlock) {
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