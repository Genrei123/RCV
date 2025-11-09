#!/usr/bin/env python3
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sklearn.cluster import DBSCAN
from math import radians, cos, sin, asin, sqrt
import random
import folium
from scipy.spatial import ConvexHull


class AnalyticsProcessor:
    
    def __init__(self):
        self.data = None
        self.results = {}
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
        
    def preprocess_data(self) -> None:
        if self.data is None:
            raise ValueError("No data loaded.")
        
        print("📊 Preprocessing data...")
        
        # Remove duplicates
        initial_count = len(self.data)
        self.data = self.data.drop_duplicates()
        removed_duplicates = initial_count - len(self.data)
        
        # Handle missing values
        self.data = self.data.ffill()
        
        print(f"✓ Preprocessing complete. Removed {removed_duplicates} duplicates")
    
    def dbscan_clustering(self, eps_km: float = 5.0, min_samples: int = 3) -> Dict[str, Any]:
        if self.data is None:
            raise ValueError("No data loaded.")
        
        # Check if required columns exist
        required_cols = ['latitude', 'longitude']
        if not all(col in self.data.columns for col in required_cols):
            raise ValueError(f"Data must contain columns: {required_cols}")
        
        print(f"🔍 Running DBSCAN clustering (eps={eps_km}km, min_samples={min_samples})...")
        
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
        for label in unique_labels:
            if label == -1:  # Noise points
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
                'noise_percentage': (n_noise / len(coordinates)) * 100
            },
            'clusters': cluster_stats,
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"✓ Clustering complete: {n_clusters} clusters, {n_noise} noise points")
        return results
    
    def create_visualization_map(self, filename: str = "clusters_map.html") -> str:
        if self.data is None or self.clusters is None:
            raise ValueError("No clustering data available. Run dbscan_clustering first.")
        
        # Calculate map center
        center_lat = self.data['latitude'].mean()
        center_lng = self.data['longitude'].mean()
        
        # Create folium map
        m = folium.Map(location=[center_lat, center_lng], zoom_start=11)
        
        # Define colors for clusters
        colors = ['red', 'blue', 'green', 'purple', 'orange', 'darkred', 'lightred', 
                 'beige', 'darkblue', 'darkgreen', 'cadetblue', 'darkpurple', 'white', 
                 'pink', 'lightblue', 'lightgreen', 'gray', 'black', 'lightgray']
        
        # Plot points and cluster boundaries
        unique_labels = set(self.clusters)
        for label in unique_labels:
            if label == -1:
                # Noise points in black
                cluster_data = self.data[self.data['cluster'] == label]
                for _, point in cluster_data.iterrows():
                    folium.CircleMarker(
                        location=[point['latitude'], point['longitude']],
                        radius=4,
                        popup=f"Noise: {point.get('product', 'N/A')}",
                        color='black',
                        fill=True,
                        fillColor='black',
                        fillOpacity=0.7
                    ).add_to(m)
            else:
                # Cluster points
                cluster_data = self.data[self.data['cluster'] == label]
                color = colors[label % len(colors)]
                
                # Create cluster polygon if we have enough points
                if len(cluster_data) >= 3:
                    try:
                        # Get coordinates for convex hull
                        points = cluster_data[['latitude', 'longitude']].values
                        hull = ConvexHull(points)
                        
                        # Create polygon coordinates
                        polygon_coords = []
                        for vertex in hull.vertices:
                            polygon_coords.append([points[vertex][0], points[vertex][1]])
                        
                        # Add polygon to map
                        folium.Polygon(
                            locations=polygon_coords,
                            color=color,
                            weight=3,
                            fillColor=color,
                            fillOpacity=0.2,
                            popup=f"Cluster {label} Boundary ({len(cluster_data)} points)"
                        ).add_to(m)
                        
                    except Exception as e:
                        print(f"Could not create polygon for cluster {label}: {e}")
                
                # Add individual cluster points
                for _, point in cluster_data.iterrows():
                    folium.CircleMarker(
                        location=[point['latitude'], point['longitude']],
                        radius=6,
                        popup=f"Cluster {label}: {point.get('product', 'N/A')}<br>User: {point.get('scannedBy', 'N/A')}",
                        color=color,
                        fill=True,
                        fillColor=color,
                        fillOpacity=0.8,
                        weight=2
                    ).add_to(m)
                
                # Add cluster center marker
                if len(cluster_data) > 0:
                    center_lat_cluster = cluster_data['latitude'].mean()
                    center_lng_cluster = cluster_data['longitude'].mean()
                    folium.Marker(
                        location=[center_lat_cluster, center_lng_cluster],
                        popup=f"Cluster {label} Center<br>{len(cluster_data)} points<br>Radius: {self._calculate_cluster_radius(cluster_data):.2f}km",
                        icon=folium.Icon(color='red', icon='star')
                    ).add_to(m)
        
        # Add legend
        legend_html = '''
        <div style="position: fixed; 
                    bottom: 50px; left: 50px; width: 200px; height: 120px; 
                    background-color: white; border:2px solid grey; z-index:9999; 
                    font-size:14px; padding: 10px">
        <h4>DBSCAN Clusters</h4>
        <p><i class="fa fa-circle" style="color:black"></i> Noise Points</p>
        <p><i class="fa fa-circle" style="color:red"></i> Cluster Points</p>
        <p><i class="fa fa-star" style="color:red"></i> Cluster Centers</p>
        <p>Polygons show cluster boundaries</p>
        </div>
        '''
        m.get_root().html.add_child(folium.Element(legend_html))
        
        # Save map
        m.save(filename)
        print(f"✓ Visualization map with cluster polygons saved as {filename}")
        return filename
    
    def _calculate_cluster_radius(self, cluster_data):
        center_lat = cluster_data['latitude'].mean()
        center_lng = cluster_data['longitude'].mean()
        max_radius = 0
        for _, point in cluster_data.iterrows():
            dist = self.haversine_distance(center_lat, center_lng, 
                                         point['latitude'], point['longitude'])
            max_radius = max(max_radius, dist)
        return max_radius


def sample_workflow():
    print("🚀 Starting DBSCAN geospatial analytics workflow...")
    
    # Initialize processor
    processor = AnalyticsProcessor()
    
    # Generate random sample data (100 reports)
    random.seed(42)  # For reproducible results
    
    # Define Metro Manila bounding box
    min_lat, max_lat = 14.3, 14.8
    min_lng, max_lng = 120.8, 121.2
    
    sample_data = []
    users = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Dana White", "Eve Davis", 
             "Frank Miller", "Grace Wilson", "Heidi Garcia", "Ivan Rodriguez", "Jane Martinez"]
    
    products = ["Rice Brand A", "Cooking Oil X", "Sugar Premium", "Salt Iodized", "Coffee Instant"]
    
    for i in range(100):
        # Generate random coordinates within Metro Manila
        latitude = random.uniform(min_lat, max_lat)
        longitude = random.uniform(min_lng, max_lng)
        
        # Generate random date within last 30 days
        days_ago = random.randint(0, 29)
        scan_date = (datetime.now() - timedelta(days=days_ago)).isoformat()
        
        sample_data.append({
            "_id": f"report_{i+1:03d}",
            "lat": str(round(latitude, 6)),
            "long": str(round(longitude, 6)),
            "latitude": round(latitude, 6),
            "longitude": round(longitude, 6),
            "product": random.choice(products),
            "scannedBy": users[i % len(users)],
            "scannedAt": scan_date,
            "scanResult": random.choice([0, 1, 2]),
            "remarks": f"Sample scan report {i+1}"
        })
    
    # Convert to DataFrame
    processor.data = pd.DataFrame(sample_data)
    print(f"✓ Random geospatial data created from {len(sample_data)} scan reports")
    
    # Run the workflow
    try:
        processor.preprocess_data()
        
        # Run DBSCAN clustering with 5km radius
        cluster_results = processor.dbscan_clustering(eps_km=5.0, min_samples=3)
        processor.results.update(cluster_results)
        
        # Print results
        print("\n" + "="*50)
        print("DBSCAN CLUSTERING RESULTS:")
        print("="*50)
        print(f"Total Points: {cluster_results['summary']['total_points']}")
        print(f"Clusters Found: {cluster_results['summary']['n_clusters']}")
        print(f"Noise Points: {cluster_results['summary']['n_noise_points']}")
        print(f"Noise Percentage: {cluster_results['summary']['noise_percentage']:.1f}%")
        
        print("\nCluster Details:")
        for cluster in cluster_results['clusters'][:3]:  # Show top 3 clusters
            print(f"- Cluster {cluster['cluster_id']}: {cluster['size']} points, "
                  f"radius {cluster['radius_km']:.2f}km")
        
        # Create visualization map
        map_file = processor.create_visualization_map("sample_clusters_map.html")
        print(f"📍 Interactive map created: {map_file}")
        
        return processor, cluster_results
        
    except Exception as e:
        print(f"✗ Workflow failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None


if __name__ == "__main__":
    # Run the sample workflow
    processor, results = sample_workflow()
    
    print("\n🎯 DBSCAN Geospatial Analytics Ready!")
    print("\n📋 What this algorithm does:")
    print("• Clusters geospatial points using DBSCAN algorithm")
    print("• Uses Haversine distance for accurate lat/lng calculations") 
    print("• Identifies hotspots and outlier locations")
    print("• Provides cluster statistics and analysis")
    
    print("\n🔧 Key Parameters:")
    print("• eps_km: Maximum distance (km) between neighbors")
    print("• min_samples: Minimum points needed to form a cluster")
    
    print("\n📊 Applications:")
    print("• Incident/crime hotspot detection")
    print("• Customer location clustering")
    print("• Delivery route optimization") 
    print("• Anomaly detection in location patterns")
    
    print("\n💡 For API usage, use: python api.py")