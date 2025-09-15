import sha256 from 'crypto-js/sha256';
import { Product } from './product.entity';
export class ProductBlock {
    index: number;
    timestamp: Date
    data: Product;
    precedingHash: string;
    hash: string;
    nonce: number;
    difficulty: number;

    constructor(index: number, timestamp: Date, data: Product, precedingHash=" ") {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.precedingHash = precedingHash;
        this.hash = this.computeHash();
        this.nonce = 0;
        this.difficulty = 4;
    }

    computeHash() {
        return sha256(this.index + this.precedingHash + this.timestamp + JSON.stringify(this.data) + this.nonce).toString();
    }

    proofOfWork(difficulty: number) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.computeHash();
        }
    }
}
