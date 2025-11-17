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

// Analytics Service Configuration
const ANALYTICS_API_BASE_URL = import.meta.env.VITE_ANALYTICS_API_BASE_URL;

class AnalyticsService {
  /**
   * Call DBSCAN clustering analysis API
   * @param reportData - The report data to analyze
   * @returns Promise with clustering analysis results
   */
  async runDBSCANAnalysis(reportData: any): Promise<APIResponse> {
    try {
      const response = await fetch(`${ANALYTICS_API_BASE_URL}/v1/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      return data;
      
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`DBSCAN Analysis failed: ${error.message}`);
      }
      throw new Error('DBSCAN Analysis failed: Unknown error occurred');
    }
  }

  /**
   * Get API health status
   * @returns Promise with API health check result
   */
  async checkAPIHealth(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${ANALYTICS_API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`API Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;