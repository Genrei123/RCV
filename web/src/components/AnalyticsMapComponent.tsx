import { useState, useEffect, useRef } from "react";
import { BarChart3, RefreshCw, MapPin, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import analyticsService from "../services/analyticsService";
import type { APIResponse } from "../services/analyticsService";
import sampleReportsData from "../../reports_sample.json";
import { ScatterplotLayer } from '@deck.gl/layers';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';

declare global {
  interface Window { google: any; }
}

export function AnalyticsMapComponent() {
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const deckOverlayRef = useRef<any>(null);

  const callDBSCANAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await analyticsService.runDBSCANAnalysis(sampleReportsData);
      setApiResponse(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Google Maps initialization
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setMapError(true); return; }
    if (window.google?.maps) { setMapLoaded(true); return; }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;

    // Default center - Philippines
    const center = { lat: 14.5995, lng: 120.9842 };

    const mapStyles = [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
      },
    ];

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 6,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: mapStyles,
    });

    // Initialize deck.gl overlay - simple version
    deckOverlayRef.current = new GoogleMapsOverlay({
      getTooltip: ({ object }: any) => {
        if (!object) return null;
        
        return {
          html: object.tooltip,
          style: {
            backgroundColor: 'white',
            color: 'black',
            fontSize: '12px',
            padding: '8px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid #ccc'
          }
        };
      }
    });
    deckOverlayRef.current.setMap(googleMapRef.current);
  }, [mapLoaded]);

  // Simple visualization effect
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !apiResponse) return;

    // Generate simple red variations based on number of clusters
    const generateRedHues = (numClusters: number) => {
      const colors = [];
      for (let i = 0; i < numClusters; i++) {
      
        const baseRed = 220;
        const green = Math.min(255, i * 40); 
        const blue = Math.min(255, i * 20);
        
        colors.push(`rgb(${baseRed}, ${green}, ${blue})`);
      }
      return colors;
    };

    const clusterColors = generateRedHues(apiResponse.results.clusters.length);
    
    // Prepare data for visualization
    const clusterPoints: any[] = [];
    const noisePoints: any[] = [];
    
    // Process cluster points with colors
    apiResponse.results.clusters.forEach((cluster, index) => {
      const color = clusterColors[index % clusterColors.length];
      cluster.points.forEach((point) => {
        const lat = typeof point.lat === 'string' ? parseFloat(point.lat) : point.latitude;
        const lng = typeof point.long === 'string' ? parseFloat(point.long) : point.longitude;
        
        clusterPoints.push({
          position: [lng, lat],
          product: point.product,
          scannedBy: point.scannedBy,
          clusterId: cluster.cluster_id,
          color: color,
          tooltip: `<strong>${point.product}</strong><br/>Cluster: ${cluster.cluster_id}<br/>Scanned by: ${point.scannedBy}<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
      });
    });

    // Process noise points
    if (apiResponse.results.noise_points) {
      apiResponse.results.noise_points.forEach((point) => {
        const lat = typeof point.lat === 'string' ? parseFloat(point.lat) : point.latitude;
        const lng = typeof point.long === 'string' ? parseFloat(point.long) : point.longitude;
        
        noisePoints.push({
          position: [lng, lat],
          product: point.product,
          scannedBy: point.scannedBy,
          tooltip: `<strong>${point.product}</strong><br/>Noise Point<br/>Scanned by: ${point.scannedBy}<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
      });
    }

    const layers = [];

    // EPS Radius visualization
    if (clusterPoints.length > 0) {
      // Convert EPS from km to meters for radius calculation
      const epsMeters = apiResponse.results.clustering_params.eps_km * 1000;
      
      layers.push(new ScatterplotLayer({
        id: 'cluster-radius',
        data: clusterPoints,
        getPosition: (d: any) => d.position,
        getRadius: epsMeters, // Use EPS distance as radius
        getFillColor: (d: any) => {
          // Parse RGB color string for radius transparency
          const match = d.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return [r, g, b, 30]; // Very transparent
          }
          return [255, 0, 0, 30]; // Fallback to red
        },
        stroked: true,
        getLineColor: (d: any) => {
          // Parse RGB color string for border
          const match = d.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return [r, g, b, 100]; // Semi-transparent border
          }
          return [255, 0, 0, 100]; // Fallback to red
        },
        getLineWidth: 2,
        pickable: false,
        radiusUnits: 'meters'
      }));
    }

    // Cluster points layer
    if (clusterPoints.length > 0) {
      layers.push(new ScatterplotLayer({
        id: 'cluster-points',
        data: clusterPoints,
        getPosition: (d: any) => d.position,
        getRadius: 120,
        getFillColor: (d: any) => {
          // Parse RGB color string like "rgb(255, 0, 0)" to [r, g, b, alpha]
          const match = d.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return [r, g, b, 220];
          }
          // Fallback to red if parsing fails
          return [255, 0, 0, 220];
        },
        pickable: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 20,
        stroked: true,
        getLineColor: [255, 255, 255, 180],
        getLineWidth: 1
      }));
    }

    // Noise points layer
    if (noisePoints.length > 0) {
      layers.push(new ScatterplotLayer({
        id: 'noise-points',
        data: noisePoints,
        getPosition: (d: any) => d.position,
        getRadius: 120,
        getFillColor: [107, 114, 128, 220], // Gray for noise
        pickable: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 20,
        stroked: true,
        getLineColor: [255, 255, 255, 180],
        getLineWidth: 1
      }));
    }

    // Update deck overlay
    if (deckOverlayRef.current) {
      deckOverlayRef.current.setProps({ layers });
    }

    // Fit bounds to show all points
    const allPoints = [...clusterPoints, ...noisePoints];
    if (allPoints.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      allPoints.forEach(point => {
        bounds.extend({ lat: point.position[1], lng: point.position[0] });
      });
      googleMapRef.current.fitBounds(bounds);
    }
  }, [apiResponse, mapLoaded]);

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Card className="p-8">
          <p className="text-red-600">
            Map unavailable. Check Google Maps API configuration.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Google Map */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Control Panel */}
      <div className="absolute top-15 left-2 z-10">
        <Card className="shadow-lg p-4 bg-white border border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <BarChart3 className="h-6 w-3 text-blue-600" />
              <h2 className="text-lg font-bold">DBSCAN Analytics</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {sampleReportsData.reports.length} reports available
            </p>
            
            <Button 
              onClick={callDBSCANAPI}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 right-4 z-10 max-w-md">
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="text-red-600">
              <h3 className="font-semibold mb-2">Error:</h3>
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Results Summary */}
      {apiResponse && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="shadow-lg px-4 py-3 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold">Clustering Results</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Points:</span>
                <span className="font-medium">{apiResponse.results.summary.total_points}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Clusters:</span>
                <span className="font-medium text-blue-600">{apiResponse.results.summary.n_clusters}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Noise Points:</span>
                <span className="font-medium text-gray-600">{apiResponse.results.summary.n_noise_points}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Noise %:</span>
                <span className="font-medium text-orange-600">{apiResponse.results.summary.noise_percentage.toFixed(1)}%</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* DBSCAN Parameters */}
      {apiResponse && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="shadow-lg p-4 bg-white border border-gray-200">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                DBSCAN Parameters
              </p>
              <div className="space-y-1 text-xs">
                <p><span className="font-medium">EPS:</span> {apiResponse.results.clustering_params.eps_km} km</p>
                <p><span className="font-medium">Min Samples:</span> {apiResponse.results.clustering_params.min_samples}</p>
                <p><span className="font-medium">Processing Time:</span> {new Date(apiResponse.metadata.processing_time).toLocaleTimeString()}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cluster Legend */}
      {apiResponse && (
        <div className="absolute bottom-4 right-4 z-10">
          <Card className="shadow-lg p-4 bg-white border border-gray-200">
            <div className="text-sm">
              <p className="font-medium mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                Cluster Visualization
              </p>
              
              <div className="space-y-2 text-xs">
                {/* Show each cluster with its color */}
                {apiResponse.results.clusters.map((cluster, index) => {
                  
                  const baseRed = 220;
                  const green = Math.min(255, index * 40);
                  const blue = Math.min(255, index * 20);
                  const color = `rgb(${baseRed}, ${green}, ${blue})`;
                  
                  return (
                    <div key={cluster.cluster_id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: color }}></div>
                      <span>Cluster {cluster.cluster_id} ({cluster.size} reports)</span>
                    </div>
                  );
                })}
                
                {/* Show noise points if any */}
                {apiResponse.results.summary.n_noise_points > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-white bg-gray-500"></div>
                    <span>Noise Points ({apiResponse.results.summary.n_noise_points})</span>
                  </div>
                )}
                
                <div className="pt-2 border-t text-xs text-gray-500">
                  <p>Total: {apiResponse.results.summary.total_points} reports</p>
                  <p>EPS Radius: {apiResponse.results.clustering_params.eps_km} km</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
