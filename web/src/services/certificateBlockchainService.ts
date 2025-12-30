import { apiClient } from './axiosConfig';

export interface CertificateBlockchainData {
  certificateId: string;
  blockIndex: number;
  certificateType: 'company' | 'product';
  entityName: string;
  issuedDate: string;
  timestamp: string;
  isValid: boolean;
}

export interface CertificateDetail {
  certificateId: string;
  blockIndex: number;
  blockHash: string;
  precedingHash: string;
  timestamp: string;
  certificateType: 'company' | 'product';
  entityId: string;
  entityName: string;
  licenseNumber?: string;
  ltoNumber?: string;
  cfprNumber?: string;
  pdfHash: string;
  issuedDate: string;
  sepoliaTransactionId?: string;
  metadata?: Record<string, any>;
  isBlockValid: boolean;
}

export interface BlockchainStats {
  totalCertificates: number;
  isValid: boolean;
  difficulty: number;
  latestCertificate: {
    certificateId: string;
    entityName: string;
  };
  companyCertificates: number;
  productCertificates: number;
  totalBlocks: number;
  chainIntegrity: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  certificateId: string;
  blockIndex?: number;
  certificateType?: string;
  entityName?: string;
  issuedDate?: string;
  pdfHashMatch: boolean;
  blockIntegrity: boolean;
  message: string;
}

export class CertificateBlockchainService {
  /**
   * Get paginated list of certificates
   */
  static async getCertificates(page: number = 1, limit: number = 20) {
    try {
      const response = await apiClient.get('/certificate-blockchain/certificates', {
        params: { page, limit }
      });
      
      return {
        success: true,
        certificates: response.data.data as CertificateBlockchainData[],
        pagination: response.data.pagination
      };
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      return {
        success: false,
        certificates: [],
        pagination: null,
        error: error.response?.data?.message || 'Failed to fetch certificates'
      };
    }
  }

  /**
   * Get certificate details by ID
   */
  static async getCertificateById(certificateId: string) {
    try {
      const response = await apiClient.get(`/certificate-blockchain/certificate/${certificateId}`);
      
      return {
        success: true,
        certificate: response.data.certificate as CertificateDetail
      };
    } catch (error: any) {
      console.error('Error fetching certificate:', error);
      return {
        success: false,
        certificate: null,
        error: error.response?.data?.message || 'Certificate not found'
      };
    }
  }

  /**
   * Get blockchain statistics
   */
  static async getStats() {
    try {
      const response = await apiClient.get('/certificate-blockchain/stats');
      
      return {
        success: true,
        stats: response.data.stats as BlockchainStats
      };
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      return {
        success: false,
        stats: null,
        error: error.response?.data?.message || 'Failed to fetch stats'
      };
    }
  }

  /**
   * Verify certificate PDF
   */
  static async verifyCertificate(certificateId: string, pdfHash: string) {
    try {
      const response = await apiClient.post('/certificate-blockchain/verify', {
        certificateId,
        pdfHash
      });
      
      return {
        success: response.data.success,
        verification: response.data.verification as VerificationResult
      };
    } catch (error: any) {
      console.error('Error verifying certificate:', error);
      return {
        success: false,
        verification: null,
        error: error.response?.data?.message || 'Verification failed'
      };
    }
  }

  /**
   * Validate entire blockchain
   */
  static async validateBlockchain() {
    try {
      const response = await apiClient.get('/certificate-blockchain/validate');
      
      return {
        success: true,
        validation: response.data.validation
      };
    } catch (error: any) {
      console.error('Error validating blockchain:', error);
      return {
        success: false,
        validation: null,
        error: error.response?.data?.message || 'Validation failed'
      };
    }
  }

  /**
   * Calculate PDF hash from file
   */
  static async calculatePDFHash(pdfFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );

          const response = await apiClient.post('/certificate-blockchain/calculate-hash', {
            pdfBase64: base64
          });

          resolve(response.data.pdfHash);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(pdfFile);
    });
  }
}
