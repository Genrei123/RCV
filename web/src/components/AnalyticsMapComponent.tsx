import { useState, useEffect, useRef } from "react";
import { BarChart3, RefreshCw, MapPin, Activity, Menu, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import analyticsService from "../services/analyticsService";
import type { APIResponse } from "../services/analyticsService";
import sampleReportsData from "../../reports_sample.json";
import { ScatterplotLayer } from "@deck.gl/layers";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";

declare global {
  interface Window {
    google: any;
  }
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
  const [show3DHeatmap, setShow3DHeatmap] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hamburgerRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const hamburgerOriginalParentRef = useRef<HTMLElement | null>(null);
  const drawerOriginalParentRef = useRef<HTMLElement | null>(null);

  const callDBSCANAPI = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.runDBSCANAnalysis({
        // Use a smaller EPS so clusters form locally
        maxDistance: 2,
        minPoints: 3,
      });
      setApiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Store original parents for overlays on mount
  useEffect(() => {
    if (hamburgerRef.current?.parentElement && !hamburgerOriginalParentRef.current) {
      hamburgerOriginalParentRef.current = hamburgerRef.current.parentElement;
    }
    if (drawerRef.current?.parentElement && !drawerOriginalParentRef.current) {
      drawerOriginalParentRef.current = drawerRef.current.parentElement;
    }
  }, []);

  // Track fullscreen state and keep overlays inside the fullscreen element
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      const nowFullscreen = !!fullscreenElement;
      setIsFullscreen(nowFullscreen);

      // Ensure we always have original parents stored
      if (hamburgerRef.current?.parentElement && !hamburgerOriginalParentRef.current) {
        hamburgerOriginalParentRef.current = hamburgerRef.current.parentElement;
      }
      if (drawerRef.current?.parentElement && !drawerOriginalParentRef.current) {
        drawerOriginalParentRef.current = drawerRef.current.parentElement;
      }

      // Move elements into or out of the fullscreen element
      setTimeout(() => {
        if (!hamburgerRef.current || !drawerRef.current) return;

        if (nowFullscreen && fullscreenElement) {
          if (hamburgerRef.current.parentElement !== fullscreenElement) {
            fullscreenElement.appendChild(hamburgerRef.current);
          }
          if (drawerRef.current.parentElement !== fullscreenElement) {
            fullscreenElement.appendChild(drawerRef.current);
          }
        } else {
          if (
            hamburgerOriginalParentRef.current &&
            hamburgerRef.current.parentElement !== hamburgerOriginalParentRef.current
          ) {
            hamburgerOriginalParentRef.current.appendChild(hamburgerRef.current);
          }
          if (
            drawerOriginalParentRef.current &&
            drawerRef.current.parentElement !== drawerOriginalParentRef.current
          ) {
            drawerOriginalParentRef.current.appendChild(drawerRef.current);
          }
        }
      }, 0);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as any);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange as any);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange as any);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as any);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange as any);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange as any);
    };
  }, []);

  // When already in fullscreen, ensure overlays stay attached to the fullscreen element
  useEffect(() => {
    if (!isFullscreen) return;

    const fullscreenElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    if (!fullscreenElement) return;

    if (hamburgerRef.current && hamburgerRef.current.parentElement !== fullscreenElement) {
      fullscreenElement.appendChild(hamburgerRef.current);
    }
    if (drawerRef.current && drawerRef.current.parentElement !== fullscreenElement) {
      fullscreenElement.appendChild(drawerRef.current);
    }
  }, [isFullscreen, drawerOpen]);

  // Google Maps initialization
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }
    // If Google Maps is already available, avoid loading script again
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // Prevent duplicate script injection on HMR or remounts
    const existing = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js?key="]`
    );
    if (existing) {
      // Script tag exists but window.google might still be initializing
      existing.addEventListener("load", () => setMapLoaded(true));
      existing.addEventListener("error", () => setMapError(true));
      return;
    }

    const script = document.createElement("script");
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
      gestureHandling: "greedy",
      mapTypeControl: true,
      streetViewControl: false,
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
            backgroundColor: "white",
            color: "black",
            fontSize: "12px",
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            border: "1px solid #ccc",
          },
        };
      },
    });
    deckOverlayRef.current.setMap(googleMapRef.current);
    // Ensure deck.gl overlay does not block Google Maps interactions
    try {
      const canvas = (deckOverlayRef.current as any)?._deck?.canvas as
        | HTMLCanvasElement
        | undefined;
      if (canvas) {
        canvas.style.pointerEvents = "none";
      }
    } catch (_) {
      // safely ignore if internals differ
    }
  }, [mapLoaded]);

  // Simple visualization effect
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

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

    const clustersLen = apiResponse?.results?.clusters?.length ?? 0;
    const clusterColors = clustersLen > 0 ? generateRedHues(clustersLen) : [];

    // Prepare data for visualization
    const clusterPoints: any[] = [];
    const noisePoints: any[] = [];

    // Helper to coerce value to number or return null
    const toNum = (v: any): number | null => {
      if (typeof v === "number" && !isNaN(v)) return v;
      if (typeof v === "string") {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      }
      return null;
    };

    // Process cluster points with colors
    apiResponse?.results?.clusters?.forEach((cluster, index) => {
      const color = clusterColors[index % clusterColors.length];
      cluster.points?.forEach((point) => {
        const latRaw =
          (point as any).lat ??
          (point as any).latitude ??
          (point as any).coordinates?.[1];
        const lngRaw =
          (point as any).lng ??
          (point as any).longitude ??
          (point as any).long ??
          (point as any).coordinates?.[0];
        const lat = toNum(latRaw);
        const lng = toNum(lngRaw);

        if (lat === null || lng === null) return; // skip invalid points

        clusterPoints.push({
          position: [lng, lat],
          product:
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report",
          scannedBy:
            (point as any).scannedBy ?? (point as any).report?.agentId ?? "",
          clusterId: cluster.cluster_id,
          color: color,
          tooltip: `<strong>${
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report"
          }</strong><br/>Cluster: ${cluster.cluster_id}<br/>Scanned by: ${
            (point as any).scannedBy ?? (point as any).report?.agentId ?? ""
          }<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      });
    });

    // Process noise points
    if (apiResponse?.results?.noise_points) {
      apiResponse.results.noise_points.forEach((point) => {
        const latRaw =
          (point as any).lat ??
          (point as any).latitude ??
          (point as any).coordinates?.[1];
        const lngRaw =
          (point as any).lng ??
          (point as any).longitude ??
          (point as any).long ??
          (point as any).coordinates?.[0];
        const lat = toNum(latRaw);
        const lng = toNum(lngRaw);
        if (lat === null || lng === null) return;

        noisePoints.push({
          position: [lng, lat],
          product:
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report",
          scannedBy:
            (point as any).scannedBy ?? (point as any).report?.agentId ?? "",
          tooltip: `<strong>${
            (point as any).product ??
            (point as any).report?.scannedData?.productName ??
            "Report"
          }</strong><br/>Noise Point<br/>Scanned by: ${
            (point as any).scannedBy ?? (point as any).report?.agentId ?? ""
          }<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      });
    }

    const layers: any[] = [];

    // Optional 3D heatmap (HexagonLayer)
    if (show3DHeatmap) {
      // Build unified positions array from available points
      const positions: [number, number][] = [];
      if (clusterPoints.length > 0) {
        clusterPoints.forEach((p) => positions.push(p.position));
      }
      if (noisePoints.length > 0) {
        noisePoints.forEach((p) => positions.push(p.position));
      }
      // Avoid rendering empty heatmap which can be confusing
      if (positions.length === 0) {
        deckOverlayRef.current?.setProps({ layers: [] });
        return;
      }
      // No demo data; heatmap will render from actual points only

      layers.push(
        new HexagonLayer({
          id: "hex-3d-heatmap",
          data: positions,
          getPosition: (d: [number, number]) => d,
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          radius: 250,
          radiusUnits: "meters",
          extruded: true,
          elevationScale: 200,
          coverage: 1,
          opacity: 0.9,
          lowerPercentile: 5,
          upperPercentile: 98,
          // Warm-to-red ramp for strong heat visuals
          colorRange: [
            [255, 235, 59],
            [255, 193, 7],
            [255, 152, 0],
            [255, 87, 34],
            [244, 67, 54],
            [198, 40, 40],
          ],
          pickable: false,
        })
      );
    }

    // EPS Radius visualization
    if (!show3DHeatmap && clusterPoints.length > 0) {
      // Convert EPS from km to meters for radius calculation
      const epsMeters =
        (apiResponse?.results.clustering_params.eps_km ?? 0) * 1000;

      layers.push(
        new ScatterplotLayer({
          id: "cluster-radius",
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
          radiusUnits: "meters",
        })
      );
    }

    // Cluster points layer
    if (!show3DHeatmap && clusterPoints.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: "cluster-points",
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
          pickable: false,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          stroked: true,
          getLineColor: [255, 255, 255, 180],
          getLineWidth: 1,
        })
      );
    }

    // Noise points layer
    if (!show3DHeatmap && noisePoints.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: "noise-points",
          data: noisePoints,
          getPosition: (d: any) => d.position,
          getRadius: 120,
          getFillColor: [107, 114, 128, 220], // Gray for noise
          pickable: false,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          stroked: true,
          getLineColor: [255, 255, 255, 180],
          getLineWidth: 1,
        })
      );
    }

    // Update deck overlay
    if (deckOverlayRef.current) {
      deckOverlayRef.current.setProps({ layers });
    }

    // Fit bounds to show all points
    const allPoints = show3DHeatmap ? [] : [...clusterPoints, ...noisePoints];
    if (allPoints.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      allPoints.forEach((point) => {
        bounds.extend({ lat: point.position[1], lng: point.position[0] });
      });
      googleMapRef.current.fitBounds(bounds);
    }

    // For 3D effect, tilt and set heading when heatmap is active and we have positions
    if (show3DHeatmap) {
      const has3DData = layers.find((l: any) => l.id === "hex-3d-heatmap");
      if (has3DData) {
        try {
          // Increase zoom a bit to make columns visible
          const currentZoom = googleMapRef.current.getZoom?.() ?? 10;
          if (currentZoom < 14) {
            googleMapRef.current.setZoom?.(14);
          }
          // Apply camera tilt and heading if supported
          googleMapRef.current.setTilt?.(60);
          googleMapRef.current.setHeading?.(30);
        } catch (_) {
          // ignore if tilt/heading not supported in this environment
        }
      }
    }
  }, [apiResponse, mapLoaded, show3DHeatmap]);

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

      {/* Hamburger Button */}
      <div
        ref={hamburgerRef}
        className="absolute top-20 right-3 z-20 pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        <Button
          variant="outline"
          className="rounded-full shadow-md"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Right-side Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-80 z-30 transform transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ pointerEvents: "auto" }}
      >
        <div className="h-full w-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold">DBSCAN Analytics</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto">
            <Card className="shadow-sm p-3 bg-white border border-gray-200">
              <div className="text-left">
                <p className="text-xs text-gray-600 mb-2">
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
                <div className="mt-3 text-left">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={show3DHeatmap}
                      onChange={(e) => setShow3DHeatmap(e.target.checked)}
                    />
                    Enable 3D Heatmap
                  </label>
                </div>
              </div>
            </Card>

            {error && (
              <Card className="p-3 border-red-200 bg-red-50">
                <div className="text-red-600">
                  <h3 className="font-semibold mb-1 text-sm">Error</h3>
                  <p className="text-xs">{error}</p>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-3 bg-white border border-gray-200">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    DBSCAN Parameters
                  </p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="font-medium">EPS:</span>{" "}
                      {apiResponse?.results?.clustering_params?.eps_km ?? 0} km
                    </p>
                    <p>
                      <span className="font-medium">Min Samples:</span>{" "}
                      {apiResponse?.results?.clustering_params?.min_samples ??
                        0}
                    </p>
                    <p>
                      <span className="font-medium">Processing Time:</span>{" "}
                      {apiResponse?.metadata?.processing_time
                        ? new Date(
                            apiResponse.metadata.processing_time
                          ).toLocaleTimeString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-3 bg-white border border-gray-200">
                <div className="text-sm">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    Cluster Visualization
                  </p>
                  <div className="space-y-2 text-xs">
                    {apiResponse?.results?.clusters?.map((cluster, index) => {
                      const baseRed = 220;
                      const green = Math.min(255, index * 40);
                      const blue = Math.min(255, index * 20);
                      const color = `rgb(${baseRed}, ${green}, ${blue})`;
                      return (
                        <div
                          key={cluster.cluster_id}
                          className="flex items-center gap-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full border border-white"
                            style={{ backgroundColor: color }}
                          ></div>
                          <span>
                            Cluster {cluster.cluster_id} ({cluster.size}{" "}
                            reports)
                          </span>
                        </div>
                      );
                    })}
                    {(apiResponse?.results?.summary?.n_noise_points ?? 0) >
                      0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-white bg-gray-500"></div>
                        <span>
                          Noise Points (
                          {apiResponse?.results?.summary?.n_noise_points})
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t text-xs text-gray-500">
                      <p>
                        Total:{" "}
                        {apiResponse?.results?.summary?.total_points ?? 0}{" "}
                        reports
                      </p>
                      <p>
                        EPS Radius:{" "}
                        {apiResponse?.results?.clustering_params?.eps_km ?? 0}{" "}
                        km
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-3 bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-semibold">
                    Clustering Results
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Points:</span>
                    <span className="font-medium">
                      {apiResponse?.results?.summary?.total_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Clusters:</span>
                    <span className="font-medium text-blue-600">
                      {apiResponse?.results?.summary?.n_clusters ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Noise Points:</span>
                    <span className="font-medium text-gray-600">
                      {apiResponse?.results?.summary?.n_noise_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Noise %:</span>
                    <span className="font-medium text-orange-600">
                      {(
                        apiResponse?.results?.summary?.noise_percentage ?? 0
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
