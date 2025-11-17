import { CertificateBlock, CertificateData } from './certificateblock';

/**
 * Blockchain for certificate verification
 * Stores immutable records of all issued certificates with their PDF hashes
 */
export class CertificateBlockchain {
    blockchain: CertificateBlock[];
    difficulty: number;

    constructor() {
        this.blockchain = [this.createGenesisBlock()];
        this.difficulty = 4;
    }

    /**
     * Create the genesis (first) block
     */
    private createGenesisBlock(): CertificateBlock {
        const genesisData: CertificateData = {
            certificateId: 'GENESIS',
            certificateType: 'company',
            pdfHash: '0000000000000000000000000000000000000000000000000000000000000000',
            entityId: 'SYSTEM',
            entityName: 'RCV Certificate System',
            issuedDate: new Date('2025-01-01'),
            metadata: {
                version: '1.0.0',
                description: 'Genesis block for RCV Certificate Blockchain'
            }
        };
        
        return new CertificateBlock(0, new Date('2025-01-01'), genesisData, "0");
    }

    /**
     * Get the latest block in the chain
     */
    getLatestBlock(): CertificateBlock {
        return this.blockchain[this.blockchain.length - 1];
    }

    /**
     * Add a new certificate to the blockchain
     */
    addCertificate(certificateData: CertificateData): CertificateBlock {
        const newBlock = new CertificateBlock(
            this.blockchain.length,
            new Date(),
            certificateData,
            this.getLatestBlock().hash
        );
        
        // Mine the block (Proof of Work)
        newBlock.proofOfWork(this.difficulty);
        
        // Add to blockchain
        this.blockchain.push(newBlock);
        
        return newBlock;
    }

    /**
     * Verify the entire blockchain integrity
     */
    isChainValid(): boolean {
        for (let i = 1; i < this.blockchain.length; i++) {
            const currentBlock = this.blockchain[i];
            const previousBlock = this.blockchain[i - 1];

            // Check if current block hash is valid
            if (currentBlock.hash !== currentBlock.computeHash()) {
                console.error(`Block ${i} has invalid hash`);
                return false;
            }

            // Check if current block's preceding hash matches previous block's hash
            if (currentBlock.precedingHash !== previousBlock.hash) {
                console.error(`Block ${i} has invalid preceding hash`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Find certificate by ID
     */
    findCertificateByCertificateId(certificateId: string): CertificateBlock | null {
        return this.blockchain.find(block => block.data.certificateId === certificateId) || null;
    }

    /**
     * Find certificate by entity ID (company or product)
     */
    findCertificatesByEntityId(entityId: string): CertificateBlock[] {
        return this.blockchain.filter(block => block.data.entityId === entityId);
    }

    /**
     * Verify if a PDF hash matches the blockchain record
     */
    verifyCertificatePDF(certificateId: string, pdfHash: string): {
        isValid: boolean;
        block: CertificateBlock | null;
        message: string;
    } {
        const block = this.findCertificateByCertificateId(certificateId);
        
        if (!block) {
            return {
                isValid: false,
                block: null,
                message: 'Certificate not found in blockchain'
            };
        }

        if (block.data.pdfHash !== pdfHash) {
            return {
                isValid: false,
                block,
                message: 'PDF has been tampered with - hash does not match blockchain record'
            };
        }

        // Verify block integrity
        if (!block.isValid()) {
            return {
                isValid: false,
                block,
                message: 'Blockchain block has been corrupted'
            };
        }

        return {
            isValid: true,
            block,
            message: 'Certificate is authentic and verified'
        };
    }

    /**
     * Get blockchain statistics
     */
    getStats() {
        return {
            totalCertificates: this.blockchain.length - 1, // Exclude genesis
            isValid: this.isChainValid(),
            difficulty: this.difficulty,
            latestCertificate: this.getLatestBlock().data,
            companyCertificates: this.blockchain.filter(b => b.data.certificateType === 'company').length - 1,
            productCertificates: this.blockchain.filter(b => b.data.certificateType === 'product').length
        };
    }

    /**
     * Get all certificates with pagination
     */
    getCertificates(page: number = 1, limit: number = 20): {
        certificates: CertificateBlock[];
        total: number;
        page: number;
        totalPages: number;
    } {
        // Exclude genesis block
        const certificates = this.blockchain.slice(1);
        const total = certificates.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return {
            certificates: certificates.slice(startIndex, endIndex),
            total,
            page,
            totalPages
        };
    }
}

// Global singleton instance
let globalCertificateBlockchain: CertificateBlockchain | null = null;

/**
 * Initialize the global certificate blockchain
 */
export const initializeCertificateBlockchain = (): CertificateBlockchain => {
    if (!globalCertificateBlockchain) {
        globalCertificateBlockchain = new CertificateBlockchain();
    }
    return globalCertificateBlockchain;
};

/**
 * Get the global certificate blockchain instance
 */
export const getCertificateBlockchain = (): CertificateBlockchain => {
    if (!globalCertificateBlockchain) {
        return initializeCertificateBlockchain();
    }
    return globalCertificateBlockchain;
};
