import sha256 from 'crypto-js/sha256';

/**
 * Certificate data structure for blockchain storage
 */
export interface CertificateData {
    certificateId: string;
    certificateType: 'company' | 'product';
    pdfHash: string; // SHA-256 hash of the PDF file
    entityId: string; // Company ID or Product ID
    entityName: string; // Company name or Product name
    licenseNumber?: string; // For company certificates
    ltoNumber?: string; // For product certificates
    cfprNumber?: string; // For product certificates
    issuedDate: Date;
    sepoliaTransactionId?: string; // Sepolia blockchain transaction hash
    metadata?: Record<string, any>;
}

/**
 * Block structure for certificate blockchain
 */
export class CertificateBlock {
    index: number;
    timestamp: Date;
    data: CertificateData;
    precedingHash: string;
    hash: string;
    nonce: number;
    difficulty: number;

    constructor(
        index: number, 
        timestamp: Date, 
        data: CertificateData, 
        precedingHash: string = "0"
    ) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.precedingHash = precedingHash;
        this.nonce = 0;
        this.difficulty = 4;
        this.hash = this.computeHash();
    }

    /**
     * Compute SHA-256 hash of the block
     */
    computeHash(): string {
        return sha256(
            this.index + 
            this.precedingHash + 
            this.timestamp + 
            JSON.stringify(this.data) + 
            this.nonce
        ).toString();
    }

    /**
     * Proof of Work - Mining the block
     */
    proofOfWork(difficulty: number): void {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.computeHash();
        }
    }

    /**
     * Verify block integrity
     */
    isValid(): boolean {
        return this.hash === this.computeHash();
    }
}
