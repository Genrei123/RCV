import { Request, Response, NextFunction } from 'express';
import { GeospatialAnalyticsService } from '../../services/analyticService';
import { ComplianceReportRepo } from '../../typeorm/data-source';
import { AnalyticsComplianceReport } from '../../types/types';
import * as fs from 'fs';
import * as path from 'path';

export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      status: 'healthy',
      service: 'DBSCAN Geospatial Analytics API',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Analytics health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Internal server error'
    });
  }
};

export const analyzeCompliance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate query parameters
    const maxDistance = Number(req.query.maxDistance) || 1000;
    const minPoints = Number(req.query.minPoints) || 3;
    const agentId = req.query.agentId as string | undefined;

    // Validate parameters
    if (maxDistance <= 0 || minPoints < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'maxDistance must be positive and minPoints must be at least 1'
      });
    }
    
    // Build query for reports with valid location data
    let query = ComplianceReportRepo.createQueryBuilder('report')
      .where('report.location IS NOT NULL')
      .andWhere("report.location::jsonb ? 'latitude'")
      .andWhere("report.location::jsonb ? 'longitude'");
    
    // Filter by agent if provided
    if (agentId && typeof agentId === 'string') {
      query = query.andWhere('report.agentId = :agentId', { agentId });
    }
    
    const reports = await query.getMany();
    
    // Json file para sa testing ng data instead of db (comment out nalagn)
    //const jsonFilePath = path.join(__dirname, '../../../sample_reports_api.json');
    //const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
    //const reports: any[] = JSON.parse(jsonData);
    
    if (reports.length === 0) {
      return res.json({
        success: true,
        message: 'No compliance reports with location data found',
        data: {
          totalReports: 0,
          clusters: [],
          statistics: {
            totalClusters: 0,
            totalCompliantReports: 0,
            totalNonCompliantReports: 0,
            averageReportsPerCluster: 0
          }
        }
      });
    }

    const analyticsReports: AnalyticsComplianceReport[] = reports
      .filter(report => 
        report.location && 
        typeof report.location.latitude === 'number' && 
        typeof report.location.longitude === 'number'
      )
      .map(report => ({
        _id: report._id,
        agentId: report.agentId,
        status: report.status,
        scannedData: report.scannedData,
        nonComplianceReason: report.nonComplianceReason,
        additionalNotes: report.additionalNotes,
        frontImageUrl: report.frontImageUrl,
        backImageUrl: report.backImageUrl,
        createdAt: new Date(report.createdAt),
        ocrBlobText: report.ocrBlobText,
        productSearchResult: report.productSearchResult,
        location: {
          latitude: report.location!.latitude!,
          longitude: report.location!.longitude!,
          address: report.location!.address
        }
      }));

    // Perform DBSCAN clustering analysis
    const results = await GeospatialAnalyticsService.analyzeComplianceReports(
      analyticsReports,
      maxDistance,
      minPoints
    );
    
    res.json({
      success: true,
      message: 'Compliance analysis completed successfully',
      data: results,
      parameters: {
        maxDistance,
        minPoints,
        agentId: agentId || 'all'
      }
    });

  } catch (error) {
    console.error('Analytics analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform compliance analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};



