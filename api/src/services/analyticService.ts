import * as turf from '@turf/turf';
import { FeatureCollection, Point } from 'geojson';
import { ComplianceStatus } from '../types/enums';
import { 
  AnalyticsComplianceReport, 
  ClusterPoint, 
  ClusterInfo, 
  AnalyticsResults 
} from '../types/types';

export class GeospatialAnalyticsService {

  static async analyzeComplianceReports(
    reports: AnalyticsComplianceReport[],
    epsKm: number = 5.0,
    minSamples: number = 3
  ): Promise<AnalyticsResults> {

    // Filter reports that have valid location data
    const reportsWithLocation = reports.filter(report => 
      report.location?.latitude !== undefined && 
      report.location?.longitude !== undefined &&
      !isNaN(report.location.latitude) && 
      !isNaN(report.location.longitude)
    );

    if (reportsWithLocation.length === 0) {
      throw new Error('No reports with valid location data found');
    }

    // Convert to GeoJSON points for Turf.js
    const geoJsonPoints: FeatureCollection<Point> = turf.featureCollection(
      reportsWithLocation.map((report, index) => {
        const point = turf.point([
          report.location!.longitude!,
          report.location!.latitude!
        ]);
        
        // Add report data as properties
        point.properties = {
          reportIndex: index,
          reportId: report._id,
          agentId: report.agentId,
          status: report.status,
          createdAt: report.createdAt.toISOString()
        };
        
        return point;
      })
    );

    const clusteredPoints: FeatureCollection<Point> = turf.clustersDbscan(
      geoJsonPoints, 
      epsKm, 
      { 
        minPoints: minSamples,
        units: 'kilometers'
      }
    );

    const clusters: Map<number, ClusterPoint[]> = new Map();
    const noisePoints: ClusterPoint[] = [];

    clusteredPoints.features.forEach((feature, index) => {
      const clusterId = feature.properties?.cluster;
      const coordinates = feature.geometry.coordinates as [number, number];
      const reportIndex = feature.properties?.reportIndex;
      const report = reportsWithLocation[reportIndex];

      const clusterPoint: ClusterPoint = {
        index,
        coordinates,
        lng: coordinates[0],
        lat: coordinates[1],
        report,
        clusterId: clusterId ?? -1
      };

      if (clusterId === undefined || clusterId === -1) {
        noisePoints.push(clusterPoint);
      } else {
        if (!clusters.has(clusterId)) {
          clusters.set(clusterId, []);
        }
        clusters.get(clusterId)!.push(clusterPoint);
      }
    });

    // Calculate cluster statistics
    const clusterInfos: ClusterInfo[] = Array.from(clusters.entries()).map(([clusterId, points]) => {
      // Calculate cluster ceentroid
      const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
      const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

      // Calculate cluster radius (maximum distance from center to any point)
      let maxRadius = 0;
      for (const point of points) {
        const distance = turf.distance(
          turf.point([centerLng, centerLat]),
          turf.point([point.lng, point.lat]),
          { units: 'kilometers' }
        );
        maxRadius = Math.max(maxRadius, distance);
      }

      // Calculate compliance statistics for this cluster
      // Eto di ko pa sure 
      const complianceStats = points.reduce((stats, point) => {
        switch (point.report.status) {
          case ComplianceStatus.COMPLIANT:
            stats.compliant++;
            break;
          case ComplianceStatus.NON_COMPLIANT:
            stats.non_compliant++;
            break;
          case ComplianceStatus.FRAUDULENT:
            stats.fraudulent++;
            break;
        }
        return stats;
      }, { compliant: 0, non_compliant: 0, fraudulent: 0 });

      return {
        cluster_id: clusterId,
        size: points.length,
        center: { latitude: centerLat, longitude: centerLng },
        radius_km: maxRadius,
        points,
        compliance_stats: complianceStats
      };
    });

    // Sort clusters by size
    clusterInfos.sort((a, b) => b.size - a.size);

    // Calculate overall compliance statistics
    const overallCompliance = reportsWithLocation.reduce((stats, report) => {
      switch (report.status) {
        case ComplianceStatus.COMPLIANT:
          stats.total_compliant++;
          break;
        case ComplianceStatus.NON_COMPLIANT:
          stats.total_non_compliant++;
          break;
        case ComplianceStatus.FRAUDULENT:
          stats.total_fraudulent++;
          break;
      }
      return stats;
    }, { total_compliant: 0, total_non_compliant: 0, total_fraudulent: 0 });

    return {
      clustering_params: {
        eps_km: epsKm,
        min_samples: minSamples
      },
      summary: {
        total_points: reportsWithLocation.length,
        n_clusters: clusters.size,
        n_noise_points: noisePoints.length,
        noise_percentage: (noisePoints.length / reportsWithLocation.length) * 100,
        compliance_overview: overallCompliance
      },
      clusters: clusterInfos,
      noise_points: noisePoints,
      timestamp: new Date().toISOString()
    };
  }
}