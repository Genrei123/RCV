// API Response types
export interface ClusterPoint {
  _id: string;
  cluster: number;
  lat: string;
  latitude: number;
  long: string;
  longitude: number;
  product: string;
  remarks: string;
  scanResult: number;
  scannedAt: string;
  scannedBy: string;
}

export interface Cluster {
  center: {
    latitude: number;
    longitude: number;
  };
  cluster_id: number;
  points: ClusterPoint[];
  radius_km: number;
  size: number;
}

export interface APIResponse {
  message: string;
  metadata: {
    processing_time: string;
    total_reports_processed: number;
    total_valid_coordinates: number;
  };
  results: {
    clustering_params: {
      eps_km: number;
      min_samples: number;
    };
    clusters: Cluster[];
    noise_points: ClusterPoint[];
    summary: {
      n_clusters: number;
      n_noise_points: number;
      noise_percentage: number;
      total_points: number;
    };
    timestamp: string;
  };
  success: boolean;
}

import { apiClient } from "./axiosConfig";

class AnalyticsService {
  /**
   * Call DBSCAN clustering analysis API
   * @param reportData - The report data to analyze
   * @returns Promise with clustering analysis results
   */
  async runDBSCANAnalysis(params?: {
    maxDistance?: number;
    minPoints?: number;
    agentId?: string;
  }): Promise<APIResponse> {
    try {
      const { data } = await apiClient.get(`/analytics/analyze`, {
        params: {
          maxDistance: params?.maxDistance ?? 1000,
          minPoints: params?.minPoints ?? 3,
          agentId: params?.agentId,
        },
      });
      // Backend returns: { success, message, data: results, parameters }
      // Adapt to the frontend's APIResponse shape where results is under `results`
      const backend = data as any;
      const results = backend?.data ?? backend?.results ?? null;

      const adapted: APIResponse = {
        success: Boolean(backend?.success),
        message: backend?.message ?? "",
        metadata: {
          // Backend doesn't provide processing time; use now
          processing_time: new Date().toISOString(),
          total_reports_processed: results?.summary?.total_points ?? 0,
          total_valid_coordinates: results?.summary?.total_points ?? 0,
        },
        results: results ?? {
          clustering_params: { eps_km: 0, min_samples: 0 },
          clusters: [],
          noise_points: [],
          summary: {
            n_clusters: 0,
            n_noise_points: 0,
            noise_percentage: 0,
            total_points: 0,
          },
          timestamp: new Date().toISOString(),
        },
      };

      return adapted;
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Unknown error occurred";
      throw new Error(`DBSCAN Analysis failed: ${msg}`);
    }
  }

  /**
   * Get API health status
   * @returns Promise with API health check result
   */
  async checkAPIHealth(): Promise<{ status: string; message?: string }> {
    try {
      const { data } = await apiClient.get(`/analytics/health`);
      return data;
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || error?.message || "Unknown error";
      throw new Error(`API Health check failed: ${msg}`);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
