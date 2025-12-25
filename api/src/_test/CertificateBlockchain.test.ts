import { Request, Response, NextFunction } from "express";
import {
  addCertificateToBlockchain,
  verifyCertificatePDF,
  getCertificateById,
  getCertificatesByEntity,
  getCertificateBlockchainStats,
  validateCertificateBlockchain,
  getCertificatesList,
  calculatePDFHash,
  getCertificatePDFUrl,
} from "../controllers/blockchain/CertificateBlockchain";
import { getCertificateBlockchain } from "../services/certificateblockchain";
import CustomError from "../utils/CustomError";

// Mock the blockchain service
jest.mock("../services/certificateblockchain");

// Mock data
const mockValidCertificateData = {
  certificateId: "CERT-COMP-123-456",
  certificateType: "company",
  pdfHash: "a".repeat(64), // Valid 64-char SHA-256 hex
  entityId: "company-123",
  entityName: "Test Company Inc.",
  licenseNumber: "LIC-001",
  metadata: { source: "test" },
};

const mockProductCertificateData = {
  certificateId: "CERT-PROD-789-012",
  certificateType: "product",
  pdfHash: "b".repeat(64),
  entityId: "product-789",
  entityName: "Test Product",
  ltoNumber: "LTO-001",
  cfprNumber: "CFPR-001",
};

const mockBlock = {
  index: 1,
  hash: "block-hash-123",
  precedingHash: "preceding-hash-000",
  timestamp: new Date("2025-01-15"),
  data: {
    certificateId: "CERT-COMP-123-456",
    certificateType: "company",
    pdfHash: "a".repeat(64),
    entityId: "company-123",
    entityName: "Test Company Inc.",
    licenseNumber: "LIC-001",
    issuedDate: new Date("2025-01-15"),
    metadata: { source: "test" },
  },
  isValid: jest.fn().mockReturnValue(true),
};

const mockProductBlock = {
  index: 2,
  hash: "block-hash-456",
  precedingHash: "block-hash-123",
  timestamp: new Date("2025-01-16"),
  data: {
    certificateId: "CERT-PROD-789-012",
    certificateType: "product",
    pdfHash: "b".repeat(64),
    entityId: "product-789",
    entityName: "Test Product",
    ltoNumber: "LTO-001",
    cfprNumber: "CFPR-001",
    issuedDate: new Date("2025-01-16"),
  },
  isValid: jest.fn().mockReturnValue(true),
};

describe("Certificate Blockchain Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockBlockchain: any;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Setup mock blockchain
    mockBlockchain = {
      blockchain: [{ data: { certificateId: "GENESIS" } }, mockBlock],
      difficulty: 4,
      findCertificateByCertificateId: jest.fn(),
      findCertificatesByEntityId: jest.fn(),
      addCertificate: jest.fn(),
      verifyCertificatePDF: jest.fn(),
      isChainValid: jest.fn().mockReturnValue(true),
      getStats: jest.fn(),
      getCertificates: jest.fn(),
    };

    (getCertificateBlockchain as jest.Mock).mockReturnValue(mockBlockchain);

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset environment
    process.env.FIREBASE_STORAGE_BUCKET = "test-bucket.firebasestorage.app";
  });

  // =========================================================================
  // ADD CERTIFICATE TO BLOCKCHAIN
  // =========================================================================
  describe("addCertificateToBlockchain", () => {
    describe("Error Cases", () => {
      it("should call next with error when required fields are missing", async () => {
        // Arrange
        req.body = {
          certificateId: "CERT-001",
          // Missing other required fields
        };

        // Act
        await addCertificateToBlockchain(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Missing required fields",
          })
        );
      });

      it("should call next with error when certificateType is invalid", async () => {
        // Arrange
        req.body = {
          ...mockValidCertificateData,
          certificateType: "invalid",
        };

        // Act
        await addCertificateToBlockchain(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Invalid certificate type",
          })
        );
      });

      it("should call next with error when pdfHash format is invalid", async () => {
        // Arrange
        req.body = {
          ...mockValidCertificateData,
          pdfHash: "invalid-hash",
        };

        // Act
        await addCertificateToBlockchain(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Invalid PDF hash format",
          })
        );
      });

      it("should call next with error when certificate already exists", async () => {
        // Arrange
        req.body = mockValidCertificateData;
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(mockBlock);

        // Act
        await addCertificateToBlockchain(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 409,
            message: "Certificate already exists",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should add company certificate successfully", async () => {
        // Arrange
        req.body = mockValidCertificateData;
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(null);
        mockBlockchain.addCertificate.mockReturnValue(mockBlock);

        // Act
        await addCertificateToBlockchain(req as Request, res as Response, next);

        // Assert
        expect(mockBlockchain.addCertificate).toHaveBeenCalledWith(
          expect.objectContaining({
            certificateId: "CERT-COMP-123-456",
            certificateType: "company",
            pdfHash: "a".repeat(64),
            entityId: "company-123",
            entityName: "Test Company Inc.",
          })
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Certificate successfully added to blockchain",
          certificate: expect.objectContaining({
            certificateId: "CERT-COMP-123-456",
            blockIndex: 1,
            certificateType: "company",
          }),
        });
      });

      it("should add product certificate successfully", async () => {
        // Arrange
        req.body = mockProductCertificateData;
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(null);
        mockBlockchain.addCertificate.mockReturnValue(mockProductBlock);

        // Act
        await addCertificateToBlockchain(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            certificate: expect.objectContaining({
              certificateId: "CERT-PROD-789-012",
              certificateType: "product",
            }),
          })
        );
      });
    });
  });

  // =========================================================================
  // VERIFY CERTIFICATE PDF
  // =========================================================================
  describe("verifyCertificatePDF", () => {
    describe("Error Cases", () => {
      it("should call next with error when required fields are missing", async () => {
        // Arrange
        req.body = { certificateId: "CERT-001" };

        // Act
        await verifyCertificatePDF(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Missing required fields",
          })
        );
      });

      it("should return 400 when PDF verification fails", async () => {
        // Arrange
        req.body = {
          certificateId: "CERT-COMP-123-456",
          pdfHash: "c".repeat(64), // Different hash
        };

        mockBlockchain.verifyCertificatePDF.mockReturnValue({
          isValid: false,
          block: mockBlock,
          message: "PDF has been tampered with",
        });

        // Act
        await verifyCertificatePDF(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "PDF has been tampered with",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should verify certificate PDF successfully", async () => {
        // Arrange
        req.body = {
          certificateId: "CERT-COMP-123-456",
          pdfHash: "a".repeat(64),
        };

        mockBlockchain.verifyCertificatePDF.mockReturnValue({
          isValid: true,
          block: mockBlock,
          message: "Certificate is authentic and verified",
        });

        // Act
        await verifyCertificatePDF(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Certificate is authentic and verified",
          verification: expect.objectContaining({
            isValid: true,
            certificateId: "CERT-COMP-123-456",
            pdfHashMatch: true,
          }),
        });
      });
    });
  });

  // =========================================================================
  // GET CERTIFICATE BY ID
  // =========================================================================
  describe("getCertificateById", () => {
    describe("Error Cases", () => {
      it("should call next with 404 when certificate not found", async () => {
        // Arrange
        req.params = { certificateId: "CERT-NONEXISTENT" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(null);

        // Act
        await getCertificateById(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: "Certificate not found",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should return certificate details successfully", async () => {
        // Arrange
        req.params = { certificateId: "CERT-COMP-123-456" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(mockBlock);

        // Act
        await getCertificateById(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Certificate found",
          certificate: expect.objectContaining({
            certificateId: "CERT-COMP-123-456",
            blockIndex: 1,
            blockHash: "block-hash-123",
            entityName: "Test Company Inc.",
            isBlockValid: true,
          }),
        });
      });
    });
  });

  // =========================================================================
  // GET CERTIFICATES BY ENTITY
  // =========================================================================
  describe("getCertificatesByEntity", () => {
    it("should return certificates for entity", async () => {
      // Arrange
      req.params = { entityId: "company-123" };
      mockBlockchain.findCertificatesByEntityId.mockReturnValue([mockBlock]);

      // Act
      await getCertificatesByEntity(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Found 1 certificate(s) for entity",
        certificates: expect.arrayContaining([
          expect.objectContaining({
            certificateId: "CERT-COMP-123-456",
            entityName: "Test Company Inc.",
          }),
        ]),
      });
    });

    it("should return empty array when no certificates found", async () => {
      // Arrange
      req.params = { entityId: "nonexistent-entity" };
      mockBlockchain.findCertificatesByEntityId.mockReturnValue([]);

      // Act
      await getCertificatesByEntity(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Found 0 certificate(s) for entity",
        certificates: [],
      });
    });
  });

  // =========================================================================
  // GET BLOCKCHAIN STATS
  // =========================================================================
  describe("getCertificateBlockchainStats", () => {
    it("should return blockchain statistics", async () => {
      // Arrange
      mockBlockchain.getStats.mockReturnValue({
        totalCertificates: 5,
        isValid: true,
        difficulty: 4,
        latestCertificate: mockBlock.data,
        companyCertificates: 3,
        productCertificates: 2,
      });

      // Act
      await getCertificateBlockchainStats(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Blockchain statistics retrieved",
        stats: expect.objectContaining({
          totalCertificates: 5,
          companyCertificates: 3,
          productCertificates: 2,
          chainIntegrity: true,
        }),
      });
    });
  });

  // =========================================================================
  // VALIDATE BLOCKCHAIN
  // =========================================================================
  describe("validateCertificateBlockchain", () => {
    it("should return valid when blockchain is intact", async () => {
      // Arrange
      mockBlockchain.isChainValid.mockReturnValue(true);

      // Act
      await validateCertificateBlockchain(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Blockchain is valid",
        validation: expect.objectContaining({
          isValid: true,
        }),
      });
    });

    it("should return invalid when blockchain is compromised", async () => {
      // Arrange
      mockBlockchain.isChainValid.mockReturnValue(false);

      // Act
      await validateCertificateBlockchain(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Blockchain integrity compromised",
        validation: expect.objectContaining({
          isValid: false,
        }),
      });
    });
  });

  // =========================================================================
  // GET CERTIFICATES LIST (PAGINATED)
  // =========================================================================
  describe("getCertificatesList", () => {
    it("should return paginated certificates list", async () => {
      // Arrange
      req.query = { page: "1", limit: "10" };
      mockBlockchain.getCertificates.mockReturnValue({
        certificates: [mockBlock, mockProductBlock],
        total: 2,
        page: 1,
        totalPages: 1,
      });

      // Act
      await getCertificatesList(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Certificates retrieved",
        data: expect.arrayContaining([
          expect.objectContaining({
            certificateId: "CERT-COMP-123-456",
          }),
          expect.objectContaining({
            certificateId: "CERT-PROD-789-012",
          }),
        ]),
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_items: 2,
          items_per_page: 10,
        },
      });
    });

    it("should use default pagination when not provided", async () => {
      // Arrange
      req.query = {};
      mockBlockchain.getCertificates.mockReturnValue({
        certificates: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      // Act
      await getCertificatesList(req as Request, res as Response, next);

      // Assert
      expect(mockBlockchain.getCertificates).toHaveBeenCalledWith(1, 20);
    });
  });

  // =========================================================================
  // CALCULATE PDF HASH
  // =========================================================================
  describe("calculatePDFHash", () => {
    describe("Error Cases", () => {
      it("should call next with error when pdfBase64 is missing", async () => {
        // Arrange
        req.body = {};

        // Act
        await calculatePDFHash(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Missing PDF data",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should calculate hash from base64 PDF", async () => {
        // Arrange
        const testPdfBase64 = Buffer.from("test pdf content").toString("base64");
        req.body = { pdfBase64: testPdfBase64 };

        // Act
        await calculatePDFHash(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "PDF hash calculated",
          pdfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          fileSize: expect.any(Number),
        });
      });
    });
  });

  // =========================================================================
  // GET CERTIFICATE PDF URL
  // =========================================================================
  describe("getCertificatePDFUrl", () => {
    describe("Error Cases", () => {
      it("should call next with 404 when certificate not found", async () => {
        // Arrange
        req.params = { certificateId: "CERT-COMP-NONEXISTENT" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(null);

        // Act
        await getCertificatePDFUrl(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: "Certificate not found",
          })
        );
      });

      it("should call next with 400 for invalid certificate ID format", async () => {
        // Arrange
        const invalidBlock = {
          ...mockBlock,
          data: { ...mockBlock.data, certificateId: "INVALID-FORMAT-123" },
        };
        req.params = { certificateId: "INVALID-FORMAT-123" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(invalidBlock);

        // Act
        await getCertificatePDFUrl(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Invalid certificate ID format",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should return PDF URL for company certificate", async () => {
        // Arrange
        req.params = { certificateId: "CERT-COMP-123-456" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(mockBlock);

        // Act
        await getCertificatePDFUrl(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Certificate PDF URL retrieved",
          certificate: expect.objectContaining({
            certificateId: "CERT-COMP-123-456",
            certificateType: "company",
            pdfUrl: expect.stringContaining("certificates%2Fcompany%2FCERT-COMP-123-456.pdf"),
          }),
        });
      });

      it("should return PDF URL for product certificate", async () => {
        // Arrange
        req.params = { certificateId: "CERT-PROD-789-012" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(mockProductBlock);

        // Act
        await getCertificatePDFUrl(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Certificate PDF URL retrieved",
          certificate: expect.objectContaining({
            certificateId: "CERT-PROD-789-012",
            certificateType: "product",
            pdfUrl: expect.stringContaining("certificates%2Fproduct%2FCERT-PROD-789-012.pdf"),
          }),
        });
      });

      it("should use environment variable for bucket name", async () => {
        // Arrange
        process.env.FIREBASE_STORAGE_BUCKET = "custom-bucket.firebasestorage.app";
        req.params = { certificateId: "CERT-COMP-123-456" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(mockBlock);

        // Act
        await getCertificatePDFUrl(req as Request, res as Response, next);

        // Assert
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            certificate: expect.objectContaining({
              pdfUrl: expect.stringContaining("custom-bucket.firebasestorage.app"),
            }),
          })
        );
      });

      it("should use default bucket when env variable not set", async () => {
        // Arrange
        delete process.env.FIREBASE_STORAGE_BUCKET;
        req.params = { certificateId: "CERT-COMP-123-456" };
        mockBlockchain.findCertificateByCertificateId.mockReturnValue(mockBlock);

        // Act
        await getCertificatePDFUrl(req as Request, res as Response, next);

        // Assert
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            certificate: expect.objectContaining({
              pdfUrl: expect.stringContaining("rcv-firebase-dev.firebasestorage.app"),
            }),
          })
        );
      });
    });
  });
});
