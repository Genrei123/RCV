import { Request, Response, NextFunction } from "express";
import { createComplianceReport } from "../controllers/compliance/CreateComplianceReport";
import {
  getComplianceReports,
  getComplianceReportById,
} from "../controllers/compliance/GetComplianceReports";
import { DB } from "../typeorm/data-source";
import { AuditLogService } from "../services/auditLogService";
import { FirebaseStorageValidator } from "../utils/FirebaseStorageValidator";
import CustomError from "../utils/CustomError";

// Mock all dependencies
jest.mock("../typeorm/data-source");
jest.mock("../services/auditLogService");
jest.mock("../utils/FirebaseStorageValidator");

// Mock data
const mockUser = {
  _id: "550e8400-e29b-41d4-a716-446655440000",
  email: "agent@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "AGENT",
};

const mockComplianceReport = {
  _id: "123e4567-e89b-12d3-a456-426614174000",
  agentId: "550e8400-e29b-41d4-a716-446655440000",
  status: "COMPLIANT",
  frontImageUrl: "https://storage.googleapis.com/bucket/front.jpg",
  backImageUrl: "https://storage.googleapis.com/bucket/back.jpg",
  scannedData: {
    productName: "Test Product",
    brandName: "Test Brand",
  },
  location: {
    latitude: 14.5995,
    longitude: 120.9842,
    address: "Manila, Philippines",
  },
  nonComplianceReason: null,
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-01-15"),
};

const mockNonCompliantReport = {
  _id: "223e4567-e89b-12d3-a456-426614174001",
  agentId: "550e8400-e29b-41d4-a716-446655440000",
  status: "NON_COMPLIANT",
  frontImageUrl: "https://storage.googleapis.com/bucket/front2.jpg",
  backImageUrl: "https://storage.googleapis.com/bucket/back2.jpg",
  scannedData: {
    productName: "Fake Product",
    brandName: "Fake Brand",
  },
  location: {
    latitude: 14.6760,
    longitude: 121.0437,
    address: "Quezon City, Philippines",
  },
  nonComplianceReason: "COUNTERFEIT",
  createdAt: new Date("2025-01-16"),
  updatedAt: new Date("2025-01-16"),
};

describe("Compliance Report Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockComplianceRepo: any;

  // Suppress console.error output in tests
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      ip: "127.0.0.1",
      get: jest.fn().mockReturnValue("Mozilla/5.0"),
    } as Partial<Request>;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Setup mock repository
    mockComplianceRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };

    (DB.getRepository as jest.Mock).mockReturnValue(mockComplianceRepo);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("createComplianceReport", () => {
    beforeEach(() => {
      (req as any).user = mockUser;
      req.body = {
        status: "COMPLIANT",
        frontImageUrl: "https://storage.googleapis.com/bucket/front.jpg",
        backImageUrl: "https://storage.googleapis.com/bucket/back.jpg",
        scannedData: {
          productName: "Test Product",
          brandName: "Test Brand",
        },
        location: {
          latitude: 14.5995,
          longitude: 120.9842,
          address: "Manila, Philippines",
        },
      };
    });

    describe("Error Cases", () => {
      it("should return 401 when user is not authenticated", async () => {
        // Arrange
        (req as any).user = null;

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "User not authenticated",
          })
        );
      });

      it("should return 400 when front image URL is missing", async () => {
        // Arrange
        req.body.frontImageUrl = null;

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: expect.stringContaining("Validation error"),
          })
        );
      });

      it("should return 400 when back image URL is missing", async () => {
        // Arrange
        req.body.backImageUrl = null;

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: expect.stringContaining("Validation error"),
          })
        );
      });

      it("should return 400 when front image URL validation fails", async () => {
        // Arrange
        (FirebaseStorageValidator.validateScanUrls as jest.Mock).mockResolvedValueOnce({
          valid: false,
          error: "Invalid Firebase Storage URL format",
        });

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Invalid Firebase Storage URL format",
          })
        );
      });

      it("should return 400 when back image URL validation fails", async () => {
        // Arrange
        (FirebaseStorageValidator.validateScanUrls as jest.Mock)
          .mockResolvedValueOnce({ valid: true })
          .mockResolvedValueOnce({
            valid: false,
            error: "Invalid back image URL",
          });

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: "Invalid back image URL",
          })
        );
      });

      it("should return 500 when database save fails", async () => {
        // Arrange
        (FirebaseStorageValidator.validateScanUrls as jest.Mock).mockResolvedValue({
          valid: true,
        });
        mockComplianceRepo.create.mockReturnValue(mockComplianceReport);
        mockComplianceRepo.save.mockRejectedValue(new Error("Database error"));

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: "Failed to create compliance report",
          })
        );
      });
    });

    describe("Success Cases", () => {
      beforeEach(() => {
        (FirebaseStorageValidator.validateScanUrls as jest.Mock).mockResolvedValue({
          valid: true,
        });
        mockComplianceRepo.create.mockReturnValue(mockComplianceReport);
        mockComplianceRepo.save.mockResolvedValue(mockComplianceReport);
        (AuditLogService.createLog as jest.Mock).mockResolvedValue(undefined);
      });

      it("should create compliance report successfully for compliant product", async () => {
        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            agentId: mockUser._id,
            status: "COMPLIANT",
            frontImageUrl: req.body.frontImageUrl,
            backImageUrl: req.body.backImageUrl,
            scannedData: req.body.scannedData,
            location: req.body.location,
          })
        );

        expect(mockComplianceRepo.save).toHaveBeenCalledWith(mockComplianceReport);

        expect(AuditLogService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser._id,
            action: expect.stringContaining("Agent submitted compliance report"),
            actionType: "COMPLIANCE_REPORT",
            platform: "MOBILE",
            metadata: expect.objectContaining({
              reportId: mockComplianceReport._id,
              status: "COMPLIANT",
              productName: "Test Product",
              frontImageUrl: req.body.frontImageUrl,
              backImageUrl: req.body.backImageUrl,
            }),
          })
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Compliance report created successfully",
          data: mockComplianceReport,
        });
      });

      it("should create compliance report successfully for non-compliant product", async () => {
        // Arrange
        req.body.status = "NON_COMPLIANT";
        req.body.nonComplianceReason = "COUNTERFEIT";
        mockComplianceRepo.create.mockReturnValue(mockNonCompliantReport);
        mockComplianceRepo.save.mockResolvedValue(mockNonCompliantReport);

        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            agentId: mockUser._id,
            status: "NON_COMPLIANT",
            nonComplianceReason: "COUNTERFEIT",
          })
        );

        expect(AuditLogService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              status: "NON_COMPLIANT",
              nonComplianceReason: "COUNTERFEIT",
            }),
          })
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: "Compliance report created successfully",
          data: mockNonCompliantReport,
        });
      });

      it("should validate both image URLs before creating report", async () => {
        // Act
        await createComplianceReport(req as Request, res as Response, next);

        // Assert
        expect(FirebaseStorageValidator.validateScanUrls).toHaveBeenCalledTimes(2);
        expect(FirebaseStorageValidator.validateScanUrls).toHaveBeenNthCalledWith(
          1,
          req.body.frontImageUrl,
          undefined
        );
        expect(FirebaseStorageValidator.validateScanUrls).toHaveBeenNthCalledWith(
          2,
          undefined,
          req.body.backImageUrl
        );
      });
    });
  });

  describe("getComplianceReports", () => {
    beforeEach(() => {
      (req as any).user = mockUser;
      req.query = { page: "1", limit: "10" };
    });

    describe("Error Cases", () => {
      it("should return 401 when user is not authenticated", async () => {
        // Arrange
        (req as any).user = null;

        // Act
        await getComplianceReports(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "User not authenticated",
          })
        );
      });

      it("should return 500 when database query fails", async () => {
        // Arrange
        mockComplianceRepo.findAndCount.mockRejectedValue(new Error("Database error"));

        // Act
        await getComplianceReports(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: "Database error",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should return paginated compliance reports for authenticated user", async () => {
        // Arrange
        const mockReports = [mockComplianceReport, mockNonCompliantReport];
        mockComplianceRepo.findAndCount.mockResolvedValue([mockReports, 2]);

        // Act
        await getComplianceReports(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.findAndCount).toHaveBeenCalledWith({
          where: { agentId: mockUser._id },
          skip: 0,
          take: 10,
          order: { createdAt: "DESC" },
        });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockReports,
          pagination: expect.objectContaining({
            current_page: 1,
            per_page: 10,
            total_items: 2,
            total_pages: 1,
          }),
          links: expect.any(Object),
        });
      });

      it("should handle pagination correctly for second page", async () => {
        // Arrange
        req.query = { page: "2", limit: "10" };
        const mockReports = [mockComplianceReport];
        mockComplianceRepo.findAndCount.mockResolvedValue([mockReports, 15]);

        // Act
        await getComplianceReports(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.findAndCount).toHaveBeenCalledWith({
          where: { agentId: mockUser._id },
          skip: 10,
          take: 10,
          order: { createdAt: "DESC" },
        });

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockReports,
          pagination: expect.objectContaining({
            current_page: 2,
            per_page: 10,
            total_items: 15,
            total_pages: 2,
          }),
          links: expect.any(Object),
        });
      });

      it("should return empty array when user has no reports", async () => {
        // Arrange
        mockComplianceRepo.findAndCount.mockResolvedValue([[], 0]);

        // Act
        await getComplianceReports(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: [],
          pagination: expect.objectContaining({
            current_page: 1,
            per_page: 10,
            total_items: 0,
            total_pages: 1,
          }),
          links: expect.any(Object),
        });
      });

      it("should use default pagination when query params are not provided", async () => {
        // Arrange
        req.query = {};
        mockComplianceRepo.findAndCount.mockResolvedValue([[mockComplianceReport], 1]);

        // Act
        await getComplianceReports(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.findAndCount).toHaveBeenCalledWith({
          where: { agentId: mockUser._id },
          skip: 0,
          take: 10,
          order: { createdAt: "DESC" },
        });
      });
    });
  });

  describe("getComplianceReportById", () => {
    beforeEach(() => {
      (req as any).user = mockUser;
      req.params = { id: "123e4567-e89b-12d3-a456-426614174000" };
    });

    describe("Error Cases", () => {
      it("should return 401 when user is not authenticated", async () => {
        // Arrange
        (req as any).user = null;

        // Act
        await getComplianceReportById(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 401,
            message: "User not authenticated",
          })
        );
      });

      it("should return 404 when report is not found", async () => {
        // Arrange
        mockComplianceRepo.findOne.mockResolvedValue(null);

        // Act
        await getComplianceReportById(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: "Report not found",
          })
        );
      });

      it("should return 404 when report belongs to different user", async () => {
        // Arrange
        mockComplianceRepo.findOne.mockResolvedValue(null);
        req.params = { id: "223e4567-e89b-12d3-a456-426614174001" };

        // Act
        await getComplianceReportById(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.findOne).toHaveBeenCalledWith({
          where: {
            _id: "223e4567-e89b-12d3-a456-426614174001",
            agentId: mockUser._id,
          },
        });

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: "Report not found",
          })
        );
      });

      it("should return 500 when database query fails", async () => {
        // Arrange
        mockComplianceRepo.findOne.mockRejectedValue(new Error("Database connection lost"));

        // Act
        await getComplianceReportById(req as Request, res as Response, next);

        // Assert
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: "Database connection lost",
          })
        );
      });
    });

    describe("Success Cases", () => {
      it("should return compliance report by ID for authenticated user", async () => {
        // Arrange
        mockComplianceRepo.findOne.mockResolvedValue(mockComplianceReport);

        // Act
        await getComplianceReportById(req as Request, res as Response, next);

        // Assert
        expect(mockComplianceRepo.findOne).toHaveBeenCalledWith({
          where: {
            _id: "123e4567-e89b-12d3-a456-426614174000",
            agentId: mockUser._id,
          },
        });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: mockComplianceReport,
        });
      });

      it("should return non-compliant report with reason", async () => {
        // Arrange
        mockComplianceRepo.findOne.mockResolvedValue(mockNonCompliantReport);
        req.params = { id: "223e4567-e89b-12d3-a456-426614174001" };

        // Act
        await getComplianceReportById(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            _id: "223e4567-e89b-12d3-a456-426614174001",
            status: "NON_COMPLIANT",
            nonComplianceReason: "COUNTERFEIT",
          }),
        });
      });
    });
  });
});
