import { useState, useEffect, useRef } from "react";
import { BarChart3, RefreshCw, MapPin, Activity, Menu, X, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import analyticsService from "../services/analyticsService";
import { apiClient } from "../services/axiosConfig";
import type { APIResponse } from "../services/analyticsService";
//import sampleReportsData from "../../reports_sample.json";
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
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string>("COMPLIANT");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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

  const handleResolveReport = async (reportId: string) => {
    try {
      // Use the selected resolution status
      const response = await apiClient.post(`/analytics/reports/${reportId}/resolve`, {
        resolution: resolutionStatus,
      });

      // Update the selected report to reflect approval
      if (selectedReport) {
        setSelectedReport({
          ...selectedReport,
          isVerified: true,
          currentStatus: resolutionStatus
        });
      }

      // Show success message
      alert(response.data.message || 'Report approved successfully!');
      
      // Refresh the analysis to get updated data
      callDBSCANAPI();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to resolve report';
      alert(errorMsg);
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

      // Hide all POI markers by default (restaurants, bars, etc.)
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
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
      onClick: async ({ object }: any) => {
        if (object && object.reportId) {
          // Fetch full report details to get current status and complete data
          try {
            const response = await apiClient.get(`/analytics/reports/${object.reportId}`);
            const reportData = response.data.data;
            setSelectedReport({ 
              ...object, 
              ...reportData,
              currentStatus: reportData.status,
              position: object.position // Keep the position from the map object
            });
            setResolutionStatus(reportData.status); // Default to current status
          } catch (err) {
            // Fallback if fetch fails
            console.error('Failed to fetch report details:', err);
            const fallbackStatus = object.status || 'NON_COMPLIANT';
            setSelectedReport({ ...object, currentStatus: fallbackStatus });
            setResolutionStatus(fallbackStatus);
          }
        }
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

  // Auto-load DBSCAN analysis when map is ready
  useEffect(() => {
    if (mapLoaded && !apiResponse && !loading) {
      callDBSCANAPI();
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

        const reportId = (point as any)._id ?? (point as any).report?._id ?? null;

        clusterPoints.push({
          position: [lng, lat],
          reportId: reportId,
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
          }<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}${
            reportId ? `<br/>Report ID: ${reportId}` : ""
          }`,
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

        const reportId = (point as any)._id ?? (point as any).report?._id ?? null;

        noisePoints.push({
          position: [lng, lat],
          reportId: reportId,
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
          }<br/>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}${
            reportId ? `<br/>Report ID: ${reportId}` : ""
          }`,
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
          pickable: true,
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
          pickable: true,
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
        className="absolute top-15 right-2 z-20 pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        <Button
          variant="outline"
          className="rounded-full shadow-md"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-4 w-10" />
        </Button>
      </div>

      {/* Right-side Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-[56px] lg:top-0 right-0 left-0 sm:left-auto h-[calc(100vh-56px)] lg:h-full w-full sm:w-80 z-50 transform transition-transform duration-300 mr-2 sm:mr-0 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ pointerEvents: "auto" }}
      >
        <div className="h-full w-full bg-white border-l-0 sm:border-l border-gray-200 shadow-xl sm:shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-2 sm:p-3 border-b gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BarChart3 className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">DBSCAN Analytics</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-2 sm:p-3 space-y-3 overflow-y-auto">
            {/* Statistics Card - Now prominently at the top */}
            {apiResponse?.results && (
              <Card className="shadow-md p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <Activity className="h-5 w-5 text-teal-600 flex-shrink-0" />
                  <span className="text-base font-bold break-words">
                    Clustering Results
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {apiResponse?.results?.summary?.total_points ?? 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Clusters Found</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {apiResponse?.results?.summary?.n_clusters ?? 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Noise Points</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {apiResponse?.results?.summary?.n_noise_points ?? 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Noise %</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(apiResponse?.results?.summary?.noise_percentage ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
              <div className="text-left">
                <p className="text-xs text-gray-600 mb-2">
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
              <Card className="p-2 sm:p-3 border-red-200 bg-red-50">
                <div className="text-red-600">
                  <h3 className="font-semibold mb-1 text-sm">Error</h3>
                  <p className="text-xs break-words">{error}</p>
                </div>
              </Card>
            )}

            {apiResponse?.results && (
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold mb-2 flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="break-words">DBSCAN Parameters</span>
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className="break-words">
                      <span className="font-medium">EPS:</span>{" "}
                      {apiResponse?.results?.clustering_params?.eps_km ?? 0} km
                    </p>
                    <p className="break-words">
                      <span className="font-medium">Min Samples:</span>{" "}
                      {apiResponse?.results?.clustering_params?.min_samples ??
                        0}
                    </p>
                    <p className="break-words">
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
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="text-sm">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="break-words">Cluster Visualization</span>
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
                          className="flex items-center gap-2 min-w-0"
                        >
                          <div
                            className="w-3 h-3 rounded-full border border-white flex-shrink-0"
                            style={{ backgroundColor: color }}
                          ></div>
                          <span className="break-words">
                            Cluster {cluster.cluster_id} ({cluster.size}{" "}
                            reports)
                          </span>
                        </div>
                      );
                    })}
                    {(apiResponse?.results?.summary?.n_noise_points ?? 0) >
                      0 && (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full border border-white bg-gray-500 flex-shrink-0"></div>
                        <span className="break-words">
                          Noise Points (
                          {apiResponse?.results?.summary?.n_noise_points})
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t text-xs text-gray-500">
                      <p className="break-words">
                        Total:{" "}
                        {apiResponse?.results?.summary?.total_points ?? 0}{" "}
                        reports
                      </p>
                      <p className="break-words">
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
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <Activity className="h-4 w-4 text-teal-600 flex-shrink-0" />
                  <span className="text-sm font-semibold break-words">
                    Clustering Results
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Total Points:</span>
                    <span className="font-medium flex-shrink-0">
                      {apiResponse?.results?.summary?.total_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Clusters:</span>
                    <span className="font-medium text-blue-600 flex-shrink-0">
                      {apiResponse?.results?.summary?.n_clusters ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Noise Points:</span>
                    <span className="font-medium text-gray-600 flex-shrink-0">
                      {apiResponse?.results?.summary?.n_noise_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-gray-600 break-words">Noise %:</span>
                    <span className="font-medium text-orange-600 flex-shrink-0">
                      {(
                        apiResponse?.results?.summary?.noise_percentage ?? 0
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Reports List Section */}
            {apiResponse?.results && (
              <Card className="shadow-sm p-2 sm:p-3 bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span className="text-sm font-semibold break-words">
                    Reports List
                  </span>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by product name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Reports</SelectItem>
                        <SelectItem value="COMPLIANT">Compliant</SelectItem>
                        <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                        <SelectItem value="FRAUDULENT">Fraudulent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {apiResponse?.results?.clusters?.map((cluster) => {
                    // Filter reports based on search and status
                    const filteredReports = cluster.points?.filter((report: any) => {
                      const reportId = report._id ?? report.report?._id;
                      const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                      const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                      
                      // Search filter
                      const matchesSearch = searchQuery === "" || 
                        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        reportId?.toLowerCase().includes(searchQuery.toLowerCase());
                      
                      // Status filter
                      const matchesStatus = statusFilter === "ALL" || reportStatus === statusFilter;
                      
                      return matchesSearch && matchesStatus;
                    }) ?? [];

                    if (filteredReports.length === 0) return null;

                    return (
                    <div key={cluster.cluster_id} className="space-y-1">
                      <div className="text-xs font-medium text-gray-700 sticky top-0 bg-white py-1">
                        Cluster {cluster.cluster_id} ({filteredReports.length} reports)
                      </div>
                      {filteredReports.map((report: any, idx: number) => {
                        const reportId = report._id ?? report.report?._id;
                        const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                        const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                        const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                        const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                        
                        return (
                          <button
                            key={reportId || idx}
                            onClick={() => {
                              if (reportId && googleMapRef.current) {
                                // Pan to report location on map
                                if (lat && lng) {
                                  googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                  googleMapRef.current.setZoom(15);
                                }
                                // Fetch and show report details
                                apiClient.get(`/analytics/reports/${reportId}`)
                                  .then(response => {
                                    const reportData = response.data.data;
                                    setSelectedReport({ 
                                      ...report, 
                                      ...reportData,
                                      reportId, 
                                      currentStatus: reportData.status,
                                      position: [lng, lat]
                                    });
                                    setResolutionStatus(reportData.status);
                                  })
                                  .catch(err => {
                                    console.error('Failed to fetch report:', err);
                                  });
                              }
                            }}
                            className="w-full text-left p-2 rounded hover:bg-gray-50 border border-gray-200 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-800 truncate">
                                  {productName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {reportId ? `ID: ${reportId.slice(0, 8)}...` : 'No ID'}
                                </div>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                                reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                                reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {reportStatus === 'COMPLIANT' ? 'OK' :
                                 reportStatus === 'FRAUDULENT' ? 'FRD' : 'NC'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    );
                  })}

                  {/* Noise Points Section */}
                  {(() => {
                    const filteredNoisePoints = apiResponse?.results?.noise_points?.filter((report: any) => {
                      const reportId = report._id ?? report.report?._id;
                      const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                      const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                      
                      const matchesSearch = searchQuery === "" || 
                        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        reportId?.toLowerCase().includes(searchQuery.toLowerCase());
                      
                      const matchesStatus = statusFilter === "ALL" || reportStatus === statusFilter;
                      
                      return matchesSearch && matchesStatus;
                    }) ?? [];

                    if (filteredNoisePoints.length === 0) return null;

                    return (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="text-xs font-medium text-gray-700 sticky top-0 bg-white py-1">
                        Noise Points ({filteredNoisePoints.length})
                      </div>
                      {filteredNoisePoints.slice(0, 10).map((report: any, idx: number) => {
                        const reportId = report._id ?? report.report?._id;
                        const productName = report.product ?? report.report?.scannedData?.productName ?? "Unknown Product";
                        const reportStatus = report.status ?? report.report?.status ?? "NON_COMPLIANT";
                        const lat = report.lat ?? report.latitude ?? report.coordinates?.[1];
                        const lng = report.lng ?? report.longitude ?? report.long ?? report.coordinates?.[0];
                        
                        return (
                          <button
                            key={reportId || idx}
                            onClick={() => {
                              if (reportId && googleMapRef.current) {
                                if (lat && lng) {
                                  googleMapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
                                  googleMapRef.current.setZoom(15);
                                }
                                apiClient.get(`/analytics/reports/${reportId}`)
                                  .then(response => {
                                    const reportData = response.data.data;
                                    setSelectedReport({ 
                                      ...report, 
                                      ...reportData,
                                      reportId, 
                                      currentStatus: reportData.status,
                                      position: [lng, lat]
                                    });
                                    setResolutionStatus(reportData.status);
                                  })
                                  .catch(err => {
                                    console.error('Failed to fetch report:', err);
                                  });
                              }
                            }}
                            className="w-full text-left p-2 rounded hover:bg-gray-50 border border-gray-200 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-800 truncate">
                                  {productName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {reportId ? `ID: ${reportId.slice(0, 8)}...` : 'No ID'}
                                </div>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                                reportStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                                reportStatus === 'FRAUDULENT' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {reportStatus === 'COMPLIANT' ? 'OK' :
                                 reportStatus === 'FRAUDULENT' ? 'FRD' : 'NC'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {filteredNoisePoints.length > 10 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          Showing 10 of {filteredNoisePoints.length} noise points
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.product || "Compliance Report"}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Report Images */}
              {(selectedReport.frontImageUrl || selectedReport.backImageUrl) && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-2">
                    Product Images
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.frontImageUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Front</p>
                        <img 
                          src={selectedReport.frontImageUrl} 
                          alt="Front" 
                          className="w-full h-32 object-cover rounded border"
                          onClick={() => window.open(selectedReport.frontImageUrl, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )}
                    {selectedReport.backImageUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Back</p>
                        <img 
                          src={selectedReport.backImageUrl} 
                          alt="Back" 
                          className="w-full h-32 object-cover rounded border"
                          onClick={() => window.open(selectedReport.backImageUrl, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Report ID */}
              {selectedReport.reportId && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Report ID
                  </p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {selectedReport.reportId}
                  </p>
                </div>
              )}

              {/* Reporter Info */}
              {(selectedReport.agent || selectedReport.agentId) && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Reported By
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {selectedReport.agent ? (
                      <>
                        <p className="text-base font-semibold text-blue-900 mb-1">
                          {selectedReport.agent.firstName && selectedReport.agent.lastName
                            ? `${selectedReport.agent.firstName} ${selectedReport.agent.lastName}`
                            : selectedReport.agent.email}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedReport.agent.email}
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-mono">
                          ID: {selectedReport.agentId}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-mono text-blue-900">
                        Agent ID: {selectedReport.agentId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {selectedReport.createdAt && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Report Time
                  </p>
                  <p className="text-sm text-neutral-900">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Product Name */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Product
                </p>
                <p className="text-base text-neutral-900">
                  {selectedReport.product || selectedReport.scannedData?.productName || "N/A"}
                </p>
              </div>

              {/* Cluster Info */}
              {selectedReport.clusterId !== undefined && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Cluster
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedReport.color && (
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: selectedReport.color }}
                      />
                    )}
                    <p className="text-base text-neutral-900">
                      {selectedReport.clusterId === -1
                        ? "Noise Point"
                        : `Cluster ${selectedReport.clusterId}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Location
                </p>
                {selectedReport.location?.address && (
                  <p className="text-sm text-neutral-900 mb-1">
                    {selectedReport.location.address}
                  </p>
                )}
                <p className="text-sm font-mono text-neutral-700">
                  Lat: {(selectedReport.position?.[1] || selectedReport.location?.latitude || 0).toFixed(6)}, Lng:{" "}
                  {(selectedReport.position?.[0] || selectedReport.location?.longitude || 0).toFixed(6)}
                </p>
              </div>

              {/* Current Status */}
              {selectedReport.currentStatus && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Current Status
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-medium ${
                      selectedReport.isVerified ? 'text-red-600' : 'text-neutral-900'
                    }`}>
                      {selectedReport.currentStatus === 'COMPLIANT' 
                        ? 'Compliant'
                        : selectedReport.currentStatus === 'NON_COMPLIANT'
                        ? 'Non-Compliant'
                        : 'Fraudulent'}
                    </p>
                    {selectedReport.isVerified && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        APPROVED
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Status Change Controls */}
              {!selectedReport.isVerified && (
                <div className="border-b pb-3">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-900 mb-2">
                      📋 Review & Change Status
                    </p>
                    <p className="text-xs text-amber-700 mb-3">
                      Select a new status to change the report classification, or keep the current status to approve as-is.
                    </p>
                    <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPLIANT">✅ Compliant</SelectItem>
                        <SelectItem value="NON_COMPLIANT">⚠️ Non-Compliant</SelectItem>
                        <SelectItem value="FRAUDULENT">🚫 Fraudulent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Additional Notes if available */}
              {selectedReport.additionalNotes && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Agent Notes
                  </p>
                  <p className="text-sm text-neutral-900 bg-gray-50 p-2 rounded">
                    {selectedReport.additionalNotes}
                  </p>
                </div>
              )}

              {/* OCR Text if available */}
              {selectedReport.ocrBlobText && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    OCR Text
                  </p>
                  <p className="text-xs text-neutral-700 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto font-mono">
                    {selectedReport.ocrBlobText}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedReport) {
                  const lat = selectedReport.position?.[1] || selectedReport.location?.latitude || 0;
                  const lng = selectedReport.position?.[0] || selectedReport.location?.longitude || 0;
                  window.open(
                    `https://www.google.com/maps?q=${lat},${lng}`,
                    "_blank"
                  );
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              View on Map
            </Button>
            <Button
              onClick={() => {
                if (selectedReport?.reportId) {
                  handleResolveReport(selectedReport.reportId);
                }
              }}
              disabled={selectedReport?.isVerified}
              className={selectedReport?.isVerified ? 'bg-red-600 hover:bg-red-600 cursor-not-allowed' : ''}
            >
              {selectedReport?.isVerified ? 'Already Approved' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
