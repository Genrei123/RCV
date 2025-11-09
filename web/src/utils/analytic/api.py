from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
from sklearn.cluster import DBSCAN
from math import radians, cos, sin, asin, sqrt

app = Flask(__name__)
CORS(app)  # Enable CORS for web app integration


class AnalyticsProcessor:
    
    def __init__(self):
        self.data = None
        self.clusters = None
        
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Radius of Earth in kilometers
        r = 6371
        return c * r
    
    def calculate_distance_matrix(self, coordinates: np.ndarray) -> np.ndarray:
        n = len(coordinates)
        distance_matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    lat1, lon1 = coordinates[i]
                    lat2, lon2 = coordinates[j]
                    distance_matrix[i][j] = self.haversine_distance(lat1, lon1, lat2, lon2)
        
        return distance_matrix
        
    def load_data_from_json(self, json_data: List[Dict]) -> None:
        # Convert JSON data to DataFrame
        self.data = pd.DataFrame(json_data)
        
        # Ensure latitude/longitude are numeric
        if 'lat' in self.data.columns and 'long' in self.data.columns:
            self.data['latitude'] = pd.to_numeric(self.data['lat'], errors='coerce')
            self.data['longitude'] = pd.to_numeric(self.data['long'], errors='coerce')
        elif 'latitude' not in self.data.columns or 'longitude' not in self.data.columns:
            raise ValueError("Data must contain 'lat'/'long' or 'latitude'/'longitude' columns")
            
        # Drop rows with invalid coordinates
        self.data = self.data.dropna(subset=['latitude', 'longitude'])
    
    def preprocess_data(self) -> None:
        if self.data is None:
            raise ValueError("No data loaded.")
        
        # Remove duplicates and handle missing values
        self.data = self.data.drop_duplicates()
        self.data = self.data.ffill()
    
    def dbscan_clustering(self, eps_km: float = 5.0, min_samples: int = 3) -> Dict[str, Any]:
        if self.data is None:
            raise ValueError("No data loaded.")
        
        # Check if required columns exist
        required_cols = ['latitude', 'longitude']
        if not all(col in self.data.columns for col in required_cols):
            raise ValueError(f"Data must contain columns: {required_cols}")
        
        # Extract coordinates
        coordinates = self.data[['latitude', 'longitude']].values
        
        # Calculate distance matrix using Haversine
        distance_matrix = self.calculate_distance_matrix(coordinates)
        
        # Run DBSCAN with precomputed distance matrix
        dbscan = DBSCAN(eps=eps_km, min_samples=min_samples, metric='precomputed')
        cluster_labels = dbscan.fit_predict(distance_matrix)
        
        # Add cluster labels to data
        self.data['cluster'] = cluster_labels
        self.clusters = cluster_labels
        
        # Calculate cluster statistics
        unique_labels = set(cluster_labels)
        n_clusters = len(unique_labels) - (1 if -1 in cluster_labels else 0)
        n_noise = list(cluster_labels).count(-1)
        
        # Analyze each cluster
        cluster_stats = []
        noise_points = []
        
        for label in unique_labels:
            if label == -1:  # Noise points
                noise_points = self.data[self.data['cluster'] == label].to_dict('records')
                continue
                
            cluster_points = self.data[self.data['cluster'] == label]
            
            # Calculate cluster center (centroid)
            center_lat = cluster_points['latitude'].mean()
            center_lng = cluster_points['longitude'].mean()
            
            # Calculate cluster radius (max distance from center)
            max_radius = 0
            for _, point in cluster_points.iterrows():
                dist = self.haversine_distance(center_lat, center_lng, 
                                             point['latitude'], point['longitude'])
                max_radius = max(max_radius, dist)
            
            cluster_info = {
                'cluster_id': int(label),
                'size': len(cluster_points),
                'center': {'latitude': center_lat, 'longitude': center_lng},
                'radius_km': max_radius,
                'points': cluster_points.to_dict('records')
            }
            
            cluster_stats.append(cluster_info)
        
        # Sort clusters by size (largest first)
        cluster_stats.sort(key=lambda x: x['size'], reverse=True)
        
        results = {
            'clustering_params': {
                'eps_km': eps_km,
                'min_samples': min_samples
            },
            'summary': {
                'total_points': len(coordinates),
                'n_clusters': n_clusters,
                'n_noise_points': n_noise,
                'noise_percentage': (n_noise / len(coordinates)) * 100 if len(coordinates) > 0 else 0
            },
            'clusters': cluster_stats,
            'noise_points': noise_points,
            'timestamp': datetime.now().isoformat()
        }
        
        return results


@app.route('/v1/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'DBSCAN Geospatial Analytics API',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/v1/analyze', methods=['POST'])
def analyze_scan_reports():
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        
        # Validate required fields
        if 'reports' not in data or not isinstance(data['reports'], list):
            return jsonify({'error': 'Missing or invalid "reports" field'}), 400
        
        if len(data['reports']) == 0:
            return jsonify({'error': 'Reports array cannot be empty'}), 400
        
        # Get clustering parameters
        params = data.get('parameters', {})
        eps_km = params.get('eps_km', 5.0)
        min_samples = params.get('min_samples', 3)
        
        # Validate parameters
        if eps_km <= 0:
            return jsonify({'error': 'eps_km must be positive'}), 400
        if min_samples < 1:
            return jsonify({'error': 'min_samples must be at least 1'}), 400
        
        # Initialize processor
        processor = AnalyticsProcessor()
        
        # Load and process data
        processor.load_data_from_json(data['reports'])
        processor.preprocess_data()
        
        # Run clustering
        results = processor.dbscan_clustering(eps_km=eps_km, min_samples=min_samples)
        
        # Return results
        return jsonify({
            'success': True,
            'message': 'Analysis completed successfully',
            'results': results,
            'metadata': {
                'total_reports_processed': len(data['reports']),
                'total_valid_coordinates': results['summary']['total_points'],
                'processing_time': datetime.now().isoformat()
            }
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': 'Validation error',
            'message': str(e)
        }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    print("🚀 Starting DBSCAN Geospatial Analytics API...")
    print("📡 Endpoints available:")
    print("  POST /v1/analyze - Main clustering endpoint")
    print("  GET /v1/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000)