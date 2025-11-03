import { useState, useEffect, useRef } from "react";
import { BarChart3, RefreshCw, MapPin, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import analyticsService from "../services/analyticsService";
import type { APIResponse } from "../services/analyticsService";
import sampleReportsData from "../../reports_sample.json";

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
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
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

    // Map styles optimized for analytics view
    const mapStyles = [
      {
        elementType: "geometry",
        stylers: [{ color: "#f5f5f5" }, { lightness: 15 }],
      },
      { elementType: "labels.text.fill", stylers: [{ color: "#6b6b6b" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ lightness: -10 }, { saturation: 20 }],
      },
      {
        featureType: "water",
        stylers: [{ color: "#cfe8ff" }, { lightness: 40 }],
      },
      { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
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

    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [mapLoaded]);

  // Create markers when API response changes
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !apiResponse) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Define cluster colors array, might change later idk
    const clusterColors = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'];

    // Create markers for each point in clusters
    apiResponse.results.clusters.forEach((cluster, clusterIndex) => {
      const clusterColor = clusterColors[clusterIndex % clusterColors.length];
      
      cluster.points.forEach((point) => {
        // Ensure coordinates are properly converted to numbers
        const latitude = typeof point.lat === 'string' ? parseFloat(point.lat) : point.latitude;
        const longitude = typeof point.long === 'string' ? parseFloat(point.long) : point.longitude;
        
        const position = {
          lat: latitude,
          lng: longitude
        };

        console.log(`Placing marker at: ${latitude}, ${longitude} for ${point.product}`); // Debug log

        // Create simple colored circle marker
        const marker = new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          title: point.product,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: clusterColor,
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 2,
          }
        });

        // Create info window for scan points
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div class="p-4 font-sans min-w-[250px] rounded-lg">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-3 h-3 rounded-full" style="background-color: ${clusterColor};"></div>
                <h3 class="m-0 text-base font-semibold text-gray-800">${point.product}</h3>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Cluster:</span>
                  <span class="font-medium" style="color: ${clusterColor};">#${cluster.cluster_id}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Scanned by:</span>
                  <span class="font-medium text-gray-800">${point.scannedBy}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Date:</span>
                  <span class="text-gray-700">${new Date(point.scannedAt).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Coordinates:</span>
                  <span class="text-gray-700">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</span>
                </div>
                <div class="pt-2 border-t">
                  <p class="text-xs text-gray-600"><strong>Remarks:</strong> ${point.remarks}</p>
                </div>
              </div>
            </div>
          `);
          infoWindowRef.current.open(googleMapRef.current, marker);
        });

        markersRef.current.push(marker);
      });

      // Create cluster center marker
      const centerMarker = new window.google.maps.Marker({
        position: {
          lat: cluster.center.latitude,
          lng: cluster.center.longitude
        },
        map: googleMapRef.current,
        title: `Cluster ${cluster.cluster_id} Center`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: clusterColor,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        }
      });

      // Cluster center info window, not sur eif needed but just edit whenever
      centerMarker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div class="p-4 font-sans min-w-[200px] rounded-lg">
            <h3 class="m-0 text-base font-semibold text-gray-800 mb-3">Cluster ${cluster.cluster_id} Center</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Points:</span>
                <span class="font-medium text-gray-800">${cluster.size}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Radius:</span>
                <span class="font-medium text-gray-800">${cluster.radius_km.toFixed(1)} km</span>
              </div>
              <div class="pt-2 border-t">
                <p class="text-xs text-gray-600">Center coordinates:</p>
                <p class="text-xs text-gray-700">${cluster.center.latitude.toFixed(4)}, ${cluster.center.longitude.toFixed(4)}</p>
              </div>
            </div>
          </div>
        `);
        infoWindowRef.current.open(googleMapRef.current, centerMarker);
      });

      markersRef.current.push(centerMarker);
    });

    // Create markers for noise points (if any)
    if (apiResponse.results.noise_points && apiResponse.results.noise_points.length > 0) {
      apiResponse.results.noise_points.forEach((point) => {
        // Ensure coordinates are properly converted to numbers
        const latitude = typeof point.lat === 'string' ? parseFloat(point.lat) : point.latitude;
        const longitude = typeof point.long === 'string' ? parseFloat(point.long) : point.longitude;
        
        const position = {
          lat: latitude,
          lng: longitude
        };

        console.log(`Placing NOISE marker at: ${latitude}, ${longitude} for ${point.product}`); // Debug log

        // Create noise marker
        const noiseMarker = new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          title: `${point.product} (Noise Point)`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#6b7280',
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 2,
          }
        });

        // Create info window for noise points
        noiseMarker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div class="p-4 font-sans min-w-[250px] rounded-lg">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-3 h-3 rounded-full bg-gray-500"></div>
                <h3 class="m-0 text-base font-semibold text-gray-800">${point.product}</h3>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Type:</span>
                  <span class="font-medium text-gray-600">Noise Point</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Scanned by:</span>
                  <span class="font-medium text-gray-800">${point.scannedBy}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Date:</span>
                  <span class="text-gray-700">${new Date(point.scannedAt).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Coordinates:</span>
                  <span class="text-gray-700">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</span>
                </div>
                <div class="pt-2 border-t">
                  <p class="text-xs text-gray-600"><strong>Remarks:</strong> ${point.remarks}</p>
                  <p class="text-xs text-gray-500 mt-1"><em>This point doesn't belong to any cluster</em></p>
                </div>
              </div>
            </div>
          `);
          infoWindowRef.current.open(googleMapRef.current, noiseMarker);
        });

        markersRef.current.push(noiseMarker);
      });
    }

    // Adjust map bounds to show all markers (including noise points)
    if (apiResponse.results.clusters.length > 0 || (apiResponse.results.noise_points && apiResponse.results.noise_points.length > 0)) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add cluster points to bounds
      apiResponse.results.clusters.forEach(cluster => {
        cluster.points.forEach(point => {
          // Use the same coordinate conversion logic
          const latitude = typeof point.lat === 'string' ? parseFloat(point.lat) : point.latitude;
          const longitude = typeof point.long === 'string' ? parseFloat(point.long) : point.longitude;
          
          bounds.extend({
            lat: latitude,
            lng: longitude
          });
        });
        // Also include cluster centers
        bounds.extend({
          lat: cluster.center.latitude,
          lng: cluster.center.longitude
        });
      });
      
      // Add noise points to bounds
      if (apiResponse.results.noise_points) {
        apiResponse.results.noise_points.forEach(point => {
          const latitude = typeof point.lat === 'string' ? parseFloat(point.lat) : point.latitude;
          const longitude = typeof point.long === 'string' ? parseFloat(point.long) : point.longitude;
          
          bounds.extend({
            lat: latitude,
            lng: longitude
          });
        });
      }
      
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
      <div className="absolute top-4 left-4 z-10">
        <Card className="shadow-lg p-4 bg-white border border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
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

      {/* Legend */}
      {apiResponse && (
        <div className="absolute bottom-4 right-4 z-10">
          <Card className="shadow-lg p-4 bg-white border border-gray-200">
            <div className="text-sm">
              <p className="font-medium mb-2">Legend</p>
              <div className="space-y-2 text-xs">
                {/* Dynamically generate cluster legend based on actual clusters */}
                {apiResponse.results.clusters.map((cluster, index) => {
                  const clusterColors = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'];
                  const color = clusterColors[index % clusterColors.length];
                  return (
                    <div key={cluster.cluster_id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: color }}></div>
                      <span>Cluster {cluster.cluster_id} ({cluster.size} points)</span>
                    </div>
                  );
                })}
                
                {/* Show noise points if any */}
                {apiResponse.results.summary.n_noise_points > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white bg-gray-500"></div>
                    <span>Noise Points ({apiResponse.results.summary.n_noise_points})</span>
                  </div>
                )}
                
                <hr className="my-2" />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-white bg-blue-500"></div>
                  <span>Cluster Centers</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
