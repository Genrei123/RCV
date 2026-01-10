// Mock app-root-path before any imports to prevent initialization errors
jest.mock('app-root-path', () => ({
  path: '/mock/app/root',
  resolve: jest.fn((pathToResolve: string) => `/mock/app/root/${pathToResolve}`),
  toString: () => '/mock/app/root',
}));

// Mock all dependencies before imports
jest.mock('../typeorm/data-source');
jest.mock('../services/analyticService');

import { Request, Response, NextFunction } from 'express';
import {
  healthCheck,
  analyzeCompliance,
} from '../controllers/analytics/Analytics';
import { ComplianceReportRepo } from '../typeorm/data-source';
import { GeospatialAnalyticsService } from '../services/analyticService';

// Mock data
const mockAnalyticsReport = {
  _id: '123e4567-e89b-12d3-a456-426614174000',
  agentId: '550e8400-e29b-41d4-a716-446655440000',
  status: 'COMPLIANT',
  frontImageUrl: 'https://storage.googleapis.com/bucket/front.jpg',
  backImageUrl: 'https://storage.googleapis.com/bucket/back.jpg',
  scannedData: {
    productName: 'Test Product',
    brandName: 'Test Brand',
  },
  location: {
    latitude: 14.5995,
    longitude: 120.9842,
    address: 'Manila, Philippines',
  },
  nonComplianceReason: null,
  createdAt: new Date('2025-01-15'),
  ocrBlobText: 'Sample OCR text',
  productSearchResult: { match: true },
};

const mockNonCompliantReport = {
  _id: '223e4567-e89b-12d3-a456-426614174001',
  agentId: '550e8400-e29b-41d4-a716-446655440000',
  status: 'NON_COMPLIANT',
  frontImageUrl: 'https://storage.googleapis.com/bucket/front2.jpg',
  backImageUrl: 'https://storage.googleapis.com/bucket/back2.jpg',
  scannedData: {
    productName: 'Fake Product',
    brandName: 'Fake Brand',
  },
  location: {
    latitude: 14.6760,
    longitude: 121.0437,
    address: 'Quezon City, Philippines',
  },
  nonComplianceReason: 'COUNTERFEIT',
  createdAt: new Date('2025-01-16'),
  ocrBlobText: 'Fake OCR text',
  productSearchResult: { match: false },
};

const mockAnalyticsResults = {
  clustering_params: {
    eps_km: 1,
    min_samples: 3,
  },
  summary: {
    total_points: 2,
    n_clusters: 1,
    n_noise_points: 0,
    noise_percentage: 0,
    compliance_overview: {
      total_compliant: 1,
      total_non_compliant: 1,
      total_fraudulent: 0,
    },
  },
  clusters: [
    {
      cluster_id: 0,
      size: 2,
      center: { latitude: 14.63775, longitude: 121.01405 },
      radius_km: 10.5,
      points: [],
      compliance_stats: {
        compliant: 1,
        non_compliant: 1,
        fraudulent: 0,
      },
    },
  ],
  noise_points: [],
  timestamp: new Date().toISOString(),
};

describe('Analytics Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  // Suppress console.error output in tests
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      params: {},
    } as Partial<Request>;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy status with service information', async () => {
      // Act
      await healthCheck(req as Request, res as Response, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          service: 'DBSCAN Geospatial Analytics API',
          version: '1.0.0',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('analyzeCompliance', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      // Mock query builder
      mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAnalyticsReport, mockNonCompliantReport])
      };

      // Mock ComplianceReportRepo
      (ComplianceReportRepo.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue(mockQueryBuilder);

      // Mock GeospatialAnalyticsService.analyzeComplianceReports
      (GeospatialAnalyticsService.analyzeComplianceReports as jest.Mock).mockResolvedValue(
        mockAnalyticsResults
      );
    });

    describe('Success Cases', () => {
      it('should successfully analyze compliance reports with default parameters', async () => {
        // Arrange
        req.query = {};

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(ComplianceReportRepo.createQueryBuilder).toHaveBeenCalledWith('report');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('report.location IS NOT NULL');
        expect(GeospatialAnalyticsService.analyzeComplianceReports).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              _id: mockAnalyticsReport._id,
              location: expect.objectContaining({
                latitude: 14.5995,
                longitude: 120.9842,
              }),
            }),
          ]),
          1000, // default maxDistance
          3 // default minPoints
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Compliance analysis completed successfully',
            data: mockAnalyticsResults,
            parameters: {
              maxDistance: 1000,
              minPoints: 3,
              agentId: 'all',
            },
          })
        );
      });

      it('should analyze compliance reports with custom parameters', async () => {
        // Arrange
        req.query = {
          maxDistance: '500',
          minPoints: '5',
          agentId: '550e8400-e29b-41d4-a716-446655440000',
        };

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(GeospatialAnalyticsService.analyzeComplianceReports).toHaveBeenCalledWith(
          expect.any(Array),
          500,
          5
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            parameters: {
              maxDistance: 500,
              minPoints: 5,
              agentId: '550e8400-e29b-41d4-a716-446655440000',
            },
          })
        );
      });

      it('should filter out reports without location data', async () => {
        // Arrange
        const reportWithoutLocation = {
          ...mockAnalyticsReport,
          _id: 'no-location-id',
          location: null,
        };
        mockQueryBuilder.getMany.mockResolvedValue([mockAnalyticsReport]);

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(GeospatialAnalyticsService.analyzeComplianceReports).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              _id: mockAnalyticsReport._id,
            }),
          ]),
          expect.any(Number),
          expect.any(Number)
        );

        // Verify the filtered array doesn't contain the report without location
        const calledWith = (GeospatialAnalyticsService.analyzeComplianceReports as jest.Mock)
          .mock.calls[0][0];
        expect(calledWith).toHaveLength(1);
        expect(calledWith.find((r: any) => r._id === 'no-location-id')).toBeUndefined();
      });

      it('should return empty result when no reports are found', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'No compliance reports with location data found',
          data: {
            totalReports: 0,
            clusters: [],
            statistics: {
              totalClusters: 0,
              totalCompliantReports: 0,
              totalNonCompliantReports: 0,
              averageReportsPerCluster: 0,
            },
          },
        });
        expect(GeospatialAnalyticsService.analyzeComplianceReports).not.toHaveBeenCalled();
      });

      it('should properly map all report fields to AnalyticsComplianceReport format', async () => {
        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        const calledWith = (GeospatialAnalyticsService.analyzeComplianceReports as jest.Mock)
          .mock.calls[0][0];
        
        expect(calledWith[0]).toMatchObject({
          _id: mockAnalyticsReport._id,
          agentId: mockAnalyticsReport.agentId,
          status: mockAnalyticsReport.status,
          scannedData: mockAnalyticsReport.scannedData,
          nonComplianceReason: mockAnalyticsReport.nonComplianceReason,
          frontImageUrl: mockAnalyticsReport.frontImageUrl,
          backImageUrl: mockAnalyticsReport.backImageUrl,
          ocrBlobText: mockAnalyticsReport.ocrBlobText,
          productSearchResult: mockAnalyticsReport.productSearchResult,
          location: {
            latitude: mockAnalyticsReport.location.latitude,
            longitude: mockAnalyticsReport.location.longitude,
            address: mockAnalyticsReport.location.address,
          },
        });
      });
    });

    describe('Error Cases', () => {
      it('should return 500 when database query fails', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to perform compliance analysis',
          message: 'Database error',
        });
      });

      it('should return 500 when JSON parsing fails', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue('invalid data');

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Failed to perform compliance analysis',
          })
        );
      });

      it('should return 500 when GeospatialAnalyticsService throws an error', async () => {
        // Arrange
        (GeospatialAnalyticsService.analyzeComplianceReports as jest.Mock).mockRejectedValue(
          new Error('Analysis failed')
        );

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to perform compliance analysis',
          message: 'Analysis failed',
        });
      });

      it('should handle unknown errors gracefully', async () => {
        // Arrange
        (GeospatialAnalyticsService.analyzeComplianceReports as jest.Mock).mockRejectedValue(
          'Non-error object'
        );

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to perform compliance analysis',
          message: 'Unknown error',
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle reports with missing optional fields', async () => {
        // Arrange
        const minimalReport = {
          _id: 'minimal-id',
          agentId: 'agent-id',
          status: 'COMPLIANT',
          scannedData: {},
          frontImageUrl: 'front.jpg',
          backImageUrl: 'back.jpg',
          createdAt: new Date('2025-01-15'),
          location: {
            latitude: 14.5995,
            longitude: 120.9842,
            address: 'Manila',
          },
        };
        mockQueryBuilder.getMany.mockResolvedValue([minimalReport]);

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(GeospatialAnalyticsService.analyzeComplianceReports).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
          })
        );
      });

      it('should handle very large maxDistance values', async () => {
        // Arrange
        req.query = {
          maxDistance: '999999',
          minPoints: '1',
        };

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(GeospatialAnalyticsService.analyzeComplianceReports).toHaveBeenCalledWith(
          expect.any(Array),
          999999,
          1
        );
      });

      it('should convert string query parameters to numbers correctly', async () => {
        // Arrange
        req.query = {
          maxDistance: '2500',
          minPoints: '10',
        };

        // Act
        await analyzeCompliance(req as Request, res as Response, next);

        // Assert
        expect(GeospatialAnalyticsService.analyzeComplianceReports).toHaveBeenCalledWith(
          expect.any(Array),
          2500,
          10
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            parameters: {
              maxDistance: 2500,
              minPoints: 10,
              agentId: 'all',
            },
          })
        );
      });
    });
  });
});
